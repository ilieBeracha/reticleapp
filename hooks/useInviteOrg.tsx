import { useAuth } from "@/contexts/AuthContext";
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
  const { selectedOrgId, userOrgContext } = useOrganizationsStore();
  const { user } = useAuth();
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

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email format");
      }

      // Get organization name from context
      if (!userOrgContext) {
        throw new Error("Organization not found");
      }

      // Map role to database role (soldier -> member)
      const dbRole = role === "soldier" ? "member" : role;

      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.functions.invoke("resend", {
          body: {
            email: email,
            organizationId: selectedOrgId,
            organizationName: userOrgContext.orgName,
            role: dbRole,
            invitedBy: user?.id,
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
    [emailAddress, selectedRole, selectedOrgId, user?.id, userOrgContext]
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
