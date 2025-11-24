import { BaseAvatar } from '@/components/BaseAvatar';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { Colors } from '@/constants/Colors';
import { useModals } from '@/contexts/ModalContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { WorkspaceMemberWithTeams } from '@/types/workspace';
import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

// Memoized stat card component
const StatCard = React.memo(function StatCard({
  icon,
  label,
  value,
  color,
  cardBg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  cardBg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: cardBg }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: '#fff' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>{label}</Text>
    </View>
  );
});

// Memoized member card component
const MemberCard = React.memo(function MemberCard({
  member,
  colors,
}: {
  member: WorkspaceMemberWithTeams;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.memberCard, { backgroundColor: colors.card }]}>
      <View style={styles.memberMain}>
        <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="md" />
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {member.profile_full_name || 'Unknown User'}
          </Text>
          <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
            {member.profile_email}
          </Text>
          {member.teams.length > 0 && (
            <View style={styles.memberTeams}>
              {member.teams.slice(0, 2).map((team: { team_name: string }, idx: number) => (
                <View key={idx} style={[styles.teamBadge, { backgroundColor: colors.secondary }]}>
                  <Feather name="users" size={10} color={colors.textMuted} />
                  <Text style={[styles.teamBadgeText, { color: colors.text }]}>
                    {team.team_name}
                  </Text>
                </View>
              ))}
              {member.teams.length > 2 && (
                <Text style={[styles.moreTeams, { color: colors.textMuted }]}>
                  +{member.teams.length - 2}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={[styles.memberAction, { backgroundColor: colors.secondary }]}>
        <Feather name="more-horizontal" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
});

// Memoized role section component
const RoleSection = React.memo(function RoleSection({
  info,
  members,
  colors,
}: {
  role: string;
  info: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap };
  members: WorkspaceMemberWithTeams[];
  colors: typeof Colors.light;
}) {
  if (members.length === 0) return null;

  return (
    <View style={styles.roleSection}>
      <View style={styles.roleSectionHeader}>
        <View style={styles.roleHeaderLeft}>
          <View style={[styles.roleIconBadge, { backgroundColor: info.color + '20' }]}>
            <Ionicons name={info.icon} size={16} color={info.color} />
          </View>
          <Text style={[styles.roleSectionTitle, { color: colors.text }]}>{info.label}</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.countBadgeText, { color: colors.text }]}>{members.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.membersList}>
        {members.map((member) => (
          <MemberCard key={member.member_id} member={member} colors={colors} />
        ))}
      </View>
    </View>
  );
});

/**
 * Members page - displays workspace members with invite functionality
 * Optimized with FlashList and memoized components for smooth scrolling
 */
const MembersScreen = React.memo(function MembersScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { activeWorkspace, activeWorkspaceId } = useAppContext();
  const { workspaceMembers, loadWorkspaceMembers, loading } = useWorkspaceStore();
  const { inviteMembersSheetRef } = useModals();

  // Load workspace members when the screen mounts or workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceMembers();
    }
  }, [activeWorkspaceId, loadWorkspaceMembers]);

  // Group members by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, WorkspaceMemberWithTeams[]> = {
      owner: [],
      admin: [],
      instructor: [],
      member: [],
    };

    workspaceMembers.forEach((member) => {
      const role = member.role;
      if (groups[role]) {
        groups[role].push(member);
      }
    });

    return groups;
  }, [workspaceMembers]);

  // Role display info
  const roleInfo = useMemo(
    () => ({
      owner: { label: 'Owners', color: '#FF6B35', icon: 'shield-checkmark' as const },
      admin: { label: 'Admins', color: '#5B7A8C', icon: 'shield-half' as const },
      instructor: { label: 'Instructors', color: '#E76925', icon: 'school' as const },
      member: { label: 'Members', color: '#6B8FA3', icon: 'person' as const },
    }),
    []
  );

  const handleInvite = useCallback(() => {
    inviteMembersSheetRef.current?.open();
  }, [inviteMembersSheetRef]);

  // Stats cards data
  const stats = useMemo(() => {
    const totalMembers = workspaceMembers.length;
    const instructors = groupedMembers.instructor.length;
    const membersWithTeams = workspaceMembers.filter((m) => m.teams.length > 0).length;
    const activeToday = Math.floor(totalMembers * 0.7); // Mock data

    return [
      { icon: 'people' as const, label: 'Total Members', value: totalMembers, color: colors.blue },
      { icon: 'school' as const, label: 'Instructors', value: instructors, color: colors.orange },
      { icon: 'shield' as const, label: 'In Teams', value: membersWithTeams, color: colors.green },
      { icon: 'pulse' as const, label: 'Active Today', value: activeToday, color: colors.purple },
    ];
  }, [workspaceMembers, groupedMembers, colors]);

  if (loading && workspaceMembers.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemedStatusBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading members...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Team Members</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {activeWorkspace?.workspace_name || 'Workspace'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            onPress={handleInvite}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <ScrollView
          horizontal
          style={styles.statsGrid}
          showsHorizontalScrollIndicator={false}
          removeClippedSubviews={true}
        >
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              cardBg={colors.card}
            />
          ))}
        </ScrollView>

        {/* Members List by Role */}
        {Object.entries(roleInfo).map(([role, info]) => (
          <RoleSection
            key={role}
            role={role}
            info={info}
            members={groupedMembers[role]}
            colors={colors}
          />
        ))}

        {/* Empty State */}
        {workspaceMembers.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No members yet</Text>
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              Invite members to join your workspace
            </Text>
            <TouchableOpacity
              style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
              onPress={handleInvite}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.emptyStateButtonText}>Invite Members</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
});

export default MembersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  roleSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  roleSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  membersList: {
    minHeight: 80,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  memberMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 13,
  },
  memberTeams: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreTeams: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  memberAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    marginHorizontal: 20,
    marginTop: 40,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});
