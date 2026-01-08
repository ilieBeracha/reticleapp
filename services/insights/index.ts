// ============================================================================
// INSIGHT SERVICE
// ============================================================================
// Main entry point for the insight pipeline.

import { supabase } from '@/lib/supabase';
import { generateInsights } from './insightEngine';
import type {
    GeneratedInsight,
    InsightPipelineResult,
    SessionFeatures,
    SessionInsight,
    UserBaseline,
} from './types';

// Re-export types and engine functions
export { generateInsights, getTopInsight } from './insightEngine';
export * from './types';

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Compute and store session features.
 * Calls the database RPC to populate session_features.
 */
export async function computeSessionFeatures(sessionId: string): Promise<SessionFeatures | null> {
  console.log('[InsightService] Computing features for session:', sessionId);
  
  const { data, error } = await supabase.rpc('compute_session_features', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('[InsightService] Error computing features:', error.message, error.details, error.hint);
    return null;
  }

  console.log('[InsightService] Features computed:', data ? 'success' : 'no data');
  return data as SessionFeatures;
}

/**
 * Get session features from database.
 */
export async function getSessionFeatures(sessionId: string): Promise<SessionFeatures | null> {
  const { data, error } = await supabase
    .from('session_features')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[InsightService] Error getting features:', error);
    return null;
  }

  return data as SessionFeatures;
}

/**
 * Get user baseline for a session's condition.
 */
export async function getSessionBaseline(sessionId: string): Promise<UserBaseline | null> {
  const { data, error } = await supabase.rpc('get_session_baseline', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('[InsightService] Error getting baseline:', error);
    return null;
  }

  // RPC returns array, get first row
  if (!data || data.length === 0) return null;

  return data[0] as UserBaseline;
}

/**
 * Refresh user baseline for a condition key.
 */
export async function refreshUserBaseline(
  userId: string,
  conditionKey: string,
  limit: number = 30
): Promise<boolean> {
  const { error } = await supabase.rpc('refresh_user_baseline', {
    p_user_id: userId,
    p_condition_key: conditionKey,
    p_limit: limit,
  });

  if (error) {
    console.error('[InsightService] Error refreshing baseline:', error);
    return false;
  }

  return true;
}

/**
 * Save generated insights to database.
 */
export async function saveInsights(
  sessionId: string,
  userId: string,
  insights: GeneratedInsight[]
): Promise<boolean> {
  if (insights.length === 0) return true;

  const rows = insights.map((insight) => ({
    session_id: sessionId,
    user_id: userId,
    title: insight.title,
    summary: insight.summary,
    primary_factor: insight.primary_factor,
    secondary_factor: insight.secondary_factor,
    score: insight.score,
    tags: insight.tags,
    insight_type: insight.insight_type,
    evidence: insight.evidence,
  }));

  const { error } = await supabase.from('session_insights').upsert(rows, {
    onConflict: 'session_id,user_id,title',
  });

  if (error) {
    console.error('[InsightService] Error saving insights:', error);
    return false;
  }

  return true;
}

/**
 * Get insights for a session.
 */
export async function getSessionInsights(sessionId: string): Promise<SessionInsight[]> {
  console.log('[InsightService] Getting insights for session:', sessionId);
  
  const { data, error } = await supabase
    .from('session_insights')
    .select('*')
    .eq('session_id', sessionId)
    .order('score', { ascending: false });

  if (error) {
    console.error('[InsightService] Error getting insights:', error.message, error.code);
    return [];
  }

  console.log('[InsightService] Found insights:', data?.length ?? 0);
  return (data ?? []) as SessionInsight[];
}

/**
 * Delete insights for a session.
 */
export async function deleteSessionInsights(sessionId: string): Promise<boolean> {
  const { error } = await supabase.from('session_insights').delete().eq('session_id', sessionId);

  if (error) {
    console.error('[InsightService] Error deleting insights:', error);
    return false;
  }

  return true;
}

// ============================================================================
// PIPELINE ORCHESTRATION
// ============================================================================

/**
 * Run the full insight pipeline for a session.
 * Call this after session completion.
 *
 * Flow:
 * 1. Compute session features
 * 2. Refresh user baseline for this condition
 * 3. Generate insights
 * 4. Save insights to database
 */
export async function runInsightPipeline(sessionId: string): Promise<InsightPipelineResult> {
  console.log('[InsightService] ====== PIPELINE START ======');
  console.log('[InsightService] Session ID:', sessionId);

  const result: InsightPipelineResult = {
    session_id: sessionId,
    features_computed: false,
    baseline_refreshed: false,
    insights_generated: 0,
    insights: [],
  };

  try {
    // 1. Compute session features
    console.log('[InsightService] Step 1: Computing features...');
    const features = await computeSessionFeatures(sessionId);
    if (!features) {
      result.error = 'Failed to compute session features (RPC returned null)';
      console.error('[InsightService] PIPELINE FAILED:', result.error);
      return result;
    }
    result.features_computed = true;
    console.log('[InsightService] Features computed - shots:', features.shots, 'accuracy:', features.accuracy_pct);

    // 2. Get condition key and refresh baseline
    if (features.user_id) {
      const conditionKey = makeConditionKey(
        features.drill_goal,
        features.position,
        features.distance_m,
        features.weapon_category
      );

      const refreshed = await refreshUserBaseline(features.user_id, conditionKey);
      result.baseline_refreshed = refreshed;

      if (refreshed) {
        console.log('[InsightService] Baseline refreshed for:', conditionKey);
      }
    }

    // 3. Get baseline for insight generation
    console.log('[InsightService] Step 3: Getting baseline...');
    const baseline = await getSessionBaseline(sessionId);
    console.log('[InsightService] Baseline:', baseline ? `n=${baseline.n}` : 'none');

    // 4. Generate insights
    console.log('[InsightService] Step 4: Generating insights...');
    const insights = generateInsights({ features, baseline });
    result.insights = insights;
    result.insights_generated = insights.length;
    console.log('[InsightService] Generated', insights.length, 'insights:', insights.map((i) => i.title));

    // 5. Save insights
    if (insights.length > 0) {
      console.log('[InsightService] Step 5: Saving insights...');
      const saved = await saveInsights(sessionId, features.user_id, insights);
      if (!saved) {
        console.warn('[InsightService] Failed to save some insights');
      } else {
        console.log('[InsightService] Insights saved successfully');
      }
    }

    console.log('[InsightService] ====== PIPELINE COMPLETE ======');
    return result;
  } catch (error) {
    console.error('[InsightService] PIPELINE ERROR:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate condition key (client-side version matching SQL function).
 */
export function makeConditionKey(
  drillGoal: string | null,
  position: string | null,
  distanceM: number | null,
  weaponCategory: string | null
): string {
  // Distance buckets matching SQL function
  let distanceBucket: string;
  if (distanceM === null) {
    distanceBucket = 'unknown';
  } else if (distanceM <= 50) {
    distanceBucket = '0-50';
  } else if (distanceM <= 100) {
    distanceBucket = '51-100';
  } else if (distanceM <= 200) {
    distanceBucket = '101-200';
  } else if (distanceM <= 300) {
    distanceBucket = '201-300';
  } else if (distanceM <= 500) {
    distanceBucket = '301-500';
  } else {
    distanceBucket = '500+';
  }

  return `${drillGoal ?? 'unknown'}|${position ?? 'unknown'}|${distanceBucket}|${weaponCategory ?? 'unknown'}`;
}

/**
 * Check if a session has insights.
 */
export async function hasSessionInsights(sessionId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('session_insights')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (error) return false;
  return (count ?? 0) > 0;
}

/**
 * Get recent insights for a user (for dashboard feed).
 */
export async function getRecentUserInsights(
  userId: string,
  limit: number = 10
): Promise<SessionInsight[]> {
  const { data, error } = await supabase
    .from('session_insights')
    .select('*')
    .eq('user_id', userId)
    .neq('insight_type', 'summary') // Exclude summaries
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[InsightService] Error getting recent insights:', error);
    return [];
  }

  return (data ?? []) as SessionInsight[];
}

// ============================================================================
// BACKFILL / RETROACTIVE PROCESSING
// ============================================================================

export interface BackfillResult {
  features: {
    total_sessions: number;
    processed: number;
    already_exists: number;
    errors: number;
  };
  baselines: Array<{ condition: string; sessions: number }>;
  insights_generated: number;
}

/**
 * Backfill all insights for a user using efficient SQL bulk processing.
 * Call this once to process historical data.
 * 
 * Flow:
 * 1. SQL: Compute session_features for all sessions (bulk)
 * 2. SQL: Refresh all baselines (bulk)
 * 3. TypeScript: Generate insights for sessions missing them
 * 
 * @param userId - User ID to backfill (required for security)
 * @returns Summary of what was processed
 */
export async function backfillUserInsights(userId: string): Promise<BackfillResult> {
  console.log('[InsightService] ====== BACKFILL START ======');
  console.log('[InsightService] User ID:', userId);

  // Step 1 & 2: Use SQL to bulk process features and baselines
  console.log('[InsightService] Step 1: Bulk processing features & baselines via SQL...');
  const { data: sqlResult, error: sqlError } = await supabase.rpc('backfill_all_insights', {
    p_user_id: userId,
  });

  if (sqlError) {
    console.error('[InsightService] SQL backfill failed:', sqlError);
    throw new Error(`Backfill failed: ${sqlError.message}`);
  }

  console.log('[InsightService] SQL result:', sqlResult);

  const result: BackfillResult = {
    features: sqlResult.features,
    baselines: sqlResult.baselines ?? [],
    insights_generated: 0,
  };

  // Step 3: Generate insights for sessions that now have features but no insights
  console.log('[InsightService] Step 2: Generating insights for sessions...');
  
  const { data: sessionsNeedingInsights } = await supabase
    .from('session_features')
    .select('session_id')
    .eq('user_id', userId);

  if (sessionsNeedingInsights && sessionsNeedingInsights.length > 0) {
    // Check which already have insights
    const { data: existingInsights } = await supabase
      .from('session_insights')
      .select('session_id')
      .eq('user_id', userId);

    const hasInsights = new Set((existingInsights ?? []).map((i) => i.session_id));
    const needsInsights = sessionsNeedingInsights.filter((s) => !hasInsights.has(s.session_id));

    console.log('[InsightService] Sessions needing insight generation:', needsInsights.length);

    for (const session of needsInsights) {
      try {
        // Get features and baseline
        const features = await getSessionFeatures(session.session_id);
        if (!features) continue;

        const baseline = await getSessionBaseline(session.session_id);

        // Generate and save insights
        const insights = generateInsights({ features, baseline });
        if (insights.length > 0) {
          await saveInsights(session.session_id, userId, insights);
          result.insights_generated += insights.length;
        }
      } catch (err) {
        console.warn('[InsightService] Failed to generate insights for', session.session_id, err);
      }
    }
  }

  console.log('[InsightService] ====== BACKFILL COMPLETE ======');
  console.log('[InsightService] Final results:', result);

  return result;
}

/**
 * Regenerate insights for a single session.
 * Useful if rules have changed and you want to update insights.
 */
export async function regenerateSessionInsights(sessionId: string): Promise<boolean> {
  console.log('[InsightService] Regenerating insights for:', sessionId);

  // Delete existing insights
  await deleteSessionInsights(sessionId);

  // Delete existing features (so they get recomputed)
  const { error: deleteError } = await supabase
    .from('session_features')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) {
    console.error('[InsightService] Error deleting features:', deleteError);
    return false;
  }

  // Run pipeline fresh
  const result = await runInsightPipeline(sessionId);
  return !result.error;
}

