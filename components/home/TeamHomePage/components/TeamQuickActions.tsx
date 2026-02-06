/**
 * TeamQuickActions Component
 *
 * Primary "Train" button + content tab selector.
 * Secondary icons act as tabs that change the content card below.
 */

import * as Haptics from 'expo-haptics';
import { Activity, Calendar, Crosshair, Trophy } from 'lucide-react-native';
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
  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  const tabs: { id: ContentTab; icon: typeof Calendar; label: string; badge?: number }[] = [
    { id: 'schedule', icon: Calendar, label: 'Schedule', badge: upcomingCount > 0 ? upcomingCount : undefined },
    { id: 'insights', icon: Trophy, label: 'Rankings' },
    { id: 'activity', icon: Activity, label: 'Activity' },
  ];

  return (
    <Animated.View entering={FadeIn.delay(50)} style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Primary Action - always navigates */}
      <TouchableOpacity
        style={[s.primaryAction, { backgroundColor: hasLiveTraining ? colors.text : colors.border }]}
        onPress={() => handlePress(onStartTraining)}
        activeOpacity={0.7}
      >
        <Crosshair size={14} color={hasLiveTraining ? colors.background : colors.text} strokeWidth={2.2} />
        <Text style={[s.primaryText, { color: hasLiveTraining ? colors.background : colors.text }]}>
          {hasLiveTraining ? 'Join Live' : 'Train'}
        </Text>
        {hasLiveTraining && <View style={[s.liveDot, { backgroundColor: '#10B981' }]} />}
      </TouchableOpacity>

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: colors.border }]} />

      {/* Content Tabs */}
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
              <Icon size={13} color={isActive ? colors.text : colors.textMuted} />
              {tab.badge !== undefined && (
                <View style={[s.badge, { backgroundColor: isActive ? colors.text : colors.border }]}>
                  <Text style={[s.badgeText, { color: isActive ? colors.background : colors.text }]}>
                    {tab.badge}
                  </Text>
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
    padding: 6,
    marginBottom: 12,
    gap: 6,
  },
  primaryAction: {
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
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 2,
  },
  divider: {
    width: 1,
    height: 20,
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
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
