import RadioButtonInput from "@/components/RadioButtonInput";
import TextInput from "@/components/TextInput";
import { useColors } from "@/hooks/useColors";
import { Control } from "react-hook-form";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

interface AccountFormProps {
  control: Control<any>;
  onSubmit: () => void;
}

export function AccountForm({
  control,
  onSubmit,
}: AccountFormProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <TextInput
        control={control}
        placeholder="Enter your full name"
        label="Full Name"
        required
        name="full_name"
      />

      <RadioButtonInput
        control={control}
        placeholder="Select your gender"
        label="Gender"
        required
        name="gender"
        options={[
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
          { label: "Other", value: "other" },
        ]}
      />

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: colors.indigo,
          },
        ]}
        onPress={onSubmit}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          Complete Account
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 20,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
