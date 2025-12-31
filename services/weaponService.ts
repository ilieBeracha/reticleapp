/**
 * Weapon Service
 * 
 * 3-Layer Weapon System:
 * - Layer 1: Global weapons (admin-managed catalog)
 * - Layer 2: Team weapons (commander-managed)
 * - Layer 3: Personal weapons (user-managed)
 */

import { supabase } from '@/lib/supabase';
import type { WeaponCategory } from '@/types/workspace';

// Re-export for convenience
export type { WeaponCategory } from '@/types/workspace';

// ============================================================================
// TYPES
// ============================================================================

// Layer 1: Global/Standard Weapon
export interface GlobalWeapon {
  id: string;
  name: string;
  category: WeaponCategory;
  manufacturer: string | null;
  caliber: string | null;
  description: string | null;
  image_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// Layer 2: Team Weapon
export interface TeamWeapon {
  id: string;
  team_id: string;
  base_weapon_id: string | null;
  name: string;
  category: WeaponCategory | null;
  caliber: string | null;
  serial_number: string | null;
  default_zero_distance_m: number | null;
  suppressor_config: string | null;
  barrel_notes: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Assignment fields (new)
  assigned_to: string | null;
  source_user_weapon_id: string | null;
  contributed_by: string | null;
  contribution_status: 'pending' | 'approved' | 'rejected' | null;
  // Joined
  base_weapon?: GlobalWeapon;
  assigned_user?: { id: string; full_name: string; avatar_url: string | null };
}

// Layer 3: Personal Weapon
export interface UserWeapon {
  id: string;
  user_id: string;
  base_weapon_id: string | null;
  team_weapon_id: string | null;
  name: string;
  category: WeaponCategory | null;
  caliber: string | null;
  personal_zero_distance_m: number | null;
  personal_notes: string | null;
  is_favorite: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  // Sharing fields (new)
  shared_with_team_id: string | null;
  share_status: 'pending' | 'approved' | 'rejected' | null;
  // Joined
  base_weapon?: GlobalWeapon;
  team_weapon?: TeamWeapon;
}

// ============================================================================
// LAYER 1: GLOBAL WEAPONS (Admin-managed)
// ============================================================================

/**
 * Get all global weapons (the standard catalog)
 */
export async function getGlobalWeapons(): Promise<GlobalWeapon[]> {
  const { data, error } = await supabase
    .from('weapons')
    .select('*')
    .order('category')
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get global weapons by category
 */
export async function getGlobalWeaponsByCategory(category: WeaponCategory): Promise<GlobalWeapon[]> {
  const { data, error } = await supabase
    .from('weapons')
    .select('*')
    .eq('category', category)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Search global weapons
 */
export async function searchGlobalWeapons(query: string): Promise<GlobalWeapon[]> {
  const { data, error } = await supabase
    .from('weapons')
    .select('*')
    .or(`name.ilike.%${query}%,manufacturer.ilike.%${query}%,caliber.ilike.%${query}%`)
    .order('name')
    .limit(20);

  if (error) throw error;
  return data || [];
}

/**
 * Create global weapon (admin only)
 */
export async function createGlobalWeapon(weapon: {
  name: string;
  category: WeaponCategory;
  manufacturer?: string;
  caliber?: string;
  description?: string;
  image_url?: string;
}): Promise<GlobalWeapon> {
  const { data, error } = await supabase
    .from('weapons')
    .insert(weapon)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update global weapon (admin only)
 */
export async function updateGlobalWeapon(
  id: string,
  updates: Partial<Omit<GlobalWeapon, 'id' | 'created_at' | 'updated_at'>>
): Promise<GlobalWeapon> {
  const { data, error } = await supabase
    .from('weapons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete global weapon (admin only)
 */
export async function deleteGlobalWeapon(id: string): Promise<void> {
  const { error } = await supabase
    .from('weapons')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// LAYER 2: TEAM WEAPONS (Commander-managed)
// ============================================================================

/**
 * Get all weapons for a team
 */
export async function getTeamWeapons(teamId: string): Promise<TeamWeapon[]> {
  const { data, error } = await supabase
    .from('team_weapons')
    .select(`
      *,
      base_weapon:weapons(*)
    `)
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific team weapon
 */
export async function getTeamWeapon(id: string): Promise<TeamWeapon | null> {
  const { data, error } = await supabase
    .from('team_weapons')
    .select(`
      *,
      base_weapon:weapons(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Create team weapon (commander only)
 */
export async function createTeamWeapon(weapon: {
  team_id: string;
  name: string;
  base_weapon_id?: string;
  category?: WeaponCategory;
  caliber?: string;
  serial_number?: string;
  default_zero_distance_m?: number;
  suppressor_config?: string;
  barrel_notes?: string;
  notes?: string;
}): Promise<TeamWeapon> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_weapons')
    .insert({
      ...weapon,
      created_by: user.id,
    })
    .select(`
      *,
      base_weapon:weapons(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update team weapon (commander only)
 */
export async function updateTeamWeapon(
  id: string,
  updates: Partial<Omit<TeamWeapon, 'id' | 'team_id' | 'created_by' | 'created_at' | 'updated_at'>>
): Promise<TeamWeapon> {
  const { data, error } = await supabase
    .from('team_weapons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      base_weapon:weapons(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete team weapon (soft delete - marks as inactive)
 */
export async function deleteTeamWeapon(id: string): Promise<void> {
  const { error } = await supabase
    .from('team_weapons')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Hard delete team weapon (commander only)
 */
export async function hardDeleteTeamWeapon(id: string): Promise<void> {
  const { error } = await supabase
    .from('team_weapons')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// LAYER 3: USER WEAPONS (Personal)
// ============================================================================

/**
 * Get all weapons for current user
 */
export async function getUserWeapons(): Promise<UserWeapon[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_weapons')
    .select(`
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `)
    .eq('user_id', user.id) // Explicit filter to ensure we get current user's weapons
    .order('is_favorite', { ascending: false })
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .order('name');

  if (error) {
    console.error('[getUserWeapons] Error fetching weapons:', error);
    throw error;
  }
  
  console.log(`[getUserWeapons] Found ${data?.length || 0} weapons for user ${user.id}`);
  return data || [];
}

/**
 * Get recently used weapons
 */
export async function getRecentlyUsedWeapons(limit = 3): Promise<UserWeapon[]> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_weapons')
    .select(`
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `)
    .eq('user_id', user.id) // Explicit filter
    .not('last_used_at', 'is', null)
    .order('last_used_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific user weapon
 */
export async function getUserWeapon(id: string): Promise<UserWeapon | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_weapons')
    .select(`
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id) // Ensure it belongs to current user
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[getUserWeapon] Error:', error);
    throw error;
  }
  return data;
}

/**
 * Create personal weapon
 */
export async function createUserWeapon(weapon: {
  name: string;
  base_weapon_id?: string;
  team_weapon_id?: string;
  category?: WeaponCategory;
  caliber?: string;
  personal_zero_distance_m?: number;
  personal_notes?: string;
  is_favorite?: boolean;
}): Promise<UserWeapon> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_weapons')
    .insert({
      ...weapon,
      user_id: user.id,
    })
    .select(`
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update personal weapon
 */
export async function updateUserWeapon(
  id: string,
  updates: Partial<Omit<UserWeapon, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserWeapon> {
  const { data, error } = await supabase
    .from('user_weapons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete personal weapon
 */
export async function deleteUserWeapon(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_weapons')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Toggle favorite status
 */
export async function toggleUserWeaponFavorite(id: string): Promise<UserWeapon> {
  // First get current status
  const current = await getUserWeapon(id);
  if (!current) throw new Error('Weapon not found');

  return updateUserWeapon(id, { is_favorite: !current.is_favorite });
}

/**
 * Mark weapon as recently used (called when starting a session)
 */
export async function markWeaponUsed(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_weapons')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// COMBINED: Get all weapons for picker
// ============================================================================

export interface WeaponPickerData {
  recentlyUsed: UserWeapon[];
  assignedToMe: TeamWeapon[];  // Team weapons assigned to current user
  myWeapons: UserWeapon[];
  teamWeapons: TeamWeapon[];
  globalWeapons: GlobalWeapon[];
}

export interface WeaponPickerOptions {
  teamId?: string;
  /** Filter weapons by category (from drill's weapon_category) */
  weaponCategory?: WeaponCategory | 'any' | null;
}

/**
 * Get all weapons for the weapon picker UI
 * Returns data organized by section
 * 
 * @param options.teamId - Team context for team weapons
 * @param options.weaponCategory - Filter by category (null or 'any' = show all)
 */
export async function getWeaponPickerData(options: WeaponPickerOptions = {}): Promise<WeaponPickerData> {
  const { teamId, weaponCategory } = options;
  
  // Get current user for assigned weapons
  const { data: { user } } = await supabase.auth.getUser();
  
  const [recentlyUsed, myWeapons, teamWeapons, globalWeapons, assignedToMe] = await Promise.all([
    getRecentlyUsedWeapons(3),
    getUserWeapons(),
    teamId ? getTeamWeapons(teamId) : Promise.resolve([]),
    getGlobalWeapons(),
    // Get team weapons assigned to current user
    teamId && user ? getAssignedWeapons(teamId, user.id) : Promise.resolve([]),
  ]);

  // If no category filter or 'any', return all
  if (!weaponCategory || weaponCategory === 'any') {
    return {
      recentlyUsed,
      assignedToMe,
      myWeapons,
      teamWeapons,
      globalWeapons,
    };
  }

  // Filter by category
  const filterByCategory = <T extends { category?: WeaponCategory | null }>(items: T[]): T[] => {
    return items.filter(item => item.category === weaponCategory);
  };

  return {
    recentlyUsed: filterByCategory(recentlyUsed),
    assignedToMe: filterByCategory(assignedToMe),
    myWeapons: filterByCategory(myWeapons),
    teamWeapons: filterByCategory(teamWeapons),
    globalWeapons: filterByCategory(globalWeapons),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

export const WEAPON_CATEGORIES: { value: WeaponCategory; label: string }[] = [
  { value: 'precision_rifle', label: 'Precision Rifle' },
  { value: 'rifle', label: 'Rifle' },
  { value: 'carbine', label: 'Carbine' },
  { value: 'pistol', label: 'Pistol' },
  { value: 'shotgun', label: 'Shotgun' },
  { value: 'any', label: 'Any' },
];

export function getCategoryLabel(category: WeaponCategory | null): string {
  if (!category) return 'Unknown';
  return WEAPON_CATEGORIES.find(c => c.value === category)?.label || category;
}

// ============================================================================
// WEAPON ASSIGNMENT (Commander manages team weapons)
// ============================================================================

/**
 * Assign a team weapon to a user
 * Only commanders can do this
 * 
 * RULE: Each user can only have 1 weapon assigned per team
 */
export async function assignTeamWeapon(
  teamWeaponId: string,
  userId: string
): Promise<TeamWeapon> {
  // First, get the team_id of this weapon
  const { data: weapon, error: fetchError } = await supabase
    .from('team_weapons')
    .select('team_id')
    .eq('id', teamWeaponId)
    .single();

  if (fetchError) throw fetchError;
  if (!weapon) throw new Error('Weapon not found');

  // Check if user already has a weapon assigned in this team
  const { data: existing, error: checkError } = await supabase
    .from('team_weapons')
    .select('id, name')
    .eq('team_id', weapon.team_id)
    .eq('assigned_to', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (checkError) throw checkError;
  
  if (existing) {
    throw new Error(`User already has weapon assigned: ${existing.name}`);
  }

  // Assign the weapon
  const { data, error } = await supabase
    .from('team_weapons')
    .update({ assigned_to: userId })
    .eq('id', teamWeaponId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Unassign a team weapon from a user
 */
export async function unassignTeamWeapon(teamWeaponId: string): Promise<TeamWeapon> {
  const { data, error } = await supabase
    .from('team_weapons')
    .update({ assigned_to: null })
    .eq('id', teamWeaponId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all weapons assigned to a specific user in a team
 */
export async function getAssignedWeapons(
  teamId: string,
  userId: string
): Promise<TeamWeapon[]> {
  const { data, error } = await supabase
    .from('team_weapons')
    .select('*, base_weapon:weapons(*)')
    .eq('team_id', teamId)
    .eq('assigned_to', userId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get team weapons with assignment info (for commanders)
 */
export async function getTeamWeaponsWithAssignments(teamId: string): Promise<TeamWeapon[]> {
  const { data, error } = await supabase
    .from('team_weapons')
    .select(`
      *,
      base_weapon:weapons(*),
      assigned_user:profiles!team_weapons_assigned_to_fkey(id, full_name, avatar_url)
    `)
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

// ============================================================================
// WEAPON CONTRIBUTION (User shares personal weapon with team)
// ============================================================================

/**
 * User offers to share their personal weapon with a team
 * Status starts as 'pending' until commander approves
 */
export async function shareWeaponWithTeam(
  userWeaponId: string,
  teamId: string
): Promise<UserWeapon> {
  const { data, error } = await supabase
    .from('user_weapons')
    .update({
      shared_with_team_id: teamId,
      share_status: 'pending',
    })
    .eq('id', userWeaponId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Commander approves a shared weapon - creates a team weapon from it
 */
export async function approveSharedWeapon(
  userWeaponId: string,
  teamId: string
): Promise<{ userWeapon: UserWeapon; teamWeapon: TeamWeapon }> {
  // Get the user weapon
  const { data: userWeapon, error: fetchError } = await supabase
    .from('user_weapons')
    .select('*')
    .eq('id', userWeaponId)
    .single();

  if (fetchError) throw fetchError;
  if (!userWeapon) throw new Error('User weapon not found');

  // Update user weapon status
  const { error: updateError } = await supabase
    .from('user_weapons')
    .update({ share_status: 'approved' })
    .eq('id', userWeaponId);

  if (updateError) throw updateError;

  // Create a team weapon linked to this user weapon
  const { data: teamWeapon, error: createError } = await supabase
    .from('team_weapons')
    .insert({
      team_id: teamId,
      base_weapon_id: userWeapon.base_weapon_id,
      name: userWeapon.name,
      category: userWeapon.category,
      caliber: userWeapon.caliber,
      source_user_weapon_id: userWeaponId,
      contributed_by: userWeapon.user_id,
      contribution_status: 'approved',
      assigned_to: userWeapon.user_id, // Auto-assign to contributor
    })
    .select('*')
    .single();

  if (createError) throw createError;

  return { userWeapon: { ...userWeapon, share_status: 'approved' }, teamWeapon };
}

/**
 * Commander rejects a shared weapon request
 */
export async function rejectSharedWeapon(userWeaponId: string): Promise<UserWeapon> {
  const { data, error } = await supabase
    .from('user_weapons')
    .update({ share_status: 'rejected', shared_with_team_id: null })
    .eq('id', userWeaponId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * User withdraws their shared weapon offer
 */
export async function withdrawSharedWeapon(userWeaponId: string): Promise<UserWeapon> {
  const { data, error } = await supabase
    .from('user_weapons')
    .update({ share_status: null, shared_with_team_id: null })
    .eq('id', userWeaponId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get weapons pending approval in a team (for commanders)
 */
export async function getPendingSharedWeapons(teamId: string): Promise<UserWeapon[]> {
  const { data, error } = await supabase
    .from('user_weapons')
    .select(`
      *,
      base_weapon:weapons(*),
      user:profiles!user_weapons_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('shared_with_team_id', teamId)
    .eq('share_status', 'pending');

  if (error) throw error;
  return data || [];
}

/**
 * Get weapons the current user has shared with teams
 */
export async function getMySharedWeapons(): Promise<UserWeapon[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_weapons')
    .select('*')
    .eq('user_id', user.id)
    .not('shared_with_team_id', 'is', null);

  if (error) throw error;
  return data || [];
}

// ============================================================================
// AUTO-CREATE PERSONAL PROFILE
// ============================================================================

/**
 * When a user uses a team weapon for the first time,
 * automatically create a personal profile linked to it
 */
export async function getOrCreatePersonalProfile(
  teamWeaponId: string
): Promise<UserWeapon> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if personal profile already exists
  const { data: existing } = await supabase
    .from('user_weapons')
    .select('*')
    .eq('user_id', user.id)
    .eq('team_weapon_id', teamWeaponId)
    .single();

  if (existing) return existing;

  // Get team weapon details
  const { data: teamWeapon, error: fetchError } = await supabase
    .from('team_weapons')
    .select('*')
    .eq('id', teamWeaponId)
    .single();

  if (fetchError) throw fetchError;
  if (!teamWeapon) throw new Error('Team weapon not found');

  // Create personal profile
  const { data: profile, error: createError } = await supabase
    .from('user_weapons')
    .insert({
      user_id: user.id,
      team_weapon_id: teamWeaponId,
      base_weapon_id: teamWeapon.base_weapon_id,
      name: teamWeapon.name,
      category: teamWeapon.category,
      caliber: teamWeapon.caliber,
    })
    .select('*')
    .single();

  if (createError) throw createError;
  return profile;
}

