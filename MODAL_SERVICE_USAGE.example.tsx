// Example of how to use the new modal service in your layout or component

import { useModalService } from '@/services/modalService';

export default function SomeComponent() {
  // Get modal controls
  const openUserMenu = useModalService((state) => state.openUserMenu);
  const openWorkspaceSwitcher = useModalService((state) => state.openWorkspaceSwitcher);
  const openCreateSession = useModalService((state) => state.openCreateSession);
  const openTeamPreview = useModalService((state) => state.openTeamPreview);

  return (
    <View>
      {/* Open User Menu */}
      <TouchableOpacity onPress={openUserMenu}>
        <Text>Open User Menu</Text>
      </TouchableOpacity>

      {/* Open Workspace Switcher */}
      <TouchableOpacity onPress={openWorkspaceSwitcher}>
        <Text>Switch Workspace</Text>
      </TouchableOpacity>

      {/* Open Create Session */}
      <TouchableOpacity onPress={openCreateSession}>
        <Text>Start Session</Text>
      </TouchableOpacity>

      {/* Open Team Preview with data */}
      <TouchableOpacity onPress={() => openTeamPreview({ id: '123', name: 'Team Alpha' })}>
        <Text>View Team</Text>
      </TouchableOpacity>
    </View>
  );
}

// In your _layout.tsx, render the modals:
export default function ProtectedLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="workspace" />
      </Stack>

      {/* Render all modals - they manage their own open state */}
      <CreateSessionSheet />
      <CreateTeamSheet />
      <UserMenuBottomSheet />
      <WorkspaceSwitcherBottomSheet />
      {/* ... other modals */}
    </>
  );
}

