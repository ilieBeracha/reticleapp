/**
 * StartPracticeCard Component
 * 
 * Clean, elegant call-to-action to start a new session.
 */

import { ChevronRight, Target } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getStartPracticeSubtitle } from '../UnifiedHomePage.helpers';
import type { StartPracticeCardProps } from '../UnifiedHomePage.types';

export function StartPracticeCard({ 
  colors, 
  onPress, 
  starting, 
  lastSessionDaysAgo 
}: StartPracticeCardProps) {
  const subtitle = getStartPracticeSubtitle(lastSessionDaysAgo);

  return (
    <TouchableOpacity
      style={[cardStyles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={starting}
    >
      <View style={[cardStyles.icon, { backgroundColor: colors.secondary }]}>
        <Target size={20} color={colors.text} />
      </View>
      
      <View style={cardStyles.text}>
        <Text style={[cardStyles.title, { color: colors.text }]}>Start Session</Text>
        <Text style={[cardStyles.hint, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>

      {starting ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <ChevronRight size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    marginTop: 2,
  },
});
