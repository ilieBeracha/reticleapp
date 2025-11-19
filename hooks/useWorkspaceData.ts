import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWorkspaceTeams } from '@/services/workspaceService';
import { useSessionStore } from '@/store/sessionStore';
import { useAppContext } from '@/hooks/useAppContext';
import type { Team } from '@/types/workspace';

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
  const { activeWorkspaceId } = useAppContext();
  const { sessions, loading: sessionsLoading, error: sessionsError, loadWorkspaceSessions } = useSessionStore();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingTeams(true);
    try {
      const fetchedTeams = await getWorkspaceTeams('org', activeWorkspaceId);
      setTeams(fetchedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  }, [activeWorkspaceId]);

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
