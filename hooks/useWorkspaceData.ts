import { useProfileContext } from '@/hooks/useProfileContext';
import { getAllSessions, getOrgSessions } from '@/services/sessionService';
import { getOrgTeams } from '@/services/teamService';
import { useCallback, useEffect, useState } from 'react';

interface Team {
  id: string;
  org_id: string;
  name: string;
  team_type?: string | null;
  member_count?: number;
  squads?: string[];
}

interface Session {
  id: string;
  org_id: string;
  org_name?: string;
  team_name?: string;
  session_mode: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

interface UseWorkspaceDataReturn {
  teams: Team[];
  loadingTeams: boolean;
  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  loadTeams: () => Promise<void>;
  refreshSessions: () => Promise<void>;
}

/**
 * Hook to load org-specific data (teams, sessions)
 * Uses new profile-based architecture
 */
export function useWorkspaceData(): UseWorkspaceDataReturn {
  const { currentOrgId, isPersonalOrg } = useProfileContext();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Load teams for current org
  const loadTeams = useCallback(async () => {
    if (!currentOrgId) return;
    
    setLoadingTeams(true);
    try {
      const teamsData = await getOrgTeams(currentOrgId);
      setTeams(teamsData);
    } catch (error: any) {
      console.error('Failed to load teams:', error);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  }, [currentOrgId]);

  // Load sessions for current org
  const loadSessions = useCallback(async () => {
    if (!currentOrgId) return;
    
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const sessionsData = isPersonalOrg 
        ? await getAllSessions()  // Personal: all user's sessions
        : await getOrgSessions(currentOrgId);  // Org: org-specific sessions
      
      setSessions(sessionsData as any);
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      setSessionsError(error.message);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [currentOrgId, isPersonalOrg]);

  // Auto-load on org change
  useEffect(() => {
    if (currentOrgId) {
      loadTeams();
      loadSessions();
    }
  }, [currentOrgId, loadTeams, loadSessions]);

  const refreshSessions = useCallback(async () => {
    await loadSessions();
  }, [loadSessions]);

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
