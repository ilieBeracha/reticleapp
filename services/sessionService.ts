import { AuthenticatedClient } from "@/lib/authenticatedClient";
import { handleServiceError } from "@/lib/errors";
import {
  CreateSessionInput,
  Session,
  UpdateSessionInput,
} from "@/types/database";

/**
 * Get sessions based on context:
 * - If in Personal Workspace (no orgId): Get ALL user's sessions across all orgs
 * - If in Organization (has orgId): Get ALL team sessions from that org
 */
// New signature (recommended)
export async function getSessionsService(
  userId: string,
  orgId?: string | null,
  trainingId?: string
): Promise<Session[]>;
// Legacy signature for backward compatibility
export async function getSessionsService(
  token: string,
  userId: string,
  orgId?: string | null,
  trainingId?: string
): Promise<Session[]>;
export async function getSessionsService(
  userIdOrToken: string,
  orgIdOrUserId?: string | null,
  trainingIdOrOrgId?: string | null,
  legacyTrainingId?: string
): Promise<Session[]> {
  try {
    const client = await AuthenticatedClient.getClient();

    // Determine if this is legacy call (4 params) or new call (3 params)
    const isLegacyCall =
      arguments.length === 4 ||
      (arguments.length === 3 &&
        typeof trainingIdOrOrgId === "string" &&
        legacyTrainingId === undefined);

    let userId: string;
    let orgId: string | null | undefined;
    let trainingId: string | undefined;

    if (isLegacyCall && arguments.length === 4) {
      // Legacy: getSessionsService(token, userId, orgId, trainingId)
      userId = orgIdOrUserId as string;
      orgId = trainingIdOrOrgId;
      trainingId = legacyTrainingId;
    } else {
      // New: getSessionsService(userId, orgId, trainingId)
      userId = userIdOrToken;
      orgId = orgIdOrUserId;
      trainingId = trainingIdOrOrgId as string | undefined;
    }

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
    handleServiceError(err, "Failed to fetch sessions");
  }
}

// New signature (recommended)
export async function createSessionService(
  input: CreateSessionInput,
  userId: string,
  orgId: string | null
): Promise<Session>;
// Legacy signature for backward compatibility
export async function createSessionService(
  token: string,
  input: CreateSessionInput,
  userId: string,
  orgId: string | null
): Promise<Session>;
export async function createSessionService(
  inputOrToken: CreateSessionInput | string,
  userIdOrInput: string | CreateSessionInput,
  orgIdOrUserId: string | null,
  legacyOrgId?: string | null
): Promise<Session> {
  try {
    const client = await AuthenticatedClient.getClient();

    // Determine if this is legacy call (4 params) or new call (3 params)
    const isLegacyCall = arguments.length === 4;

    let input: CreateSessionInput;
    let userId: string;
    let orgId: string | null;

    if (isLegacyCall) {
      // Legacy: createSessionService(token, input, userId, orgId)
      input = userIdOrInput as CreateSessionInput;
      userId = orgIdOrUserId as string;
      orgId = legacyOrgId as string | null;
    } else {
      // New: createSessionService(input, userId, orgId)
      input = inputOrToken as CreateSessionInput;
      userId = userIdOrInput as string;
      orgId = orgIdOrUserId;
    }

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
    handleServiceError(err, "Failed to create session");
  }
}

// New signature (recommended)
export async function updateSessionService(
  sessionId: string,
  input: UpdateSessionInput
): Promise<Session>;
// Legacy signature for backward compatibility
export async function updateSessionService(
  token: string,
  sessionId: string,
  input: UpdateSessionInput
): Promise<Session>;
export async function updateSessionService(
  sessionIdOrToken: string,
  inputOrSessionId: UpdateSessionInput | string,
  legacyInput?: UpdateSessionInput
): Promise<Session> {
  try {
    const client = await AuthenticatedClient.getClient();

    // Determine if this is legacy call (3 params) or new call (2 params)
    const isLegacyCall = arguments.length === 3;

    let sessionId: string;
    let input: UpdateSessionInput;

    if (isLegacyCall) {
      // Legacy: updateSessionService(token, sessionId, input)
      sessionId = inputOrSessionId as string;
      input = legacyInput as UpdateSessionInput;
    } else {
      // New: updateSessionService(sessionId, input)
      sessionId = sessionIdOrToken;
      input = inputOrSessionId as UpdateSessionInput;
    }

    const { data, error } = await client
      .from("sessions")
      .update(input)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;

    return data as Session;
  } catch (err: any) {
    handleServiceError(err, "Failed to update session");
  }
}

// New signature (recommended)
export async function deleteSessionService(sessionId: string): Promise<void>;
// Legacy signature for backward compatibility
export async function deleteSessionService(
  token: string,
  sessionId: string
): Promise<void>;
export async function deleteSessionService(
  sessionIdOrToken: string,
  legacySessionId?: string
): Promise<void> {
  try {
    const client = await AuthenticatedClient.getClient();

    // Determine if this is legacy call (2 params) or new call (1 param)
    const isLegacyCall = arguments.length === 2;

    let sessionId: string;

    if (isLegacyCall) {
      // Legacy: deleteSessionService(token, sessionId)
      sessionId = legacySessionId as string;
    } else {
      // New: deleteSessionService(sessionId)
      sessionId = sessionIdOrToken;
    }

    const { error } = await client
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;
  } catch (err: any) {
    handleServiceError(err, "Failed to delete session");
  }
}
