import { supabase } from '@/lib/supabase';
import { getDrillRequirements } from './drillContract';
import { mapSession } from './mappers';
import {
  getMyActiveSessionForTraining,
  getMyActiveSessionsAll,
  getSessionById,
  shouldAutoCancelSession,
} from './queries';
import { calculateSessionStats } from './stats';
import {
  addSessionTarget,
  savePaperTargetResult,
  saveTacticalTargetResult,
} from './targets';
import type {
  CreateSessionParams,
  PaperType,
  SessionStats,
  SessionTargetWithResults,
  SessionWithDetails,
  TargetType,
} from './types';

/**
 * Create a new session - DRILL-FIRST architecture
 *
 * Every session MUST have a drill configuration:
 * - drill_id: For training drills (from a scheduled training)
 * - drill_template_id: For quick practice (from drill library)
 * - custom_drill_config: For quick/custom drill (inline config)
 *
 * The session's configuration is determined by the drill parameters.
 * 
 * SINGLE SESSION ENFORCEMENT:
 * - Before creating a new session, any existing active sessions are auto-ended
 * - Sessions older than 24h are auto-cancelled (no data saved)
 * - This prevents orphaned sessions from accumulating
 */
export async function createSession(params: CreateSessionParams): Promise<SessionWithDetails> {
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
            status: 'cancelled', 
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
            status: 'completed', 
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSession.id);
      }
    }
  }

  // DRILL-FIRST: Every session must have a drill source
  const hasCustomConfig =
    params.custom_drill_config && params.custom_drill_config.distance_m > 0 && params.custom_drill_config.rounds_per_shooter > 0;

  if (!params.drill_id && !params.drill_template_id && !hasCustomConfig) {
    throw new Error('A drill configuration is required. Use custom drill, training drill, or drill template.');
  }

  // If joining a training, enforce drill-driven sessions and avoid drill mismatches
  if (params.training_id) {
    const existingSession = await getMyActiveSessionForTraining(params.training_id);

    // If there's already an active session for this training, only allow:
    // - continuing it (no drill specified), or
    // - continuing it if the requested drill matches
    if (existingSession) {
      if (!params.drill_id || existingSession.drill_id === params.drill_id) {
        return existingSession;
      }

      const existingLabel = existingSession.drill_name || existingSession.training_title || 'this training';
      throw new Error(`You already have an active session for "${existingLabel}". End it before starting a different drill.`);
    }

    // No active session yet: if this training has drills, require selecting a drill
    if (!params.drill_id) {
      const { count, error: drillsCountError } = await supabase
        .from('training_drills')
        .select('*', { count: 'exact', head: true })
        .eq('training_id', params.training_id);

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
        .eq('id', params.drill_id)
        .single();

      if (drillError) throw drillError;
      if (drillRow?.training_id !== params.training_id) {
        throw new Error('Selected drill does not belong to this training.');
      }
    }
  }

  // Build custom drill config for inline storage
  const customDrillConfig = hasCustomConfig
    ? {
        name: params.custom_drill_config!.name || 'Quick Practice',
        drill_goal: params.custom_drill_config!.drill_goal,
        target_type: params.custom_drill_config!.target_type || 'paper',
        distance_m: params.custom_drill_config!.distance_m,
        rounds_per_shooter: params.custom_drill_config!.rounds_per_shooter,
        time_limit_seconds: params.custom_drill_config!.time_limit_seconds ?? null,
        strings_count: params.custom_drill_config!.strings_count ?? null,
      }
    : null;

  // Direct insert for all sessions (RLS handles permissions)
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      team_id: params.team_id ?? null,
      training_id: params.training_id ?? null,
      drill_id: params.drill_id ?? null,
      drill_template_id: params.drill_template_id ?? null,
      custom_drill_config: customDrillConfig,
      session_mode: params.session_mode ?? 'solo',
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select(
      `
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      drill_template_id,
      custom_drill_config,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(*),
      drill_templates:drill_template_id(*)
    `
    )
    .single();

  if (error) throw error;
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
    status?: 'active' | 'completed' | 'cancelled';
    ended_at?: string;
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

  // Return a fully-hydrated session payload so callers don't lose drill context after updates.
  const { data, error } = await supabase
    .from('sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .select(
      `
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      drill_template_id,
      custom_drill_config,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(*),
      drill_templates:drill_template_id(*)
    `
    )
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
    status: 'completed',
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

  return updatedSession;
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
// DRILL-BOUND SESSION ENFORCEMENT (Client-side)
// ============================================================================

async function enforceDrillLimitsForNewTarget(params: { sessionId: string; targetType: TargetType; bulletsFired: number }) {
  const session = await getSessionById(params.sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const drill = session.drill_config;
  if (!drill) {
    return; // No drill = no drill limits
  }

  const { rounds, requiredTargets, requiredShots, isPaper, bulletsPerRound } = getDrillRequirements(drill);

  // Enforce target type matches drill type
  if (drill.target_type !== params.targetType) {
    throw new Error(`This drill requires ${drill.target_type} targets.`);
  }

  const stats = await calculateSessionStats(params.sessionId);

  const remainingTargets = requiredTargets - stats.targetCount;

  if (remainingTargets <= 0) {
    throw new Error(`Target limit reached (${requiredTargets}).`);
  }

  // Paper targets (scan):
  // - bulletsFired comes from AI detection (not user-entered).
  // - The scan can exceed any configured "max shots" (we track it, but don't block saving).
  if (params.targetType === 'paper') {
    return;
  }

  // Tactical targets (manual): strict bullet contract.
  const remainingShots = requiredShots - stats.totalShotsFired;

  if (remainingShots <= 0) {
    throw new Error(`Round limit reached (${requiredShots}).`);
  }

  if (params.bulletsFired > remainingShots) {
    throw new Error(`This target exceeds remaining rounds. Remaining: ${remainingShots}.`);
  }

  const expectedNext = remainingTargets === 1 ? remainingShots : bulletsPerRound;

  if (params.bulletsFired !== expectedNext) {
    throw new Error(`This drill expects ${expectedNext} bullets for the next round.`);
  }
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
}): Promise<SessionTargetWithResults> {
  console.log('[SessionService] addTargetWithPaperResult called');

  await enforceDrillLimitsForNewTarget({
    sessionId: params.session_id,
    targetType: 'paper',
    bulletsFired: params.bullets_fired,
  });

  // First create the target
  const target = await addSessionTarget({
    session_id: params.session_id,
    target_type: 'paper',
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
    targetType: 'tactical',
    bulletsFired: params.bullets_fired,
  });

  // First create the target
  const target = await addSessionTarget({
    session_id: params.session_id,
    target_type: 'tactical',
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
  durationMs?: number;
  distance?: number;
  completed?: boolean;
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
  
  // Get drill config for distance if not provided by watch
  const drill = session.drill_config;
  const distance = data.distance ?? drill?.distance_m ?? 0;
  
  // Create a tactical target entry with watch data
  // This allows the data to be picked up by normal stats calculation
  const target = await addSessionTarget({
    session_id: data.sessionId,
    target_type: 'tactical',
    distance_m: distance,
    notes: 'Recorded via Garmin watch',
    target_data: {
      source: 'garmin_watch',
      raw_data: data,
    },
  });
  
  // Calculate time in seconds from milliseconds
  const timeSeconds = data.durationMs ? data.durationMs / 1000 : null;
  
  // Save the tactical result
  // For watch data, we assume all shots are hits unless we have more info
  await saveTacticalTargetResult({
    session_target_id: target.id,
    bullets_fired: data.shotsRecorded,
    hits: data.shotsRecorded, // Assume all shots are hits from watch
    is_stage_cleared: data.completed ?? false,
    time_seconds: timeSeconds,
    notes: 'Watch session data',
  });
  
  console.log('[SessionService] Watch data saved as tactical target:', target.id);
  
  // End the session if requested
  if (shouldEnd) {
    const { endSession: endSessionFn } = await import('./mutations');
    return await endSessionFn(data.sessionId);
  }
  
  // Otherwise just return the current session
  return session;
}


