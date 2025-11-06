// services/sessionStatsService.ts
import { supabase } from "@/lib/supabase";

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
  orgId?: string | null
): Promise<SessionStats[]> {
  try {
    let query = supabase
      .from("session_stats")
      .select("*")
      .order("started_at", { ascending: false });

    if (orgId) {
      // Get org sessions
      query = query.eq("organization_id", orgId);
    } else {
      // Get personal sessions
      query = query.eq("created_by", userId).is("organization_id", null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    throw new Error(error.message || "Failed to fetch sessions");
  }
}

// Get single session
export async function getSessionStat(sessionId: string): Promise<SessionStats | null> {
  try {
    const { data, error } = await supabase
      .from("session_stats")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error("Error fetching session:", error);
    throw new Error(error.message || "Failed to fetch session");
  }
}

// Create session
export async function createSessionStats(
  input: CreateSessionStatsInput,
  userId: string
): Promise<SessionStats> {
  try {
    const { data, error } = await supabase
      .from("session_stats")
      .insert({
        ...input,
        created_by: userId,
        is_squad: input.is_squad ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error("Error creating session:", error);
    throw new Error(error.message || "Failed to create session");
  }
}

// Update session
export async function updateSessionStats(
  sessionId: string,
  input: UpdateSessionStatsInput
): Promise<SessionStats> {
  try {
    const { data, error } = await supabase
      .from("session_stats")
      .update(input)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error("Error updating session:", error);
    throw new Error(error.message || "Failed to update session");
  }
}

// Delete session
export async function deleteSessionStats(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("session_stats")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;
  } catch (error: any) {
    console.error("Error deleting session:", error);
    throw new Error(error.message || "Failed to delete session");
  }
}

// End active session
export async function endSessionStats(sessionId: string): Promise<SessionStats> {
  try {
    const { data, error } = await supabase
      .from("session_stats")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error("Error ending session:", error);
    throw new Error(error.message || "Failed to end session");
  }
}

// Get active sessions (no ended_at)
export async function getActiveSessions(
  userId: string,
  orgId?: string | null
): Promise<SessionStats[]> {
  try {
    let query = supabase
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

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error fetching active sessions:", error);
    throw new Error(error.message || "Failed to fetch active sessions");
  }
}