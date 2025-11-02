import { getLoadoutsService } from "@/services/loadoutsService";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { LoadoutWithDetails } from "@/types/database";
import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook for fetching and managing user loadouts
 *
 * @returns Loadouts data, loading state, error state, and refetch function
 */
export function useLoadouts() {
  const { userId } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();

  const [loadouts, setLoadouts] = useState<LoadoutWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoadouts = useCallback(async () => {
    if (!userId) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getLoadoutsService(userId, selectedOrgId);
      setLoadouts(data);
    } catch (err: any) {
      console.error("Error fetching loadouts:", err);
      setError(err.message || "Failed to fetch loadouts");
      setLoadouts([]);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedOrgId]);

  useEffect(() => {
    fetchLoadouts();
  }, [fetchLoadouts]);

  return {
    loadouts,
    loading,
    error,
    refetch: fetchLoadouts,
  };
}
