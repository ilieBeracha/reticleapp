interface FormatOrgErrorOptions {
  fallback?: string;
  /**
   * Whether the error refers to the current user ("self") or another person ("target")
   * This lets us tailor the copy for invitations where the issue is with the invitee.
   */
  actor?: "self" | "target";
}

/**
 * Normalize organization related error messages into user-friendly copy.
 * Covers common constraint names and message fragments introduced by the
 * single-root membership rules.
 */
export function formatOrganizationError(
  error: unknown,
  options: FormatOrgErrorOptions = {}
): string {
  const fallback = options.fallback ?? "Something went wrong";
  const actor = options.actor ?? "self";

  if (!error) {
    return fallback;
  }

  const rawMessage =
    typeof error === "string"
      ? error
      : (error as { message?: string }).message ?? "";

  if (!rawMessage) {
    return fallback;
  }

  const message = rawMessage.trim();
  const normalized = message.toLowerCase();

  const actorPrefix = actor === "target" ? "They" : "You";

  if (
    normalized.includes("org_memberships_user_root_unique") ||
    normalized.includes("organization tree") ||
    normalized.includes("belongs to another organization")
  ) {
    return actor === "target"
      ? "That member already belongs to another organization tree. They need to leave it before joining this one."
      : "You already belong to another organization tree. Leave it before creating or joining another.";
  }

  if (
    normalized.includes("org_memberships_user_id_org_id_key") ||
    normalized.includes("already a member")
  ) {
    return actor === "target"
      ? "That member is already part of this organization."
      : "You are already a member of this organization.";
  }

  if (normalized.includes("organization not found")) {
    return "The organization could not be found. Please refresh and try again.";
  }

  return message;
}

