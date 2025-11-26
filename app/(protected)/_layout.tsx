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
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import { useRef } from 'react';

/**
 * Protected Layout
 * 
 * This layout wraps all authenticated routes.
 * 
 * Route Structure:
 * - /(protected)/personal/* - Personal mode (no workspace)
 * - /(protected)/org/[workspaceId]/* - Organization mode (with workspace)
 * 
 * NOTE: OrgRoleProvider is now in org/_layout.tsx, NOT here.
 * This prevents unnecessary org-related code running in personal mode.
 */
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
    // Callback getters
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
        {/* Personal Mode Routes */}
        <Stack.Screen name="personal" options={{ headerShown: true }} />
        
        {/* Organization Mode Routes */}
        <Stack.Screen name="org" options={{ headerShown: true }} />
        
        {/* Legacy workspace routes - redirect to new structure */}
        <Stack.Screen 
          name="workspace" 
          options={{ headerShown: true }} 
        />
        
        {/* Liquid Glass Sheet - iOS 26+ native form sheet */}
        <Stack.Screen
          name="liquidGlassSheet"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: "transparent" },
            sheetAllowedDetents: [0.25, 0.5, 1],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: 0,
          }}
        />
      </Stack>

      {/* Global Sheets - Available in both modes */}
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
          getOnWorkspaceCreated()?.();
          createWorkspaceSheetRef?.current?.close();
        }}
      />
      <ComingSoonSheet
        ref={chartDetailsSheetRef}
        title="Detailed Analytics"
        subtitle="Get insights into your training patterns"
        icon="bar-chart"
      />
      <CreateSessionSheet
        ref={createSessionSheetRef}
        onSessionCreated={() => {
          getOnSessionCreated()?.();
          createSessionSheetRef?.current?.close();
        }}
      />
      <CreateTeamSheet
        ref={createTeamSheetRef}
        onTeamCreated={() => {
          getOnTeamCreated()?.();
          createTeamSheetRef?.current?.close();
        }}
      />
      <AcceptInviteSheet
        ref={acceptInviteSheetRef}
        onInviteAccepted={() => {
          getOnInviteAccepted()?.();
          acceptInviteSheetRef?.current?.close();
        }}
      />
      <InviteMembersSheet
        ref={inviteMembersSheetRef}
        onMemberInvited={() => {
          getOnMemberInvited()?.();
        }}
      />
      <TeamPreviewSheet
        ref={teamPreviewSheetRef}
        team={selectedTeam}
      />
      <MemberPreviewSheet
        ref={memberPreviewSheetRef}
        member={selectedMember}
      />
      <CreateTrainingSheet
        ref={createTrainingSheetRef}
        onTrainingCreated={() => {
          getOnTrainingCreated()?.();
          createTrainingSheetRef?.current?.close();
        }}
      />
      <TrainingDetailSheet
        ref={trainingDetailSheetRef}
        onTrainingUpdated={() => {
          getOnTrainingUpdated()?.();
        }}
      />
    </ThemeProvider>
  );
}
