import { BaseAvatar } from '@/components/BaseAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from "@/hooks/ui/useColors";
import { useTeamStore } from '@/store/teamStore';
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
 * Quick access to account actions.
 */
export default function UserMenuSheet() {
  const colors = useColors();
  const { user, signOut, profileAvatarUrl, profileFullName } = useAuth();
  const { teams } = useTeamStore();

  const avatarUri = profileAvatarUrl ?? user?.user_metadata?.avatar_url;
  const fallbackInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?";
  const displayName = profileFullName ||
                      user?.user_metadata?.full_name || 
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

  const handleProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.dismiss();
    router.push('/(protected)/(tabs)/profile' as any);
  }, []);

  const handleTeams = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.dismiss();
    router.push('/(protected)/(tabs)/profile' as any);
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
        <TouchableOpacity 
          style={[styles.profileCard, { backgroundColor: colors.card }]}
          onPress={handleProfile}
          activeOpacity={0.7}
        >
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
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
          <MenuItem
            icon="people-outline"
            label="Your Teams"
            subtitle={teams.length > 0 ? `${teams.length} team${teams.length !== 1 ? 's' : ''}` : 'None yet'}
            onPress={handleTeams}
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
  subtitle,
  onPress,
  colors,
  showChevron,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
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
      <View style={styles.menuItemContent}>
        <Text style={[styles.menuItemText, { color: textColor }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        )}
      </View>
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
});
