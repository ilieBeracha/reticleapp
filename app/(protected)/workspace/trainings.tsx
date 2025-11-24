import TrainingsPage from "@/components/organization/trainings";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/ui/useColors";
import React from "react";
import { StatusBar, StyleSheet, View } from "react-native";

const TrainingsScreen = React.memo(function TrainingsScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <TrainingsPage />
    </View>
  );
});

export default TrainingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});