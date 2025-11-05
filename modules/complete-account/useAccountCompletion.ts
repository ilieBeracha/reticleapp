import { useSignUp, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

interface AccountFormData {
  full_name: string;
  username: string;
  gender: string;
}

export function useAccountCompletion() {
  const { signUp, setActive } = useSignUp();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const { control, handleSubmit, setError, setValue } =
    useForm<AccountFormData>({
      defaultValues: {
        full_name: "",
        username: "",
        gender: "",
      },
    });

  // Pre-fill form with data from OAuth provider or existing user
  useEffect(() => {
    // If user is already signed in (OAuth case), use user data
    if (user) {
      setValue(
        "full_name",
        `${user.firstName || ""} ${user.lastName || ""}`.trim()
      );
      setValue("username", user.username || "");
      setValue("gender", String(user.unsafeMetadata?.gender) || "");
      return;
    }

    // Otherwise, use signUp data (traditional signup case)
    if (signUp) {
      setValue(
        "full_name",
        `${signUp.firstName || ""} ${signUp.lastName || ""}`.trim()
      );
      setValue("username", signUp.username || "");
      setValue("gender", String(signUp.unsafeMetadata?.gender) || "");
    }
  }, [user, signUp, setValue]);

  const onSubmit = async (data: AccountFormData) => {
    const { full_name, username, gender } = data;

    try {
      setIsLoading(true);

      // Case 1: User is already signed in via OAuth - just update user profile
      if (user) {
        console.log("User is signed in (OAuth), updating user profile:", {
          full_name,
          gender,
        });

        try {
          // For OAuth users, we can only update firstName, lastName, and metadata
          // Username is not required or used for OAuth users
          await user.update({
            firstName: full_name.split(" ")[0],
            lastName: full_name.split(" ")[1] || "",
            unsafeMetadata: {
              gender,
              onboarding_completed: true,
            },
          });

          console.log("User profile updated successfully");
          router.replace("/(protected)/(tabs)");
          return;
        } catch (updateError: any) {
          console.error("Error updating user profile:", updateError);
          throw updateError;
        }
      }

      // Case 2: Traditional signup flow - user not signed in yet
      if (!signUp) {
        console.error("No signUp or user object found");
        return;
      }

      console.log("Updating signup with data:", { username, full_name, gender });
      console.log("SignUp object before update:", {
        status: signUp.status,
        missingFields: signUp.missingFields,
      });

      // Update the signup with missing fields
      const updatedSignUp = await signUp.update({
        username: username,
        firstName: full_name.split(" ")[0],
        lastName: full_name.split(" ")[1] || "",
        unsafeMetadata: {
          gender,
          onboarding_completed: true,
        },
      });

      console.log("SignUp updated successfully");
      console.log("Status:", updatedSignUp.status);
      console.log("CreatedSessionId:", updatedSignUp.createdSessionId);

      // Check if the session was created
      if (updatedSignUp.createdSessionId) {
        console.log("Setting active session:", updatedSignUp.createdSessionId);
        await setActive!({ session: updatedSignUp.createdSessionId });
        router.replace("/(protected)/(tabs)");
      } else if (updatedSignUp.status === "complete") {
        // Try reloading to get the session
        console.log("Signup complete, reloading to get session");
        const reloadedSignUp = await signUp.reload();

        if (reloadedSignUp.createdSessionId) {
          await setActive!({ session: reloadedSignUp.createdSessionId });
          router.replace("/(protected)/(tabs)");
        } else {
          console.error("Session not created after signup completion");
        }
      } else {
        console.error("Signup incomplete. Status:", updatedSignUp.status);
        console.error("Missing fields:", updatedSignUp.missingFields);
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

  return {
    control,
    handleSubmit,
    onSubmit,
    isLoading,
  };
}
