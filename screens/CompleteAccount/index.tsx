import { useColors } from "@/hooks/useColors";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccountForm } from "./components/AccountForm";
import { FormHeader } from "./components/FormHeader";
import { useAccountCompletion } from "./hooks/useAccountCompletion";

export function CompleteAccount() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const { control, handleSubmit, onSubmit, isLoading } = useAccountCompletion();

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
