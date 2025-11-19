import EmptyState from '@/components/shared/EmptyState';
import GroupedList from '@/components/shared/GroupedList';
import TeamCard from '@/components/shared/TeamCard';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { getWorkspaceTeams } from '@/services/workspaceService';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { Team } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ViewMode = 'members' | 'teams';

export default function OrganizationPage() {
  const colors = useColors();
  const { activeWorkspaceId, activeWorkspace } = useAppContext();  
  const permissions = useWorkspacePermissions();
  const { workspaceMembers, loadWorkspaceMembers, loading: membersLoading } = useWorkspaceStore();
  const { inviteMembersSheetRef, createTeamSheetRef, setOnTeamCreated } = useModals();

  const [viewMode, setViewMode] = useState<ViewMode>('members');
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load Teams
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setTeamsLoading(true);
    try {
      const fetchedTeams = await getWorkspaceTeams('org', activeWorkspaceId);
      setTeams(fetchedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setTeamsLoading(false);
    }
  }, [activeWorkspaceId]);

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

  // Role display
  const roleDisplay = permissions.role.charAt(0).toUpperCase() + permissions.role.slice(1);
  const roleConfig = {
    owner: { icon: 'shield-checkmark' as const, color: '#FF6B35', bg: '#FF6B3515' },
    admin: { icon: 'shield-half' as const, color: '#5B7A8C', bg: '#5B7A8C15' },
    instructor: { icon: 'school' as const, color: '#E76925', bg: '#E7692515' },
    member: { icon: 'person' as const, color: '#666', bg: '#E0E0E0' },
  };
  const currentRole = roleConfig[permissions.role] || roleConfig.member;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Organization
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: currentRole.bg }]}>
                  <Ionicons name={currentRole.icon} size={12} color={currentRole.color} />
                  <Text style={[styles.roleBadgeText, { color: currentRole.color }]}>
                    {roleDisplay}
                  </Text>
                </View>
              </View>

              {/* View Toggle and Add Button */}
              <View style={styles.controlsContainer}>
                <View style={[styles.viewToggle, { backgroundColor: colors.card }]}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setViewMode('members');
                    }}
                    style={[
                      styles.viewToggleButton,
                      viewMode === 'members' && [styles.viewToggleButtonActive, { backgroundColor: colors.accent }],
                    ]}
                  >
                    <Ionicons
                      name="people"
                      size={16}
                      color={viewMode === 'members' ? colors.accentForeground : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.viewToggleText,
                        { color: viewMode === 'members' ? colors.accentForeground : colors.textMuted }
                      ]}
                    >
                      Members
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setViewMode('teams');
                    }}
                    style={[
                      styles.viewToggleButton,
                      viewMode === 'teams' && [styles.viewToggleButtonActive, { backgroundColor: colors.accent }],
                    ]}
                  >
                    <Ionicons
                      name="albums"
                      size={16}
                      color={viewMode === 'teams' ? colors.accentForeground : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.viewToggleText,
                        { color: viewMode === 'teams' ? colors.accentForeground : colors.textMuted }
                      ]}
                    >
                      Teams
                    </Text>
                  </Pressable>
                </View>

                {/* Add Button */}
                {(permissions.canInviteMembers && viewMode === 'members' || permissions.canManageTeams && viewMode === 'teams') && (
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      if (viewMode === 'members') {
                        inviteMembersSheetRef.current?.open();
                      } else {
                        createTeamSheetRef.current?.open();
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={24} color={colors.background} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Content */}
          {viewMode === 'members' ? (
            <>
              {/* Members List */}
              {workspaceMembers.length === 0 && !membersLoading ? (
                <View>
                  <EmptyState
                    icon="people-outline"
                    title="No members yet"
                    subtitle="Invite members to get started"
                    size="small"
                  />
                </View>
              ) : (
                <View style={styles.listContainer}>
                  <Text style={[styles.listTitle, { color: colors.textMuted }]}>
                    {workspaceMembers.length} Member{workspaceMembers.length !== 1 ? 's' : ''}
                  </Text>
                  <GroupedList
                    data={workspaceMembers}
                    renderItem={(member, isFirst, isLast) => (
                      <View style={[
                        styles.memberItem,
                        {
                          backgroundColor: colors.card,
                          borderBottomColor: colors.border,
                          borderBottomWidth: isLast ? 0 : 0.5
                        }
                      ]}>
                        <View style={styles.memberInfo}>
                          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>
                              {member.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          </View>
                          <View style={styles.details}>
                            <Text style={[styles.memberName, { color: colors.text }]}>
                              {member.profile?.full_name || 'Unknown'}
                            </Text>
                            <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                              {member.profile?.email || ''}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.roleBadgeSmall, { backgroundColor: getRoleColor(member.role).bg }]}>
                          <Text style={[styles.roleTextSmall, { color: getRoleColor(member.role).color }]}>
                            {member.role}
                          </Text>
                        </View>
                      </View>
                    )}
                    keyExtractor={(member) => member.id}
                  />
                </View>
              )}
            </>
          ) : (
            <>
              {/* Teams List */}
              {teamsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : teams.length === 0 ? (
                <View>
                  <EmptyState
                    icon="albums-outline"
                    title="No teams yet"
                    subtitle="Create a team to organize your members"
                    size="small"
                  />
                </View>
              ) : (
                <View style={styles.listContainer}>
                  <Text style={[styles.listTitle, { color: colors.textMuted }]}>
                    {teams.length} Team{teams.length !== 1 ? 's' : ''}
                  </Text>
                  <GroupedList
                    data={teams}
                    renderItem={(team, isFirst, isLast) => (
                      <TeamCard
                        team={team}
                        memberCount={0} // You might want to fetch real counts or pass it if available
                        isFirst={isFirst}
                        isLast={isLast}
                      />
                    )}
                    keyExtractor={(team) => team.id}
                  />
                </View>
              )}
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  workspaceName: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.3,
  },

  // Controls (Tabs + Add Button)
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },

  // View Toggle
  viewToggle: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  viewToggleButtonActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Add Button
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  // Lists
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },

  // Member List
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  details: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  memberEmail: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    opacity: 0.7,
  },
  
  // Badge styles (shared with header)
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
  roleBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleTextSmall: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
    letterSpacing: 0,
  },
});
