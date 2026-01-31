/**
 * Weapon Service
 *
 * 3-Layer Weapon System:
 * - Layer 1: Global weapons (admin-managed catalog)
 * - Layer 2: Team weapons (commander-managed)
 * - Layer 3: Personal weapons (user-managed)
 */

// WeaponPolicy removed - team context now controls weapon access directly
import { supabase } from '@/services/supabase';
import type { WeaponCategory } from '@/types/workspace';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage key for default weapon
const DEFAULT_WEAPON_KEY = '@reticle:default_weapon_id';

// Re-export for convenience - SINGLE SOURCE OF TRUTH for weapon categories
export {
    CATEGORY_CONFIGS,
    getCategoryConfig,
    getCategoryDistances,
    getCategoryLabel,
    WEAPON_CATEGORIES
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
  // Assignment fields
  assigned_to: string | null;
  source_user_weapon_id: string | null;
  contributed_by: string | null;
  contribution_status: 'pending' | 'approved' | 'rejected' | null;
  // Pool availability
  pool_available: boolean;
  // Joined
  base_weapon?: GlobalWeapon;
  assigned_user?: { id: string; full_name: string; avatar_url: string | null };
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
    const hasSuppressor =
      userWeapon.team_weapon?.suppressor_config != null ||
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
  const { data: globalWeapon } = await supabase.from('weapons').select('*').eq('id', id).single();

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
  const { data, error } = await supabase.from('weapons').select('*').order('category').order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get global weapons by category
 */
export async function getGlobalWeaponsByCategory(category: WeaponCategory): Promise<GlobalWeapon[]> {
  const { data, error } = await supabase.from('weapons').select('*').eq('category', category).order('name');

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
  const { data, error } = await supabase.from('weapons').insert(weapon).select().single();

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
  const { error } = await supabase.from('weapons').delete().eq('id', id);

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
    .select(
      `
      *,
      base_weapon:weapons(*)
    `
    )
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
    .select(
      `
      *,
      base_weapon:weapons(*)
    `
    )
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_weapons')
    .insert({
      ...weapon,
      created_by: user.id,
    })
    .select(
      `
      *,
      base_weapon:weapons(*)
    `
    )
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
    .select(
      `
      *,
      base_weapon:weapons(*)
    `
    )
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
  const { error } = await supabase.from('team_weapons').delete().eq('id', id);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_weapons')
    .select(
      `
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `
    )
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_weapons')
    .select(
      `
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `
    )
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
export async function getDefaultWeapon(options?: { personalOnly?: boolean }): Promise<UserWeapon | null> {
  const personalOnly = options?.personalOnly ?? false;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Helper to build query with optional personal-only filter
  const buildQuery = () => {
    let query = supabase
      .from('user_weapons')
      .select(
        `
        *,
        base_weapon:weapons(*),
        team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
      `
      )
      .eq('user_id', user.id);
    if (personalOnly) {
      query = query.is('team_weapon_id', null);
    }
    return query;
  };

  // 1. First check for stored default weapon
  const storedDefaultId = await getDefaultWeaponId();
  if (storedDefaultId) {
    const { data: storedDefault } = await buildQuery().eq('id', storedDefaultId).maybeSingle();

    if (storedDefault) return storedDefault;
    // If stored default no longer exists, clear it
    await setDefaultWeaponId(null);
  }

  // 2. Try to get a favorite
  const { data: favorite } = await buildQuery().eq('is_favorite', true).limit(1).maybeSingle();

  if (favorite) return favorite;

  // 3. Then try most recently used
  const { data: recent } = await buildQuery()
    .not('last_used_at', 'is', null)
    .order('last_used_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) return recent;

  // 4. Fall back to first weapon
  const { data: first } = await buildQuery().order('created_at', { ascending: false }).limit(1).maybeSingle();

  return first || null;
}

/**
 * Get a specific user weapon
 */
export async function getUserWeapon(id: string): Promise<UserWeapon | null> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_weapons')
    .select(
      `
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `
    )
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_weapons')
    .insert({
      ...weapon,
      user_id: user.id,
    })
    .select(
      `
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `
    )
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
    .select(
      `
      *,
      base_weapon:weapons(*),
      team_weapon:team_weapons!user_weapons_team_weapon_id_fkey(*)
    `
    )
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete personal weapon
 */
export async function deleteUserWeapon(id: string): Promise<void> {
  const { error } = await supabase.from('user_weapons').delete().eq('id', id);

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
  const { error } = await supabase.from('user_weapons').update({ last_used_at: new Date().toISOString() }).eq('id', id);

  if (error) throw error;
}

// ============================================================================
// COMBINED: Get all weapons for picker
// ============================================================================

export interface WeaponPickerData {
  recentlyUsed: UserWeapon[];
  assignedToMe: TeamWeapon[]; // Team weapons assigned to current user
  poolWeapons: TeamWeapon[]; // Team weapons available in shared pool
  myWeapons: UserWeapon[];
  teamWeapons: TeamWeapon[];
  globalWeapons: GlobalWeapon[];
}

export interface WeaponPickerOptions {
  /** Team context - when provided, only assigned weapons are relevant */
  teamId?: string;
  /** Filter weapons by category (from drill's weapon_category) */
  weaponCategory?: WeaponCategory | 'any' | null;
}

/**
 * Get all weapons for the weapon picker UI
 * Returns data organized by section
 *
 * Note: When teamId is provided, the UI layer decides to show only assigned weapons.
 * This function returns all relevant data for flexibility.
 *
 * @param options.teamId - Team context for team weapons
 * @param options.weaponCategory - Filter by category (null or 'any' = show all)
 */
export async function getWeaponPickerData(options: WeaponPickerOptions = {}): Promise<WeaponPickerData> {
  const { teamId, weaponCategory } = options;

  // Get current user for assigned weapons
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Filter helper for category
  const filterByCategory = <T extends { category?: WeaponCategory | null }>(items: T[]): T[] => {
    if (!weaponCategory || weaponCategory === 'any') return items;
    return items.filter((item) => item.category === weaponCategory);
  };

  // Fetch all relevant weapon data
  const [recentlyUsed, myWeapons, teamWeapons, globalWeapons, assignedToMe, poolWeapons] = await Promise.all([
    getRecentlyUsedWeapons(3),
    getUserWeapons(),
    teamId ? getTeamWeapons(teamId) : Promise.resolve([]),
    getGlobalWeapons(),
    // Get team weapons assigned to current user
    teamId && user ? getAssignedWeapons(teamId, user.id) : Promise.resolve([]),
    // Get pool weapons available to team members
    teamId ? getPoolWeapons(teamId) : Promise.resolve([]),
  ]);

  // For solo (no teamId): only show personal weapons (exclude team weapon profiles)
  const personalFilter = <T extends { team_weapon_id?: string | null }>(items: T[]): T[] => {
    if (teamId) return items; // In team context, no filtering needed
    return items.filter((item) => !item.team_weapon_id);
  };

  return {
    recentlyUsed: personalFilter(filterByCategory(recentlyUsed)),
    assignedToMe: filterByCategory(assignedToMe),
    poolWeapons: filterByCategory(poolWeapons),
    myWeapons: personalFilter(filterByCategory(myWeapons)),
    teamWeapons: filterByCategory(teamWeapons),
    globalWeapons: filterByCategory(globalWeapons),
  };
}

// ============================================================================
// UNIFIED LOADOUT: Get all accessible weapons for the user
// ============================================================================

export type WeaponSource = 'personal' | 'team_assigned' | 'team_pool';

export interface AccessibleWeapon {
  id: string;
  name: string;
  category: WeaponCategory | null;
  caliber: string | null;
  source: WeaponSource;
  teamId?: string;
  teamName?: string;
  // Stats (optional, populated separately)
  stats?: WeaponStats;
  // Original data
  userWeapon?: UserWeapon;
  teamWeapon?: TeamWeapon;
}

/**
 * Get all weapons accessible to the current user across all sources:
 * - Personal weapons (user_weapons)
 * - Team-assigned weapons (team_weapons where assigned_to = user)
 * - Team pool weapons (team_weapons available to user's teams)
 */
export async function getAllAccessibleWeapons(): Promise<AccessibleWeapon[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user's teams
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('team_id, teams!inner(id, name)')
    .eq('user_id', user.id);

  const userTeams = (teamMembers ?? []).map((tm: any) => ({
    id: tm.team_id,
    name: tm.teams?.name ?? 'Unknown Team',
  }));

  const teamIds = userTeams.map((t) => t.id);
  const teamNameMap = new Map(userTeams.map((t) => [t.id, t.name]));

  // Parallel fetch all weapon sources
  const [personalWeapons, teamWeapons] = await Promise.all([
    getUserWeapons(),
    teamIds.length > 0
      ? supabase
          .from('team_weapons')
          .select('*, base_weapon:weapons(*)')
          .in('team_id', teamIds)
          .eq('is_active', true)
          .order('name')
          .then(({ data, error }) => {
            if (error) throw error;
            return data || [];
          })
      : Promise.resolve([]),
  ]);

  const result: AccessibleWeapon[] = [];

  // Create a map of team weapons for quick lookup
  const teamWeaponMap = new Map((teamWeapons as TeamWeapon[]).map((tw) => [tw.id, tw]));

  // Add personal weapons
  // If a personal weapon is linked to a team weapon that's assigned to this user,
  // show it as 'team_assigned' instead of 'personal'
  personalWeapons.forEach((w) => {
    let source: WeaponSource = 'personal';
    let teamId: string | undefined;
    let teamName: string | undefined;
    let linkedTeamWeapon: TeamWeapon | undefined;

    // Check if this personal weapon is linked to a team weapon
    if (w.team_weapon_id) {
      linkedTeamWeapon = teamWeaponMap.get(w.team_weapon_id);
      if (linkedTeamWeapon && linkedTeamWeapon.assigned_to === user.id) {
        // This is the user's assigned team weapon - show as team_assigned
        source = 'team_assigned';
        teamId = linkedTeamWeapon.team_id;
        teamName = teamNameMap.get(linkedTeamWeapon.team_id);
      }
    }

    result.push({
      id: w.id,
      name: w.name,
      category: w.category,
      caliber: w.caliber || w.base_weapon?.caliber || null,
      source,
      teamId,
      teamName,
      userWeapon: w,
    });
  });

  // Add team weapons (distinguish assigned vs pool)
  // Only show weapons that are:
  // 1. Assigned to the current user (team_assigned)
  // 2. Available in the pool AND not assigned to anyone else (team_pool)
  (teamWeapons as TeamWeapon[]).forEach((tw) => {
    // Skip if user already has a personal weapon linked to this team weapon
    const isLinkedToPersonal = personalWeapons.some((pw) => pw.team_weapon_id === tw.id);
    if (isLinkedToPersonal) return;

    const isAssignedToMe = tw.assigned_to === user.id;
    const isAssignedToSomeoneElse = tw.assigned_to != null && tw.assigned_to !== user.id;
    const isPoolAvailable = tw.pool_available === true;

    // Only include if:
    // - Assigned to me, OR
    // - In pool and not assigned to someone else
    if (!isAssignedToMe && !isPoolAvailable) return;
    if (isAssignedToSomeoneElse && !isPoolAvailable) return;

    result.push({
      id: tw.id,
      name: tw.name,
      category: tw.category,
      caliber: tw.caliber || tw.base_weapon?.caliber || null,
      source: isAssignedToMe ? 'team_assigned' : 'team_pool',
      teamId: tw.team_id,
      teamName: teamNameMap.get(tw.team_id),
      teamWeapon: tw,
    });
  });

  return result;
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
export async function assignTeamWeapon(teamWeaponId: string, userId: string): Promise<TeamWeapon> {
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
export async function getAssignedWeapons(teamId: string, userId: string): Promise<TeamWeapon[]> {
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
    .select(
      `
      *,
      base_weapon:weapons(*),
      assigned_user:profiles!team_weapons_assigned_to_fkey(id, full_name, avatar_url)
    `
    )
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
export async function shareWeaponWithTeam(userWeaponId: string, teamId: string): Promise<UserWeapon> {
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
    .select(
      `
      *,
      base_weapon:weapons(*),
      user:profiles!user_weapons_user_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('shared_with_team_id', teamId)
    .eq('share_status', 'pending');

  if (error) throw error;
  return data || [];
}

/**
 * Get weapons the current user has shared with teams
 */
export async function getMySharedWeapons(): Promise<UserWeapon[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
export async function getOrCreatePersonalProfile(teamWeaponId: string): Promise<UserWeapon> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

// ============================================================================
// WEAPON REQUESTS (Soldier requests weapon from commander)
// ============================================================================

export type WeaponRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface WeaponRequest {
  id: string;
  team_id: string;
  user_id: string;
  requested_weapon_id: string | null;
  weapon_category: WeaponCategory | null;
  notes: string | null;
  status: WeaponRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  user?: { id: string; full_name: string; avatar_url: string | null };
  requested_weapon?: TeamWeapon;
}

export interface ArmoryOverviewData {
  assignedWeapons: TeamWeapon[];
  poolWeapons: TeamWeapon[];
  unassignedWeapons: TeamWeapon[];
  pendingRequests: WeaponRequest[];
  pendingContributions: UserWeapon[];
  myAssignment: TeamWeapon | null;
  myPendingRequest: WeaponRequest | null;
}

/**
 * Create a weapon request (soldier requests weapon from commander)
 */
export async function createWeaponRequest(request: {
  team_id: string;
  weapon_category?: WeaponCategory;
  notes?: string;
}): Promise<WeaponRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weapon_requests')
    .insert({
      team_id: request.team_id,
      user_id: user.id,
      weapon_category: request.weapon_category || null,
      notes: request.notes || null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel a pending weapon request
 */
export async function cancelWeaponRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('weapon_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

/**
 * Get all pending weapon requests for a team (for commanders)
 */
export async function getPendingWeaponRequests(teamId: string): Promise<WeaponRequest[]> {
  const { data, error } = await supabase
    .from('weapon_requests')
    .select(
      `
      *,
      user:profiles!weapon_requests_user_id_fkey(id, full_name, avatar_url),
      requested_weapon:team_weapons(*)
    `
    )
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  // Return empty array if table doesn't exist yet
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }
  return data || [];
}

/**
 * Get current user's pending request for a team
 */
export async function getMyPendingRequest(teamId: string): Promise<WeaponRequest | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('weapon_requests')
    .select('*')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  // Return null if table doesn't exist yet
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return null;
    }
    throw error;
  }
  return data;
}

/**
 * Approve a weapon request and assign a weapon
 */
export async function approveWeaponRequest(
  requestId: string,
  assignWeaponId: string
): Promise<{ request: WeaponRequest; assignment: TeamWeapon }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the request first
  const { data: request, error: fetchError } = await supabase
    .from('weapon_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;
  if (!request) throw new Error('Request not found');

  // Check if user already has a weapon assigned and unassign it first
  // Note: Must match the same filters as assignTeamWeapon (is_active only, no deleted_at)
  console.log('[approveWeaponRequest] Checking existing weapon for user:', request.user_id, 'team:', request.team_id);
  const { data: existingWeapon, error: checkError } = await supabase
    .from('team_weapons')
    .select('id, name')
    .eq('team_id', request.team_id)
    .eq('assigned_to', request.user_id)
    .eq('is_active', true)
    .maybeSingle();

  console.log('[approveWeaponRequest] Existing weapon check:', existingWeapon, 'error:', checkError?.message);

  if (existingWeapon) {
    // Unassign existing weapon before assigning new one
    console.log('[approveWeaponRequest] Unassigning existing weapon:', existingWeapon.id, existingWeapon.name);
    await unassignTeamWeapon(existingWeapon.id);
  }

  // Update request status
  const { data: updatedRequest, error: updateError } = await supabase
    .from('weapon_requests')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  // Assign the weapon to the user
  const assignment = await assignTeamWeapon(assignWeaponId, request.user_id);

  return { request: updatedRequest, assignment };
}

/**
 * Reject a weapon request
 */
export async function rejectWeaponRequest(requestId: string, reviewNotes?: string): Promise<WeaponRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('weapon_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
    })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// POOL WEAPONS
// ============================================================================

/**
 * Set whether a team weapon is available in the shared pool
 */
export async function setWeaponPoolAvailable(teamWeaponId: string, poolAvailable: boolean): Promise<TeamWeapon> {
  const { data, error } = await supabase
    .from('team_weapons')
    .update({
      pool_available: poolAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq('id', teamWeaponId)
    .select('*, base_weapon:weapons(*)')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all pool weapons for a team (available to all members)
 */
export async function getPoolWeapons(teamId: string): Promise<TeamWeapon[]> {
  const { data, error } = await supabase
    .from('team_weapons')
    .select('*, base_weapon:weapons(*)')
    .eq('team_id', teamId)
    .eq('pool_available', true)
    .eq('is_active', true)
    .order('name');

  // Return empty array if column doesn't exist yet
  if (error) {
    if (error.code === '42703' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }
  return data || [];
}

// ============================================================================
// SOLDIER WEAPON DATA
// ============================================================================

/**
 * Get the current user's assigned weapon in a team
 */
export async function getTeamWeaponForUser(teamId: string): Promise<TeamWeapon | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log('[getTeamWeaponForUser] No user');
    return null;
  }

  console.log('[getTeamWeaponForUser] Fetching for user:', user.id, 'team:', teamId);

  const { data, error } = await supabase
    .from('team_weapons')
    .select('*, base_weapon:weapons(*)')
    .eq('team_id', teamId)
    .eq('assigned_to', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.log('[getTeamWeaponForUser] Error:', error.message);
    return null;
  }

  console.log('[getTeamWeaponForUser] Result:', data ? data.name : 'null');
  return data as TeamWeapon | null;
}

// ARMORY OVERVIEW
// ============================================================================

/**
 * Get comprehensive armory overview data for a team
 * Returns different data based on user role
 */
export async function getArmoryOverview(teamId: string): Promise<ArmoryOverviewData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Parallel fetch all data
  const [allTeamWeapons, pendingRequests, pendingContributions, myPendingRequest] = await Promise.all([
    getTeamWeaponsWithAssignments(teamId),
    getPendingWeaponRequests(teamId),
    getPendingSharedWeapons(teamId),
    getMyPendingRequest(teamId),
  ]);

  // Categorize weapons
  const assignedWeapons = allTeamWeapons.filter((w) => w.assigned_to != null);
  const poolWeapons = allTeamWeapons.filter((w) => w.pool_available === true && w.assigned_to == null);
  const unassignedWeapons = allTeamWeapons.filter((w) => w.assigned_to == null && !w.pool_available);
  const myAssignment = allTeamWeapons.find((w) => w.assigned_to === user.id) || null;

  return {
    assignedWeapons,
    poolWeapons,
    unassignedWeapons,
    pendingRequests,
    pendingContributions: pendingContributions as UserWeapon[],
    myAssignment,
    myPendingRequest,
  };
}

// ============================================================================
// WEAPON STATISTICS
// ============================================================================

export async function getWeaponStats(): Promise<Map<string, WeaponStats>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  // Get all sessions with weapon_id for current user
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(
      `
      id,
      weapon_id,
      started_at,
      status
    `
    )
    .eq('user_id', user.id)
    .not('weapon_id', 'is', null);

  if (error) {
    console.error('[getWeaponStats] Error fetching sessions:', error);
    return new Map();
  }

  if (!sessions || sessions.length === 0) return new Map();

  // Group sessions by weapon_id
  const weaponSessions = new Map<
    string,
    {
      sessions: typeof sessions;
      lastUsed: string | null;
    }
  >();

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
    .select(
      `
      session_id,
      paper_target_results(bullets_fired, hits_total, dispersion_cm),
      tactical_target_results(bullets_fired, hits)
    `
    )
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
  const weaponAggregates = new Map<
    string,
    {
      rounds: number;
      hits: number;
      bestDispersion: number | null;
    }
  >();

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

/**
 * Get the most recently updated weapon ID for a user.
 */
export async function getMostRecentUserWeaponId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_weapons')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[weaponService] getMostRecentUserWeaponId error:', error);
    throw error;
  }

  return data?.[0]?.id ?? null;
}

/**
 * Get the current user's most recent weapon ID.
 * Uses RLS - no userId parameter needed. Can run in parallel with auth check.
 */
export async function getMyMostRecentWeaponId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_weapons')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[weaponService] getMyMostRecentWeaponId error:', error);
    throw error;
  }

  return data?.[0]?.id ?? null;
}
