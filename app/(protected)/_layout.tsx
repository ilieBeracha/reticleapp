import { Header } from '@/components/Header';
import { AcceptInviteSheet } from '@/components/modals/AcceptInviteSheet';
import { ComingSoonSheet } from '@/components/modals/ComingSoonSheet';
import { CreateSessionSheet } from '@/components/modals/CreateSessionSheet';
import { CreateTeamSheet } from '@/components/modals/CreateTeamSheet';
import { CreateTrainingSheet } from '@/components/modals/CreateTrainingSheet';
import { CreateWorkspaceSheet } from '@/components/modals/CreateWorkspaceSheet';
import { InviteMembersSheet } from '@/components/modals/InviteMembersSheet';
import { MemberPreviewSheet } from '@/components/modals/MemberPreviewSheet';
import { TeamPreviewSheet } from '@/components/modals/TeamPreviewSheet';
import { TrainingDetailSheet } from '@/components/modals/TrainingDetailSheet';
import { UserMenuBottomSheet, UserMenuBottomSheetRef } from '@/components/modals/UserMenuBottomSheet';
import { WorkspaceSwitcherBottomSheet } from '@/components/modals/WorkspaceSwitcherBottomSheet';
import { useModals } from '@/contexts/ModalContext';
import { OrgRoleProvider } from '@/contexts/OrgRoleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import { useRef } from 'react';

export default function ProtectedLayout() {
  const userMenuSheetRef = useRef<UserMenuBottomSheetRef>(null);
  const { 
    // Sheet refs
    workspaceSwitcherSheetRef, 
    createWorkspaceSheetRef, 
    acceptInviteSheetRef, 
    createTeamSheetRef, 
    createSessionSheetRef, 
    chartDetailsSheetRef, 
    inviteMembersSheetRef, 
    teamPreviewSheetRef, 
    memberPreviewSheetRef,
    createTrainingSheetRef,
    trainingDetailSheetRef,
    // Selected items
    selectedTeam, 
    selectedMember,
    // Callback getters - use these to get current callback value
    getOnWorkspaceSwitched, 
    getOnWorkspaceCreated, 
    getOnInviteAccepted, 
    getOnTeamCreated, 
    getOnSessionCreated, 
    getOnMemberInvited,
    getOnTrainingCreated,
    getOnTrainingUpdated,
  } = useModals();
  const colors = useColors();
  return (
    <ThemeProvider>
      <OrgRoleProvider>
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
        
        {/* Liquid Glass Sheet - iOS 26+ native form sheet */}
        <Stack.Screen
          name="liquidGlassSheet"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: "transparent" },
            sheetAllowedDetents: [0.25, 0.5, 1], // 25%, 50%, 100%
            sheetInitialDetentIndex: 0, // Start at smallest (25%)
            sheetLargestUndimmedDetentIndex: 0, // Background not dimmed at smallest
          }}
        />
      </Stack>
      <UserMenuBottomSheet
        ref={userMenuSheetRef}
        onSettingsPress={() => {}}
        onSwitchOrgPress={() => {}}
      />
      <WorkspaceSwitcherBottomSheet
        ref={workspaceSwitcherSheetRef}
        onSettingsPress={() => {
          getOnWorkspaceSwitched()?.();
        }}
      />
      <CreateWorkspaceSheet
        ref={createWorkspaceSheetRef}
        onWorkspaceCreated={() => {
          // Call callback FIRST to trigger refresh
          getOnWorkspaceCreated()?.();
          createWorkspaceSheetRef?.current?.close();
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
          // Call callback FIRST to trigger refresh
          getOnSessionCreated()?.();
          createSessionSheetRef?.current?.close();
        }}
      />

      {/* CREATE TEAM */}
      <CreateTeamSheet
        ref={createTeamSheetRef}
        onTeamCreated={() => {
          // Call callback FIRST to trigger refresh
          getOnTeamCreated()?.();
          createTeamSheetRef?.current?.close();
        }}
      />

      {/* ACCEPT INVITE */}
      <AcceptInviteSheet
        ref={acceptInviteSheetRef}
        onInviteAccepted={() => {
          // Call callback FIRST to trigger refresh
          getOnInviteAccepted()?.();
          acceptInviteSheetRef?.current?.close();
        }}
      />

      {/* INVITE MEMBERS */}
      <InviteMembersSheet
        ref={inviteMembersSheetRef}
        onMemberInvited={() => {
          // Call the registered callback if it exists
          getOnMemberInvited()?.();
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

      {/* CREATE TRAINING */}
      <CreateTrainingSheet
        ref={createTrainingSheetRef}
        onTrainingCreated={() => {
          // Call callback FIRST to trigger refresh
          getOnTrainingCreated()?.();
          createTrainingSheetRef?.current?.close();
        }}
      />

      {/* TRAINING DETAIL */}
      <TrainingDetailSheet
        ref={trainingDetailSheetRef}
        onTrainingUpdated={() => {
          // Call callback to trigger refresh
          getOnTrainingUpdated()?.();
        }}
      />

      </OrgRoleProvider>
    </ThemeProvider>
  );
}
