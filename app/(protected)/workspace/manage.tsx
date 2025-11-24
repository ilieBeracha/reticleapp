import { BaseAvatar } from '@/components/BaseAvatar';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { Colors } from '@/constants/Colors';
import { useModals } from '@/contexts/ModalContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppContext } from '@/hooks/useAppContext';
import { getWorkspaceTeams } from '@/services/teamService';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { WorkspaceMemberWithTeams } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ManageTab = 'members' | 'teams';

// Simplified Member Card
const MemberCard = React.memo(function MemberCard({
  member,
  colors,
  onPress,
}: {
  member: WorkspaceMemberWithTeams;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="sm" role={member.role} />
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {member.profile_full_name || 'Unknown'}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {member.profile_email}
          </Text>
        </View>
      </View>
      
      {member.role === 'owner' && (
        <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>Owner</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// Simplified Team Card
const TeamCard = React.memo(function TeamCard({
  team,
  colors,
  onPress,
}: {
  team: any;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
          <Ionicons name="people" size={18} color={colors.text} />
        </View>
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{team.name}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            {team.member_count || 0} {(team.member_count || 0) === 1 ? 'member' : 'members'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );
});

// Section Header
const SectionHeader = React.memo(function SectionHeader({
  title,
  colors,
}: {
  title: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
    </View>
  );
});

const ManageScreen = React.memo(function ManageScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { activeWorkspace, activeWorkspaceId } = useAppContext();
  const { workspaceMembers, loadWorkspaceMembers, loading: membersLoading } = useWorkspaceStore();
  const { inviteMembersSheetRef, createTeamSheetRef, teamPreviewSheetRef, setSelectedTeam, memberPreviewSheetRef, setSelectedMember } = useModals();
  
  const [activeTab, setActiveTab] = useState<ManageTab>('members');
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setTeamsLoading(true);
    try {
      const teamsData = await getWorkspaceTeams(activeWorkspaceId);
      setTeams(teamsData || []);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceMembers();
      loadTeams();
    }
  }, [activeWorkspaceId, loadWorkspaceMembers, loadTeams]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadWorkspaceMembers(), loadTeams()]);
    setRefreshing(false);
  }, [loadWorkspaceMembers, loadTeams]);

  const handleInvite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inviteMembersSheetRef.current?.open();
  }, [inviteMembersSheetRef]);

  const handleCreateTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createTeamSheetRef.current?.open();
  }, [createTeamSheetRef]);

  const handleTeamPress = useCallback((team: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTeam(team);
    teamPreviewSheetRef.current?.open();
  }, [setSelectedTeam, teamPreviewSheetRef]);

  const handleMemberPress = useCallback((member: WorkspaceMemberWithTeams) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMember(member);
    memberPreviewSheetRef.current?.open();
  }, [setSelectedMember, memberPreviewSheetRef]);

  // Group members
  const membersList = useMemo(() => {
    const groups: Record<string, WorkspaceMemberWithTeams[]> = {
      owner: [],
      admin: [],
      instructor: [],
      member: [],
    };
    
    workspaceMembers.forEach((m) => {
      if (groups[m.role]) groups[m.role].push(m);
    });

    const result: any[] = [];
    const roles = [
      { key: 'owner', label: 'Owners' },
      { key: 'admin', label: 'Admins' },
      { key: 'instructor', label: 'Instructors' },
      { key: 'member', label: 'Members' },
    ];

    roles.forEach(({ key, label }) => {
      const roleMembers = groups[key];
      if (roleMembers && roleMembers.length > 0) {
        result.push({ type: 'header', title: label });
        roleMembers.forEach(m => result.push({ type: 'member', data: m }));
      }
    });

    return result;
  }, [workspaceMembers]);

  const isLoading = membersLoading || teamsLoading;

  if (isLoading && !refreshing && workspaceMembers.length === 0 && teams.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemedStatusBar />
        <View style={styles.centerContent}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />
      
      {/* Header & Tabs - Fixed at top */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage</Text>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: colors.secondary }]}
            onPress={activeTab === 'members' ? handleInvite : handleCreateTeam}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.tabsContainer, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }]}
            onPress={() => setActiveTab('members')}
            activeOpacity={0.9}
          >
            <Text style={[styles.tabText, { color: activeTab === 'members' ? colors.text : colors.textMuted }]}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'teams' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }]}
            onPress={() => setActiveTab('teams')}
            activeOpacity={0.9}
          >
            <Text style={[styles.tabText, { color: activeTab === 'teams' ? colors.text : colors.textMuted }]}>Teams</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'members' ? membersList : teams}
        keyExtractor={(item, index) => 
          activeTab === 'members' 
            ? (item.type === 'header' ? `header-${item.title}` : item.data.id)
            : item.id
        }
        renderItem={({ item }) => {
          if (activeTab === 'members') {
            if (item.type === 'header') {
              return <SectionHeader title={item.title} colors={colors} />;
            }
            return <MemberCard member={item.data} colors={colors} onPress={() => handleMemberPress(item.data)} />;
          }
          return <TeamCard team={item} colors={colors} onPress={() => handleTeamPress(item)} />;
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {activeTab === 'members' ? 'No members found' : 'No teams created'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
});

export default ManageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    height: 36,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
