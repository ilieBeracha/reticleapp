import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { BellIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { BaseAvatar } from './BaseAvatar';

interface HeaderProps {
  notificationCount?: number;
  onNotificationPress?: () => void;
  onUserPress?: () => void;
  onWorkspacePress?: () => void;
}

export function Header({ notificationCount = 0, onNotificationPress, onUserPress, onWorkspacePress }: HeaderProps) {
  const { email, avatarUrl, activeWorkspace } = useAppContext();
  const colors = useColors();

  const fallbackInitial = email?.charAt(0)?.toUpperCase() ?? '?';
  const workspaceName =
    activeWorkspace?.workspace_name || 'Workspace';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container]}>
        {/* Left Section */}
        <View style={styles.left}>
          <Pressable onPress={onUserPress} style={({ pressed }) => [styles.avatar, { opacity: pressed ? 0.6 : 1 }]}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + '20' }]}>
              <BaseAvatar
                source={avatarUrl ? { uri: avatarUrl } : undefined}
                fallbackText={fallbackInitial}
                size="sm"
                borderWidth={0}
              />
            </View>
          </Pressable>

          {/* <Pressable
            onPress={onWorkspacePress}
            style={({ pressed }) => [styles.workspace, { backgroundColor: pressed ? colors.secondary : 'transparent' }]}
          >
            <Text style={[styles.workspaceText, { color: colors.text }]} numberOfLines={1}>
              {workspaceName}
            </Text>

            <ChevronDownIcon size={16} color={colors.tint} strokeWidth={2.5} />
          </Pressable> */}
        </View>

        {/* Right Section */}
        <Pressable
          onPress={onNotificationPress}
          style={({ pressed }) => [styles.notification, pressed && { opacity: 0.8 }]}
        >
          <BellIcon size={18} color={colors.tint} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={[styles.divider]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',


    display: 'flex',
    width: '100%',
  },
  divider: {
    height: 0.5,
    opacity: 0.3,
  },

  // Left Section
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspace: {
    display: 'flex',
    flexDirection: 'row',
  },
  workspaceText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  chevronWrapper: {
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  notification: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
