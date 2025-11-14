import type { DashboardStats, Organization, RecentActivity } from '@/types/dashboard';

/**
 * Mock dashboard service
 * TODO: Replace with real API calls using AuthenticatedClient
 */

export async function getDashboardStatsService(): Promise<DashboardStats> {
  // TODO: Implement real API call
  return {
    totalSessions: 47,
    hitRate: 94,
    avgGrouping: 2.8,
  };
}

export async function getOrganizationsService(): Promise<Organization[]> {
  // TODO: Implement real API call
  // Testing with organizations - change to empty array to test no-org state
  return [
    {
      id: '1',
      name: '1st Battalion',
      sessionsCount: 23,
      status: 'active',
      color: 'mint',
    },
    {
      id: '2',
      name: 'Alpha Company',
      sessionsCount: 15,
      status: 'active',
      color: 'yellow',
    },
    {
      id: '3',
      name: 'Training Group',
      sessionsCount: 9,
      status: 'active',
      color: 'blue',
    },
  ];
}

export async function getRecentActivityService(): Promise<RecentActivity[]> {
  // TODO: Implement real API call
  return [
    {
      id: '1',
      type: 'paper',
      title: 'Paper Target Session',
      distance: '300m',
      score: 96,
      timeAgo: '1 hour ago',
      color: 'blue',
    },
    {
      id: '2',
      type: 'steel',
      title: 'Steel Target Practice',
      distance: '200m',
      score: 100,
      timeAgo: '3 hours ago',
      color: 'purple',
    },
  ];
}

