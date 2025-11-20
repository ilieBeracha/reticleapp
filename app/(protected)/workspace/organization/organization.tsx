import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useTeamStore } from '@/store/teamStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OrganizationPage() {
  const colors = useColors();
  const { activeWorkspaceId, activeWorkspace } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { workspaceMembers, loadWorkspaceMembers, loading: membersLoading } = useWorkspaceStore();
  const { teams, loadTeams: loadTeamsStore, loading: teamsLoading } = useTeamStore();
  const { inviteMembersSheetRef, createTeamSheetRef, setOnTeamCreated } = useModals();

  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Load Teams
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId) return;
    const workspaceType = activeWorkspace?.workspace_type === 'org' ? 'org' : 'personal';
    await loadTeamsStore(workspaceType, activeWorkspaceId);
  }, [activeWorkspaceId, activeWorkspace, loadTeamsStore]);

  // Initial Load
  useEffect(() => {
    loadWorkspaceMembers();
    loadTeams();
  }, [activeWorkspaceId, loadWorkspaceMembers, loadTeams]);

  // Register Team Creation Callback
  useEffect(() => {
    setOnTeamCreated(() => loadTeams);
    return () => setOnTeamCreated(null);
  }, [loadTeams, setOnTeamCreated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadWorkspaceMembers(), loadTeams()]);
    setRefreshing(false);
  }, [loadWorkspaceMembers, loadTeams]);

  const toggleTeam = (teamId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  // Role display
  const roleDisplay = permissions.role.charAt(0).toUpperCase() + permissions.role.slice(1);
  const roleConfig = {
    owner: { icon: 'shield-checkmark' as const, color: '#FF6B35', bg: '#FF6B3515' },
    admin: { icon: 'shield-half' as const, color: '#5B7A8C', bg: '#5B7A8C15' },
    instructor: { icon: 'school' as const, color: '#E76925', bg: '#E7692515' },
    member: { icon: 'person' as const, color: '#666', bg: '#E0E0E0' },
  };
  const currentRole = roleConfig[permissions.role] || roleConfig.member;

  const loading = membersLoading || teamsLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Organization</Text>
          <View style={styles.headerRow}>
            <View style={[styles.roleBadge, { backgroundColor: currentRole.bg }]}>
              <Ionicons name={currentRole.icon} size={12} color={currentRole.color} />
              <Text style={[styles.roleBadgeText, { color: currentRole.color }]}>{roleDisplay}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="albums" size={14} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>{teams.length} teams</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="people" size={14} color={colors.textMuted} />
                <Text style={[styles.statText, { color: colors.textMuted }]}>{workspaceMembers.length} members</Text>
              </View>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Teams Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="albums" size={18} color={colors.text} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Teams</Text>
                  <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.accent }]}>{teams.length}</Text>
                  </View>
                </View>
                {permissions.canManageTeams && (
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.accent }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      createTeamSheetRef.current?.open();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={18} color={colors.accentForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {teams.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="albums-outline" size={32} color={colors.textMuted} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No teams yet</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    Create teams to organize your members
                  </Text>
                </View>
              ) : (
                <View style={styles.teamsGrid}>
                  {teams.map((team, index) => {
                    const isExpanded = expandedTeams.has(team.id);
                    return (
                      <TouchableOpacity
                        key={`${team.id}-${index}`}
                        style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => toggleTeam(team.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.teamCardHeader}>
                          <View style={[styles.teamIcon, { backgroundColor: colors.accent + '15' }]}>
                            <Ionicons name="people" size={20} color={colors.accent} />
                          </View>
                          <View style={styles.teamInfo}>
                            <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                              {team.name}
                            </Text>
                            {team.description && (
                              <Text style={[styles.teamDescription, { color: colors.textMuted }]} numberOfLines={1}>
                                {team.description}
                              </Text>
                            )}
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={colors.textMuted}
                          />
                        </View>

                        {isExpanded && (
                          <View style={[styles.teamMembers, { borderTopColor: colors.border }]}>
                            <Text style={[styles.teamMembersTitle, { color: colors.textMuted }]}>
                              0 members • Tap to manage
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Members Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="people" size={18} color={colors.text} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>All Members</Text>
                  <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.accent }]}>{workspaceMembers.length}</Text>
                  </View>
                </View>
                {permissions.canInviteMembers && (
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.accent }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      inviteMembersSheetRef.current?.open();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="person-add" size={18} color={colors.accentForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {workspaceMembers.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="people-outline" size={32} color={colors.textMuted} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No members yet</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    Invite members to get started
                  </Text>
                </View>
              ) : (
                <View style={[styles.membersList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {workspaceMembers.map((member, index) => (
                    <View
                      key={`${member.id}-${index}`}
                      style={[
                        styles.memberItem,
                        {
                          borderBottomColor: colors.border,
                          borderBottomWidth: index === workspaceMembers.length - 1 ? 0 : 0.5,
                        },
                      ]}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
                        <Text style={[styles.avatarText, { color: colors.accent }]}>
                          {member.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {member.profile?.full_name || 'Unknown'}
                        </Text>
                        <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                          {member.profile?.email || ''}
                        </Text>
                      </View>
                      <View style={[styles.roleBadgeSmall, { backgroundColor: getRoleColor(member.role).bg }]}>
                        <Text style={[styles.roleTextSmall, { color: getRoleColor(member.role).color }]}>
                          {member.role}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function getRoleColor(role: string) {
  const colors = {
    owner: { color: '#FF6B35', bg: '#FF6B3515' },
    admin: { color: '#5B7A8C', bg: '#5B7A8C15' },
    instructor: { color: '#E76925', bg: '#E7692515' },
    member: { color: '#666', bg: '#E0E0E0' },
  };
  return colors[role as keyof typeof colors] || colors.member;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#ccc',
    opacity: 0.3,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Teams Grid
  teamsGrid: {
    gap: 12,
  },
  teamCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  teamIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamInfo: {
    flex: 1,
    gap: 2,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  teamDescription: {
    fontSize: 13,
    fontWeight: '400',
    opacity: 0.7,
  },
  teamMembers: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
    borderTopWidth: 0.5,
  },
  teamMembersTitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Members List
  membersList: {
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  memberEmail: {
    fontSize: 13,
    fontWeight: '400',
    opacity: 0.7,
  },
  roleBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleTextSmall: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Empty States
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },

  // Loading
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
});