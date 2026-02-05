/**
 * Loadout Screen - Routes based on context & role
 *
 * - Personal mode: Personal weapons only
 * - Team mode (member): Team weapons overview (all weapons visible, request weapon)
 * - Team mode (commander): Full armory management (assign, pool, requests)
 */

import { TeamArmoryContent } from '@/app/(protected)/teamArmory';
import { PersonalLoadout } from '@/components/loadout/PersonalLoadout';
import { TeamLoadout } from '@/components/loadout/TeamLoadout';
import { useTeamStore } from '@/stores/teamStore';

export default function LoadoutScreen() {
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const myRole = useTeamStore((state) => {
    const team = state.teams.find((t) => t.id === state.activeTeamId);
    return team?.my_role || null;
  });

  const isCommander = myRole === 'owner' || myRole === 'commander';

  // Team mode
  if (activeTeamId) {
    // Commander: Full armory management embedded in tab
    if (isCommander) {
      return <TeamArmoryContent teamIdProp={activeTeamId} embedded />;
    }

    // Member: Team weapons overview
    return <TeamLoadout />;
  }

  // Personal mode
  return <PersonalLoadout />;
}
