/**
 * Weapon Service
 * 
 * 3-Layer Weapon System:
 * - Layer 1: Global weapons (admin-managed catalog)
 * - Layer 2: Team weapons (commander-managed)
 * - Layer 3: Personal weapons (user-managed)
 */

import { 
  isAssignedPolicy, 
  isCatalogPolicy, 
  isPersonalPolicy, 
  type WeaponPolicy 
} from '@/constants/weaponPolicy';
import { supabase } from '@/lib/supabase';
import type { WeaponCategory } from '@/types/workspace';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage key for default weapon
const DEFAULT_WEAPON_KEY = '@reticle:default_weapon_id';

// Re-export for convenience - SINGLE SOURCE OF TRUTH for weapon categories
export {
  CATEGORY_CONFIGS, getCategoryConfig,
  getCategoryDistances, getCategoryLabel, WEAPON_CATEGORIES
} from '@/constants/weaponCategories';
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
  team?: { id: string; name: string };
}

// Cleaning interval types
export type CleaningIntervalType = 'rounds' | 'sessions' | 'days';

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
  // Sharing fields
  shared_with_team_id: string | null;
  share_status: 'pending' | 'approved' | 'rejected' | null;
  // Cleaning routine fields
  cleaning_enabled: boolean;
  cleaning_interval_type: CleaningIntervalType | null;
  cleaning_interval_value: number | null;
  last_cleaned_at: string | null;
  rounds_since_cleaning: number;
  sessions_since_cleaning: number;
  // Joined
  base_weapon?: GlobalWeapon;
  team_weapon?: TeamWeapon;
}

// ============================================================================
// UNIFIED WEAPON LOOKUP (for detection sensitivity)
// ============================================================================

/**
 * Normalized weapon info for detection sensitivity derivation
 */
export interface WeaponForDetection {
  id: string;
  name: string;
  category: WeaponCategory | null;
  caliber: string | null;
  has_suppressor?: boolean;
  has_muzzle_brake?: boolean;
}

/**
 * Get weapon by ID (unified lookup across all layers)
 * Returns normalized data for detection sensitivity derivation
 */
export async function getWeaponById(id: string): Promise<WeaponForDetection | null> {
  // First try user weapon (most common case)
  const userWeapon = await getUserWeapon(id);
  if (userWeapon) {
    // Parse suppressor info from team weapon or notes
    const hasSuppressor = userWeapon.team_weapon?.suppressor_config != null ||
      userWeapon.personal_notes?.toLowerCase().includes('suppressor') ||
      userWeapon.personal_notes?.toLowerCase().includes('silencer');
    
    return {
      id: userWeapon.id,
      name: userWeapon.name,
      category: userWeapon.category,
      caliber: userWeapon.caliber || userWeapon.base_weapon?.caliber || null,
      has_suppressor: hasSuppressor,
    };
  }
  
  // Try team weapon
  const teamWeapon = await getTeamWeapon(id);
  if (teamWeapon) {
    return {
      id: teamWeapon.id,
      name: teamWeapon.name,
      category: teamWeapon.category,
      caliber: teamWeapon.caliber || teamWeapon.base_weapon?.caliber || null,
      has_suppressor: teamWeapon.suppressor_config != null,
    };
  }
  
  // Try global weapon
  const { data: globalWeapon } = await supabase
    .from('weapons')
    .select('*')
    .eq('id', id)
    .single();
    
  if (globalWeapon) {
    return {
      id: globalWeapon.id,
      name: globalWeapon.name,
      category: globalWeapon.category,
      caliber: globalWeapon.caliber,
    };
  }
  
  return null;
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
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(
        *,
        team:teams!team_weapons_team_id_fkey(id, name)
      )
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
 * Get the stored default weapon ID from AsyncStorage
 */
export async function getDefaultWeaponId(): Promise<string | null> {
  try {
    const id = await AsyncStorage.getItem(DEFAULT_WEAPON_KEY);
    return id;
  } catch {
    return null;
  }
}

/**
 * Set the default weapon ID in AsyncStorage
 */
export async function setDefaultWeaponId(weaponId: string | null): Promise<void> {
  try {
    if (weaponId) {
      await AsyncStorage.setItem(DEFAULT_WEAPON_KEY, weaponId);
    } else {
      await AsyncStorage.removeItem(DEFAULT_WEAPON_KEY);
    }
  } catch (error) {
    console.error('[weaponService] Failed to save default weapon:', error);
  }
}

/**
 * Get the user's default weapon for auto-selection
 * Priority: 1. Stored default, 2. Favorite weapon, 3. Most recently used, 4. First weapon
 */
export async function getDefaultWeapon(): Promise<UserWeapon | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. First check for stored default weapon
  const storedDefaultId = await getDefaultWeaponId();
  if (storedDefaultId) {
    const { data: storedDefault } = await supabase
      .from('user_weapons')
      .select(`
        *,
        base_weapon:weapons(*),
        team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
      `)
      .eq('id', storedDefaultId)
      .eq('user_id', user.id)
      .single();

    if (storedDefault) return storedDefault;
    // If stored default no longer exists, clear it
    await setDefaultWeaponId(null);
  }

  // 2. Try to get a favorite
  const { data: favorite } = await supabase
    .from('user_weapons')
    .select(`
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `)
    .eq('user_id', user.id)
    .eq('is_favorite', true)
    .limit(1)
    .single();

  if (favorite) return favorite;

  // 3. Then try most recently used
  const { data: recent } = await supabase
    .from('user_weapons')
    .select(`
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `)
    .eq('user_id', user.id)
    .not('last_used_at', 'is', null)
    .order('last_used_at', { ascending: false })
    .limit(1)
    .single();

  if (recent) return recent;

  // 4. Fall back to first weapon
  const { data: first } = await supabase
    .from('user_weapons')
    .select(`
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return first || null;
}

// ============================================================================
// TEAM DEFAULT WEAPON (FOR CATALOG POLICY)
// ============================================================================

/**
 * Get the team default weapon key for AsyncStorage
 */
function getTeamDefaultKey(teamId: string): string {
  return `@reticle:team_default_weapon:${teamId}`;
}

/**
 * Get the stored default weapon ID for a specific team
 * Used when Catalog policy is active - member can set a preferred weapon
 */
export async function getTeamDefaultWeaponId(teamId: string): Promise<string | null> {
  try {
    const id = await AsyncStorage.getItem(getTeamDefaultKey(teamId));
    return id;
  } catch {
    return null;
  }
}

/**
 * Set the default weapon ID for a specific team
 * Used when Catalog policy is active - member sets preferred weapon
 */
export async function setTeamDefaultWeaponId(teamId: string, weaponId: string | null): Promise<void> {
  try {
    const key = getTeamDefaultKey(teamId);
    if (weaponId) {
      await AsyncStorage.setItem(key, weaponId);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('[weaponService] Failed to save team default weapon:', error);
  }
}

/**
 * Get the user's default weapon for a team (Catalog policy)
 * Returns the team weapon if it exists and is still in the catalog
 */
export async function getTeamDefaultWeapon(teamId: string): Promise<TeamWeapon | null> {
  const storedId = await getTeamDefaultWeaponId(teamId);
  if (!storedId) return null;

  // Verify the weapon still exists in team catalog
  const { data } = await supabase
    .from('team_weapons')
    .select('*')
    .eq('id', storedId)
    .eq('team_id', teamId)
    .single();

  if (data) return data;

  // Weapon no longer exists, clear stored default
  await setTeamDefaultWeaponId(teamId, null);
  return null;
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
  // Cleaning routine
  cleaning_enabled?: boolean;
  cleaning_interval_type?: CleaningIntervalType;
  cleaning_interval_value?: number;
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
  /** Team's weapon policy - controls which weapons are available */
  weaponPolicy?: WeaponPolicy | null;
}

/**
 * Get all weapons for the weapon picker UI
 * Returns data organized by section, filtered by team's weapon policy
 * 
 * @param options.teamId - Team context for team weapons
 * @param options.weaponCategory - Filter by category (null or 'any' = show all)
 * @param options.weaponPolicy - Team weapon policy:
 *   - 'personal': Show all weapons (default behavior)
 *   - 'catalog': Only show team catalog weapons
 *   - 'assigned': Only show weapons assigned to current user
 */
export async function getWeaponPickerData(options: WeaponPickerOptions = {}): Promise<WeaponPickerData> {
  const { teamId, weaponCategory, weaponPolicy } = options;
  
  // Get current user for assigned weapons
  const { data: { user } } = await supabase.auth.getUser();
  
  // Filter helper for category
  const filterByCategory = <T extends { category?: WeaponCategory | null }>(items: T[]): T[] => {
    if (!weaponCategory || weaponCategory === 'any') return items;
    return items.filter(item => item.category === weaponCategory);
  };
  
  // ─────────────────────────────────────────────────────────────────────────
  // POLICY: ASSIGNED - Only show weapons assigned to current user
  // ─────────────────────────────────────────────────────────────────────────
  if (isAssignedPolicy(weaponPolicy)) {
    const assignedToMe = teamId && user 
      ? await getAssignedWeapons(teamId, user.id) 
      : [];
    
    return {
      recentlyUsed: [],
      assignedToMe: filterByCategory(assignedToMe),
      myWeapons: [],
      teamWeapons: [],
      globalWeapons: [],
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // POLICY: CATALOG - Only show team catalog weapons
  // ─────────────────────────────────────────────────────────────────────────
  if (isCatalogPolicy(weaponPolicy)) {
    const teamWeapons = teamId ? await getTeamWeapons(teamId) : [];
    
    return {
      recentlyUsed: [],
      assignedToMe: [],
      myWeapons: [],
      teamWeapons: filterByCategory(teamWeapons),
      globalWeapons: [],
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // POLICY: PERSONAL (default) - Show all weapons
  // ─────────────────────────────────────────────────────────────────────────
  const [recentlyUsed, myWeapons, teamWeapons, globalWeapons, assignedToMe] = await Promise.all([
    getRecentlyUsedWeapons(3),
    getUserWeapons(),
    teamId ? getTeamWeapons(teamId) : Promise.resolve([]),
    getGlobalWeapons(),
    // Get team weapons assigned to current user
    teamId && user ? getAssignedWeapons(teamId, user.id) : Promise.resolve([]),
  ]);

  return {
    recentlyUsed: filterByCategory(recentlyUsed),
    assignedToMe: filterByCategory(assignedToMe),
    myWeapons: filterByCategory(myWeapons),
    teamWeapons: filterByCategory(teamWeapons),
    globalWeapons: filterByCategory(globalWeapons),
  };
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

// ============================================================================
// WEAPON STATISTICS
// ============================================================================

export interface WeaponStats {
  weapon_id: string;
  total_sessions: number;
  total_rounds_fired: number;
  last_used_at: string | null;
  avg_accuracy_pct: number | null;
  best_dispersion_cm: number | null;
}

/**
 * Get statistics for all user weapons
 * Aggregates session data per weapon
 */
export async function getWeaponStats(): Promise<Map<string, WeaponStats>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map();

  // Get all sessions with weapon_id for current user
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id,
      weapon_id,
      started_at,
      status
    `)
    .eq('user_id', user.id)
    .not('weapon_id', 'is', null);

  if (error) {
    console.error('[getWeaponStats] Error fetching sessions:', error);
    return new Map();
  }

  if (!sessions || sessions.length === 0) return new Map();

  // Group sessions by weapon_id
  const weaponSessions = new Map<string, {
    sessions: typeof sessions;
    lastUsed: string | null;
  }>();

  sessions.forEach((session: any) => {
    const wid = session.weapon_id;
    if (!weaponSessions.has(wid)) {
      weaponSessions.set(wid, { sessions: [], lastUsed: null });
    }
    const ws = weaponSessions.get(wid)!;
    ws.sessions.push(session);
    if (!ws.lastUsed || session.started_at > ws.lastUsed) {
      ws.lastUsed = session.started_at;
    }
  });

  // Get session IDs for stats aggregation
  const sessionIds = sessions.map((s: any) => s.id);

  // Fetch target results for all sessions
  const { data: targets, error: targetsError } = await supabase
    .from('session_targets')
    .select(`
      session_id,
      paper_target_results(bullets_fired, hits_total, dispersion_cm),
      tactical_target_results(bullets_fired, hits)
    `)
    .in('session_id', sessionIds);

  if (targetsError) {
    console.error('[getWeaponStats] Error fetching targets:', targetsError);
  }

  // Map session_id to weapon_id
  const sessionToWeapon = new Map<string, string>();
  sessions.forEach((s: any) => {
    sessionToWeapon.set(s.id, s.weapon_id);
  });

  // Aggregate stats per weapon
  const weaponAggregates = new Map<string, {
    rounds: number;
    hits: number;
    bestDispersion: number | null;
  }>();

  (targets ?? []).forEach((target: any) => {
    const weaponId = sessionToWeapon.get(target.session_id);
    if (!weaponId) return;

    if (!weaponAggregates.has(weaponId)) {
      weaponAggregates.set(weaponId, { rounds: 0, hits: 0, bestDispersion: null });
    }
    const agg = weaponAggregates.get(weaponId)!;

    // Paper results
    const paper = target.paper_target_results;
    if (paper) {
      agg.rounds += paper.bullets_fired ?? 0;
      agg.hits += paper.hits_total ?? 0;
      if (paper.dispersion_cm != null) {
        if (agg.bestDispersion === null || paper.dispersion_cm < agg.bestDispersion) {
          agg.bestDispersion = paper.dispersion_cm;
        }
      }
    }

    // Tactical results
    const tactical = target.tactical_target_results;
    if (tactical) {
      agg.rounds += tactical.bullets_fired ?? 0;
      agg.hits += tactical.hits ?? 0;
    }
  });

  // Build final stats map
  const statsMap = new Map<string, WeaponStats>();

  weaponSessions.forEach((data, weaponId) => {
    const agg = weaponAggregates.get(weaponId);
    const rounds = agg?.rounds ?? 0;
    const hits = agg?.hits ?? 0;

    statsMap.set(weaponId, {
      weapon_id: weaponId,
      total_sessions: data.sessions.length,
      total_rounds_fired: rounds,
      last_used_at: data.lastUsed,
      avg_accuracy_pct: rounds > 0 ? Math.round((hits / rounds) * 100) : null,
      best_dispersion_cm: agg?.bestDispersion ?? null,
    });
  });

  return statsMap;
}

