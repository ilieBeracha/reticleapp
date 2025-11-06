import { AuthenticatedClient } from "@/lib/authenticatedClient";
import { DatabaseError, handleServiceError } from "@/lib/errors";

export interface Weapon {
  id: string;
  model_id: string | null;
  org_id: string | null;
  owner_user_id: string | null;
  serial_number: string | null;
  modifications: any;
  is_active: boolean;
  created_at: string;
}

export interface CreateWeaponInput {
  model_id: string;
  serial_number?: string;
  modifications?: any;
}

/**
 * Get weapons for current organization
 * @param orgId - Organization ID
 * @returns Array of weapons with model details
 */
export async function getWeaponsService(orgId: string): Promise<Weapon[]> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("weapons")
      .select("*, weapon_models(*)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("serial_number");

    if (error) throw new DatabaseError(error.message);
    return (data as Weapon[]) || [];
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch weapons");
  }
}

/**
 * Create a weapon in organization inventory
 * @param input - Weapon data
 * @param orgId - Organization ID
 * @param userId - User creating the weapon
 * @returns Created weapon
 */
export async function createWeaponService(
  input: CreateWeaponInput,
  orgId: string,
  userId: string
): Promise<Weapon> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("weapons")
      .insert({
        ...input,
        org_id: orgId,
        owner_user_id: userId,
      })
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data as Weapon;
  } catch (err: any) {
    handleServiceError(err, "Failed to create weapon");
  }
}

/**
 * Delete a weapon (soft delete)
 * @param weaponId - Weapon ID to delete
 */
export async function deleteWeaponService(weaponId: string): Promise<void> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { error } = await client
      .from("weapons")
      .update({ is_active: false })
      .eq("id", weaponId);

    if (error) throw new DatabaseError(error.message);
  } catch (err: any) {
    handleServiceError(err, "Failed to delete weapon");
  }
}

