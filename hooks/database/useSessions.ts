import { useSupabaseClient } from "@/lib/supabase";
import {
  CreateSessionInput,
  Session,
  UpdateSessionInput,
} from "@/types/database";
import { useAuth, useOrganization } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";

export function useSessions(trainingId?: string) {
  const { getAuthenticatedClient } = useSupabaseClient();
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!organization) {
      setError("No active organization");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const client = await getAuthenticatedClient();
      let query = client.from("sessions").select("*").order("created_at", {
        ascending: false,
      });

      if (trainingId) {
        query = query.eq("training_id", trainingId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setSessions(data || []);
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organization, trainingId, getAuthenticatedClient]);

  // Create session
  const createSession = useCallback(
    async (input: CreateSessionInput) => {
      if (!userId || !organization) {
        throw new Error("Not authenticated or no active organization");
      }

      try {
        const client = await getAuthenticatedClient();

        const { data, error: insertError } = await client
          .from("sessions")
          .insert({
            ...input,
            organization_id: organization.id,
            created_by: userId,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Add to local state
        setSessions((prev) => [data, ...prev]);

        return data as Session;
      } catch (err: any) {
        console.error("Error creating session:", err);
        throw err;
      }
    },
    [userId, organization, getAuthenticatedClient]
  );

  // Update session
  const updateSession = useCallback(
    async (sessionId: string, input: UpdateSessionInput) => {
      if (!userId || !organization) {
        throw new Error("Not authenticated or no active organization");
      }

      try {
        const client = await getAuthenticatedClient();

        const { data, error: updateError } = await client
          .from("sessions")
          .update(input)
          .eq("id", sessionId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state
        setSessions((prev) =>
          prev.map((session) => (session.id === sessionId ? data : session))
        );

        return data as Session;
      } catch (err: any) {
        console.error("Error updating session:", err);
        throw err;
      }
    },
    [userId, organization, getAuthenticatedClient]
  );

  // Delete session
  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!userId || !organization) {
        throw new Error("Not authenticated or no active organization");
      }

      try {
        const client = await getAuthenticatedClient();

        const { error: deleteError } = await client
          .from("sessions")
          .delete()
          .eq("id", sessionId);

        if (deleteError) throw deleteError;

        // Remove from local state
        setSessions((prev) =>
          prev.filter((session) => session.id !== sessionId)
        );
      } catch (err: any) {
        console.error("Error deleting session:", err);
        throw err;
      }
    },
    [userId, organization, getAuthenticatedClient]
  );

  // Fetch sessions on mount or when dependencies change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
  };
}
