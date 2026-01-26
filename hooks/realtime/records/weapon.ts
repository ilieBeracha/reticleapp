/**
 * Weapon Record Types
 *
 * Database record definitions for weapon requests and team weapons.
 */

export interface WeaponRequestRecord {
  id: string;
  team_id: string;
  user_id: string;
  weapon_category?: string | null;
  requested_weapon_id?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamWeaponRecord {
  id: string;
  team_id: string;
  name: string;
  category: string;
  caliber?: string | null;
  assigned_to?: string | null;
  pool_available: boolean;
  created_at: string;
  updated_at: string;
}
