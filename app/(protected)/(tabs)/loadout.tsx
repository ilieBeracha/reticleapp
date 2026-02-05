/**
 * Loadout Screen - Routes to Personal or Team loadout
 *
 * - Solo mode: Shows personal weapons only
 * - Team mode: Shows team weapons (assigned + pool)
 */

import { PersonalLoadout } from '@/components/loadout/PersonalLoadout';
import { TeamLoadout } from '@/components/loadout/TeamLoadout';
import { useTeamStore } from '@/stores/teamStore';

export default function LoadoutScreen() {
  const activeTeamId = useTeamStore((s) => s.activeTeamId);

  // Route based on account context
  if (activeTeamId) {
    return <TeamLoadout />;
  }

  return <PersonalLoadout />;
}
