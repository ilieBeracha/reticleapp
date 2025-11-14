// Dashboard types
export interface DashboardStats {
  totalSessions: number;
  hitRate: number;
  avgGrouping: number;
}

export interface Organization {
  id: string;
  name: string;
  sessionsCount: number;
  status: 'active' | 'inactive';
  color: 'mint' | 'yellow' | 'blue' | 'purple';
}

export interface RecentActivity {
  id: string;
  type: 'paper' | 'steel';
  title: string;
  distance: string;
  score: number;
  timeAgo: string;
  color: 'mint' | 'yellow' | 'blue' | 'purple';
}

