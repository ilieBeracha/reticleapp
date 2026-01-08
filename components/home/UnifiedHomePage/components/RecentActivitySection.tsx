/**
 * RecentActivitySection Component
 * 
 * Displays list of recent sessions with dividers or empty state placeholder.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { styles } from '../UnifiedHomePage.styles';
import type { RecentActivitySectionProps } from '../UnifiedHomePage.types';
import { RecentSessionRow } from './RecentSessionRow';

export function RecentActivitySection({ 
  sessions, 
  colors, 
  onSessionPress 
}: RecentActivitySectionProps) {
  return (
    <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Recent Activity</Text>
      </View>
      
      {sessions.length > 0 ? (
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
      ) : (
        <View style={[localStyles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[localStyles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="analytics-outline" size={20} color={colors.textMuted} />
          </View>
          <View style={localStyles.emptyContent}>
            <Text style={[localStyles.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
            <Text style={[localStyles.emptyText, { color: colors.textMuted }]}>
              Start your first practice to see activity here
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: { flex: 1, gap: 2 },
  emptyTitle: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 12 },
});
