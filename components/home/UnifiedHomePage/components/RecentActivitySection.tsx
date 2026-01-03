/**
 * RecentActivitySection Component
 * 
 * Displays list of recent sessions with dividers.
 */

import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { styles } from '../UnifiedHomePage.styles';
import type { RecentActivitySectionProps } from '../UnifiedHomePage.types';
import { RecentSessionRow } from './RecentSessionRow';

export function RecentActivitySection({ 
  sessions, 
  colors, 
  onSessionPress 
}: RecentActivitySectionProps) {
  if (sessions.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Recent Activity</Text>
      </View>
      <View style={[styles.recentList, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {sessions.map((session, idx) => (
          <View key={session.id}>
            <RecentSessionRow 
              session={session} 
              colors={colors} 
              onPress={() => onSessionPress(session)}
            />
            {idx < sessions.length - 1 && (
              <View style={[styles.recentDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

