/**
 * Team Settings Sheet
 *
 * Manage team configuration and preferences - native form sheet
 */
import { StandardsManager } from '@/components/standards';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { deleteTeam, removeTeamMember, updateTeam } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRTL } from '@/hooks/ui/useRTL';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SettingItem = {
  id: string;
  icon: string;
  label: string;
  description?: string;
  iconColor?: string;
  danger?: boolean;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

function getSettingsSections(t: (key: string) => string): SettingSection[] {
  return [
    {
      title: t('teams.general'),
      items: [
        { id: 'edit_team', icon: 'pencil', label: t('teams.editTeamInfo'), description: t('teams.editTeamInfoDesc') },
        {
          id: 'notifications',
          icon: 'notifications-outline',
          label: t('teams.notifications'),
          description: t('teams.notificationsDesc'),
        },
      ],
    },
    {
      title: t('teams.members'),
      items: [
        { id: 'members', icon: 'people-outline', label: t('teams.manageMembers'), description: t('teams.manageMembersDesc') },
        {
          id: 'roles',
          icon: 'shield-outline',
          label: t('teams.rolesPermissions'),
          description: t('teams.rolesPermissionsDesc'),
        },
        { id: 'squads', icon: 'git-branch-outline', label: t('teams.squads'), description: t('teams.squadsDesc') },
      ],
    },
    {
      title: t('teams.equipment'),
      items: [
        {
          id: 'weapons',
          icon: 'shield-checkmark-outline',
          label: t('teams.teamArmory'),
          description: t('teams.teamArmoryDesc'),
        },
      ],
    },
    {
      title: t('teams.training'),
      items: [
        {
          id: 'standards',
          icon: 'checkmark-circle-outline',
          label: t('teams.performanceStandards'),
          description: t('teams.performanceStandardsDesc'),
          iconColor: '#22C55E',
        },
        {
          id: 'drill_defaults',
          icon: 'fitness-outline',
          label: t('teams.drillDefaults'),
          description: t('teams.drillDefaultsDesc'),
        },
        { id: 'scoring', icon: 'analytics-outline', label: t('teams.scoringRules'), description: t('teams.scoringRulesDesc') },
        { id: 'targets', icon: 'disc-outline', label: t('teams.targetTypes'), description: t('teams.targetTypesDesc') },
      ],
    },
    {
      title: t('teams.dataPrivacy'),
      items: [
        { id: 'export', icon: 'download-outline', label: t('teams.exportData'), description: t('teams.exportDataDesc') },
        { id: 'archive', icon: 'archive-outline', label: t('teams.archiveTeam'), description: t('teams.archiveTeamDesc') },
      ],
    },
    {
      title: t('teams.dangerZone'),
      items: [
        { id: 'leave', icon: 'exit-outline', label: t('teams.leaveTeam'), danger: true },
        {
          id: 'delete',
          icon: 'trash-outline',
          label: t('teams.deleteTeam'),
          description: t('teams.deleteTeamDesc'),
          danger: true,
        },
      ],
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTING ROW
// ─────────────────────────────────────────────────────────────────────────────

function SettingRow({
  item,
  colors,
  onPress,
  isRTL,
  chevronIcon,
}: {
  item: SettingItem;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  isRTL: boolean;
  chevronIcon: string;
}) {
  const iconBgColor = item.danger ? '#EF444415' : item.iconColor ? item.iconColor + '15' : colors.primary + '15';
  const iconColor = item.danger ? '#EF4444' : item.iconColor || colors.primary;
  const textColor = item.danger ? '#EF4444' : colors.text;

  return (
    <TouchableOpacity
      style={[
        styles.settingRow,
        { backgroundColor: colors.background, borderColor: colors.border },
        isRTL && styles.settingRowRTL,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBgColor }]}>
        <Ionicons name={item.icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text 
          style={[
            styles.settingLabel, 
            { color: textColor, textAlign: isRTL ? 'right' : 'left' }
          ]}
        >
          {item.label}
        </Text>
        {item.description && (
          <Text 
            style={[
              styles.settingDescription, 
              { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }
            ]} 
            numberOfLines={1}
          >
            {item.description}
          </Text>
        )}
      </View>
      <Ionicons name={chevronIcon as any} size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamSettingsSheet() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams, loadTeams, setActiveTeam } = useTeamStore();
  const { user } = useAuth();
  const { isRTL, styles: rtlStyles, chevron } = useRTL();

  const team = teams.find((t) => t.id === teamId);
  const isOwner = team?.my_role === 'owner';
  const canManage = isOwner || team?.my_role === 'commander';

  // Edit Team Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(team?.name || '');
  const [editDescription, setEditDescription] = useState(team?.description || '');
  const [saving, setSaving] = useState(false);

  // Standards Modal State
  const [standardsModalVisible, setStandardsModalVisible] = useState(false);

  const showComingSoon = (feature: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t('teams.comingSoonTitle'), `${feature}${t('teams.comingSoonMessage')}`, [{ text: t('common.ok') }]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LEAVE TEAM
  // ─────────────────────────────────────────────────────────────────────────
  const handleLeaveTeam = async () => {
    if (!teamId || !user) return;

    if (isOwner) {
      Alert.alert(t('teams.cannotLeaveTitle'), t('teams.cannotLeaveMessage'), [
        { text: t('common.ok') },
      ]);
      return;
    }

    Alert.alert(t('teams.leaveTeamTitle'), t('teams.leaveTeamConfirm', { teamName: team?.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('teams.leave'),
        style: 'destructive',
        onPress: async () => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await removeTeamMember(teamId, user.id);
            await loadTeams();

            // Switch to another team or clear active
            const remainingTeams = teams.filter((t) => t.id !== teamId);
            if (remainingTeams.length > 0) {
              setActiveTeam(remainingTeams[0].id);
            } else {
              setActiveTeam(null);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
            Alert.alert(t('teams.leftTeamTitle'), t('teams.leftTeamMessage', { teamName: team?.name }));
          } catch (error) {
            console.error('Failed to leave team:', error);
            Alert.alert(t('common.error'), t('teams.failedLeaveTeam'));
          }
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE TEAM
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteTeam = async () => {
    if (!teamId || !isOwner) return;

    Alert.alert(
      t('teams.deleteTeamTitle'),
      t('teams.deleteTeamConfirm', { teamName: team?.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('teams.deleteForever'),
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await deleteTeam(teamId);
              await loadTeams();

              // Switch to another team or clear active
              const remainingTeams = teams.filter((t) => t.id !== teamId);
              if (remainingTeams.length > 0) {
                setActiveTeam(remainingTeams[0].id);
              } else {
                setActiveTeam(null);
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
              Alert.alert(t('teams.teamDeletedTitle'), t('teams.teamDeletedMessage', { teamName: team?.name }));
            } catch (error) {
              console.error('Failed to delete team:', error);
              Alert.alert(t('common.error'), t('teams.failedDeleteTeam'));
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT TEAM INFO
  // ─────────────────────────────────────────────────────────────────────────
  const handleEditTeam = () => {
    setEditName(team?.name || '');
    setEditDescription(team?.description || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!teamId || !editName.trim()) return;

    setSaving(true);
    try {
      await updateTeam({
        team_id: teamId,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      await loadTeams();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModalVisible(false);
    } catch (error) {
      console.error('Failed to update team:', error);
      Alert.alert(t('common.error'), t('teams.failedUpdateTeam'));
    } finally {
      setSaving(false);
    }
  };

  const handleSettingPress = (item: SettingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (item.id) {
      case 'members':
        router.push(`/(protected)/teamMembers?teamId=${teamId}` as any);
        break;
      case 'edit_team':
        handleEditTeam();
        break;
      case 'notifications':
        showComingSoon('Notification Settings');
        break;
      case 'roles':
        showComingSoon('Roles & Permissions');
        break;
      case 'squads':
        router.push(`/(protected)/teamSquads?teamId=${teamId}` as any);
        break;
      case 'weapons':
        // Dismiss sheet first, then navigate to full-screen armory
        router.dismiss();
        setTimeout(() => {
          router.push(`/(protected)/teamArmory?teamId=${teamId}` as any);
        }, 100);
        break;
      case 'standards':
        if (!canManage) {
          Alert.alert(t('common.permissionDenied'), t('teams.permissionDeniedStandards'));
          return;
        }
        setStandardsModalVisible(true);
        break;
      case 'drill_defaults':
        showComingSoon(t('teams.drillDefaults'));
        break;
      case 'scoring':
        showComingSoon(t('teams.scoringRules'));
        break;
      case 'targets':
        showComingSoon(t('teams.targetTypes'));
        break;
      case 'export':
        showComingSoon(t('teams.exportData'));
        break;
      case 'archive':
        showComingSoon(t('teams.archiveTeam'));
        break;
      case 'leave':
        handleLeaveTeam();
        break;
      case 'delete':
        if (!isOwner) {
          Alert.alert(t('common.permissionDenied'), t('teams.permissionDeniedDelete'));
          return;
        }
        handleDeleteTeam();
        break;
      default:
        showComingSoon(item.label);
    }
  };

  // Filter sections based on role
  const settingsSections = getSettingsSections(t);
  const visibleSections = settingsSections.map((section) => {
    if (section.title === t('teams.dangerZone')) {
      // Only show leave for non-owners, show both for owners
      const filteredItems = section.items.filter((item) => {
        if (item.id === 'delete') return isOwner;
        return true;
      });
      return { ...section, items: filteredItems };
    }
    // Only show Equipment section for commanders
    if (section.title === t('teams.equipment')) {
      return canManage ? section : { ...section, items: [] };
    }
    // Only show Training section for commanders
    if (section.title === t('teams.training')) {
      return canManage ? section : { ...section, items: [] };
    }
    return section;
  }).filter((section) => section.items.length > 0);

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="settings" size={28} color={colors.text} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('teams.teamSettings')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{team?.name}</Text>
        {!canManage && (
          <View style={[styles.viewOnlyBadge, { backgroundColor: colors.yellow + '20' }]}>
            <Ionicons name="eye-outline" size={12} color={colors.yellow} />
            <Text style={[styles.viewOnlyText, { color: colors.yellow }]}>{t('common.viewOnly')}</Text>
          </View>
        )}
      </View>

      {/* Settings List */}
      <View style={styles.settingsList}>
        {visibleSections.map((section, sectionIndex) => (
          <View key={section.title} style={[styles.section, sectionIndex > 0 && styles.sectionSpacing]}>
            <Text 
              style={[
                styles.sectionTitle, 
                { 
                  color: colors.textMuted,
                  textAlign: isRTL ? 'right' : 'left',
                  marginLeft: isRTL ? 0 : 4,
                  marginRight: isRTL ? 4 : 0,
                }
              ]}
            >
              {section.title.toUpperCase()}
            </Text>
            <View style={styles.sectionItems}>
              {section.items.map((item) => (
                <SettingRow key={item.id} item={item} colors={colors} isRTL={isRTL} chevronIcon={chevron.forward} onPress={() => handleSettingPress(item)} />
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Version Info */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>{t('teams.teamId')}{teamId?.slice(0, 8)}...</Text>
      </View>

      {/* Edit Team Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} disabled={saving}>
              <Text style={[styles.modalCancel, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('teams.editTeam')}</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving || !editName.trim()}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalSave, { color: editName.trim() ? colors.primary : colors.textMuted }]}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('teams.teamNameLabel')}</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder={t('teams.teamNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoFocus
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('teams.descriptionLabel')}</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                ]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder={t('teams.descriptionPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Performance Standards Modal */}
      <Modal
        visible={standardsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStandardsModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setStandardsModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textMuted }]}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('teams.performanceStandards')}</Text>
            <View style={{ width: 50 }} />
          </View>

          {/* Standards Manager */}
          {teamId && <StandardsManager teamId={teamId} />}
        </View>
      </Modal>
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
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  viewOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
  },
  viewOnlyText: { fontSize: 12, fontWeight: '600' },

  // Settings List
  settingsList: { gap: 8 },

  // Section
  section: {},
  sectionSpacing: { marginTop: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  sectionItems: { gap: 8 },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  settingRowRTL: {
    flexDirection: 'row-reverse',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingDescription: { fontSize: 12 },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 32 },
  footerText: { fontSize: 11 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalContent: { padding: 20, gap: 20 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginLeft: 4 },
  textInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
});
