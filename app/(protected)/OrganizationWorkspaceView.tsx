import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { getWorkspaceTeams } from '@/services/workspaceService';
import { useSessionStore } from '@/store/sessionStore';
import type { Team } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EmptyState from '../../components/shared/EmptyState';
import TeamCard from '../../components/shared/TeamCard';

function formatDateTime(value?: string | null) {
  if (!value) return 'In progress';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatLabel(label: string) {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function OrganizationWorkspaceView() {
  const colors = useColors();
  const { activeWorkspaceId, activeWorkspace } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { createTeamSheetRef, setOnTeamCreated, createSessionSheetRef, setOnSessionCreated, inviteMembersSheetRef } = useModals();
  const { sessions, loading: sessionsLoading, error: sessionsError, loadWorkspaceSessions } = useSessionStore();

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Role display
  const roleDisplay = permissions.role.charAt(0).toUpperCase() + permissions.role.slice(1);
  const roleConfig = {
    owner: { icon: 'shield-checkmark' as const, color: '#FF6B35', bg: '#FF6B3515' },
    admin: { icon: 'shield-half' as const, color: '#5B7A8C', bg: '#5B7A8C15' },
    instructor: { icon: 'school' as const, color: '#E76925', bg: '#E7692515' },
    member: { icon: 'person' as const, color: '#666', bg: '#E0E0E0' },
  };
  const currentRole = roleConfig[permissions.role] || roleConfig.member;

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId || !activeWorkspace) return;
    setLoadingTeams(true);
    try {
      const fetchedTeams = await getWorkspaceTeams('org', activeWorkspaceId);
      setTeams(fetchedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  }, [activeWorkspaceId, activeWorkspace]);

  // Load sessions
  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceSessions();
    }
  }, [activeWorkspaceId]);

  // Load teams on mount
  useEffect(() => {
    if (activeWorkspaceId && activeWorkspace) {
      loadTeams();
    }
  }, [activeWorkspaceId, activeWorkspace, loadTeams]);

  // Register callbacks
  const refreshSessions = useMemo(() => () => {
    if (activeWorkspaceId) loadWorkspaceSessions();
  }, [activeWorkspaceId, loadWorkspaceSessions]);

  useEffect(() => {
    setOnTeamCreated(() => loadTeams);
    setOnSessionCreated(() => refreshSessions);
    return () => {
      setOnTeamCreated(null);
      setOnSessionCreated(null);
    };
  }, [loadTeams, refreshSessions, setOnTeamCreated, setOnSessionCreated]);

  // Calculate stats
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {/* Workspace Header */}
        <View style={styles.header}>
          <Text style={[styles.workspaceName, { color: colors.text }]}>
            {activeWorkspace?.workspace_name || 'Organization'}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: currentRole.bg }]}>
            <Ionicons name={currentRole.icon} size={12} color={currentRole.color} />
            <Text style={[styles.roleBadgeText, { color: currentRole.color }]}>
              {roleDisplay}
            </Text>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Workspace Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#5B7A8C15' }]}>
                <Ionicons name="calendar-outline" size={20} color="#5B7A8C" />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalSessions}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Sessions</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#E7692515' }]}>
                <Ionicons name="play-circle-outline" size={20} color="#E76925" />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>{activeSessions}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active Now</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#5A847315' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#5A8473" />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>{completedSessions}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completed</Text>
              </View>
            </View>

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#6B8FA315' }]}>
                <Ionicons name="people-outline" size={20} color="#6B8FA3" />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>{teams.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Teams</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => createSessionSheetRef.current?.open()}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Start Session</Text>
          </TouchableOpacity>

          {permissions.canManageTeams && (
            <TouchableOpacity
              style={[styles.actionButtonSecondary, { borderColor: colors.border }]}
              onPress={() => createTeamSheetRef.current?.open()}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={20} color={colors.text} />
              <Text style={[styles.actionButtonSecondaryText, { color: colors.text }]}>Create Team</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Teams Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Teams</Text>
            {permissions.canManageTeams && teams.length > 0 && (
              <TouchableOpacity onPress={() => createTeamSheetRef.current?.open()}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>+ New</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingTeams ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading teams...</Text>
            </View>
          ) : teams.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title={permissions.canManageTeams ? "No teams yet" : "No teams available"}
              subtitle={permissions.canManageTeams ? "Create your first team to get started" : "Teams will appear here when created"}
              size="small"
            />
          ) : (
            <View style={styles.teamsList}>
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} memberCount={0} />
              ))}
            </View>
          )}
        </View>

        {/* Recent Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sessions</Text>
          </View>

          {sessionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading sessions...</Text>
            </View>
          ) : sessionsError ? (
            <EmptyState
              icon="warning-outline"
              title="Unable to load sessions"
              subtitle={sessionsError}
              size="small"
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon="fitness-outline"
              title="No sessions yet"
              subtitle="Start your first training session"
              size="small"
            />
          ) : (
            <View style={styles.sessionsList}>
              {sessions.slice(0, 5).map((session) => {
                const sessionPayload = session.session_data as Record<string, any> | null;
                const statusColors: Record<string, { bg: string; text: string }> = {
                  active: { bg: colors.blue + '20', text: colors.blue },
                  completed: { bg: colors.green + '25', text: colors.green },
                  cancelled: { bg: colors.red + '20', text: colors.red },
                };
                const statusColor = statusColors[session.status] ?? { bg: colors.muted + '20', text: colors.mutedForeground };

                return (
                  <View
                    key={session.id}
                    style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.sessionHeader}>
                      <View style={styles.sessionLeft}>
                        <View style={[styles.sessionIcon, { backgroundColor: '#5B7A8C15' }]}>
                          <Ionicons name="fitness" size={18} color="#5B7A8C" />
                        </View>
                        <View>
                          <Text style={[styles.sessionTitle, { color: colors.text }]}>
                            {session.session_mode === 'group' ? 'Group Session' : 'Solo Session'}
                          </Text>
                          <Text style={[styles.sessionSubtitle, { color: colors.textMuted }]}>
                            {session.user_full_name || 'Unknown User'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.sessionStatusBadge, { backgroundColor: statusColor.bg }]}>
                        <Text style={[styles.sessionStatusText, { color: statusColor.text }]}>
                          {formatLabel(session.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sessionMeta}>
                      <View style={styles.sessionMetaItem}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
                          {formatDateTime(session.started_at)}
                        </Text>
                      </View>
                      {session.team_name && (
                        <View style={styles.sessionMetaItem}>
                          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
                            {session.team_name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Management Section (Owner/Admin Only) */}
        {permissions.canManageWorkspace && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Management</Text>
            </View>

            <View style={[styles.managementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {permissions.canInviteMembers && (
                <TouchableOpacity
                  style={[styles.managementItem, { borderBottomColor: colors.border }]}
                  onPress={() => inviteMembersSheetRef.current?.open()}
                  activeOpacity={0.7}
                >
                  <View style={styles.managementLeft}>
                    <View style={[styles.managementIcon, { backgroundColor: '#5B7A8C15' }]}>
                      <Ionicons name="person-add" size={20} color="#5B7A8C" />
                    </View>
                    <View>
                      <Text style={[styles.managementTitle, { color: colors.text }]}>Invite Members</Text>
                      <Text style={[styles.managementSubtitle, { color: colors.textMuted }]}>
                        Add people to your workspace
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              {permissions.canManageTeams && (
                <TouchableOpacity
                  style={[styles.managementItem, { borderBottomColor: colors.border }]}
                  onPress={() => createTeamSheetRef.current?.open()}
                  activeOpacity={0.7}
                >
                  <View style={styles.managementLeft}>
                    <View style={[styles.managementIcon, { backgroundColor: '#E7692515' }]}>
                      <Ionicons name="people" size={20} color="#E76925" />
                    </View>
                    <View>
                      <Text style={[styles.managementTitle, { color: colors.text }]}>Manage Teams</Text>
                      <Text style={[styles.managementSubtitle, { color: colors.textMuted }]}>
                        Create and organize teams
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              {permissions.isOwner && (
                <TouchableOpacity
                  style={styles.managementItem}
                  onPress={() => {}}
                  activeOpacity={0.7}
                >
                  <View style={styles.managementLeft}>
                    <View style={[styles.managementIcon, { backgroundColor: '#5A847315' }]}>
                      <Ionicons name="settings" size={20} color="#5A8473" />
                    </View>
                    <View>
                      <Text style={[styles.managementTitle, { color: colors.text }]}>Workspace Settings</Text>
                      <Text style={[styles.managementSubtitle, { color: colors.textMuted }]}>
                        Configure workspace preferences
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Role Info Banner */}
        {!permissions.canManageWorkspace && (
          <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
              {permissions.isInstructor 
                ? "As an instructor, you can create trainings and view team progress"
                : "You can participate in sessions and view team activities"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  workspaceName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Stats Card
  statsCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Actions Card
  actionsCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  actionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  teamsList: {
    gap: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Sessions List
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  sessionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  sessionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionMetaText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Management Card
  managementCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  managementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  managementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  managementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  managementSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
});
