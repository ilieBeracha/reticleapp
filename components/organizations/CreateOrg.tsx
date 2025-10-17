import useCreateOrg from "@/hooks/organizations/useCreateOrg";
import { Button, Modal, TextInput, View } from "react-native";

export default function CreateOrg({
  visible,
  setVisible,
}: {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}) {
  const { createOrg, isSubmitting, organizationName, setOrganizationName } =
    useCreateOrg();
  const handleCreate = async () => {
    setOrganizationName("dsadsadasd");
    const result = await createOrg();
    console.log(result);
    setVisible(false);
  };
  return (
    <Modal
      presentationStyle="formSheet"
      visible={visible}
      onRequestClose={() => setVisible(false)}
      animationType="slide"
    >
      <View style={{ height: "70%" }}>
        <TextInput
          value={organizationName}
          onChangeText={setOrganizationName}
          placeholder="Enter organization name"
        />
        <Button
          title="Create Organization"
          onPress={handleCreate}
          disabled={isSubmitting}
        />
      </View>
    </Modal>
  );
}
