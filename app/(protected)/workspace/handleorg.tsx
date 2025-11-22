import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, Text, View } from "react-native";
export default function HandleOrganizationPage() {
    const colors = useColors();
    return (
    <View style={[styles.handleOrganizationContainer, { backgroundColor: colors.background }]}>
      <Text>Handle Organization</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  handleOrganizationContainer: {
    flex: 1,
  },
});