import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/ui/useColors";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

export default function MembersScreen() {
    const colors = useColors();
    const { theme } = useTheme();
    const themeMode = theme === 'dark' ? 'dark' : 'light';
    const barStyle = themeMode === 'dark' ? 'light-content' : 'dark-content';
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={barStyle} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Members</Text>
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