/**
 * Profile Tab
 * 
 * Clean account settings screen with:
 * - Profile info
 * - Quick team access (compact)
 * - Settings (notifications, appearance)
 * - Sign out
 */
import { BaseAvatar } from '@/components/BaseAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useNotifications } from '@/hooks/useNotifications';
import { sendTestNotification } from '@/services/notifications';
import { useTeamStore } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Bell,
  BellRing,
  ChevronRight,
  Crown,
  LogOut,
  Plus,
  Shield,
  Target,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

// ═══════════════════════════════════════════════════════════════════════════
// ROLE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_CONFIG: Record<string, { color: string; icon: any }> = {
  owner: { color: '#8B5CF6', icon: Crown },
  commander: { color: '#EF4444', icon: Crown },
  team_commander: { color: '#EF4444', icon: Crown },
  squad_commander: { color: '#F59E0B', icon: Shield },
  soldier: { color: '#10B981', icon: Target },
};

function getRoleConfig(role: string | null | undefined) {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProfileScreen() {
  const colors = useColors();
  const { fullName, email } = useAppContext();
  const { signOut, profileAvatarUrl } = useAuth();
  const { isEnabled: notificationsEnabled, requestPermission } = useNotifications();
  const { teams, loadTeams } = useTeamStore();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadTeams();
    setRefreshing(false);
  }, [loadTeams]);

  const handleTestNotification = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!notificationsEnabled) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Notifications Disabled', 'Please enable notifications in your device settings.', [{ text: 'OK' }]);
        return;
      }
    }

    await sendTestNotification();
    Alert.alert('Notification Scheduled', 'You will receive a test notification in 3 seconds.');
  }, [notificationsEnabled, requestPermission]);

  const handleSignOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Sign out error:', error);
          }
        },
      },
    ]);
  }, [signOut]);

  const avatarUrl = profileAvatarUrl;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
          <TouchableOpacity
            style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(protected)/userMenu' as any);
            }}
          >
            <BaseAvatar 
              source={avatarUrl ? { uri: avatarUrl } : undefined}
              fallbackText={fullName || email || 'U'} 
              size="lg" 
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{fullName || 'User'}</Text>
              <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{email || 'No email'}</Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>

        {/* Teams Section - Compact */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Users size={16} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TEAMS</Text>
            </View>
            {teams.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Could open a teams management sheet in the future
                }}
              >
                <Text style={[styles.sectionLink, { color: colors.primary }]}>{teams.length}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Team Preview Row */}
          {teams.length > 0 ? (
            <View style={[styles.teamsPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.teamsPreviewScroll}
              >
                {teams.slice(0, 5).map((team) => {
                  const roleConfig = getRoleConfig(team.my_role);
                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={[styles.teamChip, { backgroundColor: colors.background }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/(protected)/teamDetail?id=${team.id}` as any);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.teamChipIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Users size={14} color={colors.primary} />
                      </View>
                      <View style={styles.teamChipContent}>
                        <Text style={[styles.teamChipName, { color: colors.text }]} numberOfLines={1}>
                          {team.name}
                        </Text>
                        <View style={styles.teamChipRole}>
                          <View style={[styles.roleDot, { backgroundColor: roleConfig.color }]} />
                          <Text style={[styles.teamChipRoleText, { color: colors.textMuted }]}>
                            {team.my_role?.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {teams.length > 5 && (
                  <View style={[styles.teamChipMore, { backgroundColor: colors.background }]}>
                    <Text style={[styles.teamChipMoreText, { color: colors.textMuted }]}>+{teams.length - 5}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          ) : null}

          {/* Team Actions */}
          <View style={styles.teamActions}>
            <TouchableOpacity
              style={[styles.teamActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(protected)/createTeam' as any);
              }}
              activeOpacity={0.7}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.teamActionText, { color: colors.text }]}>Create</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.teamActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(protected)/acceptInvite' as any);
              }}
              activeOpacity={0.7}
            >
              <UserPlus size={16} color={colors.text} />
              <Text style={[styles.teamActionText, { color: colors.text }]}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SETTINGS</Text>
            </View>
          </View>

          {/* Notifications */}
          <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: notificationsEnabled ? colors.primary + '20' : colors.secondary }]}>
              <Bell size={18} color={notificationsEnabled ? colors.primary : colors.textMuted} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                {notificationsEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={async (value) => {
                if (value) {
                  await requestPermission();
                } else {
                  Alert.alert(
                    'Disable Notifications',
                    'To disable notifications, go to your device Settings > Reticle > Notifications.',
                    [{ text: 'OK' }]
                  );
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleTestNotification}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
              <BellRing size={18} color={colors.text} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Test Notification</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="color-palette-outline" size={18} color={colors.text} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Appearance</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="help-circle-outline" size={18} color={colors.text} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Help & Support</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: colors.red + '12', borderColor: colors.red + '25' }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <LogOut size={18} color={colors.red} />
            <Text style={[styles.signOutText, { color: colors.red }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>Reticle v1.0.0</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 8 : 16 },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  sectionLink: { fontSize: 13, fontWeight: '600' },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  profileEmail: { fontSize: 14 },

  // Teams Preview
  teamsPreview: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  teamsPreviewScroll: {
    gap: 8,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    minWidth: 140,
  },
  teamChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamChipContent: {
    flex: 1,
  },
  teamChipName: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 100,
  },
  teamChipRole: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teamChipRoleText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  teamChipMore: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamChipMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Team Actions
  teamActions: { flexDirection: 'row', gap: 10 },
  teamActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamActionText: { fontSize: 14, fontWeight: '600' },

  // Settings
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingHint: { fontSize: 12, marginTop: 2 },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600' },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
  },
});
