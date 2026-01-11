/**
 * Team Switcher Sheet
 * 
 * Single UX primitive for switching between teams.
 * Used in Team tab header when user has multiple teams.
 */
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import type { TeamWithRole } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
    Check,
    ChevronDown,
    Crown,
    Plus,
    Shield,
    Target,
    UserPlus,
    Users,
} from 'lucide-react-native';
import { useCallback } from 'react';
import {
    Modal,
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

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
  owner: { color: '#A78BFA', label: 'Owner', icon: Crown },
  commander: { color: '#F87171', label: 'Commander', icon: Crown },
  team_commander: { color: '#F87171', label: 'Commander', icon: Crown },
  squad_commander: { color: '#FBBF24', label: 'Squad Lead', icon: Shield },
  soldier: { color: '#34D399', label: 'Soldier', icon: Target },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface TeamSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM SWITCHER PILL (trigger button)
// ─────────────────────────────────────────────────────────────────────────────

interface TeamSwitcherPillProps {
  onPress: () => void;
}

export function TeamSwitcherPill({ onPress }: TeamSwitcherPillProps) {
  const colors = useColors();
  const { teams, activeTeamId } = useTeamStore();
  
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const teamName = activeTeam?.name || 'Select Team';
  
  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Users size={14} color={colors.primary} />
      <Text style={[styles.pillText, { color: colors.text }]} numberOfLines={1}>
        {teamName}
      </Text>
      <ChevronDown size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM SWITCHER SHEET
// ─────────────────────────────────────────────────────────────────────────────

export function TeamSwitcherSheet({ visible, onClose }: TeamSwitcherSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teams, activeTeamId, setActiveTeam } = useTeamStore();

  const handleSelectTeam = useCallback((team: TeamWithRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTeam(team.id);
    onClose();
  }, [setActiveTeam, onClose]);

  const handleCreateTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/(protected)/createTeam' as any);
  }, [onClose]);

  const handleJoinTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/(protected)/acceptInvite' as any);
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Switch Team</Text>
          </View>

          {/* Team List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {teams.map((team) => {
              const isActive = team.id === activeTeamId;
              const roleConfig = getRoleConfig(team.my_role);
              const RoleIcon = roleConfig.icon;

              return (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamRow,
                    { backgroundColor: isActive ? colors.primary + '15' : 'transparent' },
                  ]}
                  onPress={() => handleSelectTeam(team)}
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

                  {isActive && (
                    <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                      <Check size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateTeam}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Create Team</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border }]}
              onPress={handleJoinTeam}
              activeOpacity={0.8}
            >
              <UserPlus size={16} color={colors.text} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Join Team</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Pill trigger
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 180,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 120,
  },

  // Sheet
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  // List
  list: {
    maxHeight: 300,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  teamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  teamMembers: {
    fontSize: 12,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

