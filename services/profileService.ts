/**
 * Profile Service
 *
 * Handles profile-related queries (lookups by ID, batch fetches).
 */

import { supabase } from '@/services/supabase';

export interface ProfileSummary {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Fetch profiles for a list of user IDs, returned as a Map for easy lookup.
 */
export async function getProfilesByIds(userIds: string[]): Promise<Map<string, ProfileSummary>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (error) {
    console.error('[profileService] getProfilesByIds error:', error);
    throw error;
  }

  return new Map((data ?? []).map((p) => [p.id, p as ProfileSummary]));
}

/**
 * Fetch a single user's display name.
 */
export async function getProfileName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[profileService] getProfileName error:', error);
    throw error;
  }

  return data?.full_name ?? null;
}
