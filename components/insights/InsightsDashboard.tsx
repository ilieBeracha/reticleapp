/**
 * Insights Dashboard (Router)
 *
 * Routes between PersonalInsights and TeamInsights based on account context.
 * - Personal mode (no team): Shows individual improvement journey
 * - Team mode: Shows team analytics (commander vs member views)
 */

import { useTeamStore } from '@/stores/teamStore';
import { PersonalInsights } from './PersonalInsights';
import { TeamInsights } from './TeamInsights';

export function InsightsDashboard() {
  const activeTeamId = useTeamStore((s) => s.activeTeamId);

  // Route based on account context
  if (activeTeamId) {
    return <TeamInsights />;
  }

  return <PersonalInsights />;
}

export default InsightsDashboard;
