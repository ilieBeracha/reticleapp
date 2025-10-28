import { getSessionsService } from "@/services/sessionService";
import { Session } from "@/types/database";
import { useAuth, useOrganization } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";

/**
 * Direct service hook for simple session fetching operations.
 *
 * Use this pattern when:
 * - You need simple read-only data fetching
 * - State is only used in a single component
 * - No complex business logic or transformations needed
 * - You want automatic refetching on context changes
 *
 * Use the store pattern (sessionsStore) when:
 * - State needs to be shared across multiple components
 * - Complex business logic or data transformations required
 * - Optimistic updates needed
 * - Manual cache invalidation required
 *
 * @param trainingId - Optional training ID to filter sessions
 * @returns Session data, loading state, error state, and refetch function
 *
 * @example
 * ```tsx
 * function SessionsList() {
 *   const { sessions, loading, error, refetch } = useSessionsQuery();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <SessionList sessions={sessions} onRefresh={refetch} />;
 * }
 * ```
 */
export function useSessionsQuery(trainingId?: string) {
  const { userId } = useAuth();
  const { organization } = useOrganization();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!userId) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Direct service call - no token passing needed
      const data = await getSessionsService(
        userId,
        organization?.id || null,
        trainingId
      );

      setSessions(data);
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      setError(err.message || "Failed to fetch sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, organization?.id, trainingId]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
  };
}
