import { Header } from '@/components/Header';
import { ComingSoonSheet } from '@/components/modals/ComingSoonSheet';
import { CreateSessionSheet } from '@/components/modals/CreateSessionSheet';
import { CreateTeamSheet } from '@/components/modals/CreateTeamSheet';
import { UserMenuBottomSheet, UserMenuBottomSheetRef } from '@/components/modals/UserMenuBottomSheet';
import { WorkspaceSwitcherBottomSheet, WorkspaceSwitcherRef } from '@/components/modals/WorkspaceSwitcherBottomSheet';
import { ModalProvider, useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import { useRef } from 'react';

function ProtectedLayoutContent() {
  const { background, text } = useColors();
  const userMenuRef = useRef<UserMenuBottomSheetRef>(null);
  const workspaceSwitcherRef = useRef<WorkspaceSwitcherRef>(null);
  
  // Get modal refs and callbacks from context
  const { 
    chartDetailsSheetRef, 
    createSessionSheetRef, 
    createTeamSheetRef,
    onSessionCreated,
    onTeamCreated,
  } = useModals();

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

      {/* CHART DETAILS */}
      <ComingSoonSheet
        ref={chartDetailsSheetRef}
        title="Detailed Analytics"
        subtitle="Get insights into your training patterns"
        icon="bar-chart"
      />

      {/* CREATE SESSION */}
      <CreateSessionSheet
        ref={createSessionSheetRef}
        onSessionCreated={() => {
          createSessionSheetRef.current?.close();
          // Call the registered callback if it exists
          if (onSessionCreated) {
            onSessionCreated();
          }
        }}
      />

      {/* CREATE TEAM */}
      <CreateTeamSheet
        ref={createTeamSheetRef}
        onTeamCreated={() => {
          createTeamSheetRef.current?.close();
          // Call the registered callback if it exists
          if (onTeamCreated) {
            onTeamCreated();
          }
        }}
      />
    </>
  );
}

export default function ProtectedLayout() {
  return (
    <ModalProvider>
      <ProtectedLayoutContent />
    </ModalProvider>
  );
}
