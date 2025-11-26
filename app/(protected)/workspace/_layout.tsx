import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Redirect } from 'expo-router';

/**
 * DEPRECATED: Legacy Workspace Layout
 * 
 * This layout now redirects to the new route structure:
 * - Personal mode: /(protected)/personal
 * - Org mode: /(protected)/org/[workspaceId]
 * 
 * This file exists to handle any stale navigation to old routes.
 */
export default function LegacyWorkspaceLayout() {
  const { activeWorkspaceId } = useWorkspaceStore();

  // Redirect to appropriate new route
  if (activeWorkspaceId) {
    return <Redirect href={`/(protected)/org/${activeWorkspaceId}` as any} />;
  }
  
  return <Redirect href="/(protected)/personal" />;
}
