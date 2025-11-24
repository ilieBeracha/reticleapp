import TrainingsPage from "@/components/organization/trainings";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/ui/useColors";
import React from "react";
import { ScrollView, StatusBar, StyleSheet, View } from "react-native";

const TrainingsScreen = React.memo(function TrainingsScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      >
        <TrainingsPage />
      </ScrollView>
    </View>
  );
});

export default TrainingsScreen;

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