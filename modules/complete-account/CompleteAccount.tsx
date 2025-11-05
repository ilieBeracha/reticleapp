import { useColors } from "@/hooks/useColors";
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <FormHeader />
          <AccountForm
            control={control}
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isLoading}
            showUsername={showUsername}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
});
