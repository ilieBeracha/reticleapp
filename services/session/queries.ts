import { SESSION_STATUS } from '@/constants/session';
import { withQueryTiming } from '@/services/_shared/instrumentation';
import { supabase } from '@/services/supabase';
import type { DashboardFeature } from '@/types/insights';
import type { SessionAggregatedStats, SessionWithDetails } from '@/types/session';
import { mapSession } from './mappers';
import {
  SESSION_SELECT_MINIMAL,
  SESSION_SELECT_WITH_FULL_DRILL,
  SESSION_SELECT_WITH_WEAPON,
  TARGET_STATS_SELECT,
} from './selectClauses';

// ============================================================================
// DRILL QUERIES
// ============================================================================

export interface TrainingDrillData {
  id: string;
  name: string;
  drill_goal: string;
  target_type: string;
  execution_policy: string | null;
  engagement_mode: string | null;
  distance_m: number | null;
  distance_category: string | null;
  rounds_per_shooter: number | null;
  position: string | null;
  time_limit_seconds: number | null;
  max_executions: number | null;
}

/**
 * Get a training drill by ID
 */
export async function getTrainingDrill(drillId: string): Promise<TrainingDrillData | null> {
  const { data, error } = await supabase
    .from('training_drills')
    .select(
      'id, name, drill_goal, target_type, execution_policy, engagement_mode, distance_m, distance_category, rounds_per_shooter, position, time_limit_seconds, max_executions'
    )
    .eq('id', drillId)
    .single();

  if (error) {
    console.error('[getTrainingDrill] Failed to fetch drill:', error);
    return null;
  }
  return data;
}

// ============================================================================
// ENGAGEMENT QUERIES
// ============================================================================

export interface ActiveEngagement {
  id: string;
  session_id: string;
  status: string;
  engagement_mode: string;
  started_at: string | null;
  shooter_id: string;
}

/**
 * Get active squad/group engagement for a training
 */
export async function getActiveSquadEngagement(trainingId: string): Promise<ActiveEngagement | null> {
  const { data, error } = await supabase
    .from('engagements')
    .select('id, session_id, status, engagement_mode, started_at, shooter_id')
    .eq('training_id', trainingId)
    .in('engagement_mode', ['squad', 'group'])
    .not('status', 'in', '("completed","cancelled")')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[getActiveSquadEngagement] Error:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Check if user is a participant in an engagement
 */
export async function checkUserParticipation(
  engagementId: string,
  userId: string
): Promise<{ isParticipant: boolean; state: string | null }> {
  const { data, error } = await supabase
    .from('engagement_participants')
    .select('id, state')
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[checkUserParticipation] Error:', error);
    return { isParticipant: false, state: null };
  }

  return {
    isParticipant: !!data && data.state === 'joined',
    state: data?.state ?? null,
  };
}

// ============================================================================
// WEAPON QUERIES
// ============================================================================

/**
 * Get user's most recently used weapon ID
 */
export async function getUserDefaultWeaponId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_weapons')
    .select('id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[getUserDefaultWeaponId] Error:', error);
    return null;
  }

  return data && data.length > 0 ? data[0].id : null;
}

/**
 * Get user's active session for a specific training (if any)
 * @param trainingId - The training ID to check
 * @param userId - Optional pre-fetched user ID to avoid redundant auth calls
 */
export async function getMyActiveSessionForTraining(
  trainingId: string,
  userId?: string
): Promise<SessionWithDetails | null> {
  // Use provided userId or fetch from auth (for backward compatibility)
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    effectiveUserId = user?.id;
  }

  if (!effectiveUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT_WITH_WEAPON)

    .eq('training_id', trainingId)
    .eq('user_id', effectiveUserId)
    .eq('status', SESSION_STATUS.ACTIVE)
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT_WITH_WEAPON)
    .eq('user_id', user.id)
    .eq('status', SESSION_STATUS.ACTIVE)
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  console.log('[getMyActivePersonalSession] Checking for user:', user.id);

  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT_WITH_WEAPON)
    .eq('user_id', user.id)
    .eq('status', SESSION_STATUS.ACTIVE)
    .is('team_id', null) // Personal sessions have no team
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
 * Get ALL active sessions for the current user (not just the most recent).
 * Used for orphan detection and single-session enforcement.
 * @param userId - Optional pre-fetched user ID to avoid redundant auth calls
 */
export async function getMyActiveSessionsAll(userId?: string): Promise<SessionWithDetails[]> {
  // Use provided userId or fetch from auth (for backward compatibility)
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    effectiveUserId = user?.id;
  }

  if (!effectiveUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT_WITH_WEAPON)
    .eq('user_id', effectiveUserId)
    .eq('status', SESSION_STATUS.ACTIVE)
    .order('started_at', { ascending: false });

  if (error || !data) {
    console.error('[getMyActiveSessionsAll] Error:', error);
    return [];
  }

  return data.map(mapSession);
}

// ============================================================================
// STALE SESSION DETECTION
// ============================================================================

/** Threshold in hours after which a session is considered stale */
export const STALE_SESSION_THRESHOLD_HOURS = 2;

/** Threshold in hours after which a session should be auto-cancelled */
export const AUTO_CANCEL_THRESHOLD_HOURS = 24;

/**
 * Check if a session is stale (no activity for > threshold hours).
 * Uses started_at as the activity timestamp since we don't have last_activity_at yet.
 */
export function isSessionStale(session: SessionWithDetails): boolean {
  const lastActivity = session.started_at;
  if (!lastActivity) return false;

  const hoursElapsed = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
  return hoursElapsed > STALE_SESSION_THRESHOLD_HOURS;
}

/**
 * Check if a session is extremely old and should be auto-cancelled.
 */
export function shouldAutoCancelSession(session: SessionWithDetails): boolean {
  const startedAt = session.started_at;
  if (!startedAt) return false;

  const hoursElapsed = (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
  return hoursElapsed > AUTO_CANCEL_THRESHOLD_HOURS;
}

/**
 * Get the age of a session in a human-readable format.
 */
export function getSessionAge(session: SessionWithDetails): string {
  const startedAt = session.started_at;
  if (!startedAt) return 'unknown';

  const ms = Date.now() - new Date(startedAt).getTime();
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/**
 * Get sessions - fetches all sessions accessible to the user
 * Includes both personal sessions and team sessions
 */
export async function getSessions(teamId?: string | null): Promise<SessionWithDetails[]> {
  let query = supabase.from('sessions').select(SESSION_SELECT_WITH_WEAPON).order('started_at', { ascending: false });

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
 * Get sessions (bounded) - recommended for all list UIs.
 * Uses simple offset pagination via `range` (PostgREST).
 *
 * @param options.teamId - Optional team filter (null = personal only, undefined = all)
 * @param options.limit - Page size (default: 50)
 * @param options.offset - Offset (default: 0)
 */
export async function getSessionsPage(
  options: {
    teamId?: string | null;
    limit?: number;
    offset?: number;
  } = {}
): Promise<SessionWithDetails[]> {
  return withQueryTiming('sessions.getSessionsPage', async () => {
    const { teamId, limit = 50, offset = 0 } = options;

    let query = supabase
      .from('sessions')
      .select(SESSION_SELECT_MINIMAL)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (teamId !== undefined) {
      if (teamId === null) query = query.is('team_id', null);
      else query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapSession);
  });
}

/**
 * Get team sessions (bounded) - recommended for team sessions list UIs.
 */
export async function getTeamSessionsPage(teamId: string, options: { limit?: number; offset?: number } = {}) {
  return getSessionsPage({ teamId, limit: options.limit, offset: options.offset });
}

/**
 * Get sessions with aggregated stats (for widgets/analytics)
 * This fetches sessions and computes stats from session_targets
 */
export async function getSessionsWithStats(teamId?: string | null): Promise<SessionWithDetails[]> {
  // NOTE: This API is expensive and was historically unbounded.
  // Prefer `getRecentSessionsWithStats({ days, limit, teamId })` for UI lists/widgets.
  // First get all sessions
  const sessions = await getSessions(teamId);

  if (sessions.length === 0) return sessions;

  // Fetch aggregated stats for all sessions in one query
  const sessionIds = sessions.map((s) => s.id);

  const { data: statsData, error: statsError } = await supabase
    .from('session_targets')
    .select(TARGET_STATS_SELECT)
    .in('session_id', sessionIds);

  if (statsError) {
    console.error('Failed to fetch session stats:', statsError);
    return sessions; // Return sessions without stats
  }

  // Aggregate stats per session
  // We track scanned vs manual separately for proper accuracy calculation
  const statsMap = new Map<
    string,
    SessionAggregatedStats & {
      manual_shots: number;
      manual_hits: number;
    }
  >();

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
      stats.avg_distance_m = (currentAvg * (count - 1) + target.distance_m) / count;
    }
  });

  // Calculate accuracy percentages (only from manual targets where hits matter)
  statsMap.forEach((stats) => {
    if (stats.manual_shots > 0) {
      stats.accuracy_pct = Math.round((stats.manual_hits / stats.manual_shots) * 100);
    }
  });

  // Attach stats to sessions (without the internal tracking fields)
  return sessions.map((session) => {
    const rawStats = statsMap.get(session.id);
    return {
      ...session,
      stats: rawStats
        ? {
            shots_fired: rawStats.shots_fired,
            hits_total: rawStats.hits_total,
            accuracy_pct: rawStats.accuracy_pct,
            target_count: rawStats.target_count,
            best_dispersion_cm: rawStats.best_dispersion_cm,
            avg_distance_m: rawStats.avg_distance_m,
          }
        : {
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
 * Get recent sessions with aggregated stats - OPTIMIZED for home page
 * Filters at SQL level for better performance
 *
 * @param options.days - Number of days to look back (default: 7)
 * @param options.limit - Maximum number of sessions to return (default: 20)
 * @param options.teamId - Optional team filter (null = personal only, undefined = all)
 */
export async function getRecentSessionsWithStats(
  options: {
    days?: number;
    limit?: number;
    teamId?: string | null;
  } = {}
): Promise<SessionWithDetails[]> {
  return withQueryTiming('sessions.getRecentSessionsWithStats', async () => {
    const { days = 7, limit = 20, teamId } = options;

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateThresholdISO = dateThreshold.toISOString();

    // Build base query with date filter
    // Use SESSION_SELECT_WITH_WEAPON to include weapon info for filtering
    let query = supabase
      .from('sessions')
      .select(SESSION_SELECT_WITH_WEAPON)
      .or(`started_at.gte.${dateThresholdISO},status.eq.active`)
      .order('started_at', { ascending: false })
      .limit(limit);

    // Filter by team if provided
    if (teamId !== undefined) {
      if (teamId === null) {
        query = query.is('team_id', null);
      } else {
        query = query.eq('team_id', teamId);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    const sessions = (data ?? []).map(mapSession);

    if (sessions.length === 0) return sessions;

    // Fetch aggregated stats for all sessions in one query
    const sessionIds = sessions.map((s) => s.id);

    const { data: statsData, error: statsError } = await supabase
      .from('session_targets')
      .select(TARGET_STATS_SELECT)
      .in('session_id', sessionIds);

    if (statsError) {
      console.error('Failed to fetch session stats:', statsError);
      return sessions;
    }

    // Aggregate stats per session
    const statsMap = new Map<
      string,
      SessionAggregatedStats & {
        manual_shots: number;
        manual_hits: number;
      }
    >();

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

      const paperResult = target.paper_target_results;
      if (paperResult) {
        const bullets = paperResult.bullets_fired ?? 0;
        stats.shots_fired += bullets;

        const isScanned = !!paperResult.scanned_image_url;
        const hits = paperResult.hits_total ?? 0;
        stats.hits_total += hits;

        if (paperResult.dispersion_cm != null) {
          if (stats.best_dispersion_cm === null || paperResult.dispersion_cm < stats.best_dispersion_cm) {
            stats.best_dispersion_cm = paperResult.dispersion_cm;
          }
        }

        if (!isScanned) {
          stats.manual_shots += bullets;
          stats.manual_hits += hits;
        }
      }

      const tacticalResult = target.tactical_target_results;
      if (tacticalResult) {
        const bullets = tacticalResult.bullets_fired ?? 0;
        const hits = tacticalResult.hits ?? 0;
        stats.shots_fired += bullets;
        stats.hits_total += hits;
        stats.manual_shots += bullets;
        stats.manual_hits += hits;
      }

      if (target.distance_m) {
        const currentAvg = stats.avg_distance_m ?? 0;
        const count = stats.target_count;
        stats.avg_distance_m = (currentAvg * (count - 1) + target.distance_m) / count;
      }
    });

    // Calculate accuracy percentages
    statsMap.forEach((stats) => {
      if (stats.manual_shots > 0) {
        stats.accuracy_pct = Math.round((stats.manual_hits / stats.manual_shots) * 100);
      }
    });

    // Attach stats to sessions
    return sessions.map((session) => {
      const rawStats = statsMap.get(session.id);

      // For squad/group engagements, calculate stats from participants
      const engagement = session.engagement;
      const isSquadOrGroup = engagement?.engagement_mode === 'squad' || engagement?.engagement_mode === 'group';

      if (isSquadOrGroup && engagement?.engagement_participants) {
        const participants = engagement.engagement_participants;
        const joinedParticipants = participants.filter((p: any) => p.state === 'joined');

        // Aggregate participant stats
        let totalShots = 0;
        let totalHits = 0;
        joinedParticipants.forEach((p: any) => {
          totalShots += p.shots_fired ?? 0;
          totalHits += p.hits ?? 0;
        });

        return {
          ...session,
          stats: {
            shots_fired: totalShots,
            hits_total: totalHits,
            accuracy_pct: totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0,
            target_count: joinedParticipants.length, // Use participant count as "target count" for display
            best_dispersion_cm: null, // Not applicable for squad sessions
            avg_distance_m: session.drill_config?.distance_m ?? null,
            // Custom squad stats
            participant_count: joinedParticipants.length,
          } as any,
        };
      }

      return {
        ...session,
        stats: rawStats
          ? {
              shots_fired: rawStats.shots_fired,
              hits_total: rawStats.hits_total,
              accuracy_pct: rawStats.accuracy_pct,
              target_count: rawStats.target_count,
              best_dispersion_cm: rawStats.best_dispersion_cm,
              avg_distance_m: rawStats.avg_distance_m,
            }
          : {
              shots_fired: 0,
              hits_total: 0,
              accuracy_pct: 0,
              target_count: 0,
              best_dispersion_cm: null,
              avg_distance_m: null,
            },
      };
    });
  });
}

/**
 * Get lightweight dashboard features from session_features table.
 * Single-table query, no joins — used by InsightsDashboard for fast rendering.
 */
export async function getDashboardFeatures(options: {
  userId: string;
  days?: number;
  limit?: number;
}): Promise<DashboardFeature[]> {
  return withQueryTiming('sessions.getDashboardFeatures', async () => {
    const { userId, days = 365, limit = 500 } = options;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateThresholdISO = dateThreshold.toISOString();

    const { data, error } = await supabase
      .from('session_features')
      .select(
        `session_id,
        user_id,
        team_id,
        created_at,
        shots,
        hits,
        accuracy_pct,
        best_grouping_cm,
        distance_m,
        position,
        weapon_id,
        weapon_category,
        drill_goal,
        target_type,
        is_timed,
        has_weather,
        weather_wind_speed_mps`
      )
      .eq('user_id', userId)
      .gte('created_at', dateThresholdISO)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      session_id: row.session_id,
      user_id: row.user_id,
      team_id: row.team_id ?? null,
      created_at: row.created_at,
      shots: row.shots ?? 0,
      hits: row.hits ?? 0,
      accuracy_pct: row.accuracy_pct ?? null,
      best_grouping_cm: row.best_grouping_cm ?? null,
      distance_m: row.distance_m ?? null,
      position: row.position ?? null,
      weapon_id: row.weapon_id ?? null,
      weapon_category: row.weapon_category ?? null,
      drill_goal: row.drill_goal ?? null,
      target_type: row.target_type ?? null,
      is_timed: row.is_timed ?? false,
      has_weather: row.has_weather ?? false,
      weather_wind_speed_mps: row.weather_wind_speed_mps ?? null,
    }));
  });
}

/**
 * Get sessions for a specific training
 */
export async function getTrainingSessions(trainingId: string): Promise<SessionWithDetails[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT_WITH_WEAPON)
    .eq('training_id', trainingId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * Get all sessions for a training with aggregated stats
 * Used by commanders to view team progress during a training
 */
export async function getTrainingSessionsWithStats(trainingId: string): Promise<SessionWithDetails[]> {
  return withQueryTiming('sessions.getTrainingSessionsWithStats', async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select(SESSION_SELECT_MINIMAL)
      .eq('training_id', trainingId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    const sessions = (data ?? []).map(mapSession);

    if (sessions.length === 0) return sessions;

    // Fetch aggregated stats for all sessions in one query
    const sessionIds = sessions.map((s) => s.id);

    const { data: statsData, error: statsError } = await supabase
      .from('session_targets')
      .select(TARGET_STATS_SELECT)
      .in('session_id', sessionIds);

    if (statsError) {
      console.error('Failed to fetch training session stats:', statsError);
      return sessions;
    }

    // Aggregate stats per session
    const statsMap = new Map<
      string,
      SessionAggregatedStats & {
        manual_shots: number;
        manual_hits: number;
      }
    >();

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

      // Handle paper_target_results (could be array or object from Supabase)
      const paperResults = Array.isArray(target.paper_target_results)
        ? target.paper_target_results
        : target.paper_target_results
          ? [target.paper_target_results]
          : [];

      for (const paperResult of paperResults) {
        const bullets = paperResult.bullets_fired ?? 0;
        stats.shots_fired += bullets;

        const isScanned = !!paperResult.scanned_image_url;
        const hits = paperResult.hits_total ?? 0;
        stats.hits_total += hits;

        if (paperResult.dispersion_cm != null) {
          if (stats.best_dispersion_cm === null || paperResult.dispersion_cm < stats.best_dispersion_cm) {
            stats.best_dispersion_cm = paperResult.dispersion_cm;
          }
        }

        if (!isScanned) {
          stats.manual_shots += bullets;
          stats.manual_hits += hits;
        }
      }

      // Handle tactical_target_results (could be array or object from Supabase)
      const tacticalResults = Array.isArray(target.tactical_target_results)
        ? target.tactical_target_results
        : target.tactical_target_results
          ? [target.tactical_target_results]
          : [];

      for (const tacticalResult of tacticalResults) {
        const bullets = tacticalResult.bullets_fired ?? 0;
        const hits = tacticalResult.hits ?? 0;
        stats.shots_fired += bullets;
        stats.hits_total += hits;
        stats.manual_shots += bullets;
        stats.manual_hits += hits;
      }

      if (target.distance_m) {
        const currentAvg = stats.avg_distance_m ?? 0;
        const count = stats.target_count;
        stats.avg_distance_m = (currentAvg * (count - 1) + target.distance_m) / count;
      }
    });

    // Calculate accuracy percentages
    statsMap.forEach((stats) => {
      if (stats.manual_shots > 0) {
        stats.accuracy_pct = Math.round((stats.manual_hits / stats.manual_shots) * 100);
      }
    });

    // Attach stats to sessions
    return sessions.map((session) => {
      const rawStats = statsMap.get(session.id);
      return {
        ...session,
        stats: rawStats
          ? {
              shots_fired: rawStats.shots_fired,
              hits_total: rawStats.hits_total,
              accuracy_pct: rawStats.accuracy_pct,
              target_count: rawStats.target_count,
              best_dispersion_cm: rawStats.best_dispersion_cm,
              avg_distance_m: rawStats.avg_distance_m,
            }
          : {
              shots_fired: 0,
              hits_total: 0,
              accuracy_pct: 0,
              target_count: 0,
              best_dispersion_cm: null,
              avg_distance_m: null,
            },
      };
    });
  });
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
    .select(SESSION_SELECT_WITH_WEAPON)
    .eq('team_id', teamId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * Get a single session by ID
 */
export async function getSessionById(sessionId: string): Promise<SessionWithDetails | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT_WITH_FULL_DRILL)
    .eq('id', sessionId)
    .single();

  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((error as any).code === 'PGRST116') return null; // Not found
    throw error;
  }
  return mapSession(data);
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
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  // For now, return zeros for shots/hits until we implement results
  return {
    targetCount: targetCount ?? 0,
    totalShots: 0,
    totalHits: 0,
  };
}

/**
 * Fetch paper scans for the current user (bounded).
 * Used by `app/(protected)/scans.tsx`.
 *
 * NOTE: We intentionally keep this as a 2-step query (sessions -> targets) for safety,
 * because it doesn't require relying on PostgREST join syntax/foreign key naming.
 */
export async function getMyRecentPaperScans(
  options: {
    sessionLimit?: number;
    targetLimit?: number;
  } = {}
): Promise<
  Array<{
    id: string;
    session_id: string;
    scanned_image_url: string | null;
    distance_m: number | null;
    lane_number: number | null;
    notes: string | null;
    bullets_fired: number | null;
    hits_inside_scoring: number | null;
    dispersion_cm: number | null;
  }>
> {
  return withQueryTiming('sessions.getMyRecentPaperScans', async () => {
    const { sessionLimit = 200, targetLimit = 100 } = options;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    // Step 1: only fetch a bounded number of recent sessions for this user.
    // (This prevents a huge `.in(session_id, ...)` list.)
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(sessionLimit);

    if (sessionsError) throw sessionsError;
    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map((s: any) => s.id);

    // Step 2: fetch paper targets + paper result summary fields (bounded).
    const { data: targets, error: targetsError } = await supabase
      .from('session_targets')
      .select(
        `
      id,
      session_id,
      target_type,
      distance_m,
      lane_number,
      notes,
      paper_target_results(
        bullets_fired,
        hits_inside_scoring,
        scanned_image_url,
        dispersion_cm
      )
    `
      )
      .in('session_id', sessionIds)
      .eq('target_type', 'paper')
      .order('created_at', { ascending: false })
      .limit(targetLimit);

    if (targetsError) throw targetsError;

    return (targets ?? []).map((t: any) => {
      const paperResult = Array.isArray(t.paper_target_results) ? t.paper_target_results[0] : t.paper_target_results;
      return {
        id: t.id,
        session_id: t.session_id,
        scanned_image_url: paperResult?.scanned_image_url ?? null,
        distance_m: t.distance_m ?? null,
        lane_number: t.lane_number ?? null,
        notes: t.notes ?? null,
        bullets_fired: paperResult?.bullets_fired ?? null,
        hits_inside_scoring: paperResult?.hits_inside_scoring ?? null,
        dispersion_cm: paperResult?.dispersion_cm ?? null,
      };
    });
  });
}

// ============================================================================
// DRILL EXECUTION QUERIES
// ============================================================================

/**
 * Count how many times a user has completed a specific drill in a training.
 */
export async function getCompletedDrillExecutionCount(
  userId: string,
  drillId: string,
  trainingId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('drill_id', drillId)
    .eq('training_id', trainingId)
    .eq('status', 'completed');

  if (error) {
    console.error('[queries] getCompletedDrillExecutionCount error:', error);
    throw error;
  }

  return count ?? 0;
}

/**
 * Count total targets in a session.
 */
export async function getSessionTargetCount(sessionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('session_targets')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (error) {
    console.error('[queries] getSessionTargetCount error:', error);
    throw error;
  }

  return count ?? 0;
}

// ============================================================================
// TRAINING REPORT DATA
// ============================================================================

/**
 * Biometrics summary extracted from watch data
 */
export interface BiometricsSummary {
  avgHR: number;
  minHR: number;
  maxHR: number;
  avgBreathRate: number;
  avgStress?: number;
  steadinessAvg?: number;
  flinchCount?: number;
}

/**
 * Per-participant biometrics data
 */
export interface ParticipantBiometrics {
  userId: string;
  userName: string | null;
  sessionId: string;
  biometrics: BiometricsSummary;
}

/**
 * Aggregated weather data for training report
 */
export interface TrainingWeatherSummary {
  /** Average temperature across sessions */
  avgTemperatureC: number | null;
  /** Min/max temperature range */
  tempRangeC: { min: number; max: number } | null;
  /** Average humidity */
  avgHumidity: number | null;
  /** Average wind speed */
  avgWindSpeedMps: number | null;
  /** Dominant wind direction */
  dominantWindDirection: string | null;
  /** Dominant condition */
  dominantCondition: string | null;
  /** Most severe wind impact */
  maxWindImpact: 'calm' | 'light' | 'moderate' | 'strong' | null;
  /** Most severe condition */
  maxConditionSeverity: 'ideal' | 'good' | 'challenging' | 'difficult' | 'extreme' | null;
  /** Number of sessions with weather data */
  sessionsWithWeather: number;
}

/**
 * Aggregated biometrics data for training report
 */
export interface TrainingBiometricsSummary {
  /** Team-wide average HR */
  teamAvgHR: number | null;
  /** Team-wide HR range */
  teamHRRange: { min: number; max: number } | null;
  /** Team-wide average breath rate */
  teamAvgBreathRate: number | null;
  /** Team-wide average stress */
  teamAvgStress: number | null;
  /** Team-wide average steadiness */
  teamAvgSteadiness: number | null;
  /** Total flinches across team */
  totalFlinches: number;
  /** Per-participant biometrics */
  participants: ParticipantBiometrics[];
  /** Number of sessions with biometrics data */
  sessionsWithBiometrics: number;
}

/**
 * Fetch biometrics data from session_targets for training report.
 * Extracts watch data from target_data field.
 */
export async function getTrainingBiometrics(sessionIds: string[]): Promise<TrainingBiometricsSummary> {
  if (sessionIds.length === 0) {
    return {
      teamAvgHR: null,
      teamHRRange: null,
      teamAvgBreathRate: null,
      teamAvgStress: null,
      teamAvgSteadiness: null,
      totalFlinches: 0,
      participants: [],
      sessionsWithBiometrics: 0,
    };
  }

  const { data, error } = await supabase
    .from('session_targets')
    .select(
      `
      session_id,
      target_data,
      sessions!inner(
        id,
        user_id,
        profiles:user_id(full_name)
      )
    `
    )
    .in('session_id', sessionIds)
    .not('target_data', 'is', null);

  if (error) {
    console.error('[queries] getTrainingBiometrics error:', error);
    return {
      teamAvgHR: null,
      teamHRRange: null,
      teamAvgBreathRate: null,
      teamAvgStress: null,
      teamAvgSteadiness: null,
      totalFlinches: 0,
      participants: [],
      sessionsWithBiometrics: 0,
    };
  }

  const participantMap = new Map<string, ParticipantBiometrics>();
  const allHRs: number[] = [];
  const allBreathRates: number[] = [];
  const allStress: number[] = [];
  const allSteadiness: number[] = [];
  let totalFlinches = 0;

  for (const target of data ?? []) {
    const targetData = target.target_data as Record<string, any> | null;
    if (!targetData?.biometrics?.summary) continue;

    const bio = targetData.biometrics.summary;
    const steady = targetData.steadiness;
    const session = target.sessions as any;
    const userId = session?.user_id;
    const userName = session?.profiles?.full_name || null;

    if (!userId) continue;

    // Extract biometrics
    const avgHR = bio.avgHR ?? bio.hrAvg;
    const minHR = bio.minHR ?? bio.hrMin;
    const maxHR = bio.maxHR ?? bio.hrMax;
    const avgBreathRate = bio.avgBreathRate ?? bio.brAvg;
    const avgStress = bio.avgStress;
    const steadinessAvg = steady?.avgScore;
    const flinchCount = steady?.flinchCount ?? 0;

    if (avgHR) allHRs.push(avgHR);
    if (avgBreathRate) allBreathRates.push(avgBreathRate);
    if (avgStress) allStress.push(avgStress);
    if (steadinessAvg) allSteadiness.push(steadinessAvg);
    totalFlinches += flinchCount;

    // Track per-participant (use first valid biometrics per user)
    if (!participantMap.has(userId) && avgHR) {
      participantMap.set(userId, {
        userId,
        userName,
        sessionId: session.id,
        biometrics: {
          avgHR: avgHR || 0,
          minHR: minHR || 0,
          maxHR: maxHR || 0,
          avgBreathRate: avgBreathRate || 0,
          avgStress,
          steadinessAvg,
          flinchCount,
        },
      });
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return {
    teamAvgHR: avg(allHRs) ? Math.round(avg(allHRs)!) : null,
    teamHRRange: allHRs.length > 0 ? { min: Math.min(...allHRs), max: Math.max(...allHRs) } : null,
    teamAvgBreathRate: avg(allBreathRates) ? Math.round(avg(allBreathRates)! * 10) / 10 : null,
    teamAvgStress: avg(allStress) ? Math.round(avg(allStress)!) : null,
    teamAvgSteadiness: avg(allSteadiness) ? Math.round(avg(allSteadiness)!) : null,
    totalFlinches,
    participants: Array.from(participantMap.values()),
    sessionsWithBiometrics: participantMap.size,
  };
}

/**
 * Aggregate weather data from sessions for training report.
 */
export function aggregateTrainingWeather(sessions: SessionWithDetails[]): TrainingWeatherSummary {
  const weatherSessions = sessions.filter((s) => s.weather && s.weather.temperature_c != null);

  if (weatherSessions.length === 0) {
    return {
      avgTemperatureC: null,
      tempRangeC: null,
      avgHumidity: null,
      avgWindSpeedMps: null,
      dominantWindDirection: null,
      dominantCondition: null,
      maxWindImpact: null,
      maxConditionSeverity: null,
      sessionsWithWeather: 0,
    };
  }

  const temps: number[] = [];
  const humidities: number[] = [];
  const windSpeeds: number[] = [];
  const windDirections: string[] = [];
  const conditions: string[] = [];
  const windImpacts: Array<'calm' | 'light' | 'moderate' | 'strong'> = [];
  const severities: Array<'ideal' | 'good' | 'challenging' | 'difficult' | 'extreme'> = [];

  for (const session of weatherSessions) {
    const w = session.weather!;
    if (w.temperature_c != null) temps.push(w.temperature_c);
    if (w.humidity != null) humidities.push(w.humidity);
    if (w.wind_speed_mps != null) windSpeeds.push(w.wind_speed_mps);
    if (w.wind_direction) windDirections.push(w.wind_direction);
    if (w.condition) conditions.push(w.condition);
    if (w.wind_impact) windImpacts.push(w.wind_impact);
    if (w.condition_severity) severities.push(w.condition_severity);
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const mode = (arr: string[]) => {
    if (arr.length === 0) return null;
    const counts = arr.reduce(
      (acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  // Get max severity
  const windImpactOrder = ['calm', 'light', 'moderate', 'strong'] as const;
  const severityOrder = ['ideal', 'good', 'challenging', 'difficult', 'extreme'] as const;

  const maxWindImpact =
    windImpacts.length > 0
      ? windImpacts.reduce((max, curr) => (windImpactOrder.indexOf(curr) > windImpactOrder.indexOf(max) ? curr : max))
      : null;

  const maxConditionSeverity =
    severities.length > 0
      ? severities.reduce((max, curr) => (severityOrder.indexOf(curr) > severityOrder.indexOf(max) ? curr : max))
      : null;

  return {
    avgTemperatureC: avg(temps) ? Math.round(avg(temps)! * 10) / 10 : null,
    tempRangeC: temps.length > 0 ? { min: Math.min(...temps), max: Math.max(...temps) } : null,
    avgHumidity: avg(humidities) ? Math.round(avg(humidities)!) : null,
    avgWindSpeedMps: avg(windSpeeds) ? Math.round(avg(windSpeeds)! * 10) / 10 : null,
    dominantWindDirection: mode(windDirections),
    dominantCondition: mode(conditions),
    maxWindImpact,
    maxConditionSeverity,
    sessionsWithWeather: weatherSessions.length,
  };
}
