import { AuthenticatedClient } from "@/lib/authenticatedClient";
import { handleServiceError } from "@/lib/errors";
import {
  CreateTrainingInput,
  Training,
  UpdateTrainingInput,
} from "@/types/database";

/**
 * Get trainings based on context:
 * - If in Personal Workspace (no orgId): Get ALL user's trainings across all orgs
 * - If in Organization (has orgId): Get ALL team trainings from that org
 *
 * @param userId - Current user ID (from Clerk)
 * @param orgId - Optional organization ID for org context
 * @returns Array of trainings
 */
export async function getTrainingsService(
  userId: string,
  orgId?: string | null
): Promise<Training[]> {
  try {
    const client = await AuthenticatedClient.getClient();

    let query = client
      .from("trainings")
      .select("*")
      .order("created_at", { ascending: false });

    // Context-based filtering
    if (orgId) {
      // IN ORGANIZATION: Get all team trainings from this org
      query = query.eq("org_id", orgId);
    } else {
      // IN PERSONAL: Get all MY trainings across all orgs
      query = query.eq("created_by", userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch trainings");
  }
}

/**
 * Create a new training
 *
 * @param input - Training data to create
 * @param userId - Current user ID (from Clerk)
 * @param orgId - Organization ID (required for trainings)
 * @returns Created training
 */
export async function createTrainingService(
  input: CreateTrainingInput,
  userId: string,
  orgId: string
): Promise<Training> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("trainings")
      .insert({
        ...input,
        org_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return data as Training;
  } catch (err: any) {
    handleServiceError(err, "Failed to create training");
  }
}

/**
 * Update an existing training (partial update)
 *
 * @param trainingId - Training ID to update
 * @param input - Partial training data to update
 * @returns Updated training
 */
export async function updateTrainingService(
  trainingId: string,
  input: UpdateTrainingInput
): Promise<Training> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("trainings")
      .update(input)
      .eq("id", trainingId)
      .select()
      .single();

    if (error) throw error;

    return data as Training;
  } catch (err: any) {
    handleServiceError(err, "Failed to update training");
  }
}

/**
 * Delete a training
 *
 * @param trainingId - Training ID to delete
 */
export async function deleteTrainingService(trainingId: string): Promise<void> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { error } = await client
      .from("trainings")
      .delete()
      .eq("id", trainingId);

    if (error) throw error;
  } catch (err: any) {
    handleServiceError(err, "Failed to delete training");
  }
}
