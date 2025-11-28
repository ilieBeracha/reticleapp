import { useAppContext } from '@/hooks/useAppContext';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import type { Team } from '@/types/workspace';
import { useCallback, useEffect, useRef } from 'react';

interface UseWorkspaceDataReturn {
  teams: Team[];
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
 * OPTIMIZED:
 * - Uses refs to track previous workspace ID and prevent double loading
 * - Stable callback functions that don't change identity
 * - Single load on workspace change, not multiple
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
  const { activeWorkspaceId } = useAppContext();
  const { sessions, loading: sessionsLoading, error: sessionsError, loadWorkspaceSessions } = useSessionStore();
  const { teams, loading: loadingTeams, loadTeams: loadTeamsStore } = useTeamStore();

  // Track previous workspace to prevent duplicate loads
  const prevWorkspaceIdRef = useRef<string | null | undefined>(undefined);
  const isLoadingRef = useRef(false);

  // Stable load teams function
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId || isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      await loadTeamsStore(activeWorkspaceId);
    } finally {
      isLoadingRef.current = false;
    }
  }, [activeWorkspaceId, loadTeamsStore]);

  // Stable refresh sessions function
  const refreshSessions = useCallback(() => {
    if (activeWorkspaceId) {
      loadWorkspaceSessions();
    }
  }, [activeWorkspaceId, loadWorkspaceSessions]);

  // Single effect to load data when workspace changes
  useEffect(() => {
    // Skip if workspace hasn't changed (prevents double loading)
    if (prevWorkspaceIdRef.current === activeWorkspaceId) {
      return;
    }
    
    prevWorkspaceIdRef.current = activeWorkspaceId;

    if (activeWorkspaceId) {
      // Load both teams and sessions for org workspace
      loadTeamsStore(activeWorkspaceId);
      loadWorkspaceSessions();
    }
  }, [activeWorkspaceId, loadTeamsStore, loadWorkspaceSessions]);

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
