import { AuthenticatedClient } from "@/lib/authenticatedClient";
import { handleServiceError } from "@/lib/errors";
import {
    CreateLoadoutInput,
    LoadoutWithDetails,
    UpdateLoadoutInput,
    UserLoadout,
} from "@/types/database";

/**
 * Get user loadouts with full details (weapon and sight info)
 *
 * @param userId - Current user ID (from Clerk)
 * @param orgId - Optional organization ID for org context
 * @returns Array of loadouts with weapon and sight details
 */
export async function getLoadoutsService(
  userId: string,
  orgId?: string | null
): Promise<LoadoutWithDetails[]> {
  try {
    const client = await AuthenticatedClient.getClient();

    let query = client
      .from("user_loadouts")
      .select(
        `
        *,
        weapon:weapons(
          *,
          model:weapon_models(*)
        ),
        sight:sights(
          *,
          model:sight_models(*)
        )
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Context-based filtering
    if (orgId) {
      // IN ORGANIZATION: Get loadouts for this org
      query = query.eq("organization_id", orgId);
    } else {
      // IN PERSONAL: Get only MY loadouts
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as LoadoutWithDetails[]) || [];
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch loadouts");
  }
}

/**
 * Create a new loadout
 *
 * @param input - Loadout data to create
 * @param userId - Current user ID (from Clerk)
 * @param orgId - Optional organization ID
 * @returns Created loadout
 */
export async function createLoadoutService(
  input: CreateLoadoutInput,
  userId: string,
  orgId?: string | null
): Promise<UserLoadout> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("user_loadouts")
      .insert({
        ...input,
        user_id: userId,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) throw error;

    return data as UserLoadout;
  } catch (err: any) {
    handleServiceError(err, "Failed to create loadout");
  }
}

/**
 * Update an existing loadout
 *
 * @param loadoutId - Loadout ID to update
 * @param input - Partial loadout data to update
 * @returns Updated loadout
 */
export async function updateLoadoutService(
  loadoutId: string,
  input: UpdateLoadoutInput
): Promise<UserLoadout> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("user_loadouts")
      .update(input)
      .eq("id", loadoutId)
      .select()
      .single();

    if (error) throw error;

    return data as UserLoadout;
  } catch (err: any) {
    handleServiceError(err, "Failed to update loadout");
  }
}

/**
 * Delete a loadout (soft delete by setting is_active to false)
 *
 * @param loadoutId - Loadout ID to delete
 */
export async function deleteLoadoutService(loadoutId: string): Promise<void> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { error } = await client
      .from("user_loadouts")
      .update({ is_active: false })
      .eq("id", loadoutId);

    if (error) throw error;
  } catch (err: any) {
    handleServiceError(err, "Failed to delete loadout");
  }
}

/**
 * Get available weapons for the current organization
 *
 * @param orgId - Organization ID
 * @returns Array of weapons with their models
 */
export async function getOrganizationWeaponsService(
  orgId: string
): Promise<any[]> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("weapons")
      .select(
        `
        *,
        model:weapon_models(*)
      `
      )
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("serial_number");

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch organization weapons");
  }
}

/**
 * Get available sights for the current organization
 *
 * @param orgId - Organization ID
 * @returns Array of sights with their models
 */
export async function getOrganizationSightsService(
  orgId: string
): Promise<any[]> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("sights")
      .select(
        `
        *,
        model:sight_models(*)
      `
      )
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("serial_number");

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch organization sights");
  }
}
