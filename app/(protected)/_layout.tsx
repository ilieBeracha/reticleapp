import { Header } from '@/components/Header';
import { AcceptInviteSheet } from '@/components/modals/AcceptInviteSheet';
import { CreateSessionSheet } from '@/components/modals/CreateSessionSheet';
import { ProfessionalTeamSheet } from '@/components/modals/ProfessionalTeamSheet';
import { InviteMembersSheet } from '@/components/modals/InviteMembersSheet';
import { UserMenuBottomSheet, UserMenuBottomSheetRef } from '@/components/modals/UserMenuBottomSheet';
import { WorkspaceSwitcherBottomSheet, WorkspaceSwitcherRef } from '@/components/modals/WorkspaceSwitcherBottomSheet';
import { ModalProvider, useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { Stack } from 'expo-router';
import { useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function ProtectedLayoutContent() {
  const { background, text } = useColors();
  const { 
    createSessionSheetRef, 
    createTeamSheetRef, 
    inviteMembersSheetRef, 
    acceptInviteSheetRef 
  } = useModals();
  const userMenuRef = useRef<UserMenuBottomSheetRef>(null);
  const workspaceSwitcherRef = useRef<WorkspaceSwitcherRef>(null);

  return (
    <>
      <Stack
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
        <Stack.Screen name="index" options={{ headerShown: true }} />
        <Stack.Screen 
          name="org/[profileId]" 
          options={{ 
            headerShown: true,
            title: "Organization",
            animation: 'slide_from_right'
          }} 
        />
      </Stack>

      {/* Global Modals */}
      <UserMenuBottomSheet
        ref={userMenuRef}
        onSwitchOrgPress={() => workspaceSwitcherRef.current?.open()}
      />
      <WorkspaceSwitcherBottomSheet ref={workspaceSwitcherRef} />
      <CreateSessionSheet ref={createSessionSheetRef} />
      <ProfessionalTeamSheet ref={createTeamSheetRef} />
      <InviteMembersSheet ref={inviteMembersSheetRef} />
      <AcceptInviteSheet ref={acceptInviteSheetRef} />
    </>
  );
}

export default function ProtectedLayout() {
  return (

      <GestureHandlerRootView
        style={{ flex: 1 }}
      >
        <ModalProvider>
          <ProtectedLayoutContent />
        </ModalProvider>
      </GestureHandlerRootView>

  );
}