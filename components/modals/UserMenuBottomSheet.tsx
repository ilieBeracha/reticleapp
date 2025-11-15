import { BaseAvatar } from '@/components/BaseAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/ui/useColors';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import {
    BuildingIcon,
    ChevronRightIcon,
    LogOutIcon,
    SettingsIcon
} from 'lucide-react-native';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
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
      // TODO: Navigate to settings screen when available
      console.log('Navigate to settings');
    }, [onSettingsPress]);

    const handleSwitchOrg = useCallback(() => {
      bottomSheetRef.current?.close();
      onSwitchOrgPress?.();
      // TODO: Navigate to organization switcher when available
      console.log('Switch organization');
    }, [onSwitchOrgPress]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const renderHandle = useCallback(
      () => (
        <View style={[styles.handleContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.dragIndicatorBar, { backgroundColor: colors.text + '40' }]} />
        </View>
      ),
      [colors]
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        enableDynamicSizing={true}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        handleComponent={renderHandle}
        backgroundStyle={{ backgroundColor: colors.background }}
      >
        <BottomSheetView style={[styles.contentContainer, { backgroundColor: colors.background }]}>
          {/* User Info Section */}
          <View style={[styles.userSection, { backgroundColor: colors.card }]}>
            <BaseAvatar
              source={avatarUri ? { uri: avatarUri } : undefined}
              fallbackText={fallbackInitial}
              size="lg"
              borderWidth={2}
            />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.userEmail, { color: colors.text + 'B3' }]} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Menu Items */}
          <View style={styles.menuSection}>
            {/* Settings */}
            <Pressable
              onPress={handleSettings}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: colors.card },
                pressed && styles.menuItemPressed,
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <SettingsIcon size={20} color={colors.primary} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Settings
              </Text>
              <ChevronRightIcon size={20} color={colors.text + '60'} style={styles.chevron} />
            </Pressable>

            {/* Switch Organization */}
            <Pressable
              onPress={handleSwitchOrg}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: colors.card },
                pressed && styles.menuItemPressed,
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.green + '20' }]}>
                <BuildingIcon size={20} color={colors.green} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Switch Organization
              </Text>
              <ChevronRightIcon size={20} color={colors.text + '60'} style={styles.chevron} />
            </Pressable>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Logout */}
          <View style={styles.menuSection}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: colors.card },
                pressed && styles.menuItemPressed,
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.destructive + '20' }]}>
                <LogOutIcon size={20} color={colors.destructive} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.destructive }]}>
                Log Out
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

UserMenuBottomSheet.displayName = 'UserMenuBottomSheet';

const styles = StyleSheet.create({
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dragIndicatorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 30,
    paddingHorizontal: 8,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    marginVertical: 16,
    marginHorizontal: 16,
  },
  menuSection: {
    gap: 8,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 'auto',
  },
});
