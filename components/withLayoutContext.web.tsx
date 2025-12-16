import type React from 'react';
import {
  BottomTabNavigationEventMap,
  BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';

/**
 * Web-only Tabs implementation.
 *
 * Native uses `@bottom-tabs/react-navigation` (which depends on `react-native-bottom-tabs`)
 * and that library imports react-native internals that are not supported on web.
 *
 * On web we fall back to `@react-navigation/bottom-tabs` and map a few
 * native-only navigator props used by `app/(protected)/(tabs)/_layout.tsx`
 * into standard `screenOptions` where possible.
 */

const BottomTabNavigator = createBottomTabNavigator().Navigator;

const BaseTabs = withLayoutContext<
  BottomTabNavigationOptions,
  typeof BottomTabNavigator,
  TabNavigationState<ParamListBase>,
  BottomTabNavigationEventMap
>(BottomTabNavigator);

type BaseTabsProps = React.ComponentProps<typeof BaseTabs>;

type WebTabsProps = BaseTabsProps & {
  // Native-only props passed by our layout; ignored / adapted on web.
  rippleColor?: string;
  sidebarAdaptable?: boolean;
  activeIndicatorColor?: string;
  tabBarStyle?: any;
  tabBarActiveTintColor?: string;
  tabBarInactiveTintColor?: string;
};

function WebTabs({
  rippleColor: _rippleColor,
  sidebarAdaptable: _sidebarAdaptable,
  activeIndicatorColor: _activeIndicatorColor,
  tabBarStyle,
  tabBarActiveTintColor,
  tabBarInactiveTintColor,
  screenOptions,
  ...rest
}: WebTabsProps) {
  const mergedScreenOptions: BaseTabsProps['screenOptions'] =
    typeof screenOptions === 'function'
      ? (...args) => {
          const resolved = screenOptions(...args) ?? {};
          return {
            ...resolved,
            ...(tabBarStyle ? { tabBarStyle } : null),
            ...(tabBarActiveTintColor ? { tabBarActiveTintColor } : null),
            ...(tabBarInactiveTintColor ? { tabBarInactiveTintColor } : null),
          };
        }
      : {
          ...(screenOptions ?? {}),
          ...(tabBarStyle ? { tabBarStyle } : null),
          ...(tabBarActiveTintColor ? { tabBarActiveTintColor } : null),
          ...(tabBarInactiveTintColor ? { tabBarInactiveTintColor } : null),
        };

  return <BaseTabs {...rest} screenOptions={mergedScreenOptions} />;
}

// expo-router expects `Tabs.Screen` to exist.
const Tabs = Object.assign(WebTabs, { Screen: BaseTabs.Screen });

export default Tabs;

