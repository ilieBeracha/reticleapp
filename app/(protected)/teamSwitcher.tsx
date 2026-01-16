/**
 * Team Switcher Sheet
 *
 * Native form sheet for switching between teams.
 * Follows the same pattern as profileSheet and teamsList.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  owner: { color: '#A78BFA', label: 'Owner', icon: 'star' },
  commander: { color: '#3B82F6', label: 'Commander', icon: 'shield' },
  team_commander: { color: '#3B82F6', label: 'Commander', icon: 'shield' },
  squad_commander: { color: '#F59E0B', label: 'Squad Lead', icon: 'flag' },
  soldier: { color: '#10B981', label: 'Soldier', icon: 'person' },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

export default function TeamSwitcherSheet() {
  const colors = useColors();
  const { teams, activeTeamId, setActiveTeam } = useTeamStore();

  const handleSelectTeam = (teamId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTeam(teamId);
    router.back();
    // Navigate to team after a brief delay to let sheet dismiss
    setTimeout(() => {
      router.push(`/(protected)/team/${teamId}` as any);
    }, 100);
  };

  const handleCreateTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
    setTimeout(() => {
      router.push('/(protected)/createTeam' as any);
    }, 100);
  };

  const handleJoinTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
    setTimeout(() => {
      router.push('/(protected)/acceptInvite' as any);
    }, 100);
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Switch Team</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {teams.length} team{teams.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Teams List */}
      {teams.length > 0 && (
        <View style={[styles.menuGroup, { backgroundColor: colors.background }]}>
          {teams.map((team, index) => {
            const isActive = team.id === activeTeamId;
            const roleConfig = getRoleConfig(team.my_role);

            return (
              <View key={team.id}>
                {index > 0 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    isActive && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => handleSelectTeam(team.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: isActive ? colors.primary : colors.secondary }]}>
                    <Ionicons name="people" size={18} color={isActive ? '#fff' : colors.primary} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemText, { color: colors.text }]} numberOfLines={1}>
                      {team.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Ionicons name={roleConfig.icon} size={10} color={roleConfig.color} />
                      <Text style={[styles.roleText, { color: roleConfig.color }]}>
                        {roleConfig.label}
                      </Text>
                      {team.member_count != null && team.member_count > 0 && (
                        <Text style={[styles.memberText, { color: colors.textMuted }]}>
                          · {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  {isActive && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Empty State */}
      {teams.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="people" size={28} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No teams yet</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Create a team or join an existing one
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.text }]}
          onPress={handleCreateTeam}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color={colors.background} />
          <Text style={[styles.actionBtnText, { color: colors.background }]}>Create Team</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnOutline, { borderColor: colors.border }]}
          onPress={handleJoinTeam}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add" size={18} color={colors.text} />
          <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>Join Team</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  header: {
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },

  // Menu
  menuGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  memberText: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Actions
  actions: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
