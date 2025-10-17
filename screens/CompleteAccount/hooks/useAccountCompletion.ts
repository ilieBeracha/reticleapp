import { useSignUp } from "@clerk/clerk-expo";
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

  // Pre-fill form with data from OAuth provider
  useEffect(() => {
    if (!signUp) {
      return;
    }

    setValue(
      "full_name",
      `${signUp.firstName || ""} ${signUp.lastName || ""}`.trim()
    );
    setValue("username", signUp.username || "");
    setValue("gender", String(signUp.unsafeMetadata?.gender) || "");
  }, [signUp, setValue]);

  const onSubmit = async (data: AccountFormData) => {
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

  return {
    control,
    handleSubmit,
    onSubmit,
    isLoading,
  };
}
