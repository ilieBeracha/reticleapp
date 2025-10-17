import RadioButtonInput from "@/components/forms/RadioButtonInput";
import TextInput from "@/components/forms/TextInput";
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
}

export function AccountForm({
  control,
  onSubmit,
  isLoading,
}: AccountFormProps) {
  return (
    <View style={styles.container}>
      <TextInput
        control={control}
        placeholder="Enter your full name"
        label="Full Name"
        required
        name="full_name"
      />

      <TextInput
        placeholder="Enter your username"
        control={control}
        label="Username"
        required
        name="username"
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { opacity: isLoading ? 0.7 : 1 }]}
          onPress={onSubmit}
          disabled={isLoading}
        >
          {isLoading && <ActivityIndicator size="small" color="white" />}
          <Text style={styles.buttonText}>
            {isLoading ? "Loading..." : "Complete Account"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 20,
    gap: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    width: "100%",
    backgroundColor: "#3b82f6",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
