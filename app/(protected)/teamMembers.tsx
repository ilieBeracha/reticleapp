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

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  owner: { color: '#A78BFA', label: 'Owner', icon: 'crown' },
  commander: { color: '#F87171', label: 'Commander', icon: 'shield' },
  team_commander: { color: '#F87171', label: 'Commander', icon: 'shield' },
  squad_commander: { color: '#FBBF24', label: 'Squad Lead', icon: 'shield-half' },
  soldier: { color: '#34D399', label: 'Soldier', icon: 'person' },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER ROW
// ─────────────────────────────────────────────────────────────────────────────

function MemberRow({ 
  member, 
  colors, 
  onPress,
  canManage,
}: { 
  member: TeamMemberWithProfile; 
  colors: any;
  onPress: () => void;
  canManage: boolean;
}) {
  const roleConfig = getRoleConfig(member.role?.role);

  return (
    <TouchableOpacity
      style={[styles.memberRow, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <BaseAvatar
        source={member.profile.avatar_url ? { uri: member.profile.avatar_url } : undefined}
        fallbackText={member.profile.full_name || member.profile.email || 'U'}
        size="md"
      />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
          {member.profile.full_name || member.profile.email?.split('@')[0] || 'Unknown'}
        </Text>
        <View style={styles.memberMeta}>
          <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '15' }]}>
            <Ionicons name={roleConfig.icon as any} size={10} color={roleConfig.color} />
            <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
          </View>
          {member.role?.squad_id && (
            <Text style={[styles.squadText, { color: colors.textMuted }]}>
              {member.role.squad_id}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamMembersSheet() {
  const colors = useColors();
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

  // Group members by role
  const grouped = members.reduce((acc, member) => {
    const role = member.role?.role || 'soldier';
    if (!acc[role]) acc[role] = [];
    acc[role].push(member);
    return acc;
  }, {} as Record<string, TeamMemberWithProfile[]>);

  const roleOrder: TeamRole[] = ['owner', 'commander', 'squad_commander', 'soldier'];

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="people" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Team Members</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {team?.name} · {members.length} {members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {/* Invite Button */}
      {canManage && (
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
          onPress={handleInvite}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={18} color="#fff" />
          <Text style={styles.inviteBtnText}>Invite Member</Text>
        </TouchableOpacity>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Members List */}
      {!loading && (
        <View style={styles.membersList}>
          {roleOrder.map(role => {
            const roleMembers = grouped[role];
            if (!roleMembers?.length) return null;

            const roleConfig = getRoleConfig(role);

            return (
              <View key={role} style={styles.roleSection}>
                <View style={styles.roleSectionHeader}>
                  <View style={[styles.roleSectionBadge, { backgroundColor: roleConfig.color + '15' }]}>
                    <Ionicons name={roleConfig.icon as any} size={12} color={roleConfig.color} />
                  </View>
                  <Text style={[styles.roleSectionTitle, { color: colors.textMuted }]}>
                    {roleConfig.label.toUpperCase()}S
                  </Text>
                  <Text style={[styles.roleSectionCount, { color: colors.textMuted }]}>
                    {roleMembers.length}
                  </Text>
                </View>

                {roleMembers.map(member => (
                  <MemberRow
                    key={member.profile.id}
                    member={member}
                    colors={colors}
                    onPress={() => handleMemberPress(member)}
                    canManage={canManage}
                  />
                ))}
              </View>
            );
          })}
        </View>
      )}

      {/* Empty State */}
      {!loading && members.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No members yet</Text>
          {canManage && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={handleInvite}
            >
              <Text style={styles.emptyBtnText}>Invite First Member</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { alignItems: 'center', paddingVertical: 24 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Invite Button
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 20 },
  inviteBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Loading
  loading: { paddingVertical: 60, alignItems: 'center' },

  // Members List
  membersList: { gap: 20 },

  // Role Section
  roleSection: { gap: 8 },
  roleSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  roleSectionBadge: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  roleSectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  roleSectionCount: { fontSize: 11, fontWeight: '500', marginLeft: 'auto' },

  // Member Row
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
  memberInfo: { flex: 1, gap: 4 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  roleText: { fontSize: 11, fontWeight: '600' },
  squadText: { fontSize: 11 },

  // Empty
  emptyCard: { alignItems: 'center', padding: 32, borderRadius: 16, borderWidth: 1, gap: 12 },
  emptyText: { fontSize: 15 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

