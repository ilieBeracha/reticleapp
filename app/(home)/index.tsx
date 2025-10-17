import CreateOrg from "@/components/organizations/CreateOrg";
import { useEnsureActiveOrg } from "@/hooks/organizations/useEnsureActiveOrg";
import { useOrganization } from "@clerk/clerk-expo";
import { useState } from "react";
import { Button, View } from "react-native";
export default function HomeScreen() {
  const { isLoaded, organization } = useOrganization();
  useEnsureActiveOrg();
  const [createOrgVisible, setCreateOrgVisible] = useState(false);
  return (
    <View>
      <Button
        title="Create Organization"
        onPress={() => setCreateOrgVisible(true)}
      />
      <CreateOrg visible={createOrgVisible} setVisible={setCreateOrgVisible} />
    </View>
  );
}
