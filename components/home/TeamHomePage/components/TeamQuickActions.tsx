/**
 * TeamQuickActions Component
 *
 * Compact action bar with primary button and tab switcher.
 * Clean, functional design.
 */

import * as Haptics from 'expo-haptics';
import { Activity, Calendar, Crosshair, Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export type ContentTab = 'schedule' | 'insights' | 'activity';

interface TeamQuickActionsProps {
  onStartTraining: () => void;
  activeTab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  hasLiveTraining?: boolean;
  upcomingCount?: number;
  teamColor: string;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
  };
}

export function TeamQuickActions({
  onStartTraining,
  activeTab,
  onTabChange,
  hasLiveTraining = false,
  upcomingCount = 0,
  teamColor,
  colors,
}: TeamQuickActionsProps) {
  const { t } = useTranslation();

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  const tabs: { id: ContentTab; icon: typeof Calendar; badge?: number }[] = [
    { id: 'activity', icon: Activity },
    { id: 'insights', icon: Trophy },
  ];

  return (
    <Animated.View entering={FadeIn.delay(50)} style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Primary Action */}
      <TouchableOpacity
        style={[s.primaryBtn, { backgroundColor: hasLiveTraining ? '#10B981' : teamColor }]}
        onPress={() => handlePress(onStartTraining)}
        activeOpacity={0.8}
      >
        {hasLiveTraining && <View style={s.liveDot} />}
        <Crosshair size={14} color="#fff" strokeWidth={2.2} />
        <Text style={s.primaryText}>{hasLiveTraining ? t('teamHome.joinLive') : t('teamHome.train')}</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tab, isActive && { backgroundColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTabChange(tab.id);
              }}
              activeOpacity={0.6}
            >
              <Icon size={14} color={isActive ? colors.text : colors.textMuted} strokeWidth={isActive ? 2 : 1.5} />
              {tab.badge !== undefined && (
                <View style={[s.badge, { backgroundColor: isActive ? colors.text : colors.textMuted }]}>
                  <Text style={[s.badgeText, { color: colors.background }]}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 5,
    marginBottom: 10,
    gap: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    padding: 8,
    borderRadius: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
