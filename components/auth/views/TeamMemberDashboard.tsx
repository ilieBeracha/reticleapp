import { useOrgRole } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { getTeamWithMembers } from '@/services/teamService';
import type { TeamWithMembers } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

/**
 * TEAM MEMBER DASHBOARD
 * Operational view for Squad Commanders and Soldiers
 * Focus on performance, training, team awareness
 */
export default function TeamMemberDashboard() {
  const colors = useColors();
  const { activeWorkspace } = useAppContext();
  const { teamInfo, teamRole } = useOrgRole();
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isSquadCommander = teamRole === 'squad_commander';

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
        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name="warning" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Not Assigned to a Team</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Contact your administrator for team assignment
          </Text>
        </View>
      </View>
    );
  }

  const roleInfo = isSquadCommander
    ? { label: 'Squad Commander', icon: 'shield' as const, color: '#5B7A8C' }
    : { label: 'Soldier', icon: 'person' as const, color: '#666' };

  const memberCount = team.members?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        {/* Team Header Card */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerCardTop}>
            <View style={[styles.teamIconLarge, { backgroundColor: '#7C3AED' + '15' }]}>
              <Ionicons name="people" size={32} color="#7C3AED" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
              <View style={[styles.myRoleBadge, { backgroundColor: roleInfo.color + '15' }]}>
                <Ionicons name={roleInfo.icon} size={12} color={roleInfo.color} />
                <Text style={[styles.myRoleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Ionicons name="people" size={18} color={colors.textMuted} />
              <Text style={[styles.quickStatText, { color: colors.textMuted }]}>
                {memberCount} members
              </Text>
            </View>
            {team.squads && team.squads.length > 0 && (
              <>
                <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.quickStat}>
                  <Ionicons name="shield" size={18} color={colors.textMuted} />
                  <Text style={[styles.quickStatText, { color: colors.textMuted }]}>
                    {team.squads.length} squads
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Performance Overview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance Overview</Text>
          <View style={styles.performanceGrid}>
            <View style={[styles.performanceCard, { backgroundColor: '#34C759' + '15', borderColor: '#34C759' + '30' }]}>
              <View style={[styles.performanceIcon, { backgroundColor: '#34C759' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
              </View>
              <Text style={[styles.performanceValue, { color: '#34C759' }]}>12</Text>
              <Text style={[styles.performanceLabel, { color: colors.text }]}>Sessions</Text>
              <Text style={[styles.performanceSub, { color: colors.textMuted }]}>This month</Text>
            </View>

            <View style={[styles.performanceCard, { backgroundColor: '#FF9500' + '15', borderColor: '#FF9500' + '30' }]}>
              <View style={[styles.performanceIcon, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="trophy" size={24} color="#fff" />
              </View>
              <Text style={[styles.performanceValue, { color: '#FF9500' }]}>85%</Text>
              <Text style={[styles.performanceLabel, { color: colors.text }]}>Accuracy</Text>
              <Text style={[styles.performanceSub, { color: colors.textMuted }]}>Average</Text>
            </View>

            <View style={[styles.performanceCard, { backgroundColor: '#007AFF' + '15', borderColor: '#007AFF' + '30' }]}>
              <View style={[styles.performanceIcon, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="ribbon" size={24} color="#fff" />
              </View>
              <Text style={[styles.performanceValue, { color: '#007AFF' }]}>4/5</Text>
              <Text style={[styles.performanceLabel, { color: colors.text }]}>Qualified</Text>
              <Text style={[styles.performanceSub, { color: colors.textMuted }]}>This year</Text>
            </View>
          </View>
        </View>

        {/* Teammates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Teammates</Text>
          <View style={[styles.teammatesList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {team.members?.map((member: any, index: number) => (
              <View
                key={member.user_id}
                style={[
                  styles.teammateRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: index === memberCount - 1 ? 0 : 0.5,
                  },
                ]}
              >
                {member.profile?.avatar_url ? (
                  <Image source={{ uri: member.profile.avatar_url }} style={styles.teammateAvatar} />
                ) : (
                  <View style={[styles.teammateAvatarPlaceholder, { backgroundColor: '#7C3AED' + '20' }]}>
                    <Text style={[styles.teammateAvatarText, { color: '#7C3AED' }]}>
                      {member.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}

                <View style={styles.teammateInfo}>
                  <Text style={[styles.teammateName, { color: colors.text }]}>
                    {member.profile?.full_name || 'Unknown'}
                  </Text>
                  <View style={[styles.teammateRoleBadge, { backgroundColor: getRoleColor(member.role).bg }]}>
                    <Text style={[styles.teammateRoleText, { color: getRoleColor(member.role).color }]}>
                      {formatRole(member.role)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Org Context Footer */}
        <View style={[styles.orgFooter, { borderTopColor: colors.border }]}>
          <Ionicons name="business" size={14} color={colors.textMuted} />
          <Text style={[styles.orgFooterText, { color: colors.textMuted }]}>
            Part of {activeWorkspace?.workspace_name || 'Organization'}
          </Text>
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
    commander: { color: '#5B6B8C', bg: '#5B6B8C15' },
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

  // Header Card
  headerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  teamIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  teamName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  myRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  myRoleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatText: {
    fontSize: 13,
    fontWeight: '500',
  },
  quickStatDivider: {
    width: 1,
    height: 16,
  },

  // Performance Grid
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  performanceCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  performanceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  performanceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  performanceSub: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Teammates List
  teammatesList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  teammateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  teammateAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  teammateAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teammateAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  teammateInfo: {
    flex: 1,
    gap: 4,
  },
  teammateName: {
    fontSize: 14,
    fontWeight: '600',
  },
  teammateRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teammateRoleText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Org Footer
  orgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingTop: 32,
    marginTop: 24,
    borderTopWidth: 1,
    gap: 6,
  },
  orgFooterText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty State
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

