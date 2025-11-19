import { useAppContext } from '@/hooks/useAppContext';
import { Redirect } from 'expo-router';

/**
 * HomePage Router
 * 
 * Redirects to the appropriate workspace route based on user's current workspace context.
 * 
 * - Personal Workspace (isMyWorkspace): Redirects to /workspace/personal
 * - Organization Workspace (!isMyWorkspace): Redirects to /workspace/organization (with sub-routes)
 */
export default function HomePage() {
  const { isMyWorkspace } = useAppContext();

  return <Redirect href={isMyWorkspace ? '/(protected)/workspace/personal' : '/(protected)/workspace/organization'} />;
}
