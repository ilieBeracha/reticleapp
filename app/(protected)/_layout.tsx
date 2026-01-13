import { Header } from '@/components/shared/Header';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { useOrphanedSessionCheck } from '@/hooks/useOrphanedSessionCheck';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useGarminInitialize } from '@/store/garminStore';
import { router, Stack } from 'expo-router';

export default function ProtectedLayout() {
  const colors = useColors();
  useGarminInitialize();
  usePushNotifications();
  useOrphanedSessionCheck();


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
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: true,
            headerBackVisible: false,
          }}
        />
        
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
        
        <Stack.Screen
          name="createSession"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.background },
            sheetAllowedDetents: [0.9, 1],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
        }}
      />
        
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
        
        <Stack.Screen
          name="memberActivity"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        
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
        
        <Stack.Screen
          name="trainingDetail"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        
        <Stack.Screen
          name="activeSession"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
        
        <Stack.Screen
          name="trainingLive"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: false,
            contentStyle: { backgroundColor: "#0A0A0A" },
          }}
        />
        
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

        <Stack.Screen
          name="watchSessionResult"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />

        <Stack.Screen
          name="scans"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />

        <Stack.Screen
          name="drillLibrary"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />

        <Stack.Screen
          name="weaponDetail"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: true,
            contentStyle: { backgroundColor: colors.background },
          }}
        />

        <Stack.Screen
          name="sessionResults"
          options={{
            headerShown: false,
            presentation: "card",
            gestureEnabled: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />

        <Stack.Screen
          name="analysis"
          options={{
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.card },
            sheetAllowedDetents: [0.75, 1],
            sheetInitialDetentIndex: 0,
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />

        <Stack.Screen
          name="trainingReport"
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
