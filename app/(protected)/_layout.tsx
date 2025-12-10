import { Header } from '@/components/Header';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePushNotifications } from '@/hooks/usePushNotifications';
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
  
  // Register push notifications on authenticated user
  usePushNotifications();

  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitle: () => (
            <Header
              onNotificationPress={() => router.push('/(protected)/notifications')}
              onUserPress={() => router.push('/(protected)/userMenu')}
              onTeamPress={() => router.push('/(protected)/teamSwitcher')}
            />
          ),
          headerTitleAlign: 'left',
          headerTintColor: colors.text,
        }}
      >
        {/* Index redirect - hide from stack */}
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        
        {/* Personal Mode Tabs */}
        <Stack.Screen 
          name="personal" 
          options={{ 
            headerShown: true,
            headerBackVisible: false,  // Never show back button on root tabs
          }}
        />
        
        {/* Team Mode Tabs */}
        <Stack.Screen
          name="team" 
          options={{ 
            headerShown: true,
            headerBackVisible: false,  // Never show back button on root tabs
          }}
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

        {/* Notifications */}
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.7, 0.95],
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

        {/* Scan Target - Paper only, opens camera directly */}
        <Stack.Screen
          name="scanTarget"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: false,
            contentStyle: { backgroundColor: "#0A0A0A" },
            sheetAllowedDetents: [1],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />

        {/* Tactical Target - Manual entry only */}
        <Stack.Screen
          name="tacticalTarget"
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
