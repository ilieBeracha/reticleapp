/**
 * Engagement Participants Service
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * CANONICAL RULES:
 * - Grouping engagements are ALWAYS solo
 * - Squad participants are async consent only (not live/presence-based)
 * - Shooter executes alone, result is attributed to participants
 *
 * Manages participants for squad engagements.
 * Participants must be from the same team as the session owner.
 */

import { supabase } from '@/services/supabase';
import type { DrillGoal } from '@/types/workspace';
import type {
  Engagement,
  EngagementMode,
  EngagementParticipant,
  EngagementRole,
  EngagementStatus,
  MeasurementScope,
  ParticipantState,
  TargetResultEntry,
} from '@/types/session';
import { enforceEngagementMode } from '@/utils/engagementMode';

// ============================================================================
// ENGAGEMENT QUERIES
// ============================================================================

/**
 * Get engagement by ID.
 */
export async function getEngagement(engagementId: string): Promise<Engagement | null> {
  const { data, error } = await supabase.from('engagements').select('*').eq('id', engagementId).single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Get engagement by session ID.
 */
export async function getEngagementBySessionId(sessionId: string): Promise<Engagement | null> {
  const { data, error } = await supabase.from('engagements').select('*').eq('session_id', sessionId).single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

// ============================================================================
// ENGAGEMENT MUTATIONS
// ============================================================================

/**
 * Create an engagement for a session.
 * This is the entry point for starting any execution (solo or squad).
 *
 * CANONICAL RULES:
 * - Grouping engagements are ALWAYS solo (enforced)
 * - Squad engagements require drill_goal = 'engagement'
 * - Shooter executes alone, participants acknowledge async
 */
export async function createEngagement(params: {
  sessionId: string;
  shooterId: string;
  drillGoal: DrillGoal;
  trainingId?: string | null;
  requestedMode?: EngagementMode;
  status?: EngagementStatus;
}): Promise<Engagement> {
  const { sessionId, shooterId, drillGoal, trainingId = null, requestedMode, status = 'completed' } = params;

  // MANDATORY: Enforce engagement mode based on drill goal
  // Grouping is ALWAYS solo - this is non-negotiable
  const engagementMode = enforceEngagementMode(drillGoal, requestedMode);

  const { data, error } = await supabase
    .from('engagements')
    .insert({
      session_id: sessionId,
      shooter_id: shooterId,
      drill_goal: drillGoal,
      training_id: trainingId,
      engagement_mode: engagementMode,
      status,
    })
    .select('*')
    .single();

  if (error) throw error;

  // For squad/group engagements, auto-add creator as joined participant
  if (engagementMode === 'squad' || engagementMode === 'group') {
    await supabase.from('engagement_participants').insert({
      engagement_id: data.id,
      user_id: shooterId,
      state: 'joined', // Creator is automatically joined, not pending
      role: 'shooter',
      joined_at: new Date().toISOString(),
    });
  }

  return data;
}

/**
 * Update engagement status.
 *
 * Status values: 'pending' (lobby), 'active' (in progress), 'completed', 'cancelled'
 */
export async function updateEngagementStatus(engagementId: string, status: EngagementStatus): Promise<Engagement> {
  const { data, error } = await supabase
    .from('engagements')
    .update({ status })
    .eq('id', engagementId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Engagement not found or already completed');
  }
  return data;
}

/**
 * Mark an engagement as cancelled.
 */
export async function abortEngagement(engagementId: string): Promise<Engagement> {
  return updateEngagementStatus(engagementId, 'cancelled');
}

/**
 * Mark an engagement as completed.
 */
export async function completeEngagement(engagementId: string): Promise<Engagement> {
  return updateEngagementStatus(engagementId, 'completed');
}

/**
 * Mark an engagement as started (closes new invites).
 * Sets started_at timestamp and status to 'active' - after this, new participants cannot join.
 */
export async function startEngagement(engagementId: string): Promise<Engagement> {
  const { data, error } = await supabase
    .from('engagements')
    .update({
      started_at: new Date().toISOString(),
      status: 'active',
    })
    .eq('id', engagementId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// PARTICIPANT QUERIES
// ============================================================================

/**
 * Get all participants for an engagement.
 * Includes user profile data (name, avatar).
 */
export async function getEngagementParticipants(engagementId: string): Promise<EngagementParticipant[]> {
  // Get participants with their contribution (shots/hits) and role
  const { data: participants, error } = await supabase
    .from('engagement_participants')
    .select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!participants?.length) return [];

  // Get profiles for all participant user IDs
  const userIds = participants.map((p) => p.user_id);
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // Map profile data to flat structure
  return participants.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      engagement_id: row.engagement_id,
      user_id: row.user_id,
      state: row.state,
      role: row.role || 'shooter',
      joined_at: row.joined_at,
      created_at: row.created_at,
      shots_fired: row.shots_fired || null,
      hits: row.hits || null,
      target_results: row.target_results || null,
      user_full_name: profile?.full_name || null,
      user_avatar_url: profile?.avatar_url || null,
    };
  });
}

/**
 * @deprecated Use getEngagementParticipants instead.
 * This function is kept for backwards compatibility during migration.
 */
export async function getSessionParticipants(sessionId: string): Promise<EngagementParticipant[]> {
  // First get the engagement for this session
  const engagement = await getEngagementBySessionId(sessionId);
  if (!engagement) return [];
  return getEngagementParticipants(engagement.id);
}

/**
 * Get eligible team members who can be added as participants.
 * Returns team members who are NOT already participants in this engagement.
 */
export async function getEligibleParticipants(
  teamId: string,
  engagementId: string
): Promise<
  Array<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  }>
> {
  // Get team members
  const { data: teamMembers, error: teamError } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', teamId);

  if (teamError) throw teamError;
  if (!teamMembers?.length) return [];

  // Get existing participants
  const { data: existing, error: existingError } = await supabase
    .from('engagement_participants')
    .select('user_id')
    .eq('engagement_id', engagementId);

  if (existingError) throw existingError;

  // Get engagement's session owner
  const { data: engagement, error: engError } = await supabase
    .from('engagements')
    .select('session_id')
    .eq('id', engagementId)
    .single();

  if (engError) throw engError;

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('id', engagement.session_id)
    .single();

  if (sessionError) throw sessionError;

  const existingUserIds = new Set([
    ...(existing || []).map((p) => p.user_id),
    session.user_id, // Exclude session owner
  ]);

  // Filter out existing participants and session owner
  const eligibleMembers = teamMembers.filter((m) => !existingUserIds.has(m.user_id));
  if (!eligibleMembers.length) return [];

  // Get profiles for eligible members
  const userIds = eligibleMembers.map((m) => m.user_id);
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return eligibleMembers.map((m) => {
    const profile = profileMap.get(m.user_id);
    return {
      user_id: m.user_id,
      full_name: profile?.full_name || null,
      avatar_url: profile?.avatar_url || null,
      role: m.role,
    };
  });
}

// ============================================================================
// PARTICIPANT MUTATIONS
// ============================================================================

/**
 * Add a participant to a squad engagement.
 * Handles re-invitations: if participant exists with 'left' or 'declined' state, resets to 'pending'.
 *
 * CANONICAL RULES:
 * - Participants acknowledge/consent asynchronously
 * - Commander decides who participates
 * - References engagement_id ONLY (never session_id)
 */
export async function addParticipant(
  engagementId: string,
  userId: string,
  role: EngagementRole = 'shooter'
): Promise<EngagementParticipant> {
  // Check if participant already exists (for re-invitation)
  const { data: existing } = await supabase
    .from('engagement_participants')
    .select('id, state')
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .maybeSingle();

  let data;
  let error;

  if (existing) {
    // Re-invitation: reset state to pending
    const result = await supabase
      .from('engagement_participants')
      .update({
        state: 'pending',
        role,
        joined_at: null, // Reset joined_at
        shots_fired: null, // Reset results
        hits: null,
        target_results: null,
      })
      .eq('id', existing.id)
      .select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
      .single();
    data = result.data;
    error = result.error;
  } else {
    // New participant
    const result = await supabase
      .from('engagement_participants')
      .insert({
        engagement_id: engagementId,
        user_id: userId,
        state: 'pending', // Start as pending, user must accept
        role,
      })
      .select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) throw error;
  if (!data) throw new Error('Failed to add participant');

  // Get profile for this user
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single();

  return {
    id: data.id,
    engagement_id: data.engagement_id,
    user_id: data.user_id,
    state: data.state,
    role: data.role || 'shooter',
    joined_at: data.joined_at,
    created_at: data.created_at,
    shots_fired: data.shots_fired || null,
    hits: data.hits || null,
    target_results: data.target_results || null,
    user_full_name: profile?.full_name || null,
    user_avatar_url: profile?.avatar_url || null,
  };
}

/**
 * Update the state of a participant.
 * Used when a user joins or leaves the engagement (async consent).
 */
export async function updateParticipantState(
  engagementId: string,
  userId: string,
  state: ParticipantState
): Promise<EngagementParticipant> {
  const updateData: { state: ParticipantState; joined_at?: string } = { state };

  // Set joined_at when accepting (pending → joined)
  if (state === 'joined') {
    updateData.joined_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('engagement_participants')
    .update(updateData)
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
    .single();

  if (error) throw error;

  // Get profile for this user
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single();

  return {
    id: data.id,
    engagement_id: data.engagement_id,
    user_id: data.user_id,
    state: data.state,
    role: data.role || 'shooter',
    joined_at: data.joined_at,
    created_at: data.created_at,
    shots_fired: data.shots_fired || null,
    hits: data.hits || null,
    target_results: data.target_results || null,
    user_full_name: profile?.full_name || null,
    user_avatar_url: profile?.avatar_url || null,
  };
}

/**
 * Accept an invitation to join a squad engagement.
 * Changes state from 'pending' to 'joined'.
 */
export async function acceptInvite(engagementId: string, userId: string): Promise<EngagementParticipant> {
  return updateParticipantState(engagementId, userId, 'joined');
}

/**
 * Decline an invitation to join a squad engagement.
 * Changes state from 'pending' to 'declined'.
 */
export async function declineInvite(engagementId: string, userId: string): Promise<EngagementParticipant> {
  return updateParticipantState(engagementId, userId, 'declined');
}

/**
 * Update a participant's role (shooter/spotter).
 * Commander can change roles before starting the engagement.
 */
export async function updateParticipantRole(
  engagementId: string,
  userId: string,
  role: EngagementRole
): Promise<EngagementParticipant> {
  const { data, error } = await supabase
    .from('engagement_participants')
    .update({ role })
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
    .single();

  if (error) throw error;

  // Get profile for this user
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single();

  return {
    id: data.id,
    engagement_id: data.engagement_id,
    user_id: data.user_id,
    state: data.state,
    role: data.role || 'shooter',
    joined_at: data.joined_at,
    created_at: data.created_at,
    shots_fired: data.shots_fired || null,
    hits: data.hits || null,
    target_results: data.target_results || null,
    user_full_name: profile?.full_name || null,
    user_avatar_url: profile?.avatar_url || null,
  };
}

/**
 * Update a participant's contribution (shots/hits) in a squad engagement.
 * This is for recording group results where each participant contributes.
 */
export async function updateParticipantResults(
  engagementId: string,
  userId: string,
  shotsFired: number,
  hits: number
): Promise<EngagementParticipant> {
  const { data, error } = await supabase
    .from('engagement_participants')
    .update({
      shots_fired: shotsFired,
      hits: hits,
    })
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
    .single();

  if (error) throw error;

  // Get profile for this user
  const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single();

  return {
    id: data.id,
    engagement_id: data.engagement_id,
    user_id: data.user_id,
    state: data.state,
    role: data.role || 'shooter',
    joined_at: data.joined_at,
    created_at: data.created_at,
    shots_fired: data.shots_fired || null,
    hits: data.hits || null,
    target_results: data.target_results || null,
    user_full_name: profile?.full_name || null,
    user_avatar_url: profile?.avatar_url || null,
  };
}

/**
 * Remove a participant from an engagement.
 * Only the engagement owner can remove participants.
 */
export async function removeParticipant(engagementId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('engagement_participants')
    .delete()
    .eq('engagement_id', engagementId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if a squad engagement has participants.
 *
 * CANONICAL: Squad engagements are async - participants acknowledge/consent
 * This helper checks if any participants have joined.
 */
export function hasJoinedParticipants(participants: EngagementParticipant[]): boolean {
  return participants.some((p) => p.state === 'joined');
}

/**
 * Get count of participants by state.
 */
export function getParticipantCounts(participants: EngagementParticipant[]): {
  pending: number;
  joined: number;
  declined: number;
  left: number;
  total: number;
} {
  const counts = { pending: 0, joined: 0, declined: 0, left: 0, total: participants.length };
  for (const p of participants) {
    counts[p.state]++;
  }
  return counts;
}

/**
 * Calculate group totals from all participants' contributions.
 * Used for group engagements where each participant enters shots/hits.
 */
export function calculateGroupTotals(participants: EngagementParticipant[]): {
  totalShotsFired: number;
  totalHits: number;
  accuracy: number;
  submittedCount: number;
  totalCount: number;
} {
  let totalShotsFired = 0;
  let totalHits = 0;
  let submittedCount = 0;

  for (const p of participants) {
    if (p.shots_fired != null && p.shots_fired > 0) {
      totalShotsFired += p.shots_fired;
      totalHits += p.hits || 0;
      submittedCount++;
    }
  }

  return {
    totalShotsFired,
    totalHits,
    accuracy: totalShotsFired > 0 ? Math.round((totalHits / totalShotsFired) * 100) : 0,
    submittedCount,
    totalCount: participants.length,
  };
}

/**
 * Compute aggregate totals from per-target results.
 * Used when target_count > 1 to derive shots_fired and hits from target_results.
 */
export function computeAggregateTotals(targetResults: TargetResultEntry[]): {
  shots_fired: number;
  hits: number;
} {
  return targetResults.reduce(
    (acc, t) => ({
      shots_fired: acc.shots_fired + (t.shots_fired || 0),
      hits: acc.hits + (t.hits || 0),
    }),
    { shots_fired: 0, hits: 0 }
  );
}

/**
 * Update engagement results for a participant.
 * Handles both single-target and multi-target scenarios.
 *
 * Rules:
 * - If targetCount > 1: require targetResults, compute aggregates
 * - If targetCount === 1: use shotsFired + hits directly, target_results = null
 * - For collective scope: results go on the commander's participant row
 */
export async function updateEngagementResults(params: {
  engagementId: string;
  userId: string;
  targetCount: number;
  targetResults?: TargetResultEntry[] | null;
  shotsFired?: number;
  hits?: number;
}): Promise<EngagementParticipant> {
  const { engagementId, userId, targetCount, targetResults, shotsFired, hits } = params;

  let finalShotsFired: number;
  let finalHits: number;
  let finalTargetResults: TargetResultEntry[] | null = null;

  if (targetCount > 1 && targetResults && targetResults.length > 0) {
    // Multi-target: compute aggregates from per-target results
    const aggregates = computeAggregateTotals(targetResults);
    finalShotsFired = aggregates.shots_fired;
    finalHits = aggregates.hits;
    finalTargetResults = targetResults;
  } else {
    // Single-target: use direct values
    finalShotsFired = shotsFired ?? 0;
    finalHits = hits ?? 0;
    finalTargetResults = null;
  }

  const { data, error } = await supabase
    .from('engagement_participants')
    .update({
      shots_fired: finalShotsFired,
      hits: finalHits,
      target_results: finalTargetResults,
    })
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .select('id, engagement_id, user_id, state, role, joined_at, created_at, shots_fired, hits, target_results')
    .single();

  if (error) throw error;

  // Get profile for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single();

  return {
    id: data.id,
    engagement_id: data.engagement_id,
    user_id: data.user_id,
    state: data.state,
    role: data.role || 'shooter',
    joined_at: data.joined_at,
    created_at: data.created_at,
    shots_fired: data.shots_fired || null,
    hits: data.hits || null,
    target_results: data.target_results || null,
    user_full_name: profile?.full_name || null,
    user_avatar_url: profile?.avatar_url || null,
  };
}

// ============================================================================
// BANNER / LOBBY QUERIES
// ============================================================================

/**
 * Find the most recent active squad/group engagement in a training.
 */
export async function getActiveEngagementForTraining(trainingId: string) {
  const { data, error } = await supabase
    .from('engagements')
    .select(`
      id,
      session_id,
      training_id,
      engagement_mode,
      status,
      shooter_id,
      started_at
    `)
    .eq('training_id', trainingId)
    .in('engagement_mode', ['squad', 'group'])
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[participants] getActiveEngagementForTraining error:', error);
    throw error;
  }

  return data?.[0] ?? null;
}

/**
 * Get a user's participation state in an engagement.
 */
export async function getUserParticipationState(
  engagementId: string,
  userId: string
): Promise<{ id: string; state: string } | null> {
  const { data, error } = await supabase
    .from('engagement_participants')
    .select('id, state')
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[participants] getUserParticipationState error:', error);
    throw error;
  }

  return data;
}

/**
 * Self-join an engagement. Silently handles duplicate key errors.
 */
export async function joinEngagement(engagementId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('engagement_participants')
    .insert({
      engagement_id: engagementId,
      user_id: userId,
      state: 'joined',
      role: 'shooter',
      joined_at: new Date().toISOString(),
    });

  if (error && !error.message?.includes('duplicate')) {
    console.error('[participants] joinEngagement error:', error);
    throw error;
  }
}

/**
 * Get the commander's active lobby for a training (engagement with inner-joined session).
 */
export async function getCommanderActiveLobby(trainingId: string, userId: string) {
  const { data, error } = await supabase
    .from('engagements')
    .select(`
      id,
      session_id,
      engagement_mode,
      status,
      created_at,
      started_at,
      sessions!inner (
        id,
        custom_drill_config,
        training_id,
        user_id,
        status
      )
    `)
    .eq('sessions.training_id', trainingId)
    .eq('sessions.user_id', userId)
    .in('engagement_mode', ['squad', 'group'])
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[participants] getCommanderActiveLobby error:', error);
    throw error;
  }

  return data?.[0] ?? null;
}

/**
 * Get session details for an engagement (drill info + commander).
 */
export async function getEngagementSessionDetails(sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, custom_drill_config, user_id')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('[participants] getEngagementSessionDetails error:', error);
    throw error;
  }

  return data;
}
