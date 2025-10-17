import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function Layout() {
  return (
    <View style={{ flex: 1 }}>
      <Header onNotificationPress={() => {}} />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="create-organization"
            options={{
              presentation: "modal",
              headerShown: true,
              headerTitle: "Create Organization",
            }}
          />
        </Stack>
      </View>
      <BottomNav onAddPress={() => {}} />
    </View>
  );
}
