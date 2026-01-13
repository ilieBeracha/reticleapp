/**
 * Insight Service
 *
 * Provides insight generation and retrieval for sessions.
 * Re-exports types and engine functions.
 *
 * NOTE: Insight generation with Pinecone similarity is now handled by the
 * Supabase Edge Function (generate-insights). This service is for:
 * - Fetching insights from database
 * - Client-side display utilities
 * - Manual regeneration requests
 */

import { supabase } from '@/lib/supabase';
import { generateInsights } from './insightEngine';
import type {
  GeneratedInsight,
  InsightGenerationInput,
  InsightPipelineResult,
  SessionFeatures,
  SessionInsight,
  UserBaseline,
} from './types';

// Re-export types
export type {
  GeneratedInsight,
  InsightFactor,
  InsightGenerationInput,
  InsightPipelineResult,
  InsightType,
  SessionFeatures,
  SessionInsight,
  UserBaseline
} from './types';

// Re-export engine functions
export { generateInsights, getTopInsight } from './insightEngine';

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

/**
 * Get existing insights for a session from database.
 */
export async function getSessionInsights(sessionId: string): Promise<SessionInsight[]> {
  const { data, error } = await supabase
    .from('session_insights')
    .select('*')
    .eq('session_id', sessionId)
    .order('score', { ascending: false });

  if (error) {
    console.error('[insights] Failed to fetch insights:', error);
    return [];
  }

  return data || [];
}

/**
 * Save generated insights to database.
 */
async function saveInsights(
  sessionId: string,
  userId: string,
  insights: GeneratedInsight[]
): Promise<SessionInsight[]> {
  if (insights.length === 0) return [];

  const insightRows = insights.map((insight) => ({
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

  const { data, error } = await supabase
    .from('session_insights')
    .upsert(insightRows, { 
      onConflict: 'session_id,insight_type',  // Match the unique constraint
      ignoreDuplicates: true,  // Don't error on duplicates
    })
    .select();

  if (error) {
    // Ignore duplicate key errors (Edge Function may have already saved)
    if (error.code === '23505') {
      console.log('[insights] Insights already saved (likely by Edge Function)');
      return [];
    }
    console.error('[insights] Failed to save insights:', error);
    return [];
  }

  return data || [];
}

/**
 * Get session features from database.
 */
async function getSessionFeatures(sessionId: string): Promise<SessionFeatures | null> {
  const { data, error } = await supabase
    .from('session_features')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('[insights] Failed to fetch features:', error);
    return null;
  }

  return data;
}

/**
 * Get user baseline for insight comparison.
 * If no conditionKey provided, uses the session's baseline via RPC.
 */
async function getUserBaseline(userId: string, conditionKey?: string): Promise<UserBaseline | null> {
  if (conditionKey) {
    const { data, error } = await supabase
      .from('user_baselines')
      .select('*')
      .eq('user_id', userId)
      .eq('condition_key', conditionKey)
      .maybeSingle();

    if (error) {
      console.error('[insights] Failed to fetch baseline:', error);
      return null;
    }
    return data;
  }

  // Without a condition key, get the user's most recent baseline (any condition)
  const { data, error } = await supabase
    .from('user_baselines')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[insights] Failed to fetch any baseline:', error);
    return null;
  }
  return data;
}

/**
 * Get baseline for a specific session using its condition key.
 */
async function getSessionBaseline(sessionId: string): Promise<UserBaseline | null> {
  const { data, error } = await supabase.rpc('get_session_baseline', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('[insights] Failed to get session baseline:', error);
    return null;
  }

  // RPC returns array, get first row
  if (data && data.length > 0) {
    const row = data[0];
    return {
      id: '',
      user_id: '',
      condition_key: row.condition_key,
      n: row.n,
      avg_accuracy: row.avg_accuracy,
      std_accuracy: row.std_accuracy,
      avg_grouping: row.avg_grouping,
      std_grouping: row.std_grouping,
      avg_stress: null,
      avg_optimal_shot_pct: null,
      updated_at: '',
    };
  }
  return null;
}

// ============================================================================
// INSIGHT PIPELINE
// ============================================================================

/**
 * Run the full insight pipeline for a session.
 * Computes features, generates insights, and stores results.
 */
export async function runInsightPipeline(sessionId: string): Promise<InsightPipelineResult> {
  console.log('[insights] Running pipeline for session:', sessionId);

  const result: InsightPipelineResult = {
    session_id: sessionId,
    features_computed: false,
    baseline_refreshed: false,
    insights_generated: 0,
    insights: [],
  };

  try {
    // Get session features (should already exist from session completion)
    const features = await getSessionFeatures(sessionId);
    if (!features) {
      // Try to compute features via RPC if not yet computed
      const { error: computeError } = await supabase.rpc('compute_session_features', {
        p_session_id: sessionId,
      });

      if (computeError) {
        console.error('[insights] Failed to compute features:', computeError);
        result.error = 'Failed to compute session features';
        return result;
      }

      // Fetch the newly computed features
      const newFeatures = await getSessionFeatures(sessionId);
      if (!newFeatures) {
        result.error = 'Features not found after computation';
        return result;
      }

      result.features_computed = true;
      return runInsightPipelineWithFeatures(sessionId, newFeatures, result);
    }

    return runInsightPipelineWithFeatures(sessionId, features, result);
  } catch (err) {
    console.error('[insights] Pipeline error:', err);
    result.error = err instanceof Error ? err.message : 'Unknown error';
    return result;
  }
}

/**
 * Run insight generation with pre-fetched features.
 * 
 * NOTE: For production use with Pinecone similarity, prefer calling the
 * Supabase Edge Function instead (it handles similarity search server-side).
 * This function is kept for local testing and fallback.
 */
async function runInsightPipelineWithFeatures(
  sessionId: string,
  features: SessionFeatures,
  result: InsightPipelineResult
): Promise<InsightPipelineResult> {
  // Get session-specific baseline for comparison (exact match only on client)
  const baseline = await getSessionBaseline(sessionId);

  console.log('[insights] Baseline for session:', {
    sessionId,
    hasBaseline: !!baseline,
    n: baseline?.n ?? 0,
  });

  // Generate insights using rule-based engine
  const input: InsightGenerationInput = { features, baseline };
  const insights = generateInsights(input);

  result.insights = insights;

  // Save insights to database
  if (insights.length > 0) {
    const saved = await saveInsights(sessionId, features.user_id, insights);
    result.insights_generated = saved.length;
  }

  // Refresh baseline after adding this session's data
  await refreshSessionBaseline(sessionId);
  result.baseline_refreshed = true;

  console.log('[insights] Pipeline complete:', {
    sessionId,
    insightsGenerated: result.insights_generated,
    baselineRefreshed: true,
  });

  return result;
}

/**
 * Refresh baseline for a session's condition key.
 */
async function refreshSessionBaseline(sessionId: string): Promise<void> {
  // Get session features to build condition key
  const features = await getSessionFeatures(sessionId);
  if (!features) return;

  // Call RPC to refresh baseline for this user's condition
  const { error } = await supabase.rpc('refresh_user_baseline', {
    p_user_id: features.user_id,
    p_condition_key: buildConditionKey(features),
    p_limit: 30,
  });

  if (error) {
    console.error('[insights] Failed to refresh baseline:', error);
  }
}

/**
 * Build condition key from features (mirrors SQL make_condition_key).
 */
function buildConditionKey(features: SessionFeatures): string {
  const drillGoal = features.drill_goal || 'unknown';
  const position = features.position || 'unknown';
  const weaponCategory = features.weapon_category || 'unknown';
  
  // Distance buckets matching SQL function
  let distanceBucket = 'unknown';
  if (features.distance_m !== null) {
    const d = features.distance_m;
    if (d <= 50) distanceBucket = '0-50';
    else if (d <= 100) distanceBucket = '51-100';
    else if (d <= 200) distanceBucket = '101-200';
    else if (d <= 300) distanceBucket = '201-300';
    else if (d <= 500) distanceBucket = '301-500';
    else distanceBucket = '500+';
  }

  return `${drillGoal}|${position}|${distanceBucket}|${weaponCategory}`;
}

/**
 * Backfill insights for a user's existing sessions.
 * Useful for users who had sessions before insights were implemented.
 */
export async function backfillUserInsights(userId: string, limit: number = 10): Promise<number> {
  console.log('[insights] Backfilling insights for user:', userId);

  // Find sessions without insights
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(limit);

  if (error || !sessions) {
    console.error('[insights] Failed to fetch sessions for backfill:', error);
    return 0;
  }

  let processedCount = 0;
  for (const session of sessions) {
    // Check if insights already exist
    const existing = await getSessionInsights(session.id);
    if (existing.length > 0) continue;

    // Run pipeline
    const result = await runInsightPipeline(session.id);
    if (result.insights_generated > 0) {
      processedCount++;
    }
  }

  console.log('[insights] Backfill complete:', { userId, processedCount });
  return processedCount;
}

/**
 * Regenerate insights for a specific session.
 * Deletes existing insights and generates new ones.
 */
export async function regenerateSessionInsights(sessionId: string): Promise<InsightPipelineResult> {
  console.log('[insights] Regenerating insights for session:', sessionId);

  // Delete existing insights
  const { error: deleteError } = await supabase
    .from('session_insights')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) {
    console.error('[insights] Failed to delete existing insights:', deleteError);
  }

  // Run pipeline fresh
  return runInsightPipeline(sessionId);
}

// ============================================================================
// EDGE FUNCTION INTEGRATION
// ============================================================================

/**
 * Trigger insight generation via Supabase Edge Function.
 * This is the recommended way to generate insights with Pinecone similarity.
 * 
 * The Edge Function handles:
 * - Pinecone embedding upsert
 * - Similarity-based baseline computation
 * - Full insight generation
 * - Database storage
 */
export async function triggerInsightGeneration(sessionId: string): Promise<{
  success: boolean;
  insights_generated?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-insights', {
      body: { session_id: sessionId },
    });

    if (error) {
      console.error('[insights] Edge function error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      insights_generated: data?.insights_generated ?? 0,
    };
  } catch (err) {
    console.error('[insights] Failed to trigger Edge Function:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================================================
// PERSONALIZED DAILY TIP (Pinecone + AI)
// ============================================================================

export interface PersonalizedTip {
  title: string;
  content: string;
  category: 'technique' | 'fundamentals' | 'mental' | 'training';
  personalized: boolean;
  based_on?: string;
}

/**
 * Get a personalized daily tip based on user's session history from Pinecone.
 * Falls back to rule-based tips if AI services are unavailable.
 */
export async function getPersonalizedDailyTip(
  userId: string,
  userStats: {
    streak: number;
    accuracy: number;
    sessionsThisWeek: number;
    totalSessions: number;
  }
): Promise<PersonalizedTip> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-insights', {
      body: {
        mode: 'daily_tip',
        user_id: userId,
        user_stats: {
          streak: userStats.streak,
          accuracy: userStats.accuracy,
          sessions_this_week: userStats.sessionsThisWeek,
          total_sessions: userStats.totalSessions,
        },
      },
    });

    if (error) {
      console.error('[insights] Daily tip error:', error);
      return getFallbackTip(userStats);
    }

    if (data?.success && data?.tip) {
      return data.tip as PersonalizedTip;
    }

    return getFallbackTip(userStats);
  } catch (err) {
    console.error('[insights] Failed to get personalized tip:', err);
    return getFallbackTip(userStats);
  }
}

/**
 * Fallback tips when AI is not available
 */
function getFallbackTip(stats: { streak: number; accuracy: number; sessionsThisWeek: number }): PersonalizedTip {
  if (stats.streak >= 5) {
    return {
      title: 'Mental Focus',
      content: 'Great streak! Visualize each shot before taking it. See the bullet hitting the target. Confidence breeds accuracy.',
      category: 'mental',
      personalized: false,
    };
  }
  if (stats.accuracy < 50 && stats.sessionsThisWeek > 0) {
    return {
      title: 'Trigger Press',
      content: 'Focus on pressing straight back. Let the shot surprise you. Anticipation causes most misses.',
      category: 'technique',
      personalized: false,
    };
  }
  if (stats.sessionsThisWeek === 0) {
    return {
      title: 'Deliberate Practice',
      content: 'Quality over quantity. 50 focused rounds beat 200 rushed ones. Every shot should have purpose.',
      category: 'training',
      personalized: false,
    };
  }
  return {
    title: 'Breathing Control',
    content: 'Take a deep breath, hold at the natural pause, then squeeze. Consistent breathing improves groupings.',
    category: 'technique',
    personalized: false,
  };
}
