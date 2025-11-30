import { Header } from '@/components/Header';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { router, Stack } from 'expo-router';

/**
 * Protected Layout
 * 
 * This layout wraps all authenticated routes.
 * All sheets are now native form sheets via Stack.Screen.
 * 
 * Route Structure:
 * - /(protected)/personal/* - Personal mode (no workspace)
 * - /(protected)/org/* - Organization mode (store has activeWorkspaceId)
 */
export default function ProtectedLayout() {
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
              onUserPress={() => router.push('/(protected)/userMenu')}
              onWorkspacePress={() => router.push('/(protected)/workspaceSwitcher')}
            />
          ),
          headerTitleAlign: 'left',
          headerTintColor: colors.text,
        }}
      >
        {/* Personal Mode Routes */}
        <Stack.Screen name="personal" />
        
        {/* Organization Mode Routes */}
        <Stack.Screen name="org" />
        
        {/* Liquid Glass Sheet - iOS 26+ */}
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
        
        {/* Workspace Switcher */}
        <Stack.Screen
          name="workspaceSwitcher"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.5, 0.85, 1],
            sheetInitialDetentIndex: 1,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />
        
        {/* Accept Invite */}
        <Stack.Screen
          name="acceptInvite"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.6, 0.85],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
      />
        
        {/* Create Workspace */}
        <Stack.Screen
          name="createWorkspace"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.7, 0.9],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
        }}
      />
        
        {/* User Menu */}
        <Stack.Screen
          name="userMenu"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.5, 0.7],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />
        
        {/* Create Team */}
        <Stack.Screen
          name="createTeam"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.8, 0.95],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
        }}
      />
        
        {/* Create Training */}
        <Stack.Screen
          name="createTraining"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.85, 0.95],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
        }}
      />
        
        {/* Create Session */}
        <Stack.Screen
          name="createSession"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.9, 1],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
        }}
      />
        
        {/* Invite Members (legacy - can be removed later) */}
        <Stack.Screen
          name="inviteMembers"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.85, 0.95],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
        }}
      />
        
        {/* Invite Staff - Org-level roles */}
        <Stack.Screen
          name="inviteStaff"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.7, 0.85],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />
        
        {/* Invite Team Member - Team roles */}
        <Stack.Screen
          name="inviteTeamMember"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.85, 0.95],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />
        
        {/* Invite Attached - External users */}
        <Stack.Screen
          name="inviteAttached"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.75, 0.9],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />
        
        {/* Team Preview */}
        <Stack.Screen
          name="teamPreview"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.5, 0.7],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
      />
        
        {/* Member Preview */}
        <Stack.Screen
          name="memberPreview"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.6, 0.8],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
        }}
      />
        
        {/* Training Detail */}
        <Stack.Screen
          name="trainingDetail"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.85, 0.95],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
        }}
      />
        
        {/* Active Session - Full screen */}
        <Stack.Screen
          name="activeSession"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        
        {/* Training Live Dashboard - Full screen */}
        <Stack.Screen
          name="trainingLive"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: false,
            contentStyle: { backgroundColor: "#0A0A0A" },
          }}
        />
        
        {/* Add Target - Sheet */}
        <Stack.Screen
          name="addTarget"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: false,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.85, 0.95],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />

        {/* Session Detail - Sheet */}
        <Stack.Screen
          name="sessionDetail"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: "#0a0a0a" },
            sheetAllowedDetents: [0.9, 1],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
