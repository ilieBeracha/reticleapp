/**
 * Organization Mode Manage Screen
 * 
 * Route: /(protected)/org/[workspaceId]/manage
 * 
 * For now, we re-export the component from organization folder.
 * The ManageScreen component itself is in components/organization/
 */

// Re-export from the component file
// Note: The component is currently in app/(protected)/workspace/manage.tsx
// It should be moved to components/organization/ManageScreen.tsx
import ManageScreen from '@/components/organization/ManageScreen';

export default ManageScreen;
