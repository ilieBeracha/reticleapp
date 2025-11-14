import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import React from 'react';

export default function ProtectedLayout() {
  const { background, text } = useColors();
  const { user } = useAuth();
  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  return (
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: {
            backgroundColor: background,
          },
          headerShadowVisible: false,
          headerTitle: () => <Header onNotificationPress={handleNotificationPress} />,
          headerTitleAlign: 'left',
          headerTintColor: text,
          
        }}
      >
          <Stack.Screen name="modal" options={{ headerShown: false, presentation: 'modal', headerBlurEffect: 'light' }} />
          <Stack.Screen name="index" options={{ headerShown: true }} />
      </Stack>
  );
}
