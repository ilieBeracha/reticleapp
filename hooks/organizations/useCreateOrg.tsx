import { useOrganizationList } from "@clerk/clerk-expo";
import { useCallback, useState } from "react";

export default function useCreateOrg() {
  const { isLoaded, createOrganization } = useOrganizationList();
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
      setOrganizationName("");
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, [organizationName, isLoaded, createOrganization]);

  return {
    organizationName,
    setOrganizationName,
    isLoaded,
    isSubmitting,
    canSubmit,
    createOrg,
  };
}
