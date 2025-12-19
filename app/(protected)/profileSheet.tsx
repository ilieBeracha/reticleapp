/**
 * Profile Sheet
 * 
 * Personal account settings displayed as a bottom sheet.
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
import { useCallback } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function ProfileSheet() {
  const colors = useColors();
  const { fullName, email } = useAppContext();
  const { signOut, profileAvatarUrl } = useAuth();
  const { isEnabled: notificationsEnabled, requestPermission } = useNotifications();

  const handleTestNotification = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!notificationsEnabled) {
      const granted = await requestPermission();
      if (!granted) {
        await delay(2000);
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

  const avatarUri = profileAvatarUrl;
  const fallbackInitial = fullName?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
      </View>

      {/* Profile Card */}
      <TouchableOpacity
        style={[styles.profileCard, { backgroundColor: colors.background }]}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(protected)/userMenu' as any);
        }}
      >
        <BaseAvatar
          source={avatarUri ? { uri: avatarUri } : undefined}
          fallbackText={fallbackInitial}
          size="lg"
          borderWidth={0}
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
            {fullName || 'User'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textMuted }]} numberOfLines={1}>
            {email || 'No email'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SETTINGS</Text>

        <View style={[styles.menuGroup, { backgroundColor: colors.background }]}>
          {/* Notifications Toggle */}
          <View style={styles.menuItem}>
            <View style={[styles.iconContainer, { backgroundColor: notificationsEnabled ? colors.primary : colors.textMuted }]}>
              <Ionicons name="notifications" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>
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

          {/* Test Notification */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem} onPress={handleTestNotification}>
            <View style={[styles.iconContainer, { backgroundColor: colors.textMuted }]}>
              <Ionicons name="notifications-outline" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Test Notification</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Appearance */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="color-palette" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Appearance</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Integrations */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(protected)/integrations' as any);
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#22C55E' }]}>
              <Ionicons name="extension-puzzle" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Integrations</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>Garmin, Apple Watch</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Help & Support */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="help-circle" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <View style={[styles.menuGroup, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
          <View style={[styles.iconContainer, { backgroundColor: colors.destructive }]}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemText, { color: colors.destructive }]}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: colors.textMuted }]}>Reticle v1.0.0</Text>
      </View>

      <View style={{ height: 40 }} />
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

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 15,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Menu
  menuGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemText: {
    fontSize: 17,
  },
  menuItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
  },
});