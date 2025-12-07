import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

/**
 * SMART ROLE-BASED ROUTER
 * Routes users to appropriate views based on team role
 * (owner/commander/squad_commander/soldier)
 */
export default function useRoleBasedNavigation() {
  const { teams, activeTeamId, members } = useTeamStore();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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

  // Find my role in the active team
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const myRole = activeTeam?.my_role || null;

  return {
    teamRole: myRole,
    loading,
    hasTeam: !!activeTeamId,
    isOwner: myRole === 'owner',
    isCommander: myRole === 'commander',
    isSquadCommander: myRole === 'squad_commander',
    isSoldier: myRole === 'soldier',
    canManage: myRole === 'owner' || myRole === 'commander',
  };
}

/**
 * ROLE ROUTER COMPONENT
 * Wrapper that routes to correct view based on team roles
 */
export function RoleBasedRouter({ 
  ownerView,
  commanderView, 
  squadCommanderView, 
  soldierView,
  noTeamView 
}: {
  ownerView: React.ReactNode;
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

  // No team selected
  if (!navigation.hasTeam) {
    return <>{noTeamView}</>;
  }

  // Route by team role
  if (navigation.isOwner) {
    return <>{ownerView}</>;
  }
  
  if (navigation.isCommander) {
    return <>{commanderView}</>;
  }
  
  if (navigation.isSquadCommander) {
    return <>{squadCommanderView}</>;
  }
  
  if (navigation.isSoldier) {
    return <>{soldierView}</>;
  }

  // Fallback
  return <>{noTeamView}</>;
}
