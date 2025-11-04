import { supabase } from "@/lib/supabase";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useCallback, useState } from "react";
  
export type OrgRole =
  | "commander"
  | "soldier"
  | "viewer";
  

interface InviteOptions {
  emailAddress: string;
  role?: OrgRole;
}

export function useInviteOrg() {
  const { selectedOrgId } = useOrganizationsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState<OrgRole>("soldier");

  const canSubmit = Boolean(
    emailAddress.trim() &&
    selectedOrgId &&
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

      if (!selectedOrgId) {
        throw new Error("No active organization");
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email format");
      }

      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.functions.invoke("resend", {
          body: {
            to: email,
            organizationId: selectedOrgId,
          },
        });
        if (error) throw new Error(error.message);
        return data;
      } catch (error: any) {
        console.error("Error inviting member:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [emailAddress, selectedRole, selectedOrgId]
  );

  return {
    emailAddress,
    setEmailAddress,
    selectedRole,
    setSelectedRole,
    isSubmitting,
    canSubmit,
    inviteMember,
  };
}
