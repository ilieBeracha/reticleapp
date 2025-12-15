/**
 * Profile Tab
 * 
 * Personal account settings:
 * - Profile info
 * - Insights (shooting stats)
 * - Settings (notifications, appearance)
 * - Sign out
 */
import { BaseAvatar } from '@/components/BaseAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useNotifications } from '@/hooks/useNotifications';
import { sendTestNotification } from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Bell,
  BellRing,
  ChevronRight,
  LogOut,
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProfileScreen() {
  const colors = useColors();
  const { fullName, email } = useAppContext();
  const { signOut, profileAvatarUrl } = useAuth();
  const { isEnabled: notificationsEnabled, requestPermission } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Could refresh user data here
    setRefreshing(false);
  }, []);

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
