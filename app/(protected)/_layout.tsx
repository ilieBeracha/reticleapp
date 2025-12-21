import { Header } from '@/components/Header';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useGarminStore } from '@/store/garminStore';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

/**
 * Protected Layout - Unified Architecture
 * 
 * This layout wraps all authenticated routes.
 * 
 * Key change: No more "personal mode" vs "team mode".
 * Single unified tab bar at /(protected)/(tabs)/.
 * 
 * Route Structure:
 * - /(protected)/(tabs)/* - Main app tabs (Home, Trainings, Insights, Profile)
 * - /(protected)/teamDetail - Team detail/management sheet
 * - /(protected)/trainingDetail - Training detail sheet
 * - /(protected)/activeSession - Active session (full screen)
 * - etc.
 */
export default function ProtectedLayout() {
  const colors = useColors();
  const garminInitialize = useGarminStore((s) => s._initialize);
  
  // Register push notifications on authenticated user
  usePushNotifications();

  // Initialize Garmin SDK at app level so it persists across navigation
  useEffect(() => {
    const cleanup = garminInitialize();
    return cleanup;
  }, [garminInitialize]);

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
        
        {/* Unified Tabs */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: true,
            headerBackVisible: false,
          }}
        />
        
        {/* Profile Sheet - Quick profile access from header */}
        <Stack.Screen
          name="profileSheet"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.75, 0.92],
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
        
        {/* Team Detail - View/manage a specific team */}
        <Stack.Screen
          name="teamDetail"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.92, 1],
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

        {/* Team Members */}
        <Stack.Screen
          name="teamMembers"
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

        {/* Team Settings */}
        <Stack.Screen
          name="teamSettings"
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
        
        {/* Session Detail - Summary sheet */}
        <Stack.Screen
          name="sessionDetail"
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
        
        {/* Training Detail - Full screen */}
        <Stack.Screen
          name="trainingDetail"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
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

        {/* Drill Library - Card navigation from Team > Manage */}
        <Stack.Screen
          name="drillLibrary"
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
