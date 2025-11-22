import { useAppContext } from '@/hooks/useAppContext';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import type { Team } from '@/types/workspace';
import { useCallback, useEffect } from 'react';

interface UseWorkspaceDataReturn {
  teams: Team[];
  loadingTeams: boolean;
  sessions: any[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  loadTeams: () => Promise<void>;
  refreshSessions: () => void;
}

export function useWorkspaceData(): UseWorkspaceDataReturn {
  const { activeWorkspaceId, activeWorkspace } = useAppContext();
  const { sessions, loading: sessionsLoading, error: sessionsError, loadWorkspaceSessions } = useSessionStore();
  const { teams, loading: loadingTeams, loadTeams: loadTeamsStore } = useTeamStore();

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId) return;
    await loadTeamsStore(activeWorkspaceId);  // Simplified - always org
  }, [activeWorkspaceId, loadTeamsStore]);

  // Load sessions
  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceSessions();
    }
  }, [activeWorkspaceId, loadWorkspaceSessions]);

  // Load teams on mount
  useEffect(() => {
    if (activeWorkspaceId) {
      loadTeams();
    }
  }, [activeWorkspaceId, loadTeams]);

  const refreshSessions = useCallback(() => {
    if (activeWorkspaceId) {
      loadWorkspaceSessions();
    }
  }, [activeWorkspaceId, loadWorkspaceSessions]);

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
