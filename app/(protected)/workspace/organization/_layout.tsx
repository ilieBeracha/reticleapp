import { Stack } from 'expo-router';

export default function OrganizationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      {/* Future sub-routes can be added here */}
      {/* <Stack.Screen name="teams" /> */}
      {/* <Stack.Screen name="sessions" /> */}
      {/* <Stack.Screen name="settings" /> */}
      {/* <Stack.Screen name="members" /> */}
    </Stack>
  );
}

