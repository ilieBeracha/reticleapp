import { Header } from '@/components/Header';
import type { UserMenuBottomSheetRef } from '@/components/modals/UserMenuBottomSheet';
import { UserMenuBottomSheet } from '@/components/modals/UserMenuBottomSheet';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import { useRef } from 'react';

export default function ProtectedLayout() {
  const { background, text } = useColors();
  const userMenuRef = useRef<UserMenuBottomSheetRef>(null);

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handleUserPress = () => {
    userMenuRef.current?.open();
  };

  return (
    <>
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: {
            backgroundColor: background,
          },
          headerShadowVisible: false,
          headerTitle: () => (
            <Header 
              onNotificationPress={handleNotificationPress}
              onUserPress={handleUserPress}
            />
          ),
          headerTitleAlign: 'left',
          headerTintColor: text,
        }}
      >
        <Stack.Screen name="modal" options={{ headerShown: false, presentation: 'modal', headerBlurEffect: 'light' }} />
        <Stack.Screen name="index" options={{ headerShown: true }} />
      </Stack>

      {/* Bottom sheet rendered at layout level - above everything */}
      <UserMenuBottomSheet ref={userMenuRef} />
    </>
  );
}
