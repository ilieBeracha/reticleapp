/**
 * PersonalModeBanner Component
 *
 * Minimal inline indicator for personal/solo mode.
 */

import { User } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

interface PersonalModeBannerProps {
  streak: number;
  weeklyGoal?: number;
  weeklyProgress?: number;
  colors: {
    text: string;
    textMuted: string;
    primary: string;
    green: string;
    border: string;
  };
}

export function PersonalModeBanner({ streak, colors }: PersonalModeBannerProps) {
  return (
    <View style={[s.container, { borderBottomColor: colors.border }]}>
      <View style={[s.indicator, { backgroundColor: colors.textMuted }]} />
      <User size={12} color={colors.textMuted} />
      <Text style={[s.label, { color: colors.textMuted }]}>Personal</Text>
      {streak > 0 && <Text style={[s.streak, { color: colors.textMuted }]}>· {streak}d streak</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  streak: {
    fontSize: 11,
  },
});
