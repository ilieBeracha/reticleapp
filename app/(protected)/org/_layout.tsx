import { OrgRoleProvider } from '@/contexts/OrgRoleContext';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Redirect, Stack } from 'expo-router';

/**
 * Organization Route Group Layout
 * 
 * This wraps all org routes with OrgRoleProvider.
 * The actual tabs are in [workspaceId]/_layout.tsx
 * 
 * Guards:
 * - Redirects to personal if no workspaces available
 */
export default function OrgLayout() {
  const { workspaces, loading } = useWorkspaceStore();

  // Wait for workspaces to load
  if (loading) {
    return null; // Or a loading screen
  }

  // If user has no workspaces, redirect to personal
  if (workspaces.length === 0) {
    return <Redirect href="/(protected)/personal" />;
  }

  return (
    <OrgRoleProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="[workspaceId]" />
      </Stack>
    </OrgRoleProvider>
  );
}

