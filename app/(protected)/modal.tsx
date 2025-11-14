import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
export default function modalScreen() {
  const { background } = useColors();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background, flex: 1, width: '100%', height: '100%'  }]}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Modal Screen</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});