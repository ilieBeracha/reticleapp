import { AuthenticatedClient } from "@/lib/authenticatedClient";
import { handleServiceError } from "@/lib/errors";
import { WeaponModel } from "@/types/database";

/**
 * Get all active weapon models
 * Weapon models are public reference data that don't require organization context
 *
 * @returns Array of active weapon models
 */
export async function getWeaponsModelsService(): Promise<WeaponModel[]> {
  try {
    const client = await AuthenticatedClient.getClient();
    // weapon_models is a public reference table, no org filter needed
    const { data, error } = await client
      .from("weapon_models")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data as WeaponModel[];
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch weapon models");
  }
}
