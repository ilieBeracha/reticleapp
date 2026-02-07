/**
 * PersonalHeroSection Component
 *
 * Compact personal stats summary card.
 * Mirrors TeamHeroSection design: professional, minimal.
 */

import { ChevronRight, Flame, User } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface PersonalHeroSectionProps {
  sessions: number;
  accuracy: number;
  streak: number;
  totalShots: number;
  onViewInsights: () => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
  };
}

export function PersonalHeroSection({
  sessions,
  accuracy,
  streak,
  totalShots,
  onViewInsights,
  colors,
}: PersonalHeroSectionProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.container}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Identity Row */}
        <View style={s.identityRow}>
          <View style={[s.badge, { backgroundColor: colors.border }]}>
            <User size={15} color={colors.text} />
          </View>
          <View style={s.identityInfo}>
            <Text style={[s.title, { color: colors.text }]}>Personal Training</Text>
            <View style={s.metaRow}>
              {streak > 0 && (
                <>
                  <Flame size={10} color="#F97316" />
                  <Text style={[s.metaText, { color: colors.textMuted }]}>{streak}d streak</Text>
                </>
              )}
              {streak > 0 && totalShots > 0 && (
                <View style={[s.metaDivider, { backgroundColor: colors.border }]} />
              )}
              {totalShots > 0 && (
                <Text style={[s.metaText, { color: colors.textMuted }]}>
                  {totalShots.toLocaleString()} shots
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={s.detailsBtn}
            onPress={onViewInsights}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[s.detailsBtnText, { color: colors.textMuted }]}>Insights</Text>
            <ChevronRight size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stats Strip */}
        <View style={[s.statsStrip, { borderTopColor: colors.border }]}>
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>{sessions}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>sessions</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {accuracy > 0 ? `${Math.round(accuracy)}%` : '—'}
            </Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>accuracy</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>{streak}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>day streak</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaDivider: {
    width: 1,
    height: 8,
    marginHorizontal: 4,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
});
