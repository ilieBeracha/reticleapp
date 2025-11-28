import { Header } from '@/components/Header';
import { LoadingScreen } from '@/components/LoadingScreen';
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
import { useModals } from '@/contexts/ModalContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { router, Stack } from 'expo-router';
import { useRef } from 'react';

/**
 * Protected Layout
 * 
 * This layout wraps all authenticated routes.
 * 
 * Route Structure:
 * - /(protected)/personal/* - Personal mode (no workspace)
 * - /(protected)/org/* - Organization mode (store has activeWorkspaceId)
 * 
 * NOTE: OrgRoleProvider is now in org/_layout.tsx, NOT here.
 * This prevents unnecessary org-related code running in personal mode.
 */
export default function ProtectedLayout() {
  const userMenuSheetRef = useRef<UserMenuBottomSheetRef>(null);
  const { 
    // Sheet refs
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
    getOnWorkspaceCreated, 
    getOnInviteAccepted, 
    getOnTeamCreated, 
    getOnSessionCreated, 
    getOnMemberInvited,
    getOnTrainingCreated,
    getOnTrainingUpdated,
  } = useModals();
  const colors = useColors();
  const isSwitching = useWorkspaceStore(state => state.isSwitching);

  // Show full-screen loader when switching workspaces
  if (isSwitching) {
    return <LoadingScreen />;
  }

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
              onUserPress={() => router.push('/(protected)/liquidGlassSheet')}
              onWorkspacePress={() => router.push('/(protected)/workspaceSwitcher')}
            />
          ),
          headerTitleAlign: 'left',
          headerTintColor: colors.text,
        }}
      >
        {/* Personal Mode Routes - Tabs handle their own display */}
        <Stack.Screen name="personal" />
        
        {/* Organization Mode Routes - Tabs handle their own display */}
        <Stack.Screen name="org" />
        
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
        
        {/* Workspace Switcher - Native Form Sheet */}
        <Stack.Screen
          name="workspaceSwitcher"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.background + '44'},
            sheetAllowedDetents: [0.5, 0.85,1],
            sheetInitialDetentIndex: 1,
            sheetLargestUndimmedDetentIndex: 0,
          }}
        />
        
        {/* Accept Invite - Native Form Sheet */}
        <Stack.Screen
          name="acceptInvite"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.background + '44' },
            sheetAllowedDetents: [0.6, 0.85],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: 0,
          }}
        />
        
        {/* Create Workspace - Native Form Sheet */}
        <Stack.Screen
          name="createWorkspace"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.background + '44' },
            sheetAllowedDetents: [0.7, 0.9],
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
