import { useOrganization } from "@clerk/clerk-expo";
import { useCallback, useState } from "react";

interface InviteOptions {
  emailAddress: string;
  role?: "org:admin" | "org:member";
}

export function useInviteOrg() {
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState<"org:admin" | "org:member">(
    "org:member"
  );

  const canSubmit = Boolean(
    emailAddress.trim() &&
      organization &&
      !isSubmitting &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress) // Basic email validation
  );

  const inviteMember = useCallback(
    async (options?: InviteOptions) => {
      const email = options?.emailAddress || emailAddress;
      const role = options?.role || selectedRole;

      if (!email.trim()) {
        throw new Error("Email address is required");
      }

      if (!organization) {
        throw new Error("No active organization");
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email format");
      }

      setIsSubmitting(true);
      try {
        const invitation = await organization.inviteMember({
          emailAddress: email.trim(),
          role,
        });

        // Clear form on success
        setEmailAddress("");
        setSelectedRole("org:member");

        return invitation;
      } catch (error: any) {
        console.error("Error inviting member:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [emailAddress, selectedRole, organization]
  );

  return {
    emailAddress,
    setEmailAddress,
    selectedRole,
    setSelectedRole,
    isSubmitting,
    canSubmit,
    inviteMember,
    organization,
  };
}
