// components/OrgSwitcher.tsx
import { useOrganization, useOrganizationList } from "@clerk/clerk-expo";
import { Button, View } from "react-native";

export function OrgSwitcher() {
  const { organization } = useOrganization();
  const { userMemberships, setActive, isLoaded } = useOrganizationList();

  if (!isLoaded || !setActive) {
    return null;
  }

  return (
    <View>
      {userMemberships.data?.map((m) => (
        <Button
          key={m.organization.id}
          title={`${m.organization.name}${
            organization?.id === m.organization.id ? " ✓" : ""
          }`}
          onPress={() => setActive!({ organization: m.organization.id })}
        />
      ))}
    </View>
  );
}
