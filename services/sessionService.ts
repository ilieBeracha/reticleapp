import {
  CreateSessionInput,
  Session,
  UpdateSessionInput,
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
 * Get sessions based on context:
 * - If in Personal Workspace (no orgId): Get ALL user's sessions across all orgs
 * - If in Organization (has orgId): Get ALL team sessions from that org
 */
export async function getSessionsService(
  token: string,
  userId: string,
  orgId?: string | null,
  trainingId?: string
): Promise<Session[]> {
  try {
    const client = getAuthenticatedClient(token);

    let query = client
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });

    // Context-based filtering
    if (orgId) {
      // IN ORGANIZATION: Get all team sessions from this org
      query = query.eq("organization_id", orgId);
    } else {
      // IN PERSONAL: Get all MY sessions across all orgs
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
    console.error("Error fetching sessions:", err);
    throw err;
  }
}

export async function createSessionService(
  token: string,
  input: CreateSessionInput,
  userId: string,
  orgId: string | null
): Promise<Session> {
  try {
    const client = getAuthenticatedClient(token);

    const { data, error } = await client
      .from("sessions")
      .insert({
        ...input,
        organization_id: orgId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return data as Session;
  } catch (err: any) {
    console.error("Error creating session:", err);
    throw err;
  }
}

export async function updateSessionService(
  token: string,
  sessionId: string,
  input: UpdateSessionInput
): Promise<Session> {
  try {
    const client = getAuthenticatedClient(token);

    const { data, error } = await client
      .from("sessions")
      .update(input)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;

    return data as Session;
  } catch (err: any) {
    console.error("Error updating session:", err);
    throw err;
  }
}

export async function deleteSessionService(
  token: string,
  sessionId: string
): Promise<void> {
  try {
    const client = getAuthenticatedClient(token);

    const { error } = await client
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;
  } catch (err: any) {
    console.error("Error deleting session:", err);
    throw err;
  }
}
