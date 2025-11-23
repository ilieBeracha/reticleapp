import TrainingsPage from "@/components/organization/trainings";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/ui/useColors";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";

export default function TrainingsScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TrainingsPage />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});