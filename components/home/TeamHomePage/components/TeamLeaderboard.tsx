/**
 * TeamLeaderboard Component
 *
 * Compact data table leaderboard. Information-dense, professional.
 */

import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
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

const RANK_COLORS = { 1: '#F59E0B', 2: '#94A3B8', 3: '#CD7F32' };

export function TeamLeaderboard({ entries, currentUserId, teamColor, onViewAll, colors }: TeamLeaderboardProps) {
  const { t } = useTranslation();
  if (entries.length === 0) return null;

  const topThree = entries.slice(0, 3);

  return (
    <Animated.View entering={FadeIn.delay(100)} style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerText, { color: colors.textMuted }]}>{t('teamHome.leaderboard').toUpperCase()}</Text>
        <TouchableOpacity style={s.viewAllBtn} onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[s.viewAllText, { color: colors.textMuted }]}>{t('teamHome.all')}</Text>
          <ChevronRight size={10} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={[s.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Table Header */}
        <View style={[s.tableHeader, { borderBottomColor: colors.border }]}>
          <Text style={[s.thRank, { color: colors.textMuted }]}>#</Text>
          <Text style={[s.thName, { color: colors.textMuted }]}>{t('teamHome.name')}</Text>
          <Text style={[s.thStat, { color: colors.textMuted }]}>S</Text>
          <Text style={[s.thStat, { color: colors.textMuted }]}>ACC</Text>
        </View>

        {/* Rows */}
        {topThree.map((entry, i) => {
          const isCurrentUser = entry.userId === currentUserId;
          const rankColor = RANK_COLORS[entry.rank as keyof typeof RANK_COLORS];
          return (
            <View
              key={entry.userId}
              style={[
                s.tableRow,
                i < topThree.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                isCurrentUser && { backgroundColor: teamColor + '08' },
              ]}
            >
              <Text style={[s.cellRank, { color: rankColor || colors.textMuted }]}>{entry.rank}</Text>
              <View style={s.cellName}>
                <Text style={[s.nameText, { color: colors.text }]} numberOfLines={1}>{entry.userName}</Text>
                {isCurrentUser && <Text style={[s.youTag, { color: colors.textMuted }]}>{t('teamHome.you')}</Text>}
              </View>
              <Text style={[s.cellStat, { color: colors.text }]}>{entry.sessions}</Text>
              <Text style={[s.cellStat, { color: colors.text }]}>{Math.round(entry.accuracy)}%</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  headerText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  viewAllText: { fontSize: 11, fontWeight: '500' },
  table: { borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1 },
  thRank: { width: 20, fontSize: 9, fontWeight: '600' },
  thName: { flex: 1, fontSize: 9, fontWeight: '600' },
  thStat: { width: 40, fontSize: 9, fontWeight: '600', textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  cellRank: { width: 20, fontSize: 12, fontWeight: '700' },
  cellName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  nameText: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  youTag: { fontSize: 9, fontWeight: '500', fontStyle: 'italic' },
  cellStat: { width: 40, fontSize: 12, fontWeight: '600', textAlign: 'right', fontVariant: ['tabular-nums'] },
});
