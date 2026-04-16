/**
 * AchievementBadge - Single badge tile.
 *
 * Locked and unlocked states differ in color saturation + icon treatment.
 * Optional progress ring for locked badges where `progress` is available.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { Achievement } from '@/utils/achievements';
import { Crosshair, Flame, Medal, Star, Target, Trophy, Zap } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

const ICONS = { Crosshair, Flame, Medal, Star, Target, Trophy, Zap } as const;

interface Props {
  achievement: Achievement;
  size?: 'sm' | 'md';
}

export function AchievementBadge({ achievement, size = 'md' }: Props) {
  const colors = useColors();
  const Icon = (ICONS as any)[achievement.iconName] ?? Trophy;
  const tint = tintFor(achievement.color, colors);
  const isSm = size === 'sm';

  const iconSize = isSm ? 22 : 28;
  const wrapSize = isSm ? 52 : 64;

  return (
    <View style={[styles.container, isSm && { width: 72 }]}>
      <View
        style={[
          styles.iconWrap,
          {
            width: wrapSize,
            height: wrapSize,
            borderRadius: wrapSize / 2,
            backgroundColor: achievement.unlocked ? tint + '20' : colors.secondary,
            borderColor: achievement.unlocked ? tint : colors.border,
            opacity: achievement.unlocked ? 1 : 0.7,
          },
        ]}
      >
        <Icon size={iconSize} color={achievement.unlocked ? tint : colors.textMuted} strokeWidth={2} />
        {achievement.unlocked ? null : achievement.progress ? (
          <View style={[styles.progressPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.progressText, { color: colors.textMuted }]} numberOfLines={1}>
              {achievement.progress.current}/{achievement.progress.total}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.title,
          isSm && { fontSize: 11 },
          { color: achievement.unlocked ? colors.text : colors.textMuted },
        ]}
        numberOfLines={1}
      >
        {achievement.title}
      </Text>
    </View>
  );
}

function tintFor(c: Achievement['color'], colors: ReturnType<typeof useColors>): string {
  switch (c) {
    case 'green':
      return colors.green;
    case 'orange':
      return colors.orange;
    case 'blue':
      return colors.blue;
    case 'purple':
      return colors.purple;
    case 'yellow':
      return colors.yellow;
    case 'red':
      return colors.red;
  }
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6, width: 88 },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  title: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  progressPill: {
    position: 'absolute',
    bottom: -6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressText: { fontSize: 9, fontWeight: '700' },
});
