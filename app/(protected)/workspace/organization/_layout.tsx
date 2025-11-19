import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';

export default function OrganizationLayout() {
  const colors = useColors();
  const { isMyWorkspace, activeWorkspace } = useAppContext();

  // Debug logging
  useEffect(() => {
    console.log('🏢 Organization Layout:', {
      isMyWorkspace,
      workspaceType: activeWorkspace?.workspace_type,
      workspaceName: activeWorkspace?.workspace_name
    });
  }, [isMyWorkspace, activeWorkspace]);

  // Safety check: if somehow we're in personal workspace, redirect
  if (isMyWorkspace || activeWorkspace?.workspace_type === 'personal') {
    console.warn('⚠️ Organization layout loaded with personal workspace - redirecting');
    return <Redirect href="/(protected)/workspace/personal" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: -0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar-demo"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

