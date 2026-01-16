/**
 * Teams List Screen
 *
 * Shows all user's teams with option to create or join.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Check,
  ChevronRight,
  Crown,
  Plus,
  Shield,
  Target,
  UserPlus,
  Users,
} from 'lucide-react-native';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  owner: { color: '#A78BFA', label: 'Owner', icon: Crown },
  commander: { color: '#3B82F6', label: 'Commander', icon: Crown },
  team_commander: { color: '#3B82F6', label: 'Commander', icon: Crown },
  squad_commander: { color: '#F59E0B', label: 'Squad Lead', icon: Shield },
  soldier: { color: '#10B981', label: 'Soldier', icon: Target },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

export default function TeamsListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teams, activeTeamId, setActiveTeam } = useTeamStore();

  const handleSelectTeam = (teamId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTeam(teamId);
    router.push(`/(protected)/team/${teamId}` as any);
  };

  const handleCreateTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTeam' as any);
  };

  const handleJoinTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/acceptInvite' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>My Teams</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {teams.length > 0 ? `${teams.length} team${teams.length !== 1 ? 's' : ''}` : 'No teams yet'}
          </Text>
        </View>

        {/* Teams List */}
        {teams.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {teams.map((team, index) => {
              const isActive = team.id === activeTeamId;
              const roleConfig = getRoleConfig(team.my_role);
              const RoleIcon = roleConfig.icon;

              return (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamRow,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}
                  onPress={() => handleSelectTeam(team.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.teamIcon, { backgroundColor: colors.secondary }]}>
                    <Users size={18} color={colors.primary} />
                  </View>

                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                      {team.name}
                    </Text>
                    <View style={styles.teamMeta}>
                      <RoleIcon size={10} color={roleConfig.color} />
                      <Text style={[styles.teamRole, { color: roleConfig.color }]}>
                        {roleConfig.label}
                      </Text>
                      {team.member_count && (
                        <Text style={[styles.teamMembers, { color: colors.textMuted }]}>
                          · {team.member_count} members
                        </Text>
                      )}
                    </View>
                  </View>

                  {isActive ? (
                    <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                      <Check size={12} color="#fff" />
                    </View>
                  ) : (
                    <ChevronRight size={16} color={colors.border} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Users size={24} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No teams yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Create a team or join an existing one to train together
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
            <Plus size={18} color={colors.background} strokeWidth={2.5} />
            <Text style={[styles.actionBtnText, { color: colors.background }]}>Create Team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: colors.border }]}
            onPress={handleJoinTeam}
            activeOpacity={0.7}
          >
            <UserPlus size={18} color={colors.text} />
            <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>Join Team</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },

  // Header
  header: { paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 15 },

  // Card
  card: { borderRadius: 12, overflow: 'hidden' },
  teamRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  teamIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  teamMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  teamRole: { fontSize: 12, fontWeight: '500' },
  teamMembers: { fontSize: 12 },
  checkIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Empty
  emptyCard: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Actions
  actions: { gap: 12, marginTop: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12 },
  actionBtnText: { fontSize: 16, fontWeight: '600' },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12, borderWidth: 1 },
  actionBtnOutlineText: { fontSize: 16, fontWeight: '600' },
});
