import { BaseAvatar } from '@/components/BaseAvatar';
import SwiftBottomSheet from '@/components/swift/bottom-sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  value?: string;
  showChevron?: boolean;
}

function SettingsRow({ icon, label, onPress, destructive, value, showChevron = true }: SettingsRowProps) {
  const colors = useColors();
  const textColor = destructive ? '#FF3B30' : colors.text;
  
  return (
    <TouchableOpacity 
      style={styles.row} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: destructive ? '#FF3B3015' : colors.secondary }]}>
        <Ionicons name={icon} size={18} color={textColor} />
      </View>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {value && <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text>}
      {showChevron && !destructive && (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  const colors = useColors();
  
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function Settings() {
  const colors = useColors();
  const { user, signOut } = useAuth();
  const { fullName, email } = useAppContext();
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const handleSignOut = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Sign Out', 
      'Are you sure you want to sign out?', 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            signOut();
          }
        },
      ]
    );
  }, [signOut]);

  const handleProfilePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfileSheetOpen(true);
  }, []);

  const handleNotificationsPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'Notification settings will be available in a future update.');
  }, []);

  const handleAppearancePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Coming Soon', 'Appearance settings will be available in a future update.');
  }, []);

  const handleHelpPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Help & Support', 'Contact support@reticle.app for assistance.');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        {/* Profile Preview */}
        <TouchableOpacity 
          style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <BaseAvatar fallbackText={fullName || email || '?'} size="md" />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {fullName || 'User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
              {email || 'No email'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Account Section */}
        <SettingsSection title="ACCOUNT">
          <SettingsRow 
            icon="person-outline" 
            label="Edit Profile" 
            onPress={handleProfilePress}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow 
            icon="notifications-outline" 
            label="Notifications" 
            onPress={handleNotificationsPress}
          />
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection title="PREFERENCES">
          <SettingsRow 
            icon="moon-outline" 
            label="Appearance" 
            value="System"
            onPress={handleAppearancePress}
          />
        </SettingsSection>

        {/* Support Section */}
        <SettingsSection title="SUPPORT">
          <SettingsRow 
            icon="help-circle-outline" 
            label="Help & Support" 
            onPress={handleHelpPress}
          />
        </SettingsSection>

        {/* Sign Out */}
        <SettingsSection title="">
          <SettingsRow 
            icon="log-out-outline" 
            label="Sign Out" 
            onPress={handleSignOut}
            destructive
            showChevron={false}
          />
        </SettingsSection>

        {/* App Version */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          Version 1.0.0
        </Text>
      </ScrollView>

      {/* Profile Sheet */}
      <SwiftBottomSheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <BaseAvatar fallbackText={fullName || email || '?'} size="lg" />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {fullName || 'User'}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
              {email || 'No email'}
            </Text>
          </View>
          
          <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.sheetInfo}>
            <View style={styles.sheetInfoRow}>
              <Text style={[styles.sheetInfoLabel, { color: colors.textMuted }]}>User ID</Text>
              <Text style={[styles.sheetInfoValue, { color: colors.text }]} numberOfLines={1}>
                {user?.id?.slice(0, 8) || 'N/A'}...
              </Text>
            </View>
            <View style={styles.sheetInfoRow}>
              <Text style={[styles.sheetInfoLabel, { color: colors.textMuted }]}>Email</Text>
              <Text style={[styles.sheetInfoValue, { color: colors.text }]} numberOfLines={1}>
                {email || 'Not available'}
              </Text>
            </View>
          </View>
        </View>
      </SwiftBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    marginRight: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
  },
  sheet: {
    padding: 24,
  },
  sheetHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  sheetSubtitle: {
    fontSize: 15,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  sheetInfo: {
    gap: 16,
  },
  sheetInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sheetInfoValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
});