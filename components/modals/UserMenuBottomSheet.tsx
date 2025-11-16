import { BaseAvatar } from '@/components/BaseAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import {
  BuildingIcon,
  ChevronRightIcon,
  LogOutIcon,
  SettingsIcon
} from 'lucide-react-native';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface UserMenuBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface UserMenuBottomSheetProps {
  onSettingsPress?: () => void;
  onSwitchOrgPress?: () => void;
}

export const UserMenuBottomSheet = forwardRef<UserMenuBottomSheetRef, UserMenuBottomSheetProps>(
  ({ onSettingsPress, onSwitchOrgPress }, ref) => {
    const { user, signOut } = useAuth();
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);

    const avatarUri = user?.user_metadata?.avatar_url;
    const fallbackInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?";
    const displayName = user?.user_metadata?.full_name || 
                        user?.email?.split('@')[0] || 
                        'User';
    const email = user?.email || '';

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.expand(),
      close: () => bottomSheetRef.current?.close(),
    }));

    const snapPoints = useMemo(() => ['50%'], []);

    const handleSignOut = useCallback(async () => {
      try {
        bottomSheetRef.current?.close();
        await signOut();
        router.replace('/auth/sign-in');
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }, [signOut]);

    const handleSettings = useCallback(() => {
      bottomSheetRef.current?.close();
      onSettingsPress?.();
      console.log('Navigate to settings');
    }, [onSettingsPress]);

    const handleSwitchOrg = useCallback(() => {
      bottomSheetRef.current?.close();
      onSwitchOrgPress?.();
    }, [onSwitchOrgPress]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetScrollView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Account
            </Text>
          </View>

          {/* User Profile Card */}
          <View style={styles.profileSection}>
            <View style={[
              styles.profileCard,
              { 
                backgroundColor: colors.card,
              }
            ]}>
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
          </View>

          {/* Menu Items Section */}
          <View style={styles.menuSection}>
            <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
              {/* Settings */}
              <Pressable
                onPress={handleSettings}
                style={({ pressed }) => [
                  styles.menuItemWrapper,
                  pressed && { backgroundColor: colors.background + '40' },
                ]}
              >
                <View style={styles.menuItemInner}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: colors.primary }
                  ]}>
                    <SettingsIcon size={18} color="#FFF" strokeWidth={2.5} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      Settings
                    </Text>
                  </View>
                  <ChevronRightIcon size={16} color={colors.textMuted} strokeWidth={2.5} />
                </View>
              </Pressable>

              {/* Separator */}
              <View style={[styles.separator, { backgroundColor: colors.border }]} />

              {/* Switch Workspace */}
              <Pressable
                onPress={handleSwitchOrg}
                style={({ pressed }) => [
                  styles.menuItemWrapper,
                  pressed && { backgroundColor: colors.background + '40' },
                ]}
              >
                <View style={styles.menuItemInner}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: colors.primary }
                  ]}>
                    <BuildingIcon size={18} color="#FFF" strokeWidth={2.5} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemText, { color: colors.text }]}>
                      Switch Workspace
                    </Text>
                  </View>
                  <ChevronRightIcon size={16} color={colors.textMuted} strokeWidth={2.5} />
                </View>
              </Pressable>
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.dangerSection}>
            <View style={[styles.menuGroup, { backgroundColor: colors.card }]}>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.menuItemWrapper,
                  pressed && { backgroundColor: colors.background + '40' },
                ]}
              >
                <View style={styles.menuItemInner}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: colors.destructive, opacity: 0.8 }
                  ]}>
                    <LogOutIcon size={18} color="#FFF" strokeWidth={2.5} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemText, { color: colors.destructive, opacity: 0.8 }]}>
                      Log Out
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

UserMenuBottomSheet.displayName = 'UserMenuBottomSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  profileSection: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minHeight: 80,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  },
  menuSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  menuGroup: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItemWrapper: {
    overflow: 'hidden',
  },
  menuItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  dangerSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  menuItemContent: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 16,
  },
  menuItemText: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 32,
  },
});
