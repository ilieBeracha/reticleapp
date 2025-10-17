import BottomNav from "@/components/BottomNav";
import ActionMenu from "@/components/BottomNav/components/ActionMenu";
import Header from "@/components/Header";
import { Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

export default function Layout() {
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Header onNotificationPress={() => {}} />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="members" />
          <Stack.Screen name="stats" />
          <Stack.Screen name="calendar" />
        </Stack>
      </View>
      <BottomNav onAddPress={() => setActionMenuVisible(true)} />
      <ActionMenu
        visible={actionMenuVisible}
        onClose={() => setActionMenuVisible(false)}
      />
    </View>
  );
}
