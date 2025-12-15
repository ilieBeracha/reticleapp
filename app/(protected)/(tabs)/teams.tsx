/**
 * Teams Tab
 * 
 * Central hub for all team management:
 * - List of all your teams
 * - Tap team → full management (teamDetail)
 * - Create team / Join team actions
 * - Quick stats for each team
 */
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TeamWithRole } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
    ChevronRight,
    Crown,
    Plus,
    Shield,
    Target,
    UserPlus,
    Users,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  owner: { color: '#A78BFA', label: 'Owner', icon: Crown },
  commander: { color: '#F87171', label: 'Commander', icon: Crown },
  team_commander: { color: '#F87171', label: 'Commander', icon: Crown },
  squad_commander: { color: '#FBBF24', label: 'Squad Lead', icon: Shield },
  soldier: { color: '#34D399', label: 'Soldier', icon: Target },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM CARD
// ─────────────────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  colors,
  upcomingCount,
  memberCount,
  onPress,
  index,
}: {
  team: TeamWithRole;
  colors: ReturnType<typeof useColors>;
  upcomingCount: number;
  memberCount?: number;
  onPress: () => void;
  index: number;
}) {
  const roleConfig = getRoleConfig(team.my_role);
  const RoleIcon = roleConfig.icon;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <TouchableOpacity
        style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.teamCardHeader}>
          <View style={[styles.teamIcon, { backgroundColor: colors.primary + '15' }]}>
            <Users size={22} color={colors.primary} />
          </View>
          <View style={styles.teamInfo}>
            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
              {team.name}
            </Text>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '15' }]}>
                <RoleIcon size={10} color={roleConfig.color} />
                <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
              </View>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>

        {/* Quick Stats */}
        <View style={[styles.teamStats, { borderTopColor: colors.border }]}>
          <View style={styles.teamStat}>
            <Text style={[styles.teamStatValue, { color: colors.text }]}>{upcomingCount}</Text>
            <Text style={[styles.teamStatLabel, { color: colors.textMuted }]}>Upcoming</Text>
          </View>
          {memberCount !== undefined && (
            <>
              <View style={[styles.teamStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.teamStat}>
                <Text style={[styles.teamStatValue, { color: colors.text }]}>{memberCount}</Text>
                <Text style={[styles.teamStatLabel, { color: colors.textMuted }]}>Members</Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teams, loadTeams, loading: teamsLoading } = useTeamStore();
  const { myUpcomingTrainings, loadMyUpcomingTrainings } = useTrainingStore();

  const [refreshing, setRefreshing] = useState(false);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadTeams();
      loadMyUpcomingTrainings();
    }, [loadTeams, loadMyUpcomingTrainings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadTeams(), loadMyUpcomingTrainings()]);
    setRefreshing(false);
  }, [loadTeams, loadMyUpcomingTrainings]);

  // Get upcoming training count per team
  const getTeamUpcomingCount = useCallback((teamId: string) => {
    return myUpcomingTrainings.filter(t => t.team_id === teamId).length;
  }, [myUpcomingTrainings]);

  const handleTeamPress = (team: TeamWithRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/teamWorkspace?id=${team.id}` as any);
  };

  const handleCreateTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTeam' as any);
  };

  const handleJoinTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/acceptInvite' as any);
  };

  const hasTeams = teams.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Teams</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handleCreateTeam}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {teamsLoading && !hasTeams && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Team List */}
        {hasTeams && (
          <View style={styles.teamList}>
            {teams.map((team, index) => (
              <TeamCard
                key={team.id}
                team={team}
                colors={colors}
                upcomingCount={getTeamUpcomingCount(team.id)}
                onPress={() => handleTeamPress(team)}
                index={index}
              />
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.actionsSectionTitle, { color: colors.textMuted }]}>QUICK ACTIONS</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleCreateTeam}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
                <Plus size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Create Team</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Start your own squad</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleJoinTeam}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10B98115' }]}>
                <UserPlus size={20} color="#10B981" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Join Team</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Use invite code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty State */}
        {!teamsLoading && !hasTeams && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
              <Users size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Teams Yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Create a team to start training together, or join an existing team with an invite code.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading
  loading: {
    paddingVertical: 60,
  },

  // Team List
  teamList: {
    gap: 12,
    marginBottom: 24,
  },

  // Team Card
  teamCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleRow: {
    flexDirection: 'row',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  teamStats: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  teamStat: {
    flex: 1,
    alignItems: 'center',
  },
  teamStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  teamStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  teamStatDivider: {
    width: 1,
    height: 28,
  },

  // Actions Section
  actionsSection: {
    marginBottom: 24,
  },
  actionsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

