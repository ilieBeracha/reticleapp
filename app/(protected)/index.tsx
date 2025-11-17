import { useAppContext } from '@/hooks/useAppContext';
import OrganizationWorkspaceView from './OrganizationWorkspaceView';
import PersonalWorkspaceView from './PersonalWorkspaceView';

/**
 * HomePage Router
 * 
 * Simple routing component that decides which workspace view to render
 * based on the user's current workspace context.
 * 
 * - Personal Workspace (isMyWorkspace): Shows user's personal dashboard
 * - Organization Workspace (!isMyWorkspace): Shows organization management view
 */
export default function HomePage() {
  const { isMyWorkspace } = useAppContext();

  return isMyWorkspace ? <PersonalWorkspaceView /> : <OrganizationWorkspaceView />;
}
