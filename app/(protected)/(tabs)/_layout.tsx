import Tabs from '@/components/withLayoutContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

/**
 * Main Tab Layout
 *
 * 4 tabs:
 * - Team: Teams, calendar, trainings (with internal tabs)
 * - Insight: Shooting stats and analytics
 * - Home: Dashboard (center)
 * - Profile: Personal settings
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
const TAB_CONFIG = [
  {
    name: 'index',
    titleKey: 'navigation.home',
    sfSymbol: 'house',
    iconFocused: 'home' as const,
    iconOutline: 'home-outline' as const,
  },
  {
    name: 'insights',
    titleKey: 'navigation.insights',
    sfSymbol: 'chart.bar',
    iconFocused: 'bar-chart' as const,
    iconOutline: 'bar-chart-outline' as const,
  },
  {
    name: 'loadout',
    titleKey: 'navigation.loadout',
    sfSymbol: 'scope',
    iconFocused: 'aperture' as const,
    iconOutline: 'aperture-outline' as const,
  },
  {
    name: 'team',
    titleKey: 'navigation.team',
    sfSymbol: 'person.2',
    iconFocused: 'people' as const,
    iconOutline: 'people-outline' as const,
    role: 'search' as const,
  },
];

export default function TabsLayout() {
  const colors = useColors();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

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
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarIcon: ({ focused }) => getTabIcon(tab.sfSymbol, focused ? tab.iconFocused : tab.iconOutline),
            ...(tab.role && { role: tab.role }),
          }}
        />
      ))}
    </Tabs>
  );
}
