import { AuthenticatedClient } from "@/lib/authenticatedClient";
import { DatabaseError, handleServiceError } from "@/lib/errors";

export interface Sight {
  id: string;
  model_id: string | null;
  org_id: string | null;
  owner_user_id: string | null;
  serial_number: string | null;
  calibration: any;
  is_active: boolean;
  created_at: string;
}

export interface CreateSightInput {
  model_id: string;
  serial_number?: string;
  calibration?: any;
}

/**
 * Get sights for current organization
 * @param orgId - Organization ID
 * @returns Array of sights with model details
 */
export async function getSightsService(orgId: string): Promise<Sight[]> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("sights")
      .select("*, sight_models(*)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("serial_number");

    if (error) throw new DatabaseError(error.message);
    return (data as Sight[]) || [];
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch sights");
  }
}

/**
 * Create a sight in organization inventory
 * @param input - Sight data
 * @param orgId - Organization ID
 * @param userId - User creating the sight
 * @returns Created sight
 */
export async function createSightService(
  input: CreateSightInput,
  orgId: string,
  userId: string
): Promise<Sight> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("sights")
      .insert({
        ...input,
        org_id: orgId,
        owner_user_id: userId,
      })
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data as Sight;
  } catch (err: any) {
    handleServiceError(err, "Failed to create sight");
  }
}

/**
 * Delete a sight (soft delete)
 * @param sightId - Sight ID to delete
 */
export async function deleteSightService(sightId: string): Promise<void> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { error } = await client
      .from("sights")
      .update({ is_active: false })
      .eq("id", sightId);

    if (error) throw new DatabaseError(error.message);
  } catch (err: any) {
    handleServiceError(err, "Failed to delete sight");
  }
}

