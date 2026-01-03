/**
 * Team Members Sheet
 * 
 * View and manage team members - native form sheet
 */
import { BaseAvatar } from '@/components/BaseAvatar';
import { useColors } from '@/hooks/ui/useColors';
import { getTeamMembers } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import type { TeamMemberWithProfile, TeamRole } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: string; priority: number }> = {
  owner: { color: '#A78BFA', label: 'Owner', icon: 'star', priority: 0 },
  commander: { color: '#F87171', label: 'Commander', icon: 'shield', priority: 1 },
  team_commander: { color: '#F87171', label: 'Commander', icon: 'shield', priority: 1 },
  squad_commander: { color: '#FBBF24', label: 'Squad Lead', icon: 'shield-half', priority: 2 },
  soldier: { color: '#34D399', label: 'Soldier', icon: 'person', priority: 3 },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER CARD
// ─────────────────────────────────────────────────────────────────────────────

function MemberCard({ 
  member, 
  colors, 
  onPress,
  isFirst,
  isLast,
}: { 
  member: TeamMemberWithProfile; 
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const roleConfig = getRoleConfig(member.role?.role);

  return (
    <TouchableOpacity
      style={[
        styles.memberCard,
        { backgroundColor: colors.card },
        isFirst && styles.memberCardFirst,
        isLast && styles.memberCardLast,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <BaseAvatar
        source={member.profile.avatar_url ? { uri: member.profile.avatar_url } : undefined}
        fallbackText={member.profile.full_name || member.profile.email || 'U'}
        size="md"
      />
      <View style={styles.memberContent}>
        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
          {member.profile.full_name || member.profile.email?.split('@')[0] || 'Unknown'}
        </Text>
        <View style={styles.memberMeta}>
          <View style={[styles.rolePill, { backgroundColor: roleConfig.color + '12' }]}>
            <Ionicons name={roleConfig.icon as any} size={10} color={roleConfig.color} />
            <Text style={[styles.rolePillText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
          </View>
          {member.role?.squad_id && (
            <View style={[styles.squadPill, { backgroundColor: colors.secondary }]}>
              <Ionicons name="layers" size={9} color={colors.textMuted} />
              <Text style={[styles.squadPillText, { color: colors.textMuted }]}>
                {member.role.squad_id}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamMembersSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams } = useTeamStore();

  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const team = teams.find(t => t.id === teamId);
  const canManage = team?.my_role === 'owner' || team?.my_role === 'commander';

  const loadMembers = useCallback(async () => {
    if (!teamId) return;
    try {
      const data = await getTeamMembers(teamId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [loadMembers])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadMembers();
    setRefreshing(false);
  }, [loadMembers]);

  const handleMemberPress = (member: TeamMemberWithProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/memberPreview?id=${member.profile.id}` as any);
  };

  const handleInvite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/inviteTeamMember?teamId=${teamId}` as any);
  };

  // Group members by role with proper ordering
  const groupedMembers = useMemo(() => {
    const roleOrder: TeamRole[] = ['owner', 'commander', 'squad_commander', 'soldier'];
    
    const grouped = members.reduce((acc, member) => {
      const role = member.role?.role || 'soldier';
      // Normalize 'commander' roles to display together
      const normalizedRole = role === 'commander' ? 'commander' : role;
      if (!acc[normalizedRole]) acc[normalizedRole] = [];
      acc[normalizedRole].push(member);
      return acc;
    }, {} as Record<string, TeamMemberWithProfile[]>);

    return roleOrder
      .filter(role => grouped[role]?.length > 0)
      .map(role => ({
        role,
        config: getRoleConfig(role),
        members: grouped[role] || [],
      }));
  }, [members]);

  // Stats summary
  const stats = useMemo(() => {
    const commanders = members.filter(m => 
      m.role?.role === 'owner' || m.role?.role === 'commander'
    ).length;
    const squadLeads = members.filter(m => m.role?.role === 'squad_commander').length;
    const soldiers = members.filter(m => !m.role?.role || m.role?.role === 'soldier').length;
    return { commanders, squadLeads, soldiers };
  }, [members]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Team Members</Text>
        {team && (
          <View style={[styles.teamBadge, { backgroundColor: colors.secondary }]}>
            <Ionicons name="people" size={12} color={colors.textMuted} />
            <Text style={[styles.teamBadgeText, { color: colors.text }]}>{team.name}</Text>
          </View>
        )}
      </View>

      {/* Stats Bar */}
      {!loading && members.length > 0 && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{members.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: ROLE_CONFIG.commander.color }]}>{stats.commanders}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Leaders</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: ROLE_CONFIG.squad_commander.color }]}>{stats.squadLeads}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Squad Leads</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: ROLE_CONFIG.soldier.color }]}>{stats.soldiers}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Soldiers</Text>
          </View>
        </View>
      )}

      {/* Invite Button */}
      {canManage && !loading && (
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.text }]}
          onPress={handleInvite}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.background} />
          <Text style={[styles.inviteBtnText, { color: colors.background }]}>Invite Member</Text>
        </TouchableOpacity>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading members...</Text>
        </View>
      )}

      {/* Members List */}
      {!loading && groupedMembers.length > 0 && (
        <View style={styles.membersList}>
          {groupedMembers.map(({ role, config, members: roleMembers }) => (
            <View key={role} style={styles.roleGroup}>
              <View style={styles.roleHeader}>
                <View style={[styles.roleIconWrap, { backgroundColor: config.color + '12' }]}>
                  <Ionicons name={config.icon as any} size={12} color={config.color} />
                </View>
                <Text style={[styles.roleTitle, { color: colors.textMuted }]}>
                  {config.label}{roleMembers.length > 1 ? 's' : ''}
                </Text>
                <View style={[styles.roleCount, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.roleCountText, { color: colors.text }]}>{roleMembers.length}</Text>
                </View>
              </View>

              <View style={[styles.roleCard, { borderColor: colors.border }]}>
                {roleMembers.map((member, index) => (
                  <MemberCard
                    key={member.profile.id}
                    member={member}
                    colors={colors}
                    onPress={() => handleMemberPress(member)}
                    isFirst={index === 0}
                    isLast={index === roleMembers.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {!loading && members.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="people-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Members Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Start building your team by inviting members
          </Text>
          {canManage && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.text }]}
              onPress={handleInvite}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add-outline" size={16} color={colors.background} />
              <Text style={[styles.emptyBtnText, { color: colors.background }]}>Invite First Member</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // Header
  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 20, gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  teamBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  teamBadgeText: { fontSize: 13, fontWeight: '500' },

  // Stats Bar
  statsBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 28 },

  // Invite Button
  inviteBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    height: 48, 
    borderRadius: 12, 
    marginBottom: 20,
  },
  inviteBtnText: { fontSize: 15, fontWeight: '600' },

  // Loading
  loading: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  // Members List
  membersList: { gap: 20 },

  // Role Group
  roleGroup: { gap: 10 },
  roleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleIconWrap: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  roleCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  roleCountText: { fontSize: 12, fontWeight: '600' },
  roleCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },

  // Member Card
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  memberCardFirst: { borderTopLeftRadius: 13, borderTopRightRadius: 13 },
  memberCardLast: { borderBottomLeftRadius: 13, borderBottomRightRadius: 13 },
  memberContent: { flex: 1, gap: 4 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rolePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, gap: 4 },
  rolePillText: { fontSize: 10, fontWeight: '700' },
  squadPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, gap: 3 },
  squadPillText: { fontSize: 10, fontWeight: '500' },

  // Empty State
  emptyState: { alignItems: 'center', padding: 32, borderRadius: 16, gap: 12, marginTop: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  emptyBtnText: { fontSize: 14, fontWeight: '600' },
});
