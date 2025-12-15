/**
 * Team Settings Sheet
 * 
 * Manage team configuration and preferences - native form sheet
 */
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
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
  const { teams } = useTeamStore();

  const team = teams.find(t => t.id === teamId);
  const isOwner = team?.my_role === 'owner';
  const canManage = isOwner || team?.my_role === 'commander';

  const showComingSoon = (feature: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Coming Soon', `${feature} will be available in a future update.`, [{ text: 'OK' }]);
  };

  const handleSettingPress = (item: SettingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (item.id) {
      case 'members':
        router.push(`/(protected)/teamMembers?teamId=${teamId}` as any);
        break;
      case 'edit_team':
        showComingSoon('Edit Team Info');
        break;
      case 'notifications':
        showComingSoon('Notification Settings');
        break;
      case 'roles':
        showComingSoon('Roles & Permissions');
        break;
      case 'squads':
        showComingSoon('Squad Management');
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
        Alert.alert(
          'Leave Team',
          `Are you sure you want to leave ${team?.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Leave', 
              style: 'destructive', 
              onPress: () => showComingSoon('Leave Team') 
            },
          ]
        );
        break;
      case 'delete':
        if (!isOwner) {
          Alert.alert('Permission Denied', 'Only the team owner can delete the team.');
          return;
        }
        Alert.alert(
          'Delete Team',
          `Are you sure you want to permanently delete ${team?.name}? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive', 
              onPress: () => showComingSoon('Delete Team') 
            },
          ]
        );
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
});

