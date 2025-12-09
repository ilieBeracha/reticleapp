/**
 * DATA LOADING HOOK
 * 
 * Loads sessions based on active team context.
 * Named "workspaceData" for legacy compatibility, but really just team sessions.
 */

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
 * Hook to load teams and sessions
 * 
 * Note: "workspace" naming is legacy - this is team-first architecture
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
  const { activeTeamId } = useTeamStore();
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

  // Load sessions when team changes
  useEffect(() => {
    if (prevTeamIdRef.current === activeTeamId) {
      return;
    }
    
    prevTeamIdRef.current = activeTeamId;

    if (activeTeamId) {
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
