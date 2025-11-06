import { Stack } from "expo-router";

export default function CameraLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false, 
      presentation: 'fullScreenModal',
      animation: 'fade',
      contentStyle: { backgroundColor: 'black' }
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false, 
          presentation: 'fullScreenModal',
          animation: 'fade',
          contentStyle: { backgroundColor: 'black' }
        }} 
      />
    </Stack>
  );
}   