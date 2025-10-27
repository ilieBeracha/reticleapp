import {
  CreateSessionStatsInput,
  SessionStats,
  UpdateSessionStatsInput,
} from "@/types/database";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to get authenticated Supabase client with token
function getAuthenticatedClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Get session stats based on context:
 * - If in Personal Workspace (no orgId): Get ALL user's stats across all orgs
 * - If in Organization (has orgId): Get ALL team stats from that org
 */
export async function getSessionStatsService(
  token: string,
  userId: string,
  orgId?: string | null,
  trainingId?: string
): Promise<SessionStats[]> {
  try {
    const client = getAuthenticatedClient(token);

    let query = client
      .from("session_stats")
      .select("*")
      .order("started_at", { ascending: false });

    // Context-based filtering
    if (orgId) {
      // IN ORGANIZATION: Get all team stats from this org
      query = query.eq("organization_id", orgId);
    } else {
      // IN PERSONAL: Get all MY stats across all orgs
      query = query.eq("created_by", userId);
    }

    // Optional: Filter by specific training
    if (trainingId) {
      query = query.eq("training_id", trainingId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    console.error("Error fetching session stats:", err);
    throw err;
  }
}

export async function createSessionStatsService(
  token: string,
  input: CreateSessionStatsInput,
  userId: string,
  orgId: string | null
): Promise<SessionStats> {
  try {
    const client = getAuthenticatedClient(token);

    const { data, error } = await client
      .from("session_stats")
      .insert({
        ...input,
        organization_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return data as SessionStats;
  } catch (err: any) {
    console.error("Error creating session stats:", err);
    throw err;
  }
}

export async function updateSessionStatsService(
  token: string,
  sessionStatsId: string,
  input: UpdateSessionStatsInput
): Promise<SessionStats> {
  try {
    const client = getAuthenticatedClient(token);

    const { data, error } = await client
      .from("session_stats")
      .update(input)
      .eq("id", sessionStatsId)
      .select()
      .single();

    if (error) throw error;

    return data as SessionStats;
  } catch (err: any) {
    console.error("Error updating session stats:", err);
    throw err;
  }
}

export async function deleteSessionStatsService(
  token: string,
  sessionStatsId: string
): Promise<void> {
  try {
    const client = getAuthenticatedClient(token);

    const { error } = await client
      .from("session_stats")
      .delete()
      .eq("id", sessionStatsId);

    if (error) throw error;
  } catch (err: any) {
    console.error("Error deleting session stats:", err);
    throw err;
  }
}

/**
 * Start a new session (set started_at timestamp)
 */
export async function startSessionStatsService(
  token: string,
  sessionStatsId: string
): Promise<SessionStats> {
  try {
    const client = getAuthenticatedClient(token);

    const { data, error } = await client
      .from("session_stats")
      .update({ started_at: new Date().toISOString() })
      .eq("id", sessionStatsId)
      .select()
      .single();

    if (error) throw error;

    return data as SessionStats;
  } catch (err: any) {
    console.error("Error starting session stats:", err);
    throw err;
  }
}

/**
 * End a session (set ended_at timestamp)
 */
export async function endSessionStatsService(
  token: string,
  sessionStatsId: string
): Promise<SessionStats> {
  try {
    const client = getAuthenticatedClient(token);

    const { data, error } = await client
      .from("session_stats")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionStatsId)
      .select()
      .single();

    if (error) throw error;

    return data as SessionStats;
  } catch (err: any) {
    console.error("Error ending session stats:", err);
    throw err;
  }
}
