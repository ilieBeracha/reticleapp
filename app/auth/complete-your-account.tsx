import { useThemeColor } from "@/hooks/useThemeColor";
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RadioButtonInput from "../../components/forms/RadioButtonInput";
import TextInput from "../../components/forms/TextInput";

const CompleteYourAccountScreen = () => {
  const { signUp, setActive } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const descriptionColor = useThemeColor({}, "description");

  const { control, handleSubmit, setError, setValue } = useForm({
    defaultValues: {
      full_name: "",
      username: "",
      gender: "",
    },
  });

  const onSubmit = async (data: any) => {
    const { full_name, username, gender } = data;

    try {
      setIsLoading(true);

      if (!signUp) {
        console.error("No signUp object found");
        return;
      }

      // Update the signup with missing fields
      await signUp.update({
        username: username,
        firstName: full_name.split(" ")[0],
        lastName: full_name.split(" ")[1] || "",
        unsafeMetadata: {
          gender,
          onboarding_completed: true,
        },
      });

      // After updating, the session should be created
      const { createdSessionId } = signUp;

      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace("/(home)");
      } else {
        console.error("Session not created after completing signup");
      }
    } catch (error: any) {
      console.error("Error completing account:", error);

      if (error.errors?.[0]?.code === "form_identifier_exists") {
        return setError("username", { message: "Username is already taken" });
      }

      if (error.message?.includes("username")) {
        return setError("username", { message: error.message });
      }

      return setError("full_name", { message: "An error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!signUp) {
      return;
    }

    // Pre-fill with data from OAuth provider
    setValue(
      "full_name",
      `${signUp.firstName || ""} ${signUp.lastName || ""}`.trim()
    );
    setValue("username", signUp.username || "");
    setValue("gender", String(signUp.unsafeMetadata?.gender) || "");
  }, [signUp]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom,
          backgroundColor,
        },
      ]}
    >
      <View style={styles.headingContainer}>
        <Text style={[styles.label, { color: textColor }]}>
          Complete your account
        </Text>
        <Text style={[styles.description, { color: descriptionColor }]}>
          Complete your account to start your journey with thousands of
          developers around the world.
        </Text>
      </View>

      <View style={styles.formContainer}>
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

        <View style={{ marginTop: 20 }}>
          <TouchableOpacity
            style={[styles.button, { opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : null}
            <Text style={styles.buttonText}>
              {isLoading ? "Loading..." : "Complete Account"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CompleteYourAccountScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  headingContainer: {
    width: "100%",
    gap: 5,
  },
  label: {
    fontSize: 20,
    fontWeight: "bold",
  },
  description: {
    fontSize: 16,
  },
  formContainer: {
    width: "100%",
    marginTop: 20,
    gap: 20,
  },
  textIput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "gray",
    borderRadius: 5,
    padding: 10,
    width: "100%",
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
