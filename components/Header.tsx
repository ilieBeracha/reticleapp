
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { BellIcon, ChevronDownIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BaseAvatar } from './BaseAvatar';

interface HeaderProps {
  notificationCount?: number;
  onNotificationPress?: () => void;
  onUserPress?: () => void;
  onWorkspacePress?: () => void;
}

export function Header({ 
  notificationCount = 0, 
  onNotificationPress, 
  onUserPress,
  onWorkspacePress 
}: HeaderProps) {
  // ✨ SINGLE SOURCE OF TRUTH
  const { email, avatarUrl, activeWorkspace } = useAppContext();
  const colors = useColors();

  const fallbackInitial = email?.charAt(0)?.toUpperCase() ?? "?";
  
  // Display "Personal" for personal workspaces, workspace name for others
  const workspaceName = activeWorkspace?.workspace_type === 'personal'
    ? 'Personal'
    : (activeWorkspace?.workspace_name || activeWorkspace?.name || 'Workspace');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Left: Avatar + Workspace */}
      <View style={styles.leftSection}>
        <Pressable 
          onPress={onUserPress}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed && { opacity: 0.7 }
          ]}
        >
          <BaseAvatar
            source={avatarUrl ? { uri: avatarUrl } : undefined}
            fallbackText={fallbackInitial}
            size="sm"
            borderWidth={0}
          />
        </Pressable>

        <Pressable 
          onPress={onWorkspacePress} 
          style={({ pressed }) => [
            styles.workspaceButton,
            pressed && { opacity: 0.6 }
          ]}
        >
          <Text style={[styles.workspaceName, { color: colors.text }]} numberOfLines={1}>
            {workspaceName}
          </Text>
          <ChevronDownIcon size={14} color={colors.textMuted} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Right: Notifications */}
      <Pressable
        onPress={onNotificationPress}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.iconButtonPressed,
        ]}
      >
        <BellIcon size={20} color={colors.text} strokeWidth={2} />
        {notificationCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
            <Text style={styles.badgeText}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    flex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  workspaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    flex: 1,
    maxWidth: '80%',
  },
  workspaceName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconButtonPressed: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
});
