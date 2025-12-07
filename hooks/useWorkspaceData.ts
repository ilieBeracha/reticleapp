import { useAppContext } from '@/hooks/useAppContext';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import type { TeamWithRole } from '@/types/workspace';
import { useCallback, useEffect, useRef } from 'react';

interface UseWorkspaceDataReturn {
  teams: TeamWithRole[];
  loadingTeams: boolean;
  sessions: any[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  loadTeams: () => Promise<void>;
  refreshSessions: () => void;
}

/**
 * Hook to load and manage workspace data (teams and sessions)
 * 
 * TEAM-FIRST ARCHITECTURE:
 * - Uses activeTeamId from team store
 * - Loads team sessions, not workspace sessions
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
  const { activeTeamId } = useAppContext();
  const { sessions, loading: sessionsLoading, error: sessionsError, loadTeamSessions } = useSessionStore();
  const { teams, loading: loadingTeams, loadTeams: loadTeamsStore } = useTeamStore();

  // Track previous team to prevent duplicate loads
  const prevTeamIdRef = useRef<string | null | undefined>(undefined);
  const isLoadingRef = useRef(false);

  // Stable load teams function
  const loadTeams = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      await loadTeamsStore();
    } finally {
      isLoadingRef.current = false;
    }
  }, [loadTeamsStore]);

  // Stable refresh sessions function
  const refreshSessions = useCallback(() => {
    if (activeTeamId) {
      loadTeamSessions();
    }
  }, [activeTeamId, loadTeamSessions]);

  // Single effect to load data when team changes
  useEffect(() => {
    // Skip if team hasn't changed (prevents double loading)
    if (prevTeamIdRef.current === activeTeamId) {
      return;
    }
    
    prevTeamIdRef.current = activeTeamId;

    if (activeTeamId) {
      // Load sessions for the active team
      loadTeamSessions();
    }
  }, [activeTeamId, loadTeamSessions]);

  return {
    teams,
    loadingTeams,
    sessions,
    sessionsLoading,
    sessionsError,
    loadTeams,
    refreshSessions,
  };
}
