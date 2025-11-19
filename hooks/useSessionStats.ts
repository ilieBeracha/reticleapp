import { useMemo } from 'react';

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
}

export function useSessionStats(sessions: any[]): SessionStats {
  return useMemo(() => ({
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.status === 'active').length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
  }), [sessions]);
}
