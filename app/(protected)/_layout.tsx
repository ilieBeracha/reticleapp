import { Header } from '@/components/Header';
import { UserMenuBottomSheet, UserMenuBottomSheetRef } from '@/components/modals/UserMenuBottomSheet';
import { WorkspaceSwitcherBottomSheet, WorkspaceSwitcherRef } from '@/components/modals/WorkspaceSwitcherBottomSheet';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import { useRef } from 'react';

export default function ProtectedLayout() {
  const { background, text } = useColors();
  const userMenuRef = useRef<UserMenuBottomSheetRef>(null);
  const workspaceSwitcherRef = useRef<WorkspaceSwitcherRef>(null);

  return (
    <>
      <Stack 
        initialRouteName="index"
        screenOptions={{
          headerStyle: { backgroundColor: background },
          headerShadowVisible: false,
          headerTitle: () => (
            <Header
              onNotificationPress={() => {}}
              onUserPress={() => userMenuRef.current?.open()}
              onWorkspacePress={() => workspaceSwitcherRef.current?.open()}
            />
          ),
          headerTitleAlign: 'left',
          headerTintColor: text,
        }}
      >
        <Stack.Screen name="modal" options={{ headerShown: false, presentation: 'modal', headerBlurEffect: 'light' }} />
        <Stack.Screen name="index" options={{ headerShown: true }} />
      </Stack>

      {/* USER MENU */}
      <UserMenuBottomSheet
        ref={userMenuRef}
        onSwitchOrgPress={() => workspaceSwitcherRef.current?.open()}
      />

      {/* WORKSPACE SWITCHER */}
      <WorkspaceSwitcherBottomSheet ref={workspaceSwitcherRef} />
    </>
  );
}
