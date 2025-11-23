import { OrganizationHomePage } from '@/components/home/OrganizationHomePage';
import { PersonalHomePage } from '@/components/home/PersonalHomePage';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * Main workspace home page - conditionally renders Personal or Organization mode.
 * The actual implementations are in separate component files for better maintainability.
 *
 * - PersonalHomePage: components/home/PersonalHomePage.tsx
 * - OrganizationHomePage: components/home/OrganizationHomePage.tsx
 */
export default function HomePage() {
  const { activeWorkspace } = useAppContext();

  // If activeWorkspace is null, show Personal mode
  // If activeWorkspace exists, show Organization mode
  const isOrganizationMode = activeWorkspace !== null;

  return isOrganizationMode ? <OrganizationHomePage /> : <PersonalHomePage />;
}
