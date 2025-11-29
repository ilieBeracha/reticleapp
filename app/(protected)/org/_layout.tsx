import Tabs from '@/components/withLayoutContext';
import { OrgRoleProvider } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

/**
 * Organization Mode Layout
 * 
 * Route: /(protected)/org/
 * 
 * SINGLE SOURCE OF TRUTH: The store's activeWorkspaceId
 * No URL param needed - the store decides which org is active.
 * 
 * Guards:
 * - Redirects to personal if no workspace selected
 * - Redirects to personal if selected workspace doesn't exist
 * 
 * Attached Members:
 * - Show only Home tab (simplified personal-like view)
 * - Hide Trainings and Manage tabs
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

// Inner layout component that uses permissions
function OrgTabs() {
  const colors = useColors();
  const { activeWorkspaceId } = useWorkspaceStore();
  const permissions = useWorkspacePermissions();
  
  // Role-based UI:
  // - Attached: Only "My Sessions" tab (personal-like experience)
  // - Team Member: "Home", "Trainings", "My Team" (team-focused, no management)
  // - Org Staff: "Home", "Trainings", "Manage" (full admin capabilities)
  
  const isAttached = permissions.isAttached;
  const isOrgStaff = permissions.canManageWorkspace; // owner, admin, instructor
  const isTeamMember = !isAttached && !isOrgStaff;

  // ATTACHED MEMBERS: Minimal single-tab view
  if (isAttached) {
    return (
      <Tabs
        key={`org-${activeWorkspaceId}-attached`}
        rippleColor={colors.primary}
        tabBarStyle={{ backgroundColor: colors.background }}
        activeIndicatorColor={colors.primary + '20'}
        tabBarActiveTintColor={colors.primary}
        tabBarInactiveTintColor={colors.textMuted}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'My Sessions',
            tabBarIcon: ({ focused }) => getTabIcon('house', focused ? 'home' : 'home-outline'),
          }}
        />
        <Tabs.Screen name="trainings" options={{ tabBarItemHidden: true }} />
        <Tabs.Screen name="manage" options={{ tabBarItemHidden: true }} />
      </Tabs>
    );
  }

  // TEAM MEMBERS: Team-focused view (no admin features)
  if (isTeamMember) {
    return (
      <Tabs
        key={`org-${activeWorkspaceId}-team`}
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
            title: 'My Team',
            tabBarIcon: ({ focused }) => getTabIcon('person.2.fill', focused ? 'people' : 'people-outline'),
          }}
        />
      </Tabs>
    );
  }

  // ORG STAFF: Full admin view
  return (
    <Tabs
      key={`org-${activeWorkspaceId}-admin`}
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
          tabBarIcon: ({ focused }) => getTabIcon('gearshape.fill', focused ? 'settings' : 'settings-outline'),
        }}
      />
    </Tabs>
  );
}

export default function OrgLayout() {
  const { workspaces, activeWorkspaceId, loading } = useWorkspaceStore();

  // Wait for workspaces to load
  if (loading) {
    return null;
  }

  // Must have an active workspace selected to be in org mode
  if (!activeWorkspaceId) {
    return <Redirect href="/(protected)/personal" />;
  }

  // Validate the active workspace exists
  const workspace = workspaces.find(w => w.id === activeWorkspaceId);
  if (!workspace) {
    return <Redirect href="/(protected)/personal" />;
  }

  return (
    <OrgRoleProvider>
      <OrgTabs />
    </OrgRoleProvider>
  );
}
