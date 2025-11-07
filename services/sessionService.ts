// services/sessionStatsService.ts
import { AuthenticatedClient, DatabaseError, NotFoundError } from "@/lib/authenticatedClient";

export interface WeatherConditions {
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
  wind_direction?: string;
  conditions?: string; // sunny, cloudy, rainy, etc.
}

export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

export interface SessionStats {
  id: string;
  training_id?: string | null;
  organization_id?: string | null;
  name?: string | null;
  started_at: string;
  ended_at?: string | null;
  range_location?: string | null;
  weather?: WeatherConditions | null;
  day_period?: DayPeriod | null;
  is_squad: boolean;
  comments?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionStatsInput {
  training_id?: string | null;
  organization_id?: string | null;
  name?: string;
  started_at: string;
  ended_at?: string | null;
  range_location?: string;
  weather?: WeatherConditions | null;
  day_period?: DayPeriod | null;
  is_squad?: boolean;
  comments?: string;
}

export interface UpdateSessionStatsInput {
  training_id?: string | null;
  name?: string;
  started_at?: string;
  ended_at?: string | null;
  range_location?: string;
  weather?: WeatherConditions | null;
  day_period?: DayPeriod | null;
  is_squad?: boolean;
  comments?: string;
}

// Get all sessions (personal or org)
export async function getSessionStats(
  userId: string,
  orgId?: string | null,
  userOrgIds?: string[]
): Promise<SessionStats[]> {
  const client = await AuthenticatedClient.getClient();

  let query = client
    .from("session_stats")
    .select("*")
    .order("started_at", { ascending: false });

  if (orgId) {
    // Org mode: Get only sessions from selected organization
    query = query.eq("organization_id", orgId);
  } else {
    // Personal mode: Get sessions from all orgs user belongs to + personal sessions
    if (userOrgIds && userOrgIds.length > 0) {
      // Get sessions where org_id is in user's orgs OR where org_id is null (personal) and created by user
      query = query.or(`organization_id.in.(${userOrgIds.join(',')}),and(organization_id.is.null,created_by.eq.${userId})`);
    } else {
      // Fallback: just personal sessions
      query = query.eq("created_by", userId).is("organization_id", null);
    }
  }

  const { data, error } = await query;

  if (error) throw new DatabaseError(error.message);
  return data || [];
}

// Get single session
export async function getSessionStat(sessionId: string): Promise<SessionStats> {
  const client = await AuthenticatedClient.getClient();

  const { data, error } = await client
    .from("session_stats")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) throw new NotFoundError(`Session ${sessionId} not found`);
  return data;
}

// Create session
export async function createSessionStats(
  input: CreateSessionStatsInput,
  userId: string
): Promise<SessionStats> {
  const client = await AuthenticatedClient.getClient();

  const { data, error } = await client
    .from("session_stats")
    .insert({
      ...input,
      created_by: userId,
      is_squad: input.is_squad ?? false,
    })
    .select()
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}

// Update session
export async function updateSessionStats(
  sessionId: string,
  input: UpdateSessionStatsInput
): Promise<SessionStats> {
  const client = await AuthenticatedClient.getClient();

  const { data, error } = await client
    .from("session_stats")
    .update(input)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}

// Delete session
export async function deleteSessionStats(sessionId: string): Promise<void> {
  const client = await AuthenticatedClient.getClient();

  const { error } = await client
    .from("session_stats")
    .delete()
    .eq("id", sessionId);

  if (error) throw new DatabaseError(error.message);
}

// End active session
export async function endSessionStats(sessionId: string): Promise<SessionStats> {
  const client = await AuthenticatedClient.getClient();

  const { data, error } = await client
    .from("session_stats")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}

// Get active sessions (no ended_at)
export async function getActiveSessions(
  userId: string,
  orgId?: string | null
): Promise<SessionStats[]> {
  const client = await AuthenticatedClient.getClient();

  let query = client
    .from("session_stats")
    .select("*")
    .is("ended_at", null)
    .order("started_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  } else {
    query = query.eq("created_by", userId).is("organization_id", null);
  }

  const { data, error } = await query;

  if (error) throw new DatabaseError(error.message);
  return data || [];
}