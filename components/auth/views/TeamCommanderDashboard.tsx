import { useOrgRole } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { getTeamWithMembers } from '@/services/teamService';
import type { TeamWithMembers } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

/**
 * TEAM COMMANDER DASHBOARD
 * Leadership view with team management focus
 */
export default function TeamCommanderDashboard() {
  const colors = useColors();
  const { activeWorkspace } = useAppContext();
  const { teamInfo, allTeams } = useOrgRole();
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!teamInfo) {
      setLoading(false);
      return;
    }

    try {
      const teamData = await getTeamWithMembers(teamInfo.teamId);
      setTeam(teamData);
    } catch (error) {
      console.error('Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  }, [teamInfo]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTeam();
    setRefreshing(false);
  }, [loadTeam]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name="warning" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Team Data</Text>
        </View>
      </View>
    );
  }

  const squadCount = team.squads?.length || 0;
  const memberCount = team.members?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Org Context Mini Banner */}
        <View style={[styles.orgBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="business" size={14} color={colors.textMuted} />
          <Text style={[styles.orgBannerText, { color: colors.textMuted }]}>
            {activeWorkspace?.workspace_name || 'Organization'}
          </Text>
        </View>

        {/* Team Header */}
        <View style={styles.header}>
          <View style={[styles.commanderBadge, { backgroundColor: '#FF6B35' + '15' }]}>
            <Ionicons name="star" size={16} color="#FF6B35" />
            <Text style={[styles.commanderText, { color: '#FF6B35' }]}>Team Commander</Text>
          </View>
          <Text style={[styles.teamTitle, { color: colors.text }]}>{team.name}</Text>
          {team.description && (
            <Text style={[styles.teamDescription, { color: colors.textMuted }]}>
              {team.description}
            </Text>
          )}
        </View>

        {/* Team Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="people" size={24} color={colors.accent} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.text }]}>{memberCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Team Members</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="shield" size={24} color={colors.primary} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.text }]}>{squadCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Squads</Text>
            </View>
          </View>
        </View>

        {/* Management Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Team Management</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.accent }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // TODO: Open add member sheet
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={24} color="#fff" />
              <Text style={styles.actionText}>Add Members</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // TODO: Open squad management
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="shield" size={24} color="#fff" />
              <Text style={styles.actionText}>Manage Squads</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Team Members List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Team Roster</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.accent + '20' }]}>
              <Text style={[styles.countBadgeText, { color: colors.accent }]}>{memberCount}</Text>
            </View>
          </View>

          {memberCount === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No team members yet</Text>
            </View>
          ) : (
            <View style={[styles.membersList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {team.members?.map((member: any, index: number) => (
                <View
                  key={member.user_id}
                  style={[
                    styles.memberRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: index === memberCount - 1 ? 0 : 0.5,
                    },
                  ]}
                >
                  {member.profile?.avatar_url ? (
                    <Image source={{ uri: member.profile.avatar_url }} style={styles.memberAvatar} />
                  ) : (
                    <View style={[styles.memberAvatarPlaceholder, { backgroundColor: colors.accent + '20' }]}>
                      <Text style={[styles.memberAvatarText, { color: colors.accent }]}>
                        {member.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.profile?.full_name || 'Unknown'}
                    </Text>
                    <View style={styles.memberMeta}>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role).bg }]}>
                        <Text style={[styles.roleText, { color: getRoleColor(member.role).color }]}>
                          {formatRole(member.role)}
                        </Text>
                      </View>
                      {member.details?.squad_id && (
                        <View style={[styles.squadBadge, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons name="shield" size={10} color={colors.primary} />
                          <Text style={[styles.squadText, { color: colors.primary }]}>
                            {member.details.squad_id}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.manageButton, { backgroundColor: colors.accent + '15' }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // TODO: Open member management
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatRole(role: string): string {
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getRoleColor(role: string) {
  const colors = {
    commander: { color: '#FF6B35', bg: '#FF6B3515' },
    squad_commander: { color: '#5B7A8C', bg: '#5B7A8C15' },
    soldier: { color: '#666', bg: '#66666615' },
  };
  return colors[role as keyof typeof colors] || colors.soldier;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },

  // Org Banner
  orgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  orgBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  commanderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  commanderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  teamTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  teamDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 14,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Members List
  membersList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  squadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  squadText: {
    fontSize: 11,
    fontWeight: '600',
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    padding: 60,
    margin: 20,
    borderRadius: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

