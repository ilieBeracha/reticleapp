import { useAuth } from "@/contexts/AuthContext";
import { getTrainingsService } from "@/services/trainingService";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Training } from "@/types/database";
import { useCallback, useEffect, useState } from "react";

/**
 * Direct service hook for simple training fetching operations.
 *
 * Use this pattern when:
 * - You need simple read-only data fetching
 * - State is only used in a single component
 * - No complex business logic or transformations needed
 * - You want automatic refetching on context changes
 *
 * Use the store pattern (trainingsStore) when:
 * - State needs to be shared across multiple components
 * - Complex business logic or data transformations required
 * - Optimistic updates needed
 * - Manual cache invalidation required
 *
 * @returns Training data, loading state, error state, and refetch function
 *
 * @example
 * ```tsx
 * function TrainingsList() {
 *   const { trainings, loading, error, refetch } = useTrainings();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <TrainingList trainings={trainings} onRefresh={refetch} />;
 * }
 * ```
 */
export function useTrainings() {
  const { user } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainings = useCallback(async () => {
    if (!user?.id) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Direct service call - no token passing needed
      const data = await getTrainingsService(user?.id, selectedOrgId || null);

      setTrainings(data);
    } catch (err: any) {
      console.error("Error fetching trainings:", err);
      setError(err.message || "Failed to fetch trainings");
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedOrgId]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  return {
    trainings,
    loading,
    error,
    refetch: fetchTrainings,
  };
}
