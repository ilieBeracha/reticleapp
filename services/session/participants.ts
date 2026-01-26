/**
 * Engagement Participants Service
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * Manages participants for squad engagements.
 * Participants must be from the same team as the session owner.
 */

import { supabase } from '@/lib/supabase';
import type {
  Engagement,
  EngagementMode,
  EngagementParticipant,
  EngagementStatus,
  ParticipantState,
} from './types';

// ============================================================================
// ENGAGEMENT QUERIES
// ============================================================================

/**
 * Get engagement by ID.
 */
export async function getEngagement(engagementId: string): Promise<Engagement | null> {
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .eq('id', engagementId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Get engagement by session ID.
 */
export async function getEngagementBySessionId(
  sessionId: string
): Promise<Engagement | null> {
  const { data, error } = await supabase
    .from('engagements')
    .select('*')
    .eq('session_id', sessionId)
    .single();

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
 */
export async function createEngagement(params: {
  sessionId: string;
  engagementMode: EngagementMode;
  status?: EngagementStatus;
}): Promise<Engagement> {
  const { sessionId, engagementMode, status = 'pending' } = params;

  const { data, error } = await supabase
    .from('engagements')
    .insert({
      session_id: sessionId,
      engagement_mode: engagementMode,
      status,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update engagement status.
 */
export async function updateEngagementStatus(
  engagementId: string,
  status: EngagementStatus,
  timestamps?: { started_at?: string; ended_at?: string }
): Promise<Engagement> {
  const updateData: Record<string, unknown> = { status };
  if (timestamps?.started_at) updateData.started_at = timestamps.started_at;
  if (timestamps?.ended_at) updateData.ended_at = timestamps.ended_at;

  const { data, error } = await supabase
    .from('engagements')
    .update(updateData)
    .eq('id', engagementId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Start an engagement (set status to active, record start time).
 * Also updates the associated session status to 'active'.
 */
export async function startEngagement(engagementId: string): Promise<Engagement> {
  // Update engagement status
  const engagement = await updateEngagementStatus(engagementId, 'active', {
    started_at: new Date().toISOString(),
  });

  // Also update the session status to 'active'
  const { error } = await supabase
    .from('sessions')
    .update({ status: 'active' })
    .eq('id', engagement.session_id);

  if (error) {
    console.error('[startEngagement] Failed to update session status:', error);
  }

  return engagement;
}

/**
 * Complete an engagement (set status to completed, record end time).
 */
export async function completeEngagement(engagementId: string): Promise<Engagement> {
  return updateEngagementStatus(engagementId, 'completed', {
    ended_at: new Date().toISOString(),
  });
}

// ============================================================================
// PARTICIPANT QUERIES
// ============================================================================

/**
 * Get all participants for an engagement.
 * Includes user profile data (name, avatar).
 */
export async function getEngagementParticipants(
  engagementId: string
): Promise<EngagementParticipant[]> {
  // Get participants
  const { data: participants, error } = await supabase
    .from('engagement_participants')
    .select('id, engagement_id, user_id, state, joined_at, created_at, updated_at')
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!participants?.length) return [];

  // Get profiles for all participant user IDs
  const userIds = participants.map((p) => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // Map profile data to flat structure
  return participants.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      engagement_id: row.engagement_id,
      user_id: row.user_id,
      state: row.state,
      joined_at: row.joined_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_full_name: profile?.full_name || null,
      user_avatar_url: profile?.avatar_url || null,
    };
  });
}

/**
 * @deprecated Use getEngagementParticipants instead.
 * This function is kept for backwards compatibility during migration.
 */
export async function getSessionParticipants(
  sessionId: string
): Promise<EngagementParticipant[]> {
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
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

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
 * The participant starts in 'pending' state.
 */
export async function addParticipant(
  engagementId: string,
  userId: string
): Promise<EngagementParticipant> {
  // First get the engagement to find session_id (needed for backwards compat)
  const { data: engagement, error: engError } = await supabase
    .from('engagements')
    .select('session_id')
    .eq('id', engagementId)
    .single();

  if (engError) throw engError;

  // Insert with both engagement_id and session_id (backwards compat during migration)
  // Participants are added directly as 'joined' (no acceptance needed - commander decides)
  const { data, error } = await supabase
    .from('engagement_participants')
    .insert({
      engagement_id: engagementId,
      session_id: engagement.session_id, // Backwards compat - will be removed later
      user_id: userId,
      state: 'joined',
      joined_at: new Date().toISOString(),
    })
    .select('id, engagement_id, user_id, state, joined_at, created_at, updated_at')
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
    joined_at: data.joined_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_full_name: profile?.full_name || null,
    user_avatar_url: profile?.avatar_url || null,
  };
}

/**
 * Update the state of a participant.
 * Used when a user joins or leaves the engagement.
 */
export async function updateParticipantState(
  engagementId: string,
  userId: string,
  state: ParticipantState
): Promise<EngagementParticipant> {
  const { data, error } = await supabase
    .from('engagement_participants')
    .update({ state })
    .eq('engagement_id', engagementId)
    .eq('user_id', userId)
    .select('id, engagement_id, user_id, state, joined_at, created_at, updated_at')
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
    joined_at: data.joined_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_full_name: profile?.full_name || null,
    user_avatar_url: profile?.avatar_url || null,
  };
}

/**
 * Remove a participant from an engagement.
 * Only the engagement owner can remove participants.
 */
export async function removeParticipant(
  engagementId: string,
  userId: string
): Promise<void> {
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
 * Check if the engagement can start based on participant state.
 * For squad mode: requires at least one participant with state = 'joined'.
 * For solo mode: always true.
 */
export function canStartEngagement(
  engagement: Engagement,
  participants: EngagementParticipant[]
): boolean {
  if (engagement.engagement_mode === 'solo') {
    return true;
  }
  return participants.some((p) => p.state === 'joined');
}

/**
 * Get count of participants by state.
 */
export function getParticipantCounts(
  participants: EngagementParticipant[]
): { pending: number; joined: number; left: number; total: number } {
  const counts = { pending: 0, joined: 0, left: 0, total: participants.length };
  for (const p of participants) {
    counts[p.state]++;
  }
  return counts;
}
