import {
    getDashboardStatsService,
    getOrganizationsService,
    getRecentActivityService,
} from '@/services/dashboardService';
import type { DashboardStats, Organization, RecentActivity } from '@/types/dashboard';
import { useEffect, useState } from 'react';

interface UseDashboardReturn {
  stats: DashboardStats | null;
  organizations: Organization[];
  recentActivity: RecentActivity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, orgsData, activityData] = await Promise.all([
        getDashboardStatsService(),
        getOrganizationsService(),
        getRecentActivityService(),
      ]);
      
      setStats(statsData);
      setOrganizations(orgsData);
      setRecentActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    stats,
    organizations,
    recentActivity,
    loading,
    error,
    refetch: fetchData,
  };
}

