/**
 * SessionTabs - Tab bar for switching between Grouping and Engagement sessions
 *
 * Simple tab component with badge counts for each session type
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import type { DrillGoal } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Crosshair, Target } from 'lucide-react-native';
import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export interface SessionTabsProps {
  activeTab: DrillGoal;
  onTabChange: (tab: DrillGoal) => void;
  groupingCount: number;
  engagementCount: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SessionTabs({ activeTab, onTabChange, groupingCount, engagementCount }: SessionTabsProps) {
  const { t } = useTranslation();
  const colors = useColors();

  const handleTabPress = useCallback(
    (tab: DrillGoal) => {
      if (tab !== activeTab) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTabChange(tab);
      }
    },
    [activeTab, onTabChange]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Grouping Tab */}
      <TouchableOpacity
        style={[styles.tab, activeTab === 'grouping' && [styles.activeTab, { backgroundColor: colors.primary }]]}
        onPress={() => handleTabPress('grouping')}
        activeOpacity={0.7}
      >
        <Crosshair size={16} color={activeTab === 'grouping' ? '#fff' : colors.textMuted} />
        <Text style={[styles.tabText, { color: activeTab === 'grouping' ? '#fff' : colors.text }]}>{t('session.grouping')}</Text>
        {groupingCount > 0 && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: activeTab === 'grouping' ? 'rgba(255,255,255,0.25)' : colors.secondary,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: activeTab === 'grouping' ? '#fff' : colors.textMuted }]}>
              {groupingCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Engagement Tab */}
      <TouchableOpacity
        style={[styles.tab, activeTab === 'engagement' && [styles.activeTab, { backgroundColor: colors.orange }]]}
        onPress={() => handleTabPress('engagement')}
        activeOpacity={0.7}
      >
        <Target size={16} color={activeTab === 'engagement' ? '#fff' : colors.textMuted} />
        <Text style={[styles.tabText, { color: activeTab === 'engagement' ? '#fff' : colors.text }]}>{t('session.engagement')}</Text>
        {engagementCount > 0 && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: activeTab === 'engagement' ? 'rgba(255,255,255,0.25)' : colors.secondary,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: activeTab === 'engagement' ? '#fff' : colors.textMuted }]}>
              {engagementCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  activeTab: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
