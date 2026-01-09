import { SESSION_STATUS, TARGET_TYPE } from '@/constants';
import { supabase } from '@/lib/supabase';
import { markWeaponUsed } from '@/services/weaponService';
import { getDrillRequirements } from './drillContract';
import { mapSession } from './mappers';
import {
    getMyActiveSessionForTraining,
    getMyActiveSessionsAll,
    getSessionById,
    shouldAutoCancelSession,
} from './queries';
import {
    SESSION_SELECT_AFTER_CREATE,
    SESSION_SELECT_AFTER_UPDATE,
} from './selectClauses';
import { calculateSessionStats } from './stats';
import {
    addSessionTarget,
    getSessionTargets,
    savePaperTargetResult,
    saveTacticalTargetResult,
} from './targets';
import type {
    BaseSessionConfig,
    CreateSessionParams,
    PaperType,
    SessionStats,
    SessionTargetWithResults,
    SessionWithDetails,
    TargetType,
} from './types';
import { buildDetailsMergePayload, buildTargetData } from './watchDataTransformer';
import type { TransformedWatchData, WatchDetailsPayload } from './watchTypes';

/**
 * Convert legacy CreateSessionParams to BaseSessionConfig
 */
function normalizeToBaseConfig(params: CreateSessionParams | BaseSessionConfig): BaseSessionConfig {
  // If it's already a BaseSessionConfig (has watch_controlled as required boolean)
  if ('watch_controlled' in params && typeof params.watch_controlled === 'boolean' && 'drill_config' in params) {
    return params as BaseSessionConfig;
  }
  
  // Convert from CreateSessionParams
  const legacy = params as CreateSessionParams;
  return {
    team_id: legacy.team_id ?? null,
    training_id: legacy.training_id ?? null,
    weapon_id: null, // Legacy params don't have weapon
    drill_id: legacy.drill_id ?? null,
    drill_template_id: legacy.drill_template_id ?? null,
    drill_config: legacy.custom_drill_config ?? null,
    session_mode: legacy.session_mode ?? 'solo',
    watch_controlled: legacy.watch_controlled ?? false,
  };
}

/**
 * Create a new session - UNIFIED ARCHITECTURE
 *
 * All session creation flows use BaseSessionConfig:
 * - Solo quick practice (team_id: null)
 * - Team training (team_id: X, training_id: Y)
 * - Drill library pick (drill_template_id: Z)
 * - Custom drill (drill_config: {...})
 *
 * Every session MUST have a drill configuration:
 * - drill_id: For training drills (from a scheduled training)
 * - drill_template_id: For quick practice (from drill library)
 * - drill_config: For quick/custom drill (inline config)
 *
 * SINGLE SESSION ENFORCEMENT:
 * - Before creating a new session, any existing active sessions are auto-ended
 * - Sessions older than 24h are auto-cancelled (no data saved)
 * - This prevents orphaned sessions from accumulating
 */
export async function createSession(params: CreateSessionParams | BaseSessionConfig): Promise<SessionWithDetails> {
  // Normalize to BaseSessionConfig
  const config = normalizeToBaseConfig(params);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // =========================================================================
  // SINGLE ACTIVE SESSION ENFORCEMENT
  // =========================================================================
  // Before creating a new session, handle any existing active sessions.
  // This prevents orphaned sessions from accumulating.
  const existingActiveSessions = await getMyActiveSessionsAll();
  
  if (existingActiveSessions.length > 0) {
    console.log(`[createSession] Found ${existingActiveSessions.length} existing active session(s), cleaning up...`);
    
    for (const existingSession of existingActiveSessions) {
      // Sessions older than 24h are stale - cancel them (don't count as completed)
      if (shouldAutoCancelSession(existingSession)) {
        console.log(`[createSession] Auto-cancelling stale session ${existingSession.id} (>24h old)`);
        await supabase
          .from('sessions')
          .update({ 
            status: SESSION_STATUS.CANCELLED, 
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSession.id);
      } else {
        // Recent sessions - end them properly (mark as completed)
        console.log(`[createSession] Auto-ending active session ${existingSession.id}`);
        await supabase
          .from('sessions')
          .update({ 
            status: SESSION_STATUS.COMPLETED, 
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSession.id);
      }
    }
  }

  // DRILL-FIRST: Every session must have a drill source
  const hasCustomConfig =
    config.drill_config && config.drill_config.distance_m > 0 && config.drill_config.rounds_per_shooter > 0;

  if (!config.drill_id && !config.drill_template_id && !hasCustomConfig) {
    throw new Error('A drill configuration is required. Use custom drill, training drill, or drill template.');
  }

  // If joining a training, enforce drill-driven sessions and avoid drill mismatches
  if (config.training_id) {
    const existingSession = await getMyActiveSessionForTraining(config.training_id);

    // If there's already an active session for this training, only allow:
    // - continuing it (no drill specified), or
    // - continuing it if the requested drill matches
    if (existingSession) {
      if (!config.drill_id || existingSession.drill_id === config.drill_id) {
        return existingSession;
      }

      const existingLabel = existingSession.drill_name || existingSession.training_title || 'this training';
      throw new Error(`You already have an active session for "${existingLabel}". End it before starting a different drill.`);
    }

    // No active session yet: if this training has drills, require selecting a drill
    if (!config.drill_id) {
      const { count, error: drillsCountError } = await supabase
        .from('training_drills')
        .select('*', { count: 'exact', head: true })
        .eq('training_id', config.training_id);

      // If we can't determine drill count, fail safe by allowing session creation.
      // (UI should still route users through drill selection.)
      if (!drillsCountError && (count ?? 0) > 0) {
        throw new Error('This training uses drills. Start your session from a specific drill.');
      }
    } else {
      // Validate drill belongs to training (prevents mixing drills across trainings)
      const { data: drillRow, error: drillError } = await supabase
        .from('training_drills')
        .select('training_id')
        .eq('id', config.drill_id)
        .single();

      if (drillError) throw drillError;
      if (drillRow?.training_id !== config.training_id) {
        throw new Error('Selected drill does not belong to this training.');
      }
    }
  }

  // Build custom drill config for inline storage
  const customDrillConfig = hasCustomConfig
    ? {
        name: config.drill_config!.name || 'Quick Practice',
        drill_goal: config.drill_config!.drill_goal,
        target_type: config.drill_config!.target_type || 'paper',
        input_method: config.drill_config!.input_method ?? null, // User's choice
        distance_m: config.drill_config!.distance_m,
        rounds_per_shooter: config.drill_config!.rounds_per_shooter,
        time_limit_seconds: config.drill_config!.time_limit_seconds ?? null,
        strings_count: config.drill_config!.strings_count ?? null,
      }
    : null;

  // Check if we should start as pending (for watch selection flow)
  const startAsPending = (config as any).start_as_pending === true;
  const status = startAsPending ? SESSION_STATUS.PENDING : SESSION_STATUS.ACTIVE;
  // Always set started_at - database requires it. Status indicates pending vs active.
  const startedAt = new Date().toISOString();

  // Direct insert for all sessions (RLS handles permissions)
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      team_id: config.team_id,
      training_id: config.training_id,
      weapon_id: config.weapon_id, // Link to user's weapon profile
      drill_id: config.drill_id,
      drill_template_id: config.drill_template_id,
      custom_drill_config: customDrillConfig,
      session_mode: config.session_mode,
      watch_controlled: config.watch_controlled,
      status,
      started_at: startedAt,
      weather: config.weather ?? null, // Weather data from OpenWeatherMap
    })
    .select(SESSION_SELECT_AFTER_CREATE)
    .single();

  if (error) throw error;
  
  // Mark weapon as used (non-blocking)
  if (config.weapon_id) {
    markWeaponUsed(config.weapon_id).catch((err) => {
      console.warn('[createSession] Failed to mark weapon as used:', err);
    });
  }
  
  return mapSession(data);
}

/**
 * Start a quick practice session from a drill template
 * This is the primary way for soldiers to practice drills outside of scheduled trainings
 */
export async function startQuickPractice(drillTemplateId: string): Promise<SessionWithDetails> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Load drill template to get team_id
  const { data: template, error: templateError } = await supabase
    .from('drill_templates')
    .select('id, team_id, name')
    .eq('id', drillTemplateId)
    .single();

  if (templateError || !template) {
    throw new Error('Drill template not found');
  }

  // Verify user is a member of the team (for RLS)
  const { data: membership, error: memberError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', template.team_id)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    throw new Error('You are not a member of this team');
  }

  // Create session with drill_template_id
  return createSession({
    team_id: template.team_id,
    drill_template_id: drillTemplateId,
    session_mode: 'solo',
  });
}

/**
 * Create a session for a specific training
 * Used by team members (commander, squad_commander, soldier) to log their training sessions
 */
export async function createTrainingSession(params: {
  training_id: string;
  drill_id?: string | null;
  session_mode?: 'solo' | 'group';
}): Promise<SessionWithDetails> {
  // First, get the training to know the team_id and title
  const { data: training, error: trainingError } = await supabase
    .from('trainings')
    .select('team_id, title')
    .eq('id', params.training_id)
    .single();

  if (trainingError || !training) {
    throw new Error('Training not found');
  }

  const session = await createSession({
    team_id: training.team_id,
    training_id: params.training_id,
    drill_id: params.drill_id ?? null,
    session_mode: params.session_mode ?? 'solo',
  });

  // Send notifications (non-blocking)
  sendTrainingSessionNotifications(params.training_id, training.title, session.user_full_name || 'A member').catch(console.error);

  return session;
}

/**
 * Send notifications when a training session is started
 */
async function sendTrainingSessionNotifications(trainingId: string, trainingTitle: string, memberName: string) {
  // Log for commanders/owners - actual push needs server-side
  console.log(`[Notification] ${memberName} started session in ${trainingTitle}`);

  // TODO: To notify commanders/owners, create Supabase Edge Function that:
  // 1. Gets team owner + commanders from team_members
  // 2. Gets their push tokens
  // 3. Sends push via Expo Push API
  // Example: await supabase.functions.invoke('notify-training-session', { body: { ... } })
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  updates: {
    status?: 'pending' | 'active' | 'completed' | 'cancelled';
    ended_at?: string;
    started_at?: string;
    watch_controlled?: boolean;
    /** Update custom drill config (e.g., to save detection_sensitivity) */
    custom_drill_config?: Record<string, any>;
  }
) {
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.status !== 'undefined') {
    updatePayload.status = updates.status;
  }

  if (typeof updates.ended_at !== 'undefined') {
    updatePayload.ended_at = updates.ended_at;
  }

  if (typeof updates.started_at !== 'undefined') {
    updatePayload.started_at = updates.started_at;
  }

  if (typeof updates.watch_controlled !== 'undefined') {
    updatePayload.watch_controlled = updates.watch_controlled;
  }

  if (typeof updates.custom_drill_config !== 'undefined') {
    updatePayload.custom_drill_config = updates.custom_drill_config;
  }

  // Return a fully-hydrated session payload so callers don't lose drill context after updates.
  const { data, error } = await supabase
    .from('sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .select(SESSION_SELECT_AFTER_UPDATE)
    .single();

  if (error) throw error;
  return mapSession(data);
}

/**
 * Delete (cancel) a session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);

  if (error) throw error;
  return true;
}

/**
 * Activate a pending session
 * 
 * Changes status from 'pending' to 'active' and sets:
 * - started_at to now
 * - watch_controlled based on user choice
 * 
 * @param sessionId - The pending session to activate
 * @param watchControlled - Whether the watch should control this session
 * @returns The activated session
 */
export async function activateSession(
  sessionId: string,
  watchControlled: boolean
): Promise<SessionWithDetails> {
  const session = await getSessionById(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.status !== SESSION_STATUS.PENDING) {
    throw new Error(`Cannot activate session with status '${session.status}'. Expected '${SESSION_STATUS.PENDING}'.`);
  }
  
  return updateSession(sessionId, {
    status: SESSION_STATUS.ACTIVE,
    started_at: new Date().toISOString(),
    watch_controlled: watchControlled,
  });
}

/**
 * End a session (mark as completed)
 * Also records drill completion if this was a drill session
 */
export async function endSession(sessionId: string) {
  // First get the session to check if it's linked to a drill
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  // Update the session status
  const updatedSession = await updateSession(sessionId, {
    status: SESSION_STATUS.COMPLETED,
    ended_at: new Date().toISOString(),
  });

  // If session was linked to a training + drill, record completion ONLY if requirements were met
  if (session.training_id && session.drill_id && session.drill_config) {
    const drill = session.drill_config;
    const stats = await calculateSessionStats(sessionId);

    const { requiredTargets, requiredShots, isPaper } = getDrillRequirements(drill);

    const meetsShotCount = isPaper ? true : stats.totalShotsFired >= requiredShots;
    const meetsTargetCount = stats.targetCount >= requiredTargets;
    const meetsAccuracy = !drill.min_accuracy_percent || stats.accuracyPct >= drill.min_accuracy_percent;

    // Time limit enforcement: compare against session duration (not per-target engagement time)
    const endedAt = updatedSession.ended_at ? new Date(updatedSession.ended_at).getTime() : Date.now();
    const startedAt = session.started_at ? new Date(session.started_at).getTime() : endedAt;
    const durationSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
    const meetsTime = !drill.time_limit_seconds || durationSeconds <= drill.time_limit_seconds;

    if (meetsShotCount && meetsTargetCount && meetsAccuracy && meetsTime) {
      await recordDrillCompletion({
        sessionId,
        trainingId: session.training_id,
        drillId: session.drill_id,
        stats,
      });
    } else {
      console.log('[SessionService] Drill requirements not met; skipping completion record', {
        sessionId,
        requiredTargets,
        requiredShots,
        totalTargets: stats.targetCount,
        totalShots: stats.totalShotsFired,
        accuracyPct: stats.accuracyPct,
        durationSeconds,
      });
    }

    // =========================================================================
    // AUTO-CLOSE TRAINING IF ALL MEMBERS COMPLETED ALL DRILLS (OR EXPIRED)
    // =========================================================================
    try {
      const { data: newStatus, error: rpcError } = await supabase.rpc('auto_close_training_if_complete', {
        p_training_id: session.training_id,
      });

      if (rpcError) {
        console.error('[SessionService] Failed to check training auto-close:', rpcError);
      } else if (newStatus === 'finished') {
        console.log('[SessionService] Training auto-closed - all members completed all drills');
      }
    } catch (err) {
      // Non-blocking - don't fail session end if auto-close check fails
      console.error('[SessionService] Error checking training auto-close:', err);
    }
  }

  // =========================================================================
  // COMPUTE FEATURES & GENERATE INSIGHTS (via Edge Function)
  // =========================================================================
  // Non-blocking - don't fail session end if insight generation fails
  computeSessionFeaturesAndInsights(sessionId).catch((err) => {
    console.error('[SessionService] Failed to generate insights:', err);
  });

  return updatedSession;
}

/**
 * Compute session features and trigger insight generation.
 * Called after session ends. Non-blocking.
 */
async function computeSessionFeaturesAndInsights(sessionId: string): Promise<void> {
  try {
    // 1. Compute session features (SQL function)
    const { error: featuresError } = await supabase.rpc('compute_session_features', {
      p_session_id: sessionId,
    });

    if (featuresError) {
      console.error('[SessionService] Failed to compute session features:', featuresError);
      return;
    }
    console.log('[SessionService] Session features computed for:', sessionId);

    // 2. Trigger insight generation via Edge Function
    // The Edge Function handles Pinecone embedding + similarity search + insight generation
    const { error: insightError } = await supabase.functions.invoke('generate-insights', {
      body: { session_id: sessionId },
    });

    if (insightError) {
      console.error('[SessionService] Edge function error:', insightError);
      return;
    }
    console.log('[SessionService] Insights generated for:', sessionId);
  } catch (err) {
    console.error('[SessionService] computeSessionFeaturesAndInsights error:', err);
  }
}

/**
 * Record drill completion in user_drill_completions table
 */
async function recordDrillCompletion(params: {
  sessionId: string;
  trainingId: string;
  drillId: string;
  stats: SessionStats;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Insert completion record
  const { error } = await supabase.from('user_drill_completions').insert({
    user_id: user.id,
    training_id: params.trainingId,
    drill_id: params.drillId,
    session_id: params.sessionId,
    completed_at: new Date().toISOString(),
    shots_fired: params.stats.totalShotsFired,
    hits: params.stats.totalHits,
    accuracy_pct: params.stats.accuracyPct,
    time_seconds: params.stats.avgEngagementTimeSec,
  });

  if (error) {
    console.error('Failed to record drill completion:', error);
    // Don't throw - this is a secondary operation
  }
}

// ============================================================================
// DRILL LIMITS - Soft tracking only (no enforcement)
// ============================================================================
// 
// Per sessions.mdc mental model:
// - "Drills set expectations. Sessions record reality."
// - Users can always record what actually happened
// - Limits are tracked for analytics, not enforcement
//

async function enforceDrillLimitsForNewTarget(_params: { sessionId: string; targetType: TargetType; bulletsFired: number }) {
  // No enforcement - users can always add targets
  // Stats will track actual vs expected for analytics
  return;
}

/**
 * Add a target with results in one operation
 * Useful for paper targets where we have AI detection results immediately
 */
export async function addTargetWithPaperResult(params: {
  session_id: string;
  distance_m?: number | null;
  lane_number?: number | null;
  planned_shots?: number | null;
  notes?: string | null;
  target_data?: Record<string, any> | null;
  // Paper result params
  paper_type: PaperType;
  bullets_fired: number;
  hits_total?: number | null;
  hits_inside_scoring?: number | null;
  dispersion_cm?: number | null;
  offset_right_cm?: number | null;
  offset_up_cm?: number | null;
  scanned_image_url?: string | null;
  result_notes?: string | null;
  /** Optional: User-declared actual shots (for scanned targets where bullets_fired = detected holes) */
  actual_shots_declared?: number | null;
}): Promise<SessionTargetWithResults> {
  console.log('[SessionService] addTargetWithPaperResult called');

  await enforceDrillLimitsForNewTarget({
    sessionId: params.session_id,
    targetType: TARGET_TYPE.PAPER,
    bulletsFired: params.bullets_fired,
  });

  // First create the target
  const target = await addSessionTarget({
    session_id: params.session_id,
    target_type: TARGET_TYPE.PAPER,
    distance_m: params.distance_m,
    lane_number: params.lane_number,
    planned_shots: params.planned_shots ?? params.bullets_fired,
    notes: params.notes,
    target_data: params.target_data,
  });
  console.log('[SessionService] Target created:', target.id);

  // Then save the paper result
  const paperResult = await savePaperTargetResult({
    session_target_id: target.id,
    paper_type: params.paper_type,
    bullets_fired: params.bullets_fired,
    hits_total: params.hits_total,
    hits_inside_scoring: params.hits_inside_scoring,
    dispersion_cm: params.dispersion_cm,
    offset_right_cm: params.offset_right_cm,
    offset_up_cm: params.offset_up_cm,
    scanned_image_url: params.scanned_image_url,
    notes: params.result_notes,
    actual_shots_declared: params.actual_shots_declared,
  });
  console.log('[SessionService] Paper result created:', paperResult.id);

  return {
    ...target,
    paper_result: paperResult,
    tactical_result: null,
  };
}

/**
 * Add a target with tactical results in one operation
 */
export async function addTargetWithTacticalResult(params: {
  session_id: string;
  distance_m?: number | null;
  lane_number?: number | null;
  planned_shots?: number | null;
  notes?: string | null;
  target_data?: Record<string, any> | null;
  // Tactical result params
  bullets_fired: number;
  hits: number;
  is_stage_cleared?: boolean;
  time_seconds?: number | null;
  result_notes?: string | null;
}): Promise<SessionTargetWithResults> {
  await enforceDrillLimitsForNewTarget({
    sessionId: params.session_id,
    targetType: TARGET_TYPE.TACTICAL,
    bulletsFired: params.bullets_fired,
  });

  // First create the target
  const target = await addSessionTarget({
    session_id: params.session_id,
    target_type: TARGET_TYPE.TACTICAL,
    distance_m: params.distance_m,
    lane_number: params.lane_number,
    planned_shots: params.planned_shots ?? params.bullets_fired,
    notes: params.notes,
    target_data: params.target_data,
  });

  // Then save the tactical result
  const tacticalResult = await saveTacticalTargetResult({
    session_target_id: target.id,
    bullets_fired: params.bullets_fired,
    hits: params.hits,
    is_stage_cleared: params.is_stage_cleared,
    time_seconds: params.time_seconds,
    notes: params.result_notes,
  });

  return {
    ...target,
    paper_result: null,
    tactical_result: tacticalResult,
  };
}

// ============================================================================
// WATCH DATA INTEGRATION
// ============================================================================

export interface WatchSessionData {
  sessionId: string;
  shotsRecorded: number;
  hitsRecorded?: number; // User-entered hits count
  durationMs?: number;
  distance?: number;
  completed?: boolean;
  // Detection info
  autoDetected?: boolean;
  detectionSensitivity?: number;
  manualOverrides?: number;
  // Extended data from Garmin watch
  splitTimes?: number[];
  avgSplitMs?: number;
  // Performance analytics
  performance?: {
    firstShotTime?: number;
    bestSplit?: number;
    worstSplit?: number;
    splitStdDev?: number;
    shotsPerMinute?: number;
    parDelta?: number;
    warmupAvg?: number;
    restAvg?: number;
    lastThreeAvg?: number;
  };
  // Biometrics
  biometrics?: {
    enabled?: boolean;
    summary?: {
      minHR?: number;
      maxHR?: number;
      avgHR?: number;
      avgBreathRate?: number;
      hrSamples?: number;
      breathSamples?: number;
      shotCount?: number;
      // Stress data
      stressAvg?: number;
      stressMin?: number;
      stressMax?: number;
      stressTrend?: string;
      optimalShots?: number;
      optimalPct?: number;
    };
    hrTimeline?: [number, number, number][];
    breathTimeline?: [number, number, number][];
    shotBiometrics?: {
      shot: number;
      hr?: number;
      hrAvg?: number;
      br?: number;
      breathPhase?: string;
      hrTrend?: string;
      stress?: number;
      rmssd?: number;
    }[];
  };
  // Steadiness
  steadiness?: {
    enabled?: boolean;
    avgScore?: number;
    shotCount?: number;
    trend?: string;
    // Flinch detection
    flinchCount?: number;
    flinchRate?: number;
    // Recoil analysis
    recoilConsistency?: number;
    // Best/worst shots
    bestShot?: number;
    bestScore?: number;
    worstShot?: number;
    worstScore?: number;
    // Per-shot data
    shots?: {
      shotNumber: number;
      score: number;
      grade: string;
      tremor?: number;
      drift?: number;
      sway?: number;
      samples?: number;
      anomaly?: boolean;
      // Flinch
      flinch?: boolean;
      flinchMag?: number;
      // Recoil
      recoilMag?: number;
      recoilDev?: number;
    }[];
    gradeDistribution?: Record<string, number>;
    // Legacy format
    shotScores?: number[];
    timeline?: [number, number, number][];
  };
}

/**
 * Save watch data to session and optionally end it.
 * Creates a tactical target entry with the watch data as the result.
 * 
 * @param data - Watch session data from Garmin
 * @param endSession - Whether to end the session after saving
 * @returns The updated session
 */
export async function saveWatchSessionData(
  data: WatchSessionData,
  shouldEnd: boolean = true
): Promise<SessionWithDetails> {
  const session = await getSessionById(data.sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  console.log('[SessionService] Saving watch data:', data);
  
  // Check if we already have a watch target for this session (prevent duplicates from retries)
  const existingTargets = await getSessionTargets(data.sessionId);
  const hasWatchTarget = existingTargets.some(
    (t) => (t.target_data as Record<string, unknown> | null)?.source === 'garmin_watch'
  );
  
  if (hasWatchTarget) {
    console.log('[SessionService] ⚠️ Watch target already exists for session, skipping duplicate save');
    return session;
  }
  
  // Get drill config for distance if not provided by watch
  const drill = session.drill_config;
  const distance = data.distance ?? drill?.distance_m ?? 0;
  
  // Build comprehensive target_data with all watch telemetry
  const targetData: Record<string, unknown> = {
    source: 'garmin_watch',
    // Basic data
    shots_recorded: data.shotsRecorded,
    hits_recorded: data.hitsRecorded ?? data.shotsRecorded,
    duration_ms: data.durationMs,
    distance: distance,
    completed: data.completed ?? false,
    // Detection info
    auto_detected: data.autoDetected,
    detection_sensitivity: data.detectionSensitivity,
    manual_overrides: data.manualOverrides,
  };
  
  // Add split times if available (from watch directly)
  if (data.splitTimes && data.splitTimes.length > 0) {
    targetData.splits = data.splitTimes;
    targetData.avg_split_ms = data.avgSplitMs ?? Math.round(data.splitTimes.reduce((a, b) => a + b, 0) / data.splitTimes.length);
    targetData.fastest_split_ms = Math.min(...data.splitTimes);
    targetData.slowest_split_ms = Math.max(...data.splitTimes);
  }
  
  // Add performance analytics if available
  if (data.performance) {
    targetData.performance = {
      first_shot_time: data.performance.firstShotTime,
      best_split: data.performance.bestSplit,
      worst_split: data.performance.worstSplit,
      split_std_dev: data.performance.splitStdDev,
      shots_per_minute: data.performance.shotsPerMinute,
      par_delta: data.performance.parDelta,
      warmup_avg: data.performance.warmupAvg,
      rest_avg: data.performance.restAvg,
      last_three_avg: data.performance.lastThreeAvg,
    };
  }
  
  // Add full biometrics data if available
  if (data.biometrics?.enabled) {
    targetData.biometrics = {
      summary: data.biometrics.summary,
      // Store timelines (could be large arrays)
      hr_timeline: data.biometrics.hrTimeline,
      breath_timeline: data.biometrics.breathTimeline,
      shot_biometrics: data.biometrics.shotBiometrics,
    };
    
    // Also store summary at top level for easy access
    if (data.biometrics.summary) {
      targetData.heart_rate = {
        avg: data.biometrics.summary.avgHR,
        max: data.biometrics.summary.maxHR,
        min: data.biometrics.summary.minHR,
      };
      targetData.avg_breath_rate = data.biometrics.summary.avgBreathRate;
      // Stress data at top level
      targetData.stress = {
        avg: data.biometrics.summary.stressAvg,
        min: data.biometrics.summary.stressMin,
        max: data.biometrics.summary.stressMax,
        trend: data.biometrics.summary.stressTrend,
      };
      // Optimal shots
      targetData.optimal_shots = data.biometrics.summary.optimalShots;
      targetData.optimal_pct = data.biometrics.summary.optimalPct;
    }
  }
  
  // Add steadiness data if available
  if (data.steadiness?.enabled) {
    targetData.steadiness = {
      avg_score: data.steadiness.avgScore,
      shot_count: data.steadiness.shotCount,
      trend: data.steadiness.trend,
      // Flinch data
      flinch_count: data.steadiness.flinchCount,
      flinch_rate: data.steadiness.flinchRate,
      // Recoil consistency
      recoil_consistency: data.steadiness.recoilConsistency,
      // Best/worst shots
      best_shot: data.steadiness.bestShot,
      best_score: data.steadiness.bestScore,
      worst_shot: data.steadiness.worstShot,
      worst_score: data.steadiness.worstScore,
      // Per-shot data (includes flinch, recoil per shot)
      shots: data.steadiness.shots,
      grade_distribution: data.steadiness.gradeDistribution,
      // Legacy format
      shot_scores: data.steadiness.shotScores,
      timeline: data.steadiness.timeline,
    };
  }
  
  console.log('[SessionService] Target data keys:', Object.keys(targetData));
  
  // Create a tactical target entry with watch data
  // This allows the data to be picked up by normal stats calculation
  const target = await addSessionTarget({
    session_id: data.sessionId,
    target_type: TARGET_TYPE.TACTICAL,
    distance_m: distance,
    notes: 'Recorded via Garmin watch',
    target_data: targetData,
  });
  
  // Calculate time in seconds from milliseconds
  const timeSeconds = data.durationMs ? data.durationMs / 1000 : null;
  
  // Save the tactical result
  // Use user-provided hits if available, otherwise assume all shots are hits
  const hits = data.hitsRecorded ?? data.shotsRecorded;
  await saveTacticalTargetResult({
    session_target_id: target.id,
    bullets_fired: data.shotsRecorded,
    hits: hits,
    is_stage_cleared: data.completed ?? false,
    time_seconds: timeSeconds,
    notes: 'Watch session data',
  });
  
  console.log('[SessionService] Watch data saved as tactical target:', target.id);
  
  // End the session if requested
  if (shouldEnd) {
    // Calculate ended_at based on watch duration (not current phone time)
    // This ensures the session duration matches what the watch recorded
    let calculatedEndedAt: string;
    
    if (data.durationMs && session.started_at) {
      // Use watch duration: started_at + durationMs
      const startedAtMs = new Date(session.started_at).getTime();
      const endedAtMs = startedAtMs + data.durationMs;
      calculatedEndedAt = new Date(endedAtMs).toISOString();
      console.log('[SessionService] Using watch duration for ended_at:', {
        started_at: session.started_at,
        durationMs: data.durationMs,
        calculated_ended_at: calculatedEndedAt,
      });
    } else {
      // Fallback to current time if no duration from watch
      calculatedEndedAt = new Date().toISOString();
      console.log('[SessionService] No watch duration, using current time for ended_at');
    }
    
    // Update session with calculated ended_at
    const updatedSession = await updateSession(data.sessionId, {
      status: SESSION_STATUS.COMPLETED,
      ended_at: calculatedEndedAt,
    });
    
    // Check drill completion if applicable
    if (session.training_id && session.drill_id && session.drill_config) {
      const drill = session.drill_config;
      const stats = await calculateSessionStats(data.sessionId);
      
      const meetsShotCount = !drill.rounds_per_shooter || stats.totalShotsFired >= drill.rounds_per_shooter;
      const targetRequirement = (drill.strings_count ?? 1) * (drill.target_count ?? 1);
      const meetsTargetCount = stats.targetCount >= targetRequirement;
      const meetsAccuracy = !drill.min_accuracy_percent || stats.accuracyPct >= drill.min_accuracy_percent;
      
      const endedAt = new Date(calculatedEndedAt).getTime();
      const startedAt = session.started_at ? new Date(session.started_at).getTime() : endedAt;
      const durationSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
      const meetsTime = !drill.time_limit_seconds || durationSeconds <= drill.time_limit_seconds;
      
      if (meetsShotCount && meetsTargetCount && meetsAccuracy && meetsTime) {
        await recordDrillCompletion({
          sessionId: data.sessionId,
          trainingId: session.training_id,
          drillId: session.drill_id,
          stats,
        });
        console.log('[SessionService] Watch session: Drill marked completed');
      }
    }

    // Generate insights for watch session (non-blocking)
    computeSessionFeaturesAndInsights(data.sessionId).catch((err) => {
      console.error('[SessionService] Watch session: Failed to generate insights:', err);
    });
    
    return updatedSession;
  }
  
  // Otherwise just return the current session
  return session;
}

/**
 * Merge SESSION_DETAILS into an existing watch session target.
 * Called when Phase 2 data arrives after Phase 1 summary was already saved.
 * 
 * @param sessionId - The session to update
 * @param details - The full details data from SESSION_DETAILS
 * @returns true if update was successful, false if no target found
 */
export async function mergeWatchSessionDetails(
  sessionId: string,
  details: Partial<WatchSessionData>
): Promise<boolean> {
  console.log('[SessionService] Merging watch session details for:', sessionId);
  
  // Find the existing target with garmin_watch source
  // Note: session_targets doesn't have created_at, so we filter by target_data source
  const { data: targets, error: fetchError } = await supabase
    .from('session_targets')
    .select('id, target_data')
    .eq('session_id', sessionId)
    .limit(10);  // Get all targets for this session, we'll filter for garmin_watch
  
  if (fetchError) {
    console.error('[SessionService] Error fetching target for merge:', fetchError);
    return false;
  }
  
  if (!targets || targets.length === 0) {
    console.log('[SessionService] No target found for session, details will be saved on next save');
    return false;
  }
  
  // Find the garmin_watch target
  const watchTarget = targets.find((t) => {
    const data = t.target_data as Record<string, unknown> | null;
    return data?.source === 'garmin_watch';
  });
  
  if (!watchTarget) {
    console.log('[SessionService] No garmin_watch target found, details will be saved on next save');
    return false;
  }
  
  const target = watchTarget;
  const existingData = (target.target_data as Record<string, unknown>) || {};
  
  console.log('[SessionService] Found existing garmin_watch target:', target.id);
  
  // Build the details to merge
  const detailsToMerge: Record<string, unknown> = {};
  
  // Add split times if available
  if (details.splitTimes && details.splitTimes.length > 0) {
    detailsToMerge.splits = details.splitTimes;
    detailsToMerge.avg_split_ms = details.avgSplitMs ?? Math.round(details.splitTimes.reduce((a, b) => a + b, 0) / details.splitTimes.length);
    detailsToMerge.fastest_split_ms = Math.min(...details.splitTimes);
    detailsToMerge.slowest_split_ms = Math.max(...details.splitTimes);
  }
  
  // Add detection info
  if (details.autoDetected !== undefined) detailsToMerge.auto_detected = details.autoDetected;
  if (details.detectionSensitivity !== undefined) detailsToMerge.detection_sensitivity = details.detectionSensitivity;
  if (details.manualOverrides !== undefined) detailsToMerge.manual_overrides = details.manualOverrides;
  
  // Add performance analytics if available
  if (details.performance) {
    detailsToMerge.performance = {
      first_shot_time: details.performance.firstShotTime,
      best_split: details.performance.bestSplit,
      worst_split: details.performance.worstSplit,
      split_std_dev: details.performance.splitStdDev,
      shots_per_minute: details.performance.shotsPerMinute,
      par_delta: details.performance.parDelta,
      warmup_avg: details.performance.warmupAvg,
      rest_avg: details.performance.restAvg,
      last_three_avg: details.performance.lastThreeAvg,
    };
  }
  
  // Add full biometrics data if available
  if (details.biometrics?.enabled) {
    detailsToMerge.biometrics = {
      summary: details.biometrics.summary,
      hr_timeline: details.biometrics.hrTimeline,
      breath_timeline: details.biometrics.breathTimeline,
      shot_biometrics: details.biometrics.shotBiometrics,
    };
    
    // Also update top-level fields
    if (details.biometrics.summary) {
      detailsToMerge.heart_rate = {
        avg: details.biometrics.summary.avgHR,
        max: details.biometrics.summary.maxHR,
        min: details.biometrics.summary.minHR,
      };
      detailsToMerge.avg_breath_rate = details.biometrics.summary.avgBreathRate;
      detailsToMerge.stress = {
        avg: details.biometrics.summary.stressAvg,
        min: details.biometrics.summary.stressMin,
        max: details.biometrics.summary.stressMax,
        trend: details.biometrics.summary.stressTrend,
      };
      detailsToMerge.optimal_shots = details.biometrics.summary.optimalShots;
      detailsToMerge.optimal_pct = details.biometrics.summary.optimalPct;
    }
  }
  
  // Add steadiness data if available
  if (details.steadiness?.enabled) {
    detailsToMerge.steadiness = {
      avg_score: details.steadiness.avgScore,
      shot_count: details.steadiness.shotCount,
      trend: details.steadiness.trend,
      flinch_count: details.steadiness.flinchCount,
      flinch_rate: details.steadiness.flinchRate,
      recoil_consistency: details.steadiness.recoilConsistency,
      best_shot: details.steadiness.bestShot,
      best_score: details.steadiness.bestScore,
      worst_shot: details.steadiness.worstShot,
      worst_score: details.steadiness.worstScore,
      shots: details.steadiness.shots,
      grade_distribution: details.steadiness.gradeDistribution,
      shot_scores: details.steadiness.shotScores,
      timeline: details.steadiness.timeline,
    };
  }
  
  // Mark as complete (details merged)
  detailsToMerge.details_merged = true;
  detailsToMerge.details_merged_at = new Date().toISOString();
  
  // Merge with existing data
  const mergedData = {
    ...existingData,
    ...detailsToMerge,
  };
  
  console.log('[SessionService] Merging keys:', Object.keys(detailsToMerge));
  
  // Update the target
  const { error: updateError } = await supabase
    .from('session_targets')
    .update({ target_data: mergedData })
    .eq('id', target.id);
  
  if (updateError) {
    console.error('[SessionService] Error updating target with details:', updateError);
    return false;
  }
  
  console.log('[SessionService] ✅ Watch session details merged successfully');
  return true;
}

// ============================================================================
// NEW TWO-PHASE SYNC FUNCTIONS (for compact watch payloads)
// ============================================================================

/**
 * Save transformed watch data from new compact payload format.
 * Creates a tactical target entry with comprehensive telemetry data.
 * 
 * @param data - Transformed watch data from transformSummaryPayload()
 * @param shouldEnd - Whether to end the session after saving (default: true)
 * @returns The updated session
 */
export async function saveTransformedWatchData(
  data: TransformedWatchData,
  shouldEnd: boolean = true
): Promise<SessionWithDetails> {
  const session = await getSessionById(data.sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  console.log('[SessionService] Saving transformed watch data:', {
    sessionId: data.sessionId,
    shots: data.shotsRecorded,
    hits: data.hitsRecorded,
    durationMs: data.durationMs,
    isSummaryOnly: data.isSummaryOnly,
  });
  
  // Get drill config for distance if not provided by watch
  const drill = session.drill_config;
  const distance = data.distance || drill?.distance_m || 0;
  
  // Build target_data using the transformer
  const targetData = buildTargetData({
    ...data,
    distance,
  });
  
  console.log('[SessionService] Target data keys:', Object.keys(targetData));
  
  // Create a tactical target entry with watch data
  const target = await addSessionTarget({
    session_id: data.sessionId,
    target_type: TARGET_TYPE.TACTICAL,
    distance_m: distance,
    notes: 'Recorded via Garmin watch',
    target_data: targetData,
  });
  
  // Calculate time in seconds from milliseconds
  const timeSeconds = data.durationMs ? data.durationMs / 1000 : null;
  
  // Save the tactical result
  await saveTacticalTargetResult({
    session_target_id: target.id,
    bullets_fired: data.shotsRecorded,
    hits: data.hitsRecorded,
    is_stage_cleared: data.completed,
    time_seconds: timeSeconds,
    notes: data.isSummaryOnly ? 'Watch summary (details pending)' : 'Watch session data',
  });
  
  console.log('[SessionService] Transformed watch data saved as tactical target:', target.id);
  
  // End the session if requested
  if (shouldEnd) {
    // Calculate ended_at based on watch duration
    let calculatedEndedAt: string;
    
    if (data.durationMs && session.started_at) {
      const startedAtMs = new Date(session.started_at).getTime();
      const endedAtMs = startedAtMs + data.durationMs;
      calculatedEndedAt = new Date(endedAtMs).toISOString();
    } else {
      calculatedEndedAt = new Date().toISOString();
    }
    
    const updatedSession = await updateSession(data.sessionId, {
      status: SESSION_STATUS.COMPLETED,
      ended_at: calculatedEndedAt,
    });
    
    // Check drill completion if applicable
    if (session.training_id && session.drill_id && session.drill_config) {
      const drillConfig = session.drill_config;
      const stats = await calculateSessionStats(data.sessionId);
      
      const meetsShotCount = !drillConfig.rounds_per_shooter || stats.totalShotsFired >= drillConfig.rounds_per_shooter;
      const targetRequirement = (drillConfig.strings_count ?? 1) * (drillConfig.target_count ?? 1);
      const meetsTargetCount = stats.targetCount >= targetRequirement;
      const meetsAccuracy = !drillConfig.min_accuracy_percent || stats.accuracyPct >= drillConfig.min_accuracy_percent;
      
      const endedAt = new Date(calculatedEndedAt).getTime();
      const startedAt = session.started_at ? new Date(session.started_at).getTime() : endedAt;
      const durationSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
      const meetsTime = !drillConfig.time_limit_seconds || durationSeconds <= drillConfig.time_limit_seconds;
      
      if (meetsShotCount && meetsTargetCount && meetsAccuracy && meetsTime) {
        await recordDrillCompletion({
          sessionId: data.sessionId,
          trainingId: session.training_id,
          drillId: session.drill_id,
          stats,
        });
        console.log('[SessionService] Watch session: Drill marked completed');
      }
    }

    // Generate insights (non-blocking)
    computeSessionFeaturesAndInsights(data.sessionId).catch((err) => {
      console.error('[SessionService] Failed to generate insights:', err);
    });
    
    return updatedSession;
  }
  
  return session;
}

/**
 * Merge Phase 2 details from new compact payload format.
 * Updates existing garmin_watch target with per-shot data.
 * 
 * @param sessionId - The session to update
 * @param details - The WatchDetailsPayload from Phase 2
 * @returns true if merge was successful
 */
export async function mergeCompactWatchDetails(
  sessionId: string,
  details: WatchDetailsPayload
): Promise<boolean> {
  console.log('[SessionService] Merging compact watch details for:', sessionId);
  
  // Find the existing target with garmin_watch source
  const { data: targets, error: fetchError } = await supabase
    .from('session_targets')
    .select('id, target_data')
    .eq('session_id', sessionId)
    .limit(10);
  
  if (fetchError) {
    console.error('[SessionService] Error fetching target for merge:', fetchError);
    return false;
  }
  
  if (!targets || targets.length === 0) {
    console.log('[SessionService] No target found for session');
    return false;
  }
  
  // Find the garmin_watch target
  const watchTarget = targets.find((t) => {
    const targetDataRaw = t.target_data as Record<string, unknown> | null;
    return targetDataRaw?.source === 'garmin_watch';
  });
  
  if (!watchTarget) {
    console.log('[SessionService] No garmin_watch target found');
    return false;
  }
  
  const existingData = (watchTarget.target_data as Record<string, unknown>) || {};
  
  // Build details merge payload using transformer
  const detailsToMerge = buildDetailsMergePayload(details);
  
  console.log('[SessionService] Merging keys:', Object.keys(detailsToMerge));
  
  // Merge with existing data
  const mergedData = {
    ...existingData,
    ...detailsToMerge,
  };
  
  // Update the target
  const { error: updateError } = await supabase
    .from('session_targets')
    .update({ target_data: mergedData })
    .eq('id', watchTarget.id);
  
  if (updateError) {
    console.error('[SessionService] Error updating target with details:', updateError);
    return false;
  }
  
  // Also update the tactical_results notes to indicate details are merged
  const { error: resultUpdateError } = await supabase
    .from('tactical_results')
    .update({ notes: 'Watch session data (details synced)' })
    .eq('session_target_id', watchTarget.id);
  
  if (resultUpdateError) {
    console.warn('[SessionService] Could not update tactical result notes:', resultUpdateError);
  }
  
  console.log('[SessionService] ✅ Compact watch details merged successfully');
  return true;
}

