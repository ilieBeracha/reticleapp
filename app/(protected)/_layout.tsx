import { Header } from '@/components/Header';
import { AcceptInviteSheet } from '@/components/modals/AcceptInviteSheet';
import { ComingSoonSheet } from '@/components/modals/ComingSoonSheet';
import { CreateSessionSheet } from '@/components/modals/CreateSessionSheet';
import { CreateTeamSheet } from '@/components/modals/CreateTeamSheet';
import { InviteMembersSheet } from '@/components/modals/InviteMembersSheet';
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
  const { 
    chartDetailsSheetRef, 
    createSessionSheetRef, 
    createTeamSheetRef,
    inviteMembersSheetRef,
    acceptInviteSheetRef,
    onSessionCreated,
    onTeamCreated,
    onMemberInvited,
    onInviteAccepted,
  } = useModals();

  return (
    <>
      <Stack 
        initialRouteName="index"
        screenOptions={{
          animation: 'none',
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
        <Stack.Screen name="workspace/personal" options={{ headerShown: true , animation: 'none'}} />
        <Stack.Screen name="workspace/organization" options={{ headerShown: true , animation: 'none'}} />
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

      {/* INVITE MEMBERS */}
      <InviteMembersSheet
        ref={inviteMembersSheetRef}
        onMemberInvited={() => {
          // Don't close the sheet - let user see the generated code
          // Call the registered callback if it exists
          if (onMemberInvited) {
            onMemberInvited();
          }
        }}
      />

      {/* ACCEPT INVITE */}
      <AcceptInviteSheet
        ref={acceptInviteSheetRef}
        onInviteAccepted={() => {
          acceptInviteSheetRef.current?.close();
          // Call the registered callback if it exists
          if (onInviteAccepted) {
            onInviteAccepted();
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
