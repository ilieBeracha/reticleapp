// hooks/useCreateOrg.ts
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useState } from "react";

export default function useCreateOrg() {
  const { userId } = useAuth();
  const { createRootOrg, fetchUserOrgs } = useOrganizationsStore();
  const { switchOrganization } = useOrganizationSwitch();

  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("Organization"); // Default type
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoaded = !!userId;
  const canSubmit =
    Boolean(organizationName.trim()) && isLoaded && !isSubmitting;

  const createOrg = useCallback(async () => {
    if (!organizationName.trim()) {
      throw new Error("Organization name cannot be empty.");
    }
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    setIsSubmitting(true);

    try {
      // Create root organization in hierarchy
      const result = await createRootOrg(
        {
          name: organizationName.trim(),
          orgType: organizationType.trim() || "Organization",
          description: description.trim() || undefined,
        },
        userId
      );

      if (!result) {
        throw new Error("Failed to create organization");
      }

      // Refresh user's org list
      await fetchUserOrgs(userId);

      // Automatically switch to the new organization
      await switchOrganization(result.id, result.name);

      // Clear form
      setOrganizationName("");
      setOrganizationType("Organization");
      setDescription("");

      return result;
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    organizationName,
    organizationType,
    description,
    userId,
    createRootOrg,
    fetchUserOrgs,
    switchOrganization,
  ]);

  return {
    organizationName,
    setOrganizationName,
    organizationType,
    setOrganizationType,
    description,
    setDescription,
    isLoaded,
    isSubmitting,
    canSubmit,
    createOrg,
  };
}
