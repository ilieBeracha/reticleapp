import { Header } from '@/components/Header';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { router, Stack } from 'expo-router';

/**
 * Protected Layout - Team-First Architecture
 * 
 * This layout wraps all authenticated routes.
 * All sheets are now native form sheets via Stack.Screen.
 * 
 * Route Structure:
 * - /(protected)/personal/* - Personal mode (training alone)
 * - /(protected)/team/* - Team mode (active team context)
 */
export default function ProtectedLayout() {
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
              onUserPress={() => router.push('/(protected)/userMenu')}
              onTeamPress={() => router.push('/(protected)/teamSwitcher')}
            />
          ),
          headerTitleAlign: 'left',
          headerTintColor: colors.text,
        }}
      >
        {/* Personal Mode Tabs */}
        <Stack.Screen 
          name="personal" 
          options={{ headerShown: true }}
        />
        
        {/* Team Mode Tabs */}
        <Stack.Screen
          name="team" 
          options={{ headerShown: true }}
        />
        
        {/* Team Switcher */}
        <Stack.Screen
          name="teamSwitcher"
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
        
        {/* Invite Team Member */}
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
        
        {/* Member Activity */}
        <Stack.Screen
          name="memberActivity"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
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

        {/* Session Detail - Sheet (TODO: create sessionDetail.tsx) */}
        {/* <Stack.Screen
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
        /> */}

        {/* Scans Gallery - Full screen */}
        <Stack.Screen
          name="scans"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
