import { useOrganizationList } from "@clerk/clerk-expo";
import { useCallback, useState } from "react";

export default function useCreateOrg() {
  const { isLoaded, createOrganization, setActive, userMemberships } =
    useOrganizationList({
      userMemberships: {
        pageSize: 50,
      },
    });
  const [organizationName, setOrganizationName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    Boolean(organizationName.trim()) && isLoaded && !isSubmitting;

  const createOrg = useCallback(async () => {
    if (!organizationName.trim())
      throw new Error("Organization name cannot be empty.");
    if (!isLoaded) throw new Error("Clerk organization list not loaded.");
    setIsSubmitting(true);
    try {
      const result = await createOrganization({
        name: organizationName.trim(),
      });

      // Automatically set the new organization as active
      if (result && setActive) {
        await setActive({ organization: result.id });
      }

      // Refetch the organization list
      if (userMemberships?.revalidate) {
        await userMemberships.revalidate();
      }

      setOrganizationName("");
      return result;
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    organizationName,
    isLoaded,
    createOrganization,
    setActive,
    userMemberships,
  ]);

  return {
    organizationName,
    setOrganizationName,
    isLoaded,
    isSubmitting,
    canSubmit,
    createOrg,
  };
}
