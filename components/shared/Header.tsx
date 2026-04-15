import { AccountSwitcherSheet } from '@/components/account';
import { PressableScale } from '@/components/shared/PressableScale';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationRealtime } from '@/hooks/realtime/notification/useNotificationRealtime';
import { useColors } from '@/hooks/ui/useColors';
import { getUnreadCount } from '@/services/notifications';
import { useTeamStore } from '@/stores/teamStore';
import { Bell, ChevronDown, User, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';

interface HeaderProps {
  onNotificationPress?: () => void;
}

/**
 * App Header Component
 *
 * Brand header with:
 * - App icon + "Reticle" brand name
 * - Notification bell with badge
 * - Context switcher button (User/Users icon + chevron)
 *   Shows current mode (Personal vs Team name)
 *   Tap → opens account switcher sheet
 */
export function Header({ onNotificationPress }: HeaderProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [accountSwitcherVisible, setAccountSwitcherVisible] = useState(false);

  // Team context
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const isTeamMode = activeTeamId !== null;

  // Fetch initial unread count on mount
  useEffect(() => {
    getUnreadCount()
      .then((count) => setNotificationCount(count))
      .catch((error) => console.error('Failed to get notification count:', error));
  }, []);

  // Increment count in real-time when a new notification arrives
  const handleNewNotification = useCallback(() => {
    console.log('[Header] Realtime notification received, incrementing badge');
    setNotificationCount((c) => c + 1);
  }, []);

  useNotificationRealtime({
    userId: user?.id,
    onNewNotification: handleNewNotification,
  });

  const handleNotificationPress = () => {
    setNotificationCount(0);
    onNotificationPress?.();
  };

  const handleSwitcherPress = () => {
    setAccountSwitcherVisible(true);
  };

  const ContextIcon = isTeamMode ? Users : User;

  return (
    <>
      <View style={styles.container}>
        {/* Left - Brand */}
        <View style={styles.left}>
          <Image source={require('@/assets/images/icon.jpg')} style={styles.appIcon} />
          <Text style={[styles.brandName, { color: colors.text }]}>Reticle</Text>
        </View>

        {/* Right - Action Buttons */}
        <View style={styles.actions}>
          <PressableScale
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleNotificationPress}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={t('common.notifications')}
          >
            <Bell size={18} color={colors.text} strokeWidth={2} />
            {notificationCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: colors.red, borderColor: colors.background }]} />
            )}
          </PressableScale>

          {/* Context switcher trigger */}
          <PressableScale
            style={[
              styles.contextBtn,
              {
                backgroundColor: isTeamMode ? colors.primary + '12' : colors.card,
                borderColor: isTeamMode ? colors.primary + '30' : colors.border,
              },
            ]}
            onPress={handleSwitcherPress}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={isTeamMode ? activeTeam?.name || t('teamHome.team') : t('common.personal')}
          >
            <ContextIcon size={15} color={isTeamMode ? colors.primary : colors.textMuted} strokeWidth={2} />
            {isTeamMode && (
              <Text style={[styles.contextLabel, { color: colors.primary }]} numberOfLines={1}>
                {activeTeam?.name || t('teamHome.team')}
              </Text>
            )}
            <ChevronDown size={12} color={isTeamMode ? colors.primary : colors.textMuted} />
          </PressableScale>
        </View>
      </View>

      {/* Account Switcher Modal */}
      <AccountSwitcherSheet visible={accountSwitcherVisible} onClose={() => setAccountSwitcherVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingRight: 8,
  },

  // Left section
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Right section
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },

  // Context switcher button
  contextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1,
    maxWidth: 140,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 80,
  },
});
