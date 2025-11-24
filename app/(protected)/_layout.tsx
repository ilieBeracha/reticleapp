import { Header } from '@/components/Header';
import { AcceptInviteSheet } from '@/components/modals/AcceptInviteSheet';
import { ComingSoonSheet } from '@/components/modals/ComingSoonSheet';
import { CreateSessionSheet } from '@/components/modals/CreateSessionSheet';
import { CreateTeamSheet } from '@/components/modals/CreateTeamSheet';
import { CreateWorkspaceSheet } from '@/components/modals/CreateWorkspaceSheet';
import { InviteMembersSheet } from '@/components/modals/InviteMembersSheet';
import { MemberPreviewSheet } from '@/components/modals/MemberPreviewSheet';
import { TeamPreviewSheet } from '@/components/modals/TeamPreviewSheet';
import { UserMenuBottomSheet, UserMenuBottomSheetRef } from '@/components/modals/UserMenuBottomSheet';
import { WorkspaceSwitcherBottomSheet } from '@/components/modals/WorkspaceSwitcherBottomSheet';
import { useModals } from '@/contexts/ModalContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import { useRef } from 'react';

export default function ProtectedLayout() {
  const userMenuSheetRef = useRef<UserMenuBottomSheetRef>(null);
  const { workspaceSwitcherSheetRef, onWorkspaceSwitched, onWorkspaceCreated, createWorkspaceSheetRef, acceptInviteSheetRef, onInviteAccepted, createTeamSheetRef, onTeamCreated, createSessionSheetRef, onSessionCreated, chartDetailsSheetRef, inviteMembersSheetRef, onMemberInvited, teamPreviewSheetRef, selectedTeam, memberPreviewSheetRef, selectedMember } = useModals();
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
      <CreateWorkspaceSheet
        ref={createWorkspaceSheetRef}
        onWorkspaceCreated={() => {
          createWorkspaceSheetRef?.current?.close();
          // Call the registered callback if it exists
          if (onWorkspaceCreated) {
            onWorkspaceCreated();
          }
        }}
      />

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
          createSessionSheetRef?.current?.close();
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
          createTeamSheetRef?.current?.close();
          // Call the registered callback if it exists
          if (onTeamCreated) {
            onTeamCreated();
          }
        }}
      />

      {/* ACCEPT INVITE */}
      <AcceptInviteSheet
        ref={acceptInviteSheetRef}
        onInviteAccepted={() => {
          acceptInviteSheetRef?.current?.close();
          // Call the registered callback if it exists
          if (onInviteAccepted) {
            onInviteAccepted();
          }
        }}
      />

      {/* INVITE MEMBERS */}
      <InviteMembersSheet
        ref={inviteMembersSheetRef}
        onMemberInvited={() => {
          // Call the registered callback if it exists
          if (onMemberInvited) {
            onMemberInvited();
          }
        }}
      />

      {/* TEAM PREVIEW */}
      <TeamPreviewSheet
        ref={teamPreviewSheetRef}
        team={selectedTeam}
      />

      {/* MEMBER PREVIEW */}
      <MemberPreviewSheet
        ref={memberPreviewSheetRef}
        member={selectedMember}
      />

    </ThemeProvider>
  );
}
