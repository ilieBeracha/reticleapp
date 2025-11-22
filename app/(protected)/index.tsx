import { useAppContext } from '@/hooks/useAppContext';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';

/**
 * HomePage Router
 * 
 * Redirects to the appropriate workspace route based on user's current workspace context.
 * 
 * - Personal Workspace (isMyWorkspace): Redirects to /workspace/personal
 * - Organization Workspace (!isMyWorkspace): Redirects to /workspace/organization (with sub-routes)
 */
export default function HomePage() {
  const { isMyWorkspace, activeWorkspaceId, activeWorkspace } = useAppContext();

  // Debug logging
  useEffect(() => {
    console.log('🏠 HomePage redirect:', {
      isMyWorkspace,
      activeWorkspaceId,
      workspaceType: activeWorkspace?.workspace_type,
      redirectTo: isMyWorkspace ? 'personal' : 'organization'
    });
  }, [isMyWorkspace, activeWorkspaceId, activeWorkspace]);

  return <Redirect href={isMyWorkspace ? '/(protected)/workspace/personal' : '/(protected)/workspace/organization'} />;
}
