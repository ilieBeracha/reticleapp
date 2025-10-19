import { useSupabaseClient } from "@/lib/supabase";
import {
  CreateTrainingInput,
  Training,
  UpdateTrainingInput,
} from "@/types/database";
import { useAuth, useOrganization } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";

export function useTrainings() {
  const { getAuthenticatedClient } = useSupabaseClient();
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch trainings
  const fetchTrainings = useCallback(async () => {
    if (!organization) {
      setError("No active organization");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const client = await getAuthenticatedClient();
      const { data, error: fetchError } = await client
        .from("trainings")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setTrainings(data || []);
    } catch (err: any) {
      console.error("Error fetching trainings:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organization, getAuthenticatedClient]);

  // Create training
  const createTraining = useCallback(
    async (input: CreateTrainingInput) => {
      if (!userId || !organization) {
        throw new Error("Not authenticated or no active organization");
      }

      try {
        const client = await getAuthenticatedClient();

        const { data, error: insertError } = await client
          .from("trainings")
          .insert({
            ...input,
            organization_id: organization.id,
            created_by: userId,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Add to local state
        setTrainings((prev) => [data, ...prev]);

        return data as Training;
      } catch (err: any) {
        console.error("Error creating training:", err);
        throw err;
      }
    },
    [userId, organization, getAuthenticatedClient]
  );

  // Update training
  const updateTraining = useCallback(
    async (trainingId: string, input: UpdateTrainingInput) => {
      if (!userId || !organization) {
        throw new Error("Not authenticated or no active organization");
      }

      try {
        const client = await getAuthenticatedClient();

        const { data, error: updateError } = await client
          .from("trainings")
          .update(input)
          .eq("id", trainingId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state
        setTrainings((prev) =>
          prev.map((training) => (training.id === trainingId ? data : training))
        );

        return data as Training;
      } catch (err: any) {
        console.error("Error updating training:", err);
        throw err;
      }
    },
    [userId, organization, getAuthenticatedClient]
  );

  // Delete training
  const deleteTraining = useCallback(
    async (trainingId: string) => {
      if (!userId || !organization) {
        throw new Error("Not authenticated or no active organization");
      }

      try {
        const client = await getAuthenticatedClient();

        const { error: deleteError } = await client
          .from("trainings")
          .delete()
          .eq("id", trainingId);

        if (deleteError) throw deleteError;

        // Remove from local state
        setTrainings((prev) =>
          prev.filter((training) => training.id !== trainingId)
        );
      } catch (err: any) {
        console.error("Error deleting training:", err);
        throw err;
      }
    },
    [userId, organization, getAuthenticatedClient]
  );

  // Fetch trainings on mount or when dependencies change
  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  return {
    trainings,
    loading,
    error,
    fetchTrainings,
    createTraining,
    updateTraining,
    deleteTraining,
  };
}
