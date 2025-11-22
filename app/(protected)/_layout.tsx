import { Header } from '@/components/Header';
import { WorkspaceSwitcherBottomSheet } from '@/components/modals';
import { UserMenuBottomSheet, UserMenuBottomSheetRef } from '@/components/modals/UserMenuBottomSheet';
import { useModals } from '@/contexts/ModalContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import { useRef } from 'react';

export default function ProtectedLayout() {
  const userMenuSheetRef = useRef<UserMenuBottomSheetRef>(null);
  const { workspaceSwitcherSheetRef, onWorkspaceSwitched } = useModals();
  const colors = useColors();
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitle: () => (
            <Header
              onNotificationPress={() => {}}
              onUserPress={() => userMenuSheetRef.current?.open()}
              onWorkspacePress={() => workspaceSwitcherSheetRef.current?.open()}
            />
          ),
          headerTitleAlign: 'left',
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="workspace" />
        <Stack.Screen name="settings" />
      </Stack>
      <UserMenuBottomSheet
        ref={userMenuSheetRef}
        onSettingsPress={() => {}}
        onSwitchOrgPress={() => {}}
      />
      <WorkspaceSwitcherBottomSheet
        ref={workspaceSwitcherSheetRef}
        onSettingsPress={() => {
          onWorkspaceSwitched?.();
        }}
      />

    </ThemeProvider>
  );
}
