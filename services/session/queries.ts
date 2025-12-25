import { supabase } from '@/lib/supabase';
import { withQueryTiming } from '@/services/_shared/instrumentation';
import { mapSession } from './mappers';
import type { SessionAggregatedStats, SessionWithDetails } from './types';

/**
 * Get user's active session for a specific training (if any)
 */
export async function getMyActiveSessionForTraining(trainingId: string): Promise<SessionWithDetails | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('sessions')
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
      training_drills:drill_id(name),
      drill_templates:drill_template_id(name)
    `
    )
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('sessions')
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
      training_drills:drill_id(name),
      drill_templates:drill_template_id(name)
    `
    )
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  console.log('[getMyActivePersonalSession] Checking for user:', user.id);

  const { data, error } = await supabase
    .from('sessions')
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
      training_drills:drill_id(name),
      drill_templates:drill_template_id(name)
    `
    )
    .eq('user_id', user.id)
    .eq('status', 'active')
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
 */
export async function getMyActiveSessionsAll(): Promise<SessionWithDetails[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('sessions')
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
      training_drills:drill_id(name),
      drill_templates:drill_template_id(name)
    `
    )
    .eq('user_id', user.id)
    .eq('status', 'active')
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
  let query = supabase
    .from('sessions')
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
      training_drills:drill_id(name),
      drill_templates:drill_template_id(name)
    `
    )
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
 * Get sessions (bounded) - recommended for all list UIs.
 * Uses simple offset pagination via `range` (PostgREST).
 *
 * @param options.teamId - Optional team filter (null = personal only, undefined = all)
 * @param options.limit - Page size (default: 50)
 * @param options.offset - Offset (default: 0)
 */
export async function getSessionsPage(options: {
  teamId?: string | null;
  limit?: number;
  offset?: number;
} = {}): Promise<SessionWithDetails[]> {
  return withQueryTiming('sessions.getSessionsPage', async () => {
    const { teamId, limit = 50, offset = 0 } = options;

    let query = supabase
      .from('sessions')
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
        training_drills:drill_id(name),
        drill_templates:drill_template_id(name)
      `
      )
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
    .select(
      `
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
    `
    )
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
    let query = supabase
      .from('sessions')
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
        training_drills:drill_id(name),
        drill_templates:drill_template_id(name)
      `
      )
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
      .select(
        `
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
      `
      )
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
 * Get sessions for a specific training
 */
export async function getTrainingSessions(trainingId: string): Promise<SessionWithDetails[]> {
  const { data, error } = await supabase
    .from('sessions')
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
      training_drills:drill_id(name),
      drill_templates:drill_template_id(name)
    `
    )
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
        training_drills:drill_id(name),
        drill_templates:drill_template_id(name)
      `
      )
      .eq('training_id', trainingId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    const sessions = (data ?? []).map(mapSession);

    if (sessions.length === 0) return sessions;

    // Fetch aggregated stats for all sessions in one query
    const sessionIds = sessions.map((s) => s.id);

    const { data: statsData, error: statsError } = await supabase
      .from('session_targets')
      .select(
        `
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
      `
      )
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
      training_drills:drill_id(name),
      drill_templates:drill_template_id(name)
    `
    )
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
      ),
      drill_templates:drill_template_id(
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
    `
    )
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
export async function getMyRecentPaperScans(options: {
  sessionLimit?: number;
  targetLimit?: number;
} = {}): Promise<
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


