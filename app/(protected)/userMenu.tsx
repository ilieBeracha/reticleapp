import { BaseAvatar } from '@/components/BaseAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import { useCallback } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

/**
 * USER MENU - Native Form Sheet
 * 
 * Account settings, workspace switch, logout.
 */
export default function UserMenuSheet() {
  const colors = useColors();
  const { user, signOut } = useAuth();

  const avatarUri = user?.user_metadata?.avatar_url;
  const fallbackInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?";
  const displayName = user?.user_metadata?.full_name || 
                      user?.email?.split('@')[0] || 
                      'User';
  const email = user?.email || '';

  const handleSignOut = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  }, [signOut]);

  const handleSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Navigate to settings
    Alert.alert("Coming Soon", "Settings will be available soon!");
  }, []);

  const handleSwitchTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/teamSwitcher' as any);
  }, []);

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Account</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <BaseAvatar
            source={avatarUri ? { uri: avatarUri } : undefined}
            fallbackText={fallbackInitial}
            size="lg"
            borderWidth={0}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={handleSettings}
            colors={colors}
            showChevron
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="business-outline"
            label="Switch Team"
            onPress={handleSwitchTeam}
            colors={colors}
            showChevron
          />
        </View>

        {/* Logout */}
        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <MenuItem
            icon="log-out-outline"
            label="Log Out"
            onPress={handleSignOut}
            colors={colors}
            destructive
          />
        </View>
    </ScrollView>
  );
}

// Menu Item Component
function MenuItem({
  icon,
  label,
  onPress,
  colors,
  showChevron,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/ui/useColors").useColors>;
  showChevron?: boolean;
  destructive?: boolean;
}) {
  const iconBgColor = destructive ? colors.destructive : colors.primary;
  const textColor = destructive ? colors.destructive : colors.text;

  return (
    <TouchableOpacity   
      onPress={onPress}
      style={styles.menuItem}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={[styles.menuItemText, { color: textColor }]}>{label}</Text>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

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

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 15,
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
  menuItemText: {
    flex: 1,
    fontSize: 17,
    marginLeft: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
});

