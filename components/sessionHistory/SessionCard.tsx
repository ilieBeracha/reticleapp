import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/session/types';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { STATUS_COLORS } from './SessionHistory.constants';
import {
  calculateAccuracy,
  formatDuration,
  formatSessionDate,
  getSessionDurationMinutes,
} from './SessionHistory.helpers';

interface SessionCardProps {
  session: SessionWithDetails;
  onPress: (session: SessionWithDetails) => void;
  compact?: boolean;
}

export function SessionCard({ session, onPress, compact = false }: SessionCardProps) {
  const colors = useColors();
  
  // Determine if this is a grouping session
  const isGrouping = session.drill_config?.drill_goal === 'grouping';
  
  // Calculate stats
  const accuracy = calculateAccuracy(session);
  const durationMins = getSessionDurationMinutes(session);
  const shots = session.stats?.shots_fired || 0;
  const hits = session.stats?.hits_total || 0;
  const distance = session.drill_config?.distance_m;
  const drillName = session.drill_config?.name || session.drill_name || 'Quick Practice';
  const weaponName = session.weapon_name;
  const statusColor = STATUS_COLORS[session.status] || colors.textMuted;
  const bestDispersion = session.stats?.best_dispersion_cm;
  
  // Drill goal icon
  const goalIcon = isGrouping 
    ? 'ellipse-outline' 
    : 'trophy-outline';
    
  // Source badge
  const isWatch = session.watch_controlled;
  const isTeam = !!session.team_id;

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => onPress(session)}
        activeOpacity={0.7}
      >
        <View style={styles.compactLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={styles.compactInfo}>
            <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={1}>
              {drillName}
            </Text>
            <Text style={[styles.compactMeta, { color: colors.textMuted }]}>
              {formatSessionDate(session.started_at)}
            </Text>
          </View>
        </View>
        <View style={styles.compactRight}>
          {/* Compact stat: group size for grouping, hits for engagement */}
          <Text style={[styles.compactStat, { color: isGrouping ? colors.orange : colors.text }]}>
            {isGrouping 
              ? (bestDispersion != null ? `${bestDispersion.toFixed(1)}cm` : `${shots}`)
              : `${hits}/${shots}`
            }
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(session)}
      activeOpacity={0.7}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <Ionicons 
            name={goalIcon as any} 
            size={16} 
            color={colors.textMuted} 
            style={styles.goalIcon}
          />
          <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {formatSessionDate(session.started_at)}
          </Text>
        </View>
      </View>

      {/* Stats Row - Different for grouping vs engagement */}
      <View style={styles.statsRow}>
        {/* Shots */}
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{shots}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots</Text>
        </View>

        {isGrouping ? (
          // GROUPING: Show group size (cm) - NO accuracy
          <>
            {/* Group Size */}
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: bestDispersion != null ? colors.orange : colors.textMuted }]}>
                {bestDispersion != null ? `${bestDispersion.toFixed(1)}cm` : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>group</Text>
            </View>

            {/* Distance */}
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: distance ? colors.text : colors.textMuted }]}>
                {distance ? `${distance}m` : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>dist</Text>
            </View>

            {/* Duration */}
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: durationMins ? colors.text : colors.textMuted }]}>
                {formatDuration(durationMins)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>time</Text>
            </View>
          </>
        ) : (
          // ENGAGEMENT: Show hits/accuracy
          <>
            {/* Hits */}
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {hits}/{shots}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>hits</Text>
            </View>

            {/* Accuracy */}
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: accuracy !== null ? colors.text : colors.textMuted }]}>
                {accuracy !== null ? `${accuracy}%` : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>acc</Text>
            </View>

            {/* Distance */}
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: distance ? colors.text : colors.textMuted }]}>
                {distance ? `${distance}m` : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>dist</Text>
            </View>

            {/* Duration */}
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: durationMins ? colors.text : colors.textMuted }]}>
                {formatDuration(durationMins)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>time</Text>
            </View>
          </>
        )}
      </View>

      {/* Footer Row - Metadata */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {weaponName && (
            <View style={styles.badge}>
              <Ionicons name="hardware-chip-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.badgeText, { color: colors.textMuted }]} numberOfLines={1}>
                {weaponName}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.footerRight}>
          {isWatch && (
            <View style={[styles.sourceBadge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="watch-outline" size={10} color={colors.primary} />
            </View>
          )}
          {isTeam && (
            <View style={[styles.sourceBadge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people-outline" size={10} color={colors.primary} />
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  headerRight: {},
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  goalIcon: {
    marginRight: 6,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
    minWidth: 45,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sourceBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactStat: {
    fontSize: 14,
    fontWeight: '600',
  },
});

