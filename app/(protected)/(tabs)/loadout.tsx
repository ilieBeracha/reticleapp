/**
 * Loadout Screen - Routes based on context & role
 *
 * - Personal mode: Personal weapons only
 * - Team mode: Unified weapon list for all roles
 *   - Soldiers: View weapons, request weapon
 *   - Commanders/Owners: View + Edit mode (assign, pool, add, manage requests)
 */

import { PersonalLoadout } from '@/components/loadout/PersonalLoadout';
import { TeamLoadout } from '@/components/loadout/TeamLoadout';
import { useTeamStore } from '@/stores/teamStore';

export default function LoadoutScreen() {
  const activeTeamId = useTeamStore((s) => s.activeTeamId);

  // Team mode — unified list for all roles (TeamLoadout handles role-based features)
  if (activeTeamId) {
    return <TeamLoadout />;
  }

  // Personal mode
  return <PersonalLoadout />;
}
