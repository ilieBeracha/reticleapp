import Tabs from '@/components/withLayoutContext';
import { useColors } from '@/hooks/ui/useColors';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Organization Mode Tabs Layout
 * 
 * Dynamic route: /(protected)/org/[workspaceId]/
 * 
 * Tabs:
 * - Home (OrganizationHomePage)
 * - Trainings
 * - Manage
 * 
 * This layout also syncs the workspaceId param with the store.
 */

// Cross-platform icon helper
const getTabIcon = (
  sfSymbol: string,
  ionicon: keyof typeof Ionicons.glyphMap,
): any => {
  if (Platform.OS === 'ios') {
    return { sfSymbol };
  }
  return { ionicon };
};

export default function OrgWorkspaceLayout() {
  const colors = useColors();
  const { workspaceId } = useLocalSearchParams<{ workspaceId: string }>();
  const { workspaces, setActiveWorkspace, activeWorkspaceId } = useWorkspaceStore();

  // Validate workspace exists and sync with store
  const workspace = workspaces.find(w => w.id === workspaceId);
  
  useEffect(() => {
    // Sync the URL param with the store
    if (workspaceId && workspaceId !== activeWorkspaceId) {
      setActiveWorkspace(workspaceId);
    }
  }, [workspaceId, activeWorkspaceId, setActiveWorkspace]);

  // Redirect if workspace not found
  if (!workspace) {
    return <Redirect href="/(protected)/personal" />;
  }

  return (
    <Tabs
      key={`org-${workspaceId}`}
      rippleColor={colors.primary}
      sidebarAdaptable
      tabBarStyle={{ backgroundColor: colors.background }}
      activeIndicatorColor={colors.primary + '20'}
      tabBarActiveTintColor={colors.primary}
      tabBarInactiveTintColor={colors.textMuted}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => getTabIcon('house', focused ? 'home' : 'home-outline'),
        }}
      />

      <Tabs.Screen
        name="trainings"
        options={{
          title: 'Trainings',
          tabBarIcon: ({ focused }) => getTabIcon('target', focused ? 'fitness' : 'fitness-outline'),
        }}
      />

      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarIcon: ({ focused }) => getTabIcon('person.2.fill', focused ? 'people' : 'people-outline'),
        }}
      />
    </Tabs>
  );
}

