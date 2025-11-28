import { useColors } from '@/hooks/ui/useColors';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

/**
 * SMART ROLE-BASED ROUTER
 * Routes users to appropriate views based on:
 * 1. Organization role (owner/admin/member)
 * 2. Team role (commander/squad_commander/soldier)
 */
export default function useRoleBasedNavigation() {
  const permissions = useWorkspacePermissions();
  const { workspaceMembers } = useWorkspaceStore();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
      setLoading(false);
    };
    getCurrentUser();
  }, []);

  // Get team role
  useEffect(() => {
    if (!currentUserId || workspaceMembers.length === 0) return;

    const currentMember = workspaceMembers.find(m => m.member_id === currentUserId);
    if (currentMember && currentMember.teams.length > 0) {
      // Get role from first team (or could be enhanced for multi-team)
      setTeamRole(currentMember.teams[0].team_role);
    }
  }, [currentUserId, workspaceMembers]);

  return {
    orgRole: permissions.role,
    teamRole,
    loading,
    isAdmin: permissions.role === 'owner' || permissions.role === 'admin',
    isTeamMember: permissions.role === 'member',
    isCommander: teamRole === 'commander',
    isSquadCommander: teamRole === 'squad_commander',
    isSoldier: teamRole === 'soldier',
  };
}

/**
 * ROLE ROUTER COMPONENT
 * Wrapper that routes to correct view based on roles
 */
export function RoleBasedRouter({ 
  adminView, 
  commanderView, 
  squadCommanderView, 
  soldierView,
  noTeamView 
}: {
  adminView: React.ReactNode;
  commanderView: React.ReactNode;
  squadCommanderView: React.ReactNode;
  soldierView: React.ReactNode;
  noTeamView: React.ReactNode;
}) {
  const colors = useColors();
  const navigation = useRoleBasedNavigation();

  if (navigation.loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Organization Admin/Owner → Full org management
  if (navigation.isAdmin) {
    return <>{adminView}</>;
  }

  // Team Member → Route by team role
  if (navigation.isTeamMember) {
    if (navigation.isCommander) {
      return <>{commanderView}</>;
    }
    if (navigation.isSquadCommander) {
      return <>{squadCommanderView}</>;
    }
    if (navigation.isSoldier) {
      return <>{soldierView}</>;
    }
    // No team assigned yet
    return <>{noTeamView}</>;
  }

  // Fallback
  return <>{noTeamView}</>;
}

