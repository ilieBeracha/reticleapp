import Tabs from '@/components/withLayoutContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useColors } from '@/hooks/ui/useColors';
import { useIsTeamMode } from '@/stores/teamStore';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

/**
 * Main Tab Layout
 *
 * Personal mode (2 tabs):
 * - Home: Dashboard with solo sessions
 * - Insights: Personal analytics
 *
 * Team mode (4 tabs):
 * - Home: Dashboard with team sessions
 * - Insights: Team analytics
 * - Loadout: Team arsenal
 * - Team: Team management
 *
 * Tab order is reversed for RTL languages (Hebrew)
 */

const getTabIcon = (sfSymbol: string, ionicon: keyof typeof Ionicons.glyphMap): any => {
  if (Platform.OS === 'ios') {
    return { sfSymbol };
  }
  return { ionicon };
};

// Tab definitions for easy reordering
// teamOnly: true means the tab is only visible in team mode
const TAB_CONFIG = [
  {
    name: 'index',
    titleKey: 'navigation.home',
    sfSymbol: 'house',
    iconFocused: 'home' as const,
    iconOutline: 'home-outline' as const,
    teamOnly: false,
  },
  {
    name: 'insights',
    titleKey: 'navigation.insights',
    sfSymbol: 'chart.bar',
    iconFocused: 'bar-chart' as const,
    iconOutline: 'bar-chart-outline' as const,
    teamOnly: false,
  },
  {
    name: 'loadout',
    titleKey: 'navigation.loadout',
    sfSymbol: 'scope',
    iconFocused: 'aperture' as const,
    iconOutline: 'aperture-outline' as const,
    teamOnly: true,
  },
  {
    name: 'team',
    titleKey: 'navigation.team',
    sfSymbol: 'person.2',
    iconFocused: 'people' as const,
    iconOutline: 'people-outline' as const,
    role: 'search' as const,
    teamOnly: true,
  },
];

// Team-only tab names for redirect check
const TEAM_ONLY_TABS = TAB_CONFIG.filter(t => t.teamOnly).map(t => t.name);

export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const isTeamMode = useIsTeamMode();
  const router = useRouter();
  const pathname = usePathname();
  const prevIsTeamMode = useRef(isTeamMode);

  // Redirect to home if user switches to personal mode while on a team-only tab
  useEffect(() => {
    // Only handle transition from team → personal mode
    if (prevIsTeamMode.current && !isTeamMode) {
      // Check if current tab is team-only
      const currentTab = pathname.split('/').pop();
      if (currentTab && TEAM_ONLY_TABS.includes(currentTab)) {
        // Redirect to home tab
        router.replace('/(protected)/(tabs)/' as any);
      }
    }
    prevIsTeamMode.current = isTeamMode;
  }, [isTeamMode, pathname, router]);

  // Reverse tab order for RTL languages
  const tabs = isRTL ? [...TAB_CONFIG].reverse() : TAB_CONFIG;

  return (
    <Tabs
      rippleColor={colors.primary}
      sidebarAdaptable
      tabBarStyle={{ backgroundColor: colors.background }}
      activeIndicatorColor={colors.primary + '20'}
      tabBarActiveTintColor={colors.primary}
      tabBarInactiveTintColor={colors.textMuted}
    >
      {tabs.map((tab) => {
        // Hide team-only tabs in personal mode
        const shouldHide = tab.teamOnly && !isTeamMode;

        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: t(tab.titleKey),
              tabBarIcon: ({ focused }) => getTabIcon(tab.sfSymbol, focused ? tab.iconFocused : tab.iconOutline),
              ...(tab.role && { role: tab.role }),
              // Use native tabBarItemHidden to completely hide tab from layout
              tabBarItemHidden: shouldHide,
            }}
          />
        );
      })}
    </Tabs>
  );
}
