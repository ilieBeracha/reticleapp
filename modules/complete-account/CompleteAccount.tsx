import { useColors } from "@/hooks/useColors";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { AccountForm } from "./AccountForm";
import { FormHeader } from "./FormHeader";
import { useAccountCompletion } from "./useAccountCompletion";

export function CompleteAccount() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user } = useUser();

  const { control, handleSubmit, onSubmit, isLoading } = useAccountCompletion();

  // For OAuth users (already signed in), don't show username field
  const showUsername = !user;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom,
          backgroundColor: colors.background,
        },
      ]}
    >
      <FormHeader />
      <AccountForm
        control={control}
        onSubmit={handleSubmit(onSubmit)}
        isLoading={isLoading}
        showUsername={showUsername}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
});
