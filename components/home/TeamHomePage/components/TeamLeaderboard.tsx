/**
 * TeamLeaderboard Component
 *
 * Compact data-table style leaderboard. Professional, information-dense.
 */

import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  rank: number;
  sessions: number;
  accuracy: number;
  shots: number;
}

interface TeamLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  teamColor: string;
  onViewAll: () => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
  };
}

export function TeamLeaderboard({ entries, currentUserId, teamColor, onViewAll, colors }: TeamLeaderboardProps) {
  if (entries.length === 0) return null;

  const topThree = entries.slice(0, 3);

  return (
    <Animated.View entering={FadeIn.delay(100)} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerText, { color: colors.textMuted }]}>LEADERBOARD</Text>
        <TouchableOpacity style={s.viewAllBtn} onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[s.viewAllText, { color: colors.textMuted }]}>All</Text>
          <ChevronRight size={10} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={[s.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Table Header */}
        <View style={[s.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[s.thRank, { color: colors.textMuted }]}>#</Text>
          <Text style={[s.thName, { color: colors.textMuted }]}>Name</Text>
          <Text style={[s.thStat, { color: colors.textMuted }]}>Sessions</Text>
          <Text style={[s.thStat, { color: colors.textMuted }]}>Accuracy</Text>
        </View>

        {/* Table Rows */}
        {topThree.map((entry, index) => {
          const isCurrentUser = entry.userId === currentUserId;
          return (
            <View
              key={entry.userId}
              style={[
                s.tableRow,
                index < topThree.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                isCurrentUser && { backgroundColor: `${colors.border}50` },
              ]}
            >
              <Text style={[s.cellRank, { color: entry.rank <= 3 ? colors.text : colors.textMuted }]}>{entry.rank}</Text>
              <View style={s.cellName}>
                <Text style={[s.nameText, { color: colors.text }]} numberOfLines={1}>
                  {entry.userName}
                </Text>
                {isCurrentUser && <Text style={[s.youTag, { color: colors.textMuted }]}>you</Text>}
              </View>
              <Text style={[s.cellStat, { color: colors.text }]}>{entry.sessions}</Text>
              <Text style={[s.cellStat, s.cellAccuracy, { color: colors.text }]}>{Math.round(entry.accuracy)}%</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '500',
  },
  table: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  thRank: {
    width: 20,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  thName: {
    flex: 1,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  thStat: {
    width: 56,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  cellRank: {
    width: 20,
    fontSize: 12,
    fontWeight: '700',
  },
  cellName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  youTag: {
    fontSize: 9,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  cellStat: {
    width: 56,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  cellAccuracy: {
    fontVariant: ['tabular-nums'],
  },
});
