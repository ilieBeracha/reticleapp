/**
 * RecentSessionRow Component
 * 
 * Clean session row with key metrics.
 * Shows different stats for grouping vs engagement sessions.
 */

import { ChevronRight, Crosshair, Heart, Target, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatTimeAgo } from '../UnifiedHomePage.helpers';
import type { RecentSessionRowProps } from '../UnifiedHomePage.types';

export function RecentSessionRow({ session, colors, onPress }: RecentSessionRowProps) {
  const isTeam = session.origin === 'team';
  const hasWatchData = session.sourceSession?.watch_controlled ?? false;
  const isGrouping = session.drillGoal === 'grouping';
  
  const timeAgo = session.endedAt
    ? formatTimeAgo(session.endedAt)
    : session.startedAt
    ? formatTimeAgo(session.startedAt)
    : '';

  const shots = session.stats?.shots || 0;
  const hits = session.stats?.hits || 0;
  const accuracy = session.stats?.accuracy;
  const bestDispersion = session.stats?.bestDispersion;

  return (
    <TouchableOpacity 
      style={s.row} 
      onPress={onPress}
      activeOpacity={0.6}
    >
      {/* Icon - different for grouping vs engagement */}
      <View style={[s.icon, { backgroundColor: isTeam ? `${colors.blue}12` : isGrouping ? `${colors.orange}12` : `${colors.indigo}12` }]}>
        {isTeam ? (
          <Users size={16} color={colors.blue} />
        ) : isGrouping ? (
          <Target size={16} color={colors.orange} />
        ) : (
          <Crosshair size={16} color={colors.indigo} />
        )}
      </View>
      
      {/* Content */}
      <View style={s.content}>
        <View style={s.titleRow}>
          <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
            {session.drillName || (isTeam ? 'Team Session' : 'Practice')}
          </Text>
          {hasWatchData && (
            <Heart size={12} color="#EF4444" fill="#EF4444" style={{ opacity: 0.8 }} />
          )}
        </View>
        
        {/* Stats row - different for grouping vs engagement */}
        <View style={s.statsRow}>
          {isGrouping ? (
            // GROUPING: Show shots + group size (cm)
            <>
              {shots > 0 && (
                <Text style={[s.stat, { color: colors.textMuted }]}>
                  {shots} shots
                </Text>
              )}
              {bestDispersion !== undefined && bestDispersion > 0 && (
                <>
                  <View style={[s.dot, { backgroundColor: colors.textMuted }]} />
                  <Text style={[s.stat, { color: colors.orange }]}>
                    {bestDispersion.toFixed(1)}cm
                  </Text>
                </>
              )}
            </>
          ) : (
            // ENGAGEMENT: Show hits/shots + accuracy
            <>
              {shots > 0 && (
                <Text style={[s.stat, { color: colors.textMuted }]}>
                  {hits}/{shots} hits
                </Text>
              )}
              {accuracy !== undefined && accuracy > 0 && (
                <>
                  <View style={[s.dot, { backgroundColor: colors.textMuted }]} />
                  <Text style={[s.stat, { color: accuracy >= 70 ? colors.green : colors.textMuted }]}>
                    {accuracy}%
                  </Text>
                </>
              )}
            </>
          )}
        </View>
      </View>
      
      {/* Right side */}
      <View style={s.right}>
        <Text style={[s.time, { color: colors.textMuted }]}>{timeAgo}</Text>
        <ChevronRight size={14} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  stat: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
    opacity: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
  },
});
