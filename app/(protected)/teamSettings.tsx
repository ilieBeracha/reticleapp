/**
 * Team Settings Sheet
 * 
 * Manage team configuration and preferences - native form sheet
 */
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { deleteTeam, removeTeamMember, updateTeam } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
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

const SETTINGS_SECTIONS: SettingSection[] = [
  {
    title: 'General',
    items: [
      { id: 'edit_team', icon: 'pencil', label: 'Edit Team Info', description: 'Name, description, and logo' },
      { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', description: 'Training alerts & reminders' },
    ],
  },
  {
    title: 'Members',
    items: [
      { id: 'members', icon: 'people-outline', label: 'Manage Members', description: 'View and manage team roster' },
      { id: 'roles', icon: 'shield-outline', label: 'Roles & Permissions', description: 'Configure member access levels' },
      { id: 'squads', icon: 'git-branch-outline', label: 'Squads', description: 'Organize into sub-groups' },
    ],
  },
  {
    title: 'Training',
    items: [
      { id: 'drill_defaults', icon: 'fitness-outline', label: 'Drill Defaults', description: 'Default drill configurations' },
      { id: 'scoring', icon: 'analytics-outline', label: 'Scoring Rules', description: 'Customize scoring criteria' },
      { id: 'targets', icon: 'disc-outline', label: 'Target Types', description: 'Manage available targets' },
    ],
  },
  {
    title: 'Data & Privacy',
    items: [
      { id: 'export', icon: 'download-outline', label: 'Export Data', description: 'Download training records' },
      { id: 'archive', icon: 'archive-outline', label: 'Archive Team', description: 'Hide team from active list' },
    ],
  },
  {
    title: 'Danger Zone',
    items: [
      { id: 'leave', icon: 'exit-outline', label: 'Leave Team', danger: true },
      { id: 'delete', icon: 'trash-outline', label: 'Delete Team', description: 'Permanently remove team', danger: true },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SETTING ROW
// ─────────────────────────────────────────────────────────────────────────────

function SettingRow({
  item,
  colors,
  onPress,
}: {
  item: SettingItem;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const iconBgColor = item.danger 
    ? '#EF444415' 
    : item.iconColor 
      ? item.iconColor + '15' 
      : colors.primary + '15';
  const iconColor = item.danger ? '#EF4444' : item.iconColor || colors.primary;
  const textColor = item.danger ? '#EF4444' : colors.text;

  return (
    <TouchableOpacity
      style={[styles.settingRow, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBgColor }]}>
        <Ionicons name={item.icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: textColor }]}>{item.label}</Text>
        {item.description && (
          <Text style={[styles.settingDescription, { color: colors.textMuted }]} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamSettingsSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams, loadTeams, setActiveTeam } = useTeamStore();
  const { user } = useAuth();

  const team = teams.find(t => t.id === teamId);
  const isOwner = team?.my_role === 'owner';
  const canManage = isOwner || team?.my_role === 'commander';

  // Edit Team Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(team?.name || '');
  const [editDescription, setEditDescription] = useState(team?.description || '');
  const [saving, setSaving] = useState(false);

  const showComingSoon = (feature: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Coming Soon', `${feature} will be available in a future update.`, [{ text: 'OK' }]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LEAVE TEAM
  // ─────────────────────────────────────────────────────────────────────────
  const handleLeaveTeam = async () => {
    if (!teamId || !user) return;
    
    if (isOwner) {
      Alert.alert(
        'Cannot Leave',
        'As the owner, you must transfer ownership or delete the team instead.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Leave Team',
      `Are you sure you want to leave ${team?.name}? You'll need a new invite to rejoin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await removeTeamMember(teamId, user.id);
              await loadTeams();
              
              // Switch to another team or clear active
              const remainingTeams = teams.filter(t => t.id !== teamId);
              if (remainingTeams.length > 0) {
                setActiveTeam(remainingTeams[0].id);
              } else {
                setActiveTeam(null);
              }
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
              Alert.alert('Left Team', `You have left ${team?.name}.`);
            } catch (error) {
              console.error('Failed to leave team:', error);
              Alert.alert('Error', 'Failed to leave team. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE TEAM
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteTeam = async () => {
    if (!teamId || !isOwner) return;

    Alert.alert(
      'Delete Team',
      `Are you sure you want to permanently delete "${team?.name}"?\n\nThis will remove all members, trainings, and data. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await deleteTeam(teamId);
              await loadTeams();
              
              // Switch to another team or clear active
              const remainingTeams = teams.filter(t => t.id !== teamId);
              if (remainingTeams.length > 0) {
                setActiveTeam(remainingTeams[0].id);
              } else {
                setActiveTeam(null);
              }
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
              Alert.alert('Team Deleted', `${team?.name} has been permanently deleted.`);
            } catch (error) {
              console.error('Failed to delete team:', error);
              Alert.alert('Error', 'Failed to delete team. Please try again.');
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
      Alert.alert('Error', 'Failed to update team. Please try again.');
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
      case 'drill_defaults':
        showComingSoon('Drill Defaults');
        break;
      case 'scoring':
        showComingSoon('Scoring Rules');
        break;
      case 'targets':
        showComingSoon('Target Types');
        break;
      case 'export':
        showComingSoon('Export Data');
        break;
      case 'archive':
        showComingSoon('Archive Team');
        break;
      case 'leave':
        handleLeaveTeam();
        break;
      case 'delete':
        if (!isOwner) {
          Alert.alert('Permission Denied', 'Only the team owner can delete the team.');
          return;
        }
        handleDeleteTeam();
        break;
      default:
        showComingSoon(item.label);
    }
  };

  // Filter sections based on role
  const visibleSections = SETTINGS_SECTIONS.map(section => {
    if (section.title === 'Danger Zone') {
      // Only show leave for non-owners, show both for owners
      const filteredItems = section.items.filter(item => {
        if (item.id === 'delete') return isOwner;
        return true;
      });
      return { ...section, items: filteredItems };
    }
    return section;
  }).filter(section => section.items.length > 0);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="settings" size={28} color={colors.text} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Team Settings</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {team?.name}
        </Text>
        {!canManage && (
          <View style={[styles.viewOnlyBadge, { backgroundColor: colors.yellow + '20' }]}>
            <Ionicons name="eye-outline" size={12} color={colors.yellow} />
            <Text style={[styles.viewOnlyText, { color: colors.yellow }]}>View Only</Text>
          </View>
        )}
      </View>

      {/* Settings List */}
      <View style={styles.settingsList}>
        {visibleSections.map((section, sectionIndex) => (
          <View key={section.title} style={[styles.section, sectionIndex > 0 && styles.sectionSpacing]}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {section.title.toUpperCase()}
            </Text>
            <View style={styles.sectionItems}>
              {section.items.map(item => (
                <SettingRow
                  key={item.id}
                  item={item}
                  colors={colors}
                  onPress={() => handleSettingPress(item)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Version Info */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Team ID: {teamId?.slice(0, 8)}...
        </Text>
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
              <Text style={[styles.modalCancel, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Team</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving || !editName.trim()}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[
                  styles.modalSave, 
                  { color: editName.trim() ? colors.primary : colors.textMuted }
                ]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>TEAM NAME</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter team name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
              <TextInput
                style={[
                  styles.textInput, 
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
                ]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Optional team description"
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
  viewOnlyBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    marginTop: 12 
  },
  viewOnlyText: { fontSize: 12, fontWeight: '600' },

  // Settings List
  settingsList: { gap: 8 },

  // Section
  section: {},
  sectionSpacing: { marginTop: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  sectionItems: { gap: 8 },

  // Setting Row
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 12, 
    borderWidth: 1, 
    gap: 12 
  },
  settingIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center' 
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

