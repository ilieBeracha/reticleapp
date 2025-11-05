import RadioButtonInput from "@/components/RadioButtonInput";
import TextInput from "@/components/TextInput";
import { useColors } from "@/hooks/useColors";
import { Control } from "react-hook-form";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AccountFormProps {
  control: Control<any>;
  onSubmit: () => void;
  isLoading: boolean;
  showUsername?: boolean;
}

export function AccountForm({
  control,
  onSubmit,
  isLoading,
  showUsername = true,
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

      {showUsername && (
        <TextInput
          placeholder="Enter your username"
          control={control}
          label="Username"
          required
          name="username"
        />
      )}

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
            opacity: isLoading ? 0.7 : 1,
          },
        ]}
        onPress={onSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading && <ActivityIndicator size="small" color="white" />}
        <Text style={styles.buttonText}>
          {isLoading ? "Completing..." : "Complete Account"}
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
