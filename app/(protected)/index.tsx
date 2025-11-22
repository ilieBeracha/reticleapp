import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useColors } from '@/hooks/ui/useColors';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EmptyState from '../../components/shared/EmptyState';
import GroupedList from '../../components/shared/GroupedList';
import QuickActionCard from '../../components/shared/QuickActionCard';
import TrainingChart from '../../components/shared/TrainingChart';
import WelcomeCard from '../../components/shared/WelcomeCard';

/**
 * 🏠 PROFILE-BASED COMMAND CENTER
 * 
 * Dashboard that changes based on active profile:
 * - Personal Profile: Aggregated stats from ALL orgs (PersonalDashboard)
 * - Org Profile: Stats specific to that organization (OrgDashboard)
 * - Context switches completely with profile selection
 * 
 * This component acts as a router between two completely different layouts.
 */
export default function ProfileBasedCommandCenter() {
  const colors = useColors();
  const { 
    activeProfile,
    isPersonalOrg,
    loading,
  } = useProfile();

  // Show loading state while profile is being determined
  if (loading || !activeProfile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading your workspace...
        </Text>
      </View>
    );
  }

  // Switch between Personal and Organization layouts
  return isPersonalOrg ? <PersonalDashboard /> : <OrgDashboard />;
}

/**
 * 👤 PERSONAL DASHBOARD
 * 
 * Aggregated view across ALL organizations
 * - Shows combined stats from all orgs
 * - Lists all organizations user is part of
 * - Cross-org analytics
 */
function PersonalDashboard() {
  const colors = useColors();
  const { user } = useAuth();
  const { chartDetailsSheetRef, createSessionSheetRef, setOnSessionCreated } = useModals();
  const { 
    allProfiles,
    activeProfile,
    allSessionsAcrossOrgs,
    loadAllData,
    loadingAggregated,
  } = useProfile();

  const [refreshing, setRefreshing] = useState(false);

  // Load aggregated data for personal profile
  useEffect(() => {
    if (activeProfile && allProfiles.length > 0) {
      console.log('📊 PERSONAL: Loading aggregated data for personal profile')
      loadAllData();
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    setOnSessionCreated(() => loadAllData);
    return () => setOnSessionCreated(null);
  }, [loadAllData, setOnSessionCreated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
      await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // Personal Profile Stats: Aggregated from ALL orgs
  const profileStats = useMemo(() => {
      const totalSessions = allSessionsAcrossOrgs.length;
      const totalCompleted = allSessionsAcrossOrgs.filter(s => s.status === 'completed').length;
      const totalOrgs = allProfiles.length;
      
      return {
        totalSessions,
        totalAbg: totalCompleted,
        totalCompletedSessions: totalCompleted,
        totalTime: `${totalOrgs} orgs`,
        context: 'All Organizations',
        contextType: 'personal' as const
      };
  }, [allSessionsAcrossOrgs, allProfiles]);

  // Personal Chart: Show org distribution
  const pieData = useMemo(() => {
    let data: any[] = [];
    
      if (allProfiles.length > 0) {
        const orgTypes = allProfiles.reduce((acc: any, profile) => {
          const type = profile.org.org_type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        const adminRoles = allProfiles.filter(p => ['owner', 'admin'].includes(p.role)).length;

        data = [
          { 
            value: orgTypes.personal || 0, 
            color: '#6B8FA3', 
            gradientCenterColor: '#8BADC1',
            focused: true,
          },
          { 
            value: orgTypes.organization || 0, 
            color: '#FF8A5C',
            gradientCenterColor: '#FFA880',
          },
          { 
            value: adminRoles, 
            color: '#7AA493',
            gradientCenterColor: '#98C2B1',
          },
        ].filter(item => item.value > 0);
    }

    // Ensure we always have at least one data point for the chart
    if (data.length === 0) {
      data = [
        { 
          value: 1, 
          color: '#E0E0E0', 
          gradientCenterColor: '#F5F5F5',
          focused: true,
        }
      ];
    }

    return data;
  }, [allProfiles]);

  // Quick actions for personal command center
  const handleStartSession = useCallback(() => {
    createSessionSheetRef.current?.open();
  }, [createSessionSheetRef]);

  const handleViewProgress = useCallback(() => {
    chartDetailsSheetRef.current?.open();
  }, [chartDetailsSheetRef]);

  const handleViewAllOrgs = useCallback(() => {
    // Could open profile switcher or dedicated orgs view
  }, []);

  const quickActions = useMemo(() => [
        { 
          icon: 'add-circle' as const, 
          title: 'Start New Session', 
          subtitle: 'Begin training in any org', 
          onPress: handleStartSession
        },
        { 
          icon: 'bar-chart-outline' as const, 
          title: 'View Analytics', 
          subtitle: 'Cross-org performance', 
          color: '#5B7A8C',
          onPress: handleViewProgress
        },
        { 
          icon: 'business' as const, 
          title: 'Manage Orgs', 
          subtitle: `${allProfiles.length} organizations`, 
          color: '#5A8473',
          onPress: handleViewAllOrgs
        },
  ], [handleStartSession, handleViewProgress, handleViewAllOrgs, allProfiles.length]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Welcome Card - Personal Stats */}
        <WelcomeCard 
          fullName={user?.email?.split('@')[0] || 'Commander'}
          stats={profileStats}
          loading={loadingAggregated}
        />

        {/* Personal Chart */}
        <TrainingChart 
          data={pieData}
          centerValue={
            pieData[0]?.color === '#E0E0E0' ? '0' : allProfiles.length.toString()
          }
          centerLabel="Organizations"
          centerSubtext={
            pieData[0]?.color === '#E0E0E0' ? 'No Data Yet' : 'Total'
          }
          onDoubleTap={handleViewProgress}
        />

        {/* Personal Quick Actions */}
        <View style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Command Center
            </Text>
          </View>

          <GroupedList
            data={quickActions}
            renderItem={(action, isFirst, isLast) => (
              <QuickActionCard
                icon={action.icon}
                title={action.title}
                subtitle={action.subtitle}
                color={action.color}
                onPress={action.onPress}
                isFirst={isFirst}
                isLast={isLast}
              />
            )}
            keyExtractor={(action, index) => `action-${index}`}
          />
        </View>

        {/* Recent Activity (All Orgs) */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Activity (All Orgs)
            </Text>
          </View>

          {loadingAggregated ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Loading all sessions...
              </Text>
            </View>
          ) : allSessionsAcrossOrgs.length === 0 ? (
            <EmptyState
              icon="fitness-outline"
              title="No activity yet"
              subtitle="Start training in any of your organizations"
              size="small"
            />
          ) : (
            <View style={styles.sessionList}>
              {allSessionsAcrossOrgs.slice(0, 10).map((session) => (
                <View key={session.id} style={[styles.sessionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <View style={[styles.sessionIcon, { backgroundColor: `${colors.primary}20` }]}>
                    <Ionicons name="fitness" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.sessionDetails}>
                    <Text style={[styles.sessionText, { color: colors.text }]}>
                      {session.session_mode} session
                    </Text>
                    <Text style={[styles.sessionOrg, { color: colors.textMuted }]}>
                      {session.org_name} • {session.profile_role}
                    </Text>
                  </View>
                  <View style={[styles.sessionStatus, { 
                    backgroundColor: session.status === 'completed' ? '#4CAF5020' : '#FFC10720' 
                  }]}>
                    <Text style={[styles.sessionStatusText, { 
                      color: session.status === 'completed' ? '#4CAF50' : '#FFC107' 
                    }]}>
                      {session.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * 🏢 ORGANIZATION DASHBOARD
 * 
 * Focused workspace for a specific organization
 * - Shows ONLY data for this org/profile
 * - Org-specific management
 * - Team-focused interface
 */
function OrgDashboard() {
  const colors = useColors();
  const { user } = useAuth();
  const { createSessionSheetRef, createTeamSheetRef, inviteMembersSheetRef, setOnSessionCreated } = useModals();
  const { 
    activeProfile,
    allProfiles,
    switchToProfile,
    orgSessions,
    orgTeams,
    orgMembers,
    loadOrgData,
    refreshOrgMembers,
  } = useProfile();

  // Use role permissions hook for proper permission checking
  const { org, getRoleInfo } = useRolePermissions();

  const [refreshing, setRefreshing] = useState(false);

  // Register session creation callback
  useEffect(() => {
    setOnSessionCreated(() => () => {
      if (activeProfile) {
        loadOrgData(activeProfile);
      }
    });
    return () => setOnSessionCreated(null);
  }, [loadOrgData, activeProfile, setOnSessionCreated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeProfile) {
      await loadOrgData(activeProfile);
    }
    setRefreshing(false);
  }, [loadOrgData, activeProfile]);

  const handleBackToPersonal = useCallback(() => {
    // Switch to personal profile instead of router.back()
    const personalProfile = allProfiles.find(p => p.org.org_type === 'personal');
    if (personalProfile) {
      switchToProfile(personalProfile.id);
    }
  }, [allProfiles, switchToProfile]);

  const handleStartSession = useCallback(() => {
    createSessionSheetRef.current?.open();
  }, [createSessionSheetRef]);

  const handleCreateTeam = useCallback(() => {
    createTeamSheetRef.current?.open();
  }, [createTeamSheetRef]);

  const handleInviteMembers = useCallback(() => {
    inviteMembersSheetRef.current?.open();
  }, [inviteMembersSheetRef]);

  const getRoleColorLocal = (role: string) => {
    switch (role) {
      case 'owner': return '#FFD700';
      case 'admin': return '#FF6B6B';
      case 'instructor': return '#4ECDC4';
      default: return colors.textMuted;
    }
  };

  if (!activeProfile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading organization...
        </Text>
      </View>
    );
  }

  // Use permissions from role management system
  const canManageMembers = org.canInviteMembers || org.canCreateTeams;
  const isPersonal = activeProfile.org.org_type === 'personal';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Org Header */}
      <View style={styles.header}>
       
        
        <Text style={[styles.orgNameHeader, { color: colors.text }]}>
          {activeProfile.org.name}
        </Text>
        
        <View style={styles.profileMeta}>
          <Text style={[styles.profileName, { color: colors.textMuted }]}>
            {activeProfile.display_name || user?.email?.split('@')[0]}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: `${getRoleColorLocal(activeProfile.role)}20` }]}>
            <Text style={[styles.roleText, { color: getRoleColorLocal(activeProfile.role) }]}>
              {activeProfile.role}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      {!isPersonal && (
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={handleStartSession}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Start Session</Text>
          </TouchableOpacity>

          {/* Show Create Team only if user has permission */}
          {org.canCreateTeams && (
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleCreateTeam}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Create Team</Text>
            </TouchableOpacity>
          )}

          {/* Show Invite Members only if user has permission */}
          {org.canInviteMembers && (
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleInviteMembers}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Invite Members</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sessions for This Org */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Sessions ({orgSessions.length})
        </Text>
        {orgSessions.length === 0 ? (
          <EmptyState
            icon="fitness-outline"
            title="No sessions in this org"
            subtitle="Start your first session here"
            size="small"
          />
        ) : (
          orgSessions.map((session) => (
            <View key={session.id} style={[styles.sessionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={[styles.sessionIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="fitness" size={18} color={colors.primary} />
              </View>
              <View style={styles.sessionDetails}>
                <Text style={[styles.sessionText, { color: colors.text }]}>
                  {session.session_mode} session
                </Text>
                <Text style={[styles.sessionOrg, { color: colors.textMuted }]}>
                  {session.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Members (Org Only) */}
      {!isPersonal && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Members ({orgMembers.length})
            </Text>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={refreshOrgMembers}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={[styles.refreshButtonText, { color: colors.primary }]}>
                Refresh
              </Text>
            </TouchableOpacity>
          </View>
          {orgMembers.length === 0 ? (
            <EmptyState icon="people-outline" title="No members yet" subtitle="Invite members to get started" size="small" />
          ) : (
            orgMembers.map((member) => (
              <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="person" size={20} color={colors.primary} />
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {member.display_name || 'Unknown'}
                </Text>
                <View style={[styles.memberRole, { backgroundColor: `${getRoleColorLocal(member.role)}20` }]}>
                  <Text style={[styles.memberRoleText, { color: getRoleColorLocal(member.role) }]}>
                    {member.role}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Teams (Org Only) */}
      {!isPersonal && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Teams ({orgTeams.length})
          </Text>
          {orgTeams.length === 0 ? (
            <EmptyState icon="people-outline" title="No teams yet" subtitle="Create teams to organize members" size="small" />
          ) : (
            orgTeams.map((team) => (
              <View key={team.id} style={[styles.teamCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <Text style={[styles.teamName, { color: colors.text }]}>
                  {team.name} • {team.member_count} members
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

// Helper function
function getRoleColor(role: string) {
  switch (role) {
    case 'owner': return '#FFD700';
    case 'admin': return '#FF6B6B';
    case 'instructor': return '#4ECDC4';
    default: return '#6B8FA3';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsSection: {
    marginBottom: 24,
  },
  orgsSection: {
    marginBottom: 24,
  },
  orgsList: {
    gap: 12,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgInfo: {
    flex: 1,
    gap: 6,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '700',
  },
  orgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orgType: {
    fontSize: 12,
    fontWeight: '500',
  },
  activitySection: {
    marginBottom: 20,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  sessionList: {
    gap: 8,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDetails: {
    flex: 1,
  },
  sessionText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionOrg: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Org Dashboard specific styles
  header: {
    padding: 24,
    paddingTop: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orgNameHeader: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  memberRole: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberRoleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
  },
});
