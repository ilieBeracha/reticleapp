/**
 * Account Switcher Sheet
 *
 * Allows switching between Personal (solo) mode and Team accounts.
 * Used in the global header for account context selection.
 */
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/stores/teamStore';
import type { TeamWithRole } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, ChevronDown, Crown, Plus, Shield, Target, User, UserPlus, Users } from 'lucide-react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

function getRoleConfig(role: string | null | undefined, t: (key: string) => string) {
  const ROLE_CONFIG: Record<string, { color: string; label: string; icon: any }> = {
    owner: { color: '#A78BFA', label: t('teams.roles.owner'), icon: Crown },
    commander: { color: '#F87171', label: t('teams.roles.commander'), icon: Crown },
    team_commander: { color: '#F87171', label: t('teams.roles.commander'), icon: Crown },
    squad_commander: { color: '#FBBF24', label: t('teams.roles.squadCommander'), icon: Shield },
    soldier: { color: '#34D399', label: t('teams.roles.soldier'), icon: Target },
  };

  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface AccountSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT SWITCHER PILL (trigger button for header)
// ─────────────────────────────────────────────────────────────────────────────

interface AccountSwitcherPillProps {
  onPress: () => void;
}

export function AccountSwitcherPill({ onPress }: AccountSwitcherPillProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { teams, activeTeamId } = useTeamStore();

  const isPersonalMode = activeTeamId === null;
  const activeTeam = teams.find((team) => team.id === activeTeamId);
  const displayName = isPersonalMode ? t('account.personal') : activeTeam?.name || t('teams.selectTeam');
  const IconComponent = isPersonalMode ? User : Users;

  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <IconComponent size={14} color={colors.primary} />
      <Text style={[styles.pillText, { color: colors.text }]} numberOfLines={1}>
        {displayName}
      </Text>
      <ChevronDown size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT SWITCHER SHEET
// ─────────────────────────────────────────────────────────────────────────────

export function AccountSwitcherSheet({ visible, onClose }: AccountSwitcherSheetProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teams, activeTeamId, setActiveTeam, showContextSwitchOverlay } = useTeamStore();

  const isPersonalMode = activeTeamId === null;

  const handleSelectPersonal = useCallback(() => {
    if (isPersonalMode) {
      onClose();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Show full-screen overlay, switch team, close modal
    showContextSwitchOverlay(t('account.personal'));
    setActiveTeam(null);
    onClose();
  }, [setActiveTeam, onClose, isPersonalMode, t, showContextSwitchOverlay]);

  const handleSelectTeam = useCallback(
    (team: TeamWithRole) => {
      if (team.id === activeTeamId) {
        onClose();
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Show full-screen overlay, switch team, close modal
      showContextSwitchOverlay(team.name);
      setActiveTeam(team.id);
      onClose();
    },
    [setActiveTeam, onClose, activeTeamId, showContextSwitchOverlay]
  );

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('account.switchAccount')}</Text>
          </View>

          {/* Account List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {/* Personal Account Option */}
            <TouchableOpacity
              style={[styles.accountRow, { backgroundColor: isPersonalMode ? colors.primary + '15' : 'transparent' }]}
              onPress={handleSelectPersonal}
              activeOpacity={0.7}
            >
              <View style={[styles.accountIcon, { backgroundColor: colors.secondary }]}>
                <User size={18} color={colors.primary} />
              </View>

              <View style={styles.accountInfo}>
                <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                  {t('account.personal')}
                </Text>
                <Text style={[styles.accountMeta, { color: colors.textMuted }]}>{t('account.mySessions')}</Text>
              </View>

              {isPersonalMode && (
                <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Separator */}
            {teams.length > 0 && (
              <View style={styles.separatorContainer}>
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
                <Text style={[styles.separatorText, { color: colors.textMuted }]}>{t('account.teams')}</Text>
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              </View>
            )}

            {/* Team List */}
            {teams.map((team) => {
              const isActive = team.id === activeTeamId;
              const roleConfig = getRoleConfig(team.my_role, t);
              const RoleIcon = roleConfig.icon;

              return (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.accountRow, { backgroundColor: isActive ? colors.primary + '15' : 'transparent' }]}
                  onPress={() => handleSelectTeam(team)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.accountIcon, { backgroundColor: colors.secondary }]}>
                    <Users size={18} color={colors.primary} />
                  </View>

                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                      {team.name}
                    </Text>
                    <View style={styles.teamMeta}>
                      <RoleIcon size={10} color={roleConfig.color} />
                      <Text style={[styles.teamRole, { color: roleConfig.color }]}>{roleConfig.label}</Text>
                      {team.member_count && (
                        <Text style={[styles.teamMembers, { color: colors.textMuted }]}>
                          · {t('teams.membersCount', { count: team.member_count })}
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
              <Text style={styles.actionBtnText}>{t('teams.createTeam')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border }]}
              onPress={handleJoinTeam}
              activeOpacity={0.8}
            >
              <UserPlus size={16} color={colors.text} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>{t('teams.joinTeam')}</Text>
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
    maxWidth: 160,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 100,
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
    maxHeight: 350,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  accountMeta: {
    fontSize: 12,
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

  // Separator
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  separator: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
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
