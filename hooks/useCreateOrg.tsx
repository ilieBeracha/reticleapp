// hooks/useCreateOrg.ts
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useCallback, useState } from "react";

interface UseCreateOrgOptions {
  parentId?: string;
  autoSwitch?: boolean;
}

export default function useCreateOrg(options: UseCreateOrgOptions = {}) {
  const { parentId, autoSwitch = !parentId } = options;
  const { user } = useAuth();
  const { createRootOrg, createChildOrg, fetchUserOrgs } =
    useOrganizationsStore();
  const { switchOrganization } = useOrganizationSwitch();

  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("Organization"); // Default type
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoaded = !!user?.id;
  const canSubmit =
    Boolean(organizationName.trim()) && isLoaded && !isSubmitting;

  const createOrg = useCallback(async () => {
    if (!organizationName.trim()) {
      throw new Error("Organization name cannot be empty.");
    }
    if (!user?.id) {
      throw new Error("User not authenticated.");
    }

    setIsSubmitting(true);

    try {
      let result;

      if (parentId) {
        // Create child organization under parent
        result = await createChildOrg(
          {
            name: organizationName.trim(),
            orgType: organizationType.trim() || "Organization",
            parentId,
            description: description.trim() || undefined,
          },
          user?.id
        );
      } else {
        // Create root organization
        result = await createRootOrg(
          {
            name: organizationName.trim(),
            orgType: organizationType.trim() || "Organization",
            description: description.trim() || undefined,
          },
          user?.id
        );
      }

      if (!result) {
        throw new Error("Failed to create organization");
      }

      // Refresh user's org list
      await fetchUserOrgs(user?.id);

      // Conditionally switch to the new organization
      if (autoSwitch) {
        await switchOrganization(result.id, result.name);
      }

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
      user?.id,
      parentId,
      autoSwitch,
      createRootOrg,
      createChildOrg,
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
  };  

