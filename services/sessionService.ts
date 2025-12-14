/**
 * SESSION SERVICE
 * Team-first architecture: Supports personal and team sessions
 */

import { supabase } from '@/lib/supabase';
import { notifySessionStarted } from './notifications';

export interface CreateSessionParams {
  team_id?: string | null;        // NULL for personal, UUID for team
  training_id?: string | null;    // Link session to a training
  drill_id?: string | null;       // Link session to a specific drill
  drill_template_id?: string | null; // NEW: For quick practice from template
  session_mode?: 'solo' | 'group';
}

/** Drill configuration embedded in session */
export interface SessionDrillConfig {
  id: string;
  name: string;
  drill_goal: 'grouping' | 'achievement';  // Primary: what the drill measures
  target_type: 'paper' | 'tactical';       // Secondary: input method hint
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number | null;
  par_time_seconds?: number | null;
  scoring_mode?: string | null;
  min_accuracy_percent?: number | null;
  target_count?: number | null;
  target_size?: string | null;
  shots_per_target?: number | null;
  position?: string | null;
  start_position?: string | null;
  weapon_category?: string | null;
  strings_count?: number | null;
  reload_required?: boolean | null;
  movement_type?: string | null;
  difficulty?: string | null;
  category?: string | null;
  instructions?: string | null;
  safety_notes?: string | null;
}

/** Aggregated session statistics (computed from targets) */
export interface SessionAggregatedStats {
  shots_fired: number;
  hits_total: number;
  accuracy_pct: number;
  target_count: number;
  best_dispersion_cm: number | null;
  avg_distance_m: number | null;
}

export interface SessionWithDetails {
  id: string;
  user_id: string;
  user_full_name?: string | null;
  team_id: string | null;
  team_name?: string | null;
  training_id: string | null;
  training_title?: string | null;
  drill_id: string | null;
  drill_name?: string | null;
  drill_config?: SessionDrillConfig | null; // Full drill configuration
  session_mode: 'solo' | 'group';
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at?: string;
  // Optional aggregated stats (populated when requested)
  stats?: SessionAggregatedStats;
}

function mapSession(row: any): SessionWithDetails {
  if (!row) {
    throw new Error('Session payload is empty');
  }

  const profiles = row.profiles ?? {};
  const teams = row.teams ?? {};
  const trainings = row.trainings ?? {};
  const drills = row.training_drills ?? {};
  const drillTemplate = row.drill_templates ?? {};

  // Build drill config from training_drills OR drill_templates (for quick practice)
  let drillConfig: SessionDrillConfig | null = null;
  
  // Priority: training_drills > drill_templates
  const drillSource = drills.id ? drills : (drillTemplate.id ? drillTemplate : null);
  
  if (drillSource) {
    drillConfig = {
      id: drillSource.id,
      name: drillSource.name,
      drill_goal: drillSource.drill_goal ?? 'achievement', // Default to achievement for backward compat
      target_type: drillSource.target_type,
      distance_m: drillSource.distance_m,
      rounds_per_shooter: drillSource.rounds_per_shooter,
      time_limit_seconds: drillSource.time_limit_seconds ?? null,
      par_time_seconds: drillSource.par_time_seconds ?? null,
      scoring_mode: drillSource.scoring_mode ?? null,
      min_accuracy_percent: drillSource.min_accuracy_percent ?? null,
      target_count: drillSource.target_count ?? null,
      target_size: drillSource.target_size ?? null,
      shots_per_target: drillSource.shots_per_target ?? null,
      position: drillSource.position ?? null,
      start_position: drillSource.start_position ?? null,
      weapon_category: drillSource.weapon_category ?? null,
      strings_count: drillSource.strings_count ?? null,
      reload_required: drillSource.reload_required ?? null,
      movement_type: drillSource.movement_type ?? null,
      difficulty: drillSource.difficulty ?? null,
      category: drillSource.category ?? null,
      instructions: drillSource.instructions ?? null,
      safety_notes: drillSource.safety_notes ?? null,
    };
  }

  // Determine drill name: prefer training_drills, then drill_templates
  const drillName = drills.name ?? drillTemplate.name ?? null;

  return {
    id: row.id,
    user_id: row.user_id,
    user_full_name: row.user_full_name ?? profiles.full_name ?? null,
    team_id: row.team_id ?? null,
    team_name: row.team_name ?? teams.name ?? null,
    training_id: row.training_id ?? null,
    training_title: row.training_title ?? trainings.title ?? null,
    drill_id: row.drill_id ?? null,
    drill_name: row.drill_name ?? drillName,
    drill_config: drillConfig,
    session_mode: row.session_mode,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

/**
 * Create a new session - supports both personal and org sessions
 * Can be linked to a training and/or drill
 * 
 * IMPORTANT: If joining a training, checks for existing active session first
 */
export async function createSession(params: CreateSessionParams): Promise<SessionWithDetails> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
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
      throw new Error(
        `You already have an active session for "${existingLabel}". End it before starting a different drill.`
      );
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

  // Direct insert for all sessions (RLS handles permissions)
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      team_id: params.team_id ?? null,
      training_id: params.training_id ?? null,
      drill_id: params.drill_id ?? null,
      drill_template_id: params.drill_template_id ?? null,
      session_mode: params.session_mode ?? 'solo',
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select(`
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      drill_template_id,
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
    `)
    .single();

  if (error) throw error;
  return mapSession(data);
}

/**
 * Start a quick practice session from a drill template
 * This is the primary way for soldiers to practice drills outside of scheduled trainings
 */
export async function startQuickPractice(drillTemplateId: string): Promise<SessionWithDetails> {
  const { data: { user } } = await supabase.auth.getUser();
  
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
 * Get user's active session for a specific training (if any)
 */
export async function getMyActiveSessionForTraining(trainingId: string): Promise<SessionWithDetails | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .eq('training_id', trainingId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  
  return mapSession(data);
}

/**
 * Get user's active session - checks for ANY active session
 */
export async function getMyActiveSession(): Promise<SessionWithDetails | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }
  
  return mapSession(data[0]);
}

/**
 * Get user's active PERSONAL session (no team)
 * Used to enforce 1 session limit in personal mode
 */
export async function getMyActivePersonalSession(): Promise<SessionWithDetails | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  console.log('[getMyActivePersonalSession] Checking for user:', user.id);

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .is('team_id', null)  // Personal sessions have no team
    .order('started_at', { ascending: false })
    .limit(1);

  if (error) {
    console.log('[getMyActivePersonalSession] Error:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    console.log('[getMyActivePersonalSession] No active personal session found');
    return null;
  }
  
  console.log('[getMyActivePersonalSession] Found active personal session:', data[0].id);
  return mapSession(data[0]);
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
  sendTrainingSessionNotifications(
    params.training_id,
    training.title,
    session.user_full_name || 'A member'
  ).catch(console.error);

  return session;
}

/**
 * Send notifications when a training session is started
 */
async function sendTrainingSessionNotifications(
  trainingId: string,
  trainingTitle: string,
  memberName: string
) {
  // Notify the user who started (local)
  await notifySessionStarted(trainingId);

  // Log for commanders/owners - actual push needs server-side
  console.log(`[Notification] ${memberName} started session in ${trainingTitle}`);

  // TODO: To notify commanders/owners, create Supabase Edge Function that:
  // 1. Gets team owner + commanders from team_members
  // 2. Gets their push tokens
  // 3. Sends push via Expo Push API
  // Example: await supabase.functions.invoke('notify-training-session', { body: { ... } })
}

/**
 * Get sessions - fetches all sessions accessible to the user
 * Includes both personal sessions and team sessions
 */
export async function getSessions(teamId?: string | null): Promise<SessionWithDetails[]> {
  let query = supabase
    .from('sessions')
    .select(`
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .order('started_at', { ascending: false });

  // Filter by team if provided
  if (teamId !== undefined) {
    if (teamId === null) {
      // Get personal sessions only
      query = query.is('team_id', null);
    } else {
      // Get team sessions only
      query = query.eq('team_id', teamId);
    }
  }
  // Otherwise, get ALL sessions (personal + team)

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * Get sessions with aggregated stats (for widgets/analytics)
 * This fetches sessions and computes stats from session_targets
 */
export async function getSessionsWithStats(teamId?: string | null): Promise<SessionWithDetails[]> {
  // First get all sessions
  const sessions = await getSessions(teamId);
  
  if (sessions.length === 0) return sessions;
  
  // Fetch aggregated stats for all sessions in one query
  const sessionIds = sessions.map(s => s.id);
  
  const { data: statsData, error: statsError } = await supabase
    .from('session_targets')
    .select(`
      session_id,
      distance_m,
      paper_target_results(
        bullets_fired,
        hits_total,
        dispersion_cm,
        scanned_image_url
      ),
      tactical_target_results(
        bullets_fired,
        hits
      )
    `)
    .in('session_id', sessionIds);
  
  if (statsError) {
    console.error('Failed to fetch session stats:', statsError);
    return sessions; // Return sessions without stats
  }
  
  // Aggregate stats per session
  // We track scanned vs manual separately for proper accuracy calculation
  const statsMap = new Map<string, SessionAggregatedStats & { 
    manual_shots: number; 
    manual_hits: number;
  }>();
  
  (statsData ?? []).forEach((target: any) => {
    const sessionId = target.session_id;
    if (!statsMap.has(sessionId)) {
      statsMap.set(sessionId, {
        shots_fired: 0,
        hits_total: 0,
        accuracy_pct: 0,
        target_count: 0,
        best_dispersion_cm: null,
        avg_distance_m: null,
        manual_shots: 0,
        manual_hits: 0,
      });
    }
    
    const stats = statsMap.get(sessionId)!;
    stats.target_count++;
    
    // Handle paper target results
    const paperResult = target.paper_target_results;
    if (paperResult) {
      const bullets = paperResult.bullets_fired ?? 0;
      stats.shots_fired += bullets;
      
      // Check if this is a scanned target (has scanned_image_url)
      const isScanned = !!paperResult.scanned_image_url;
      
      const hits = paperResult.hits_total ?? 0;
      
      // Always add hits to total for display purposes
      stats.hits_total += hits;
      
      // Track dispersion if available
      if (paperResult.dispersion_cm != null) {
        if (stats.best_dispersion_cm === null || paperResult.dispersion_cm < stats.best_dispersion_cm) {
          stats.best_dispersion_cm = paperResult.dispersion_cm;
        }
      }
      
      if (!isScanned) {
        // Only manual entry targets count towards accuracy calculation
        stats.manual_shots += bullets;
        stats.manual_hits += hits;
      }
      // Scanned targets: hits are shown but don't affect accuracy %
      // because dispersion (group size) is the primary metric
    }
    
    // Handle tactical target results (always manual, hits matter)
    const tacticalResult = target.tactical_target_results;
    if (tacticalResult) {
      const bullets = tacticalResult.bullets_fired ?? 0;
      const hits = tacticalResult.hits ?? 0;
      stats.shots_fired += bullets;
      stats.hits_total += hits;
      stats.manual_shots += bullets;
      stats.manual_hits += hits;
    }
    
    // Track distances for average
    if (target.distance_m) {
      const currentAvg = stats.avg_distance_m ?? 0;
      const count = stats.target_count;
      stats.avg_distance_m = ((currentAvg * (count - 1)) + target.distance_m) / count;
    }
  });
  
  // Calculate accuracy percentages (only from manual targets where hits matter)
  statsMap.forEach((stats) => {
    if (stats.manual_shots > 0) {
      stats.accuracy_pct = Math.round((stats.manual_hits / stats.manual_shots) * 100);
    }
  });
  
  // Attach stats to sessions (without the internal tracking fields)
  return sessions.map(session => {
    const rawStats = statsMap.get(session.id);
    return {
      ...session,
      stats: rawStats ? {
        shots_fired: rawStats.shots_fired,
        hits_total: rawStats.hits_total,
        accuracy_pct: rawStats.accuracy_pct,
        target_count: rawStats.target_count,
        best_dispersion_cm: rawStats.best_dispersion_cm,
        avg_distance_m: rawStats.avg_distance_m,
      } : {
        shots_fired: 0,
        hits_total: 0,
        accuracy_pct: 0,
        target_count: 0,
        best_dispersion_cm: null,
        avg_distance_m: null,
      },
    };
  });
}

/**
 * Get sessions for a specific training
 */
export async function getTrainingSessions(trainingId: string): Promise<SessionWithDetails[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .eq('training_id', trainingId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * @deprecated Use getTeamSessions instead
 */
export async function getWorkspaceSessions(teamId: string | null): Promise<SessionWithDetails[]> {
  return getSessions(teamId);
}

/**
 * Get sessions for a specific team
 */
export async function getTeamSessions(teamId: string): Promise<SessionWithDetails[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .eq('team_id', teamId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
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
  
  const { data, error } = await supabase
    .from('sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return mapSession(data);
}

/**
 * Delete (cancel) a session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

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

    const rounds = drill.strings_count && drill.strings_count > 0 ? drill.strings_count : 1;
    const requiredTargets = rounds;
    const requiredShots = drill.rounds_per_shooter * rounds;

    const meetsShotCount = stats.totalShotsFired >= requiredShots;
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Insert completion record
  const { error } = await supabase
    .from('user_drill_completions')
    .insert({
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
// SESSION TARGETS
// ============================================================================

export type TargetType = 'paper' | 'tactical';
export type PaperType = 'achievement' | 'grouping';
export type ParticipantRole = 'sniper' | 'spotter' | 'pistol' | 'observer' | 'instructor';

export interface SessionTarget {
  id: string;
  session_id: string;
  target_type: TargetType;
  sequence_in_session: number | null;
  distance_m: number | null;
  lane_number: number | null;
  planned_shots: number | null;
  notes: string | null;
  target_data: Record<string, any> | null;
}

export interface CreateTargetParams {
  session_id: string;
  target_type: TargetType;
  distance_m?: number | null;
  lane_number?: number | null;
  planned_shots?: number | null;
  notes?: string | null;
  target_data?: Record<string, any> | null;
}

// ============================================================================
// TARGET RESULTS
// ============================================================================

export interface PaperTargetResult {
  id: string;
  session_target_id: string;
  paper_type: PaperType;
  bullets_fired: number;
  hits_total: number | null;
  hits_inside_scoring: number | null;
  dispersion_cm: number | null;
  offset_right_cm: number | null;
  offset_up_cm: number | null;
  scanned_image_url: string | null;
  notes: string | null;
}

export interface TacticalTargetResult {
  id: string;
  session_target_id: string;
  bullets_fired: number;
  hits: number;
  is_stage_cleared: boolean;
  time_seconds: number | null;
  notes: string | null;
}

export interface CreatePaperResultParams {
  session_target_id: string;
  paper_type: PaperType;
  bullets_fired: number;
  hits_total?: number | null;
  hits_inside_scoring?: number | null;
  dispersion_cm?: number | null;
  offset_right_cm?: number | null;
  offset_up_cm?: number | null;
  scanned_image_url?: string | null;
  notes?: string | null;
}

export interface CreateTacticalResultParams {
  session_target_id: string;
  bullets_fired: number;
  hits: number;
  is_stage_cleared?: boolean;
  time_seconds?: number | null;
  notes?: string | null;
}

export interface SessionTargetWithResults extends SessionTarget {
  paper_result?: PaperTargetResult | null;
  tactical_result?: TacticalTargetResult | null;
}

/**
 * Get a single session by ID
 */
export async function getSessionById(sessionId: string): Promise<SessionWithDetails | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      trainings:training_id(title),
      training_drills:drill_id(
        id,
        name,
        drill_goal,
        target_type,
        distance_m,
        rounds_per_shooter,
        time_limit_seconds,
        par_time_seconds,
        scoring_mode,
        min_accuracy_percent,
        target_count,
        target_size,
        shots_per_target,
        position,
        start_position,
        weapon_category,
        strings_count,
        reload_required,
        movement_type,
        difficulty,
        category,
        instructions,
        safety_notes
      )
    `)
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return mapSession(data);
}

/**
 * Get all targets for a session
 */
export async function getSessionTargets(sessionId: string): Promise<SessionTarget[]> {
  const { data, error } = await supabase
    .from('session_targets')
    .select('*')
    .eq('session_id', sessionId)
    .order('sequence_in_session', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Add a target to a session
 */
export async function addSessionTarget(params: CreateTargetParams): Promise<SessionTarget> {
  // Get current target count for sequence
  const { count } = await supabase
    .from('session_targets')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', params.session_id);

  const sequence = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from('session_targets')
    .insert({
      session_id: params.session_id,
      target_type: params.target_type,
      distance_m: params.distance_m ?? null,
      lane_number: params.lane_number ?? null,
      planned_shots: params.planned_shots ?? null,
      sequence_in_session: sequence,
      notes: params.notes ?? null,
      target_data: params.target_data ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a target from a session
 */
export async function deleteSessionTarget(targetId: string): Promise<boolean> {
  const { error } = await supabase
    .from('session_targets')
    .delete()
    .eq('id', targetId);

  if (error) throw error;
  return true;
}

/**
 * Get session stats summary (quick counts)
 */
export async function getSessionSummary(sessionId: string): Promise<{
  targetCount: number;
  totalShots: number;
  totalHits: number;
}> {
  // Count targets
  const { count: targetCount } = await supabase
    .from('session_targets')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  // For now, return zeros for shots/hits until we implement results
  return {
    targetCount: targetCount ?? 0,
    totalShots: 0,
    totalHits: 0,
  };
}

// ============================================================================
// PAPER TARGET RESULTS
// ============================================================================

/**
 * Save paper target results (upsert)
 */
export async function savePaperTargetResult(params: CreatePaperResultParams): Promise<PaperTargetResult> {
  console.log('[SessionService] savePaperTargetResult called with:', {
    session_target_id: params.session_target_id,
    paper_type: params.paper_type,
    bullets_fired: params.bullets_fired,
    hits_total: params.hits_total,
  });
  
  // Check if result already exists for this target
  const { data: existing, error: existingError } = await supabase
    .from('paper_target_results')
    .select('id')
    .eq('session_target_id', params.session_target_id)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('[SessionService] Error checking existing result:', existingError);
  }

  if (existing) {
    console.log('[SessionService] Updating existing paper result:', existing.id);
    // Update existing result
    const { data, error } = await supabase
      .from('paper_target_results')
      .update({
        paper_type: params.paper_type,
        bullets_fired: params.bullets_fired,
        hits_total: params.hits_total ?? null,
        hits_inside_scoring: params.hits_inside_scoring ?? null,
        dispersion_cm: params.dispersion_cm ?? null,
        offset_right_cm: params.offset_right_cm ?? null,
        offset_up_cm: params.offset_up_cm ?? null,
        scanned_image_url: params.scanned_image_url ?? null,
        notes: params.notes ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[SessionService] Error updating paper result:', error);
      throw error;
    }
    console.log('[SessionService] Paper result updated:', data.id);
    return data;
  }

  console.log('[SessionService] Inserting new paper result');
  // Insert new result
  const { data, error } = await supabase
    .from('paper_target_results')
    .insert({
      session_target_id: params.session_target_id,
      paper_type: params.paper_type,
      bullets_fired: params.bullets_fired,
      hits_total: params.hits_total ?? null,
      hits_inside_scoring: params.hits_inside_scoring ?? null,
      dispersion_cm: params.dispersion_cm ?? null,
      offset_right_cm: params.offset_right_cm ?? null,
      offset_up_cm: params.offset_up_cm ?? null,
      scanned_image_url: params.scanned_image_url ?? null,
      notes: params.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[SessionService] Error inserting paper result:', error);
    throw error;
  }
  console.log('[SessionService] Paper result inserted:', data.id);
  return data;
}

/**
 * Get paper target result by target ID
 */
export async function getPaperTargetResult(sessionTargetId: string): Promise<PaperTargetResult | null> {
  const { data, error } = await supabase
    .from('paper_target_results')
    .select('*')
    .eq('session_target_id', sessionTargetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

// ============================================================================
// TACTICAL TARGET RESULTS
// ============================================================================

/**
 * Save tactical target results (upsert)
 */
export async function saveTacticalTargetResult(params: CreateTacticalResultParams): Promise<TacticalTargetResult> {
  // Check if result already exists for this target
  const { data: existing } = await supabase
    .from('tactical_target_results')
    .select('id')
    .eq('session_target_id', params.session_target_id)
    .single();

  if (existing) {
    // Update existing result
    const { data, error } = await supabase
      .from('tactical_target_results')
      .update({
        bullets_fired: params.bullets_fired,
        hits: params.hits,
        is_stage_cleared: params.is_stage_cleared ?? false,
        time_seconds: params.time_seconds ?? null,
        notes: params.notes ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Insert new result
  const { data, error } = await supabase
    .from('tactical_target_results')
    .insert({
      session_target_id: params.session_target_id,
      bullets_fired: params.bullets_fired,
      hits: params.hits,
      is_stage_cleared: params.is_stage_cleared ?? false,
      time_seconds: params.time_seconds ?? null,
      notes: params.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get tactical target result by target ID
 */
export async function getTacticalTargetResult(sessionTargetId: string): Promise<TacticalTargetResult | null> {
  const { data, error } = await supabase
    .from('tactical_target_results')
    .select('*')
    .eq('session_target_id', sessionTargetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

// ============================================================================
// TARGETS WITH RESULTS
// ============================================================================

/**
 * Get all targets for a session with their results
 */
export async function getSessionTargetsWithResults(sessionId: string): Promise<SessionTargetWithResults[]> {
  const { data: targets, error } = await supabase
    .from('session_targets')
    .select(`
      *,
      paper_target_results(*),
      tactical_target_results(*)
    `)
    .eq('session_id', sessionId)
    .order('sequence_in_session', { ascending: true });

  if (error) throw error;

  return (targets ?? []).map((t: any) => {
    // Handle both array and object results (depends on Supabase relation type)
    // One-to-one relations return object, one-to-many return array
    const paperResult = Array.isArray(t.paper_target_results) 
      ? t.paper_target_results[0] 
      : t.paper_target_results;
    const tacticalResult = Array.isArray(t.tactical_target_results) 
      ? t.tactical_target_results[0] 
      : t.tactical_target_results;
    
    return {
      id: t.id,
      session_id: t.session_id,
      target_type: t.target_type,
      sequence_in_session: t.sequence_in_session,
      distance_m: t.distance_m,
      lane_number: t.lane_number,
      planned_shots: t.planned_shots,
      notes: t.notes,
      target_data: t.target_data,
      paper_result: paperResult ?? null,
      tactical_result: tacticalResult ?? null,
    };
  });
}

/**
 * Get a single target with its results
 */
export async function getTargetWithResults(targetId: string): Promise<SessionTargetWithResults | null> {
  const { data: target, error } = await supabase
    .from('session_targets')
    .select(`
      *,
      paper_target_results(*),
      tactical_target_results(*)
    `)
    .eq('id', targetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Handle both array and object results
  const paperResult = Array.isArray(target.paper_target_results) 
    ? target.paper_target_results[0] 
    : target.paper_target_results;
  const tacticalResult = Array.isArray(target.tactical_target_results) 
    ? target.tactical_target_results[0] 
    : target.tactical_target_results;

  return {
    id: target.id,
    session_id: target.session_id,
    target_type: target.target_type,
    sequence_in_session: target.sequence_in_session,
    distance_m: target.distance_m,
    lane_number: target.lane_number,
    planned_shots: target.planned_shots,
    notes: target.notes,
    target_data: target.target_data,
    paper_result: paperResult ?? null,
    tactical_result: tacticalResult ?? null,
  };
}

/**
 * Update a session target
 */
export async function updateSessionTarget(
  targetId: string,
  updates: Partial<Pick<SessionTarget, 'distance_m' | 'lane_number' | 'planned_shots' | 'notes' | 'target_data'>>
): Promise<SessionTarget> {
  const { data, error } = await supabase
    .from('session_targets')
    .update(updates)
    .eq('id', targetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// SESSION STATS (Computed)
// ============================================================================

export interface SessionStats {
  targetCount: number;
  paperTargets: number;
  tacticalTargets: number;
  totalShotsFired: number;
  totalHits: number;
  accuracyPct: number;
  avgDispersionCm: number | null;
  bestDispersionCm: number | null;
  stagesCleared: number;
  avgEngagementTimeSec: number | null;
  fastestEngagementTimeSec: number | null;
}

/**
 * Calculate comprehensive session stats from targets and results
 * 
 * IMPORTANT: 
 * - Grouping targets (paper_type='grouping') measure consistency/dispersion only
 * - Achievement targets (paper_type='achievement') count towards accuracy calculations
 * - Tactical targets always count towards accuracy
 */
export async function calculateSessionStats(sessionId: string): Promise<SessionStats> {
  const targets = await getSessionTargetsWithResults(sessionId);

  let paperTargets = 0;
  let tacticalTargets = 0;
  let totalShotsFired = 0;
  let totalHits = 0;
  let achievementShotsFired = 0;  // Only shots from achievement targets (for accuracy)
  let achievementHits = 0;        // Only hits from achievement targets (for accuracy)
  let totalDispersion = 0;
  let dispersionCount = 0;
  let bestDispersion: number | null = null;
  let stagesCleared = 0;
  let totalEngagementTime = 0;
  let engagementTimeCount = 0;
  let fastestEngagement: number | null = null;

  for (const target of targets) {
    if (target.target_type === 'paper') {
      paperTargets++;
      if (target.paper_result) {
        const bullets = target.paper_result.bullets_fired;
        totalShotsFired += bullets;
        
        // Check paper_type to determine if this is achievement or grouping
        const isAchievementTarget = target.paper_result.paper_type === 'achievement';
        
        const hits = target.paper_result.hits_total ?? 0;
        
        // Always add hits to total for display purposes
        totalHits += hits;
        
        // Track dispersion if available (applies to both grouping and achievement)
        if (target.paper_result.dispersion_cm != null) {
          totalDispersion += target.paper_result.dispersion_cm;
          dispersionCount++;
          if (bestDispersion === null || target.paper_result.dispersion_cm < bestDispersion) {
            bestDispersion = target.paper_result.dispersion_cm;
          }
        }
        
        if (isAchievementTarget) {
          // Only achievement targets count towards accuracy calculation
          achievementShotsFired += bullets;
          achievementHits += hits;
        }
        // Grouping targets: only track dispersion, no accuracy calculation
      }
    } else if (target.target_type === 'tactical') {
      tacticalTargets++;
      if (target.tactical_result) {
        const bullets = target.tactical_result.bullets_fired;
        const hits = target.tactical_result.hits;
        totalShotsFired += bullets;
        totalHits += hits;
        // Tactical targets always count towards accuracy
        achievementShotsFired += bullets;
        achievementHits += hits;
        
        if (target.tactical_result.is_stage_cleared) {
          stagesCleared++;
        }
        
        if (target.tactical_result.time_seconds != null) {
          totalEngagementTime += target.tactical_result.time_seconds;
          engagementTimeCount++;
          if (fastestEngagement === null || target.tactical_result.time_seconds < fastestEngagement) {
            fastestEngagement = target.tactical_result.time_seconds;
          }
        }
      }
    }
  }

  // Calculate accuracy only from achievement/tactical targets (not grouping)
  const accuracyPct = achievementShotsFired > 0 
    ? Math.round((achievementHits / achievementShotsFired) * 100 * 100) / 100 
    : 0;

  const avgDispersionCm = dispersionCount > 0 
    ? Math.round((totalDispersion / dispersionCount) * 100) / 100 
    : null;

  const avgEngagementTimeSec = engagementTimeCount > 0 
    ? Math.round((totalEngagementTime / engagementTimeCount) * 100) / 100 
    : null;

  return {
    targetCount: targets.length,
    paperTargets,
    tacticalTargets,
    totalShotsFired,
    totalHits,
    accuracyPct,
    avgDispersionCm,
    bestDispersionCm: bestDispersion,
    stagesCleared,
    avgEngagementTimeSec,
    fastestEngagementTimeSec: fastestEngagement,
  };
}

// ============================================================================
// DRILL-BOUND SESSION ENFORCEMENT (Client-side)
// ============================================================================

async function enforceDrillLimitsForNewTarget(params: {
  sessionId: string;
  targetType: TargetType;
  bulletsFired: number;
}) {
  const session = await getSessionById(params.sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const drill = session.drill_config;
  if (!drill) {
    return; // No drill = no drill limits
  }

  // Enforce target type matches drill type
  if (drill.target_type !== params.targetType) {
    throw new Error(`This drill requires ${drill.target_type} targets.`);
  }

  const stats = await calculateSessionStats(params.sessionId);

  const rounds = drill.strings_count && drill.strings_count > 0 ? drill.strings_count : 1;
  const bulletsPerRound = drill.rounds_per_shooter;

  // Contract: user must log exactly `rounds` entries, each with `bulletsPerRound` bullets.
  const requiredTargets = rounds;
  const requiredShots = bulletsPerRound * rounds;

  const remainingTargets = requiredTargets - stats.targetCount;
  const remainingShots = requiredShots - stats.totalShotsFired;

  if (remainingTargets <= 0) {
    throw new Error(`Target limit reached (${requiredTargets}).`);
  }

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