/**
 * DailyTip Component
 *
 * Shows rotating tips and insights to keep users engaged.
 * Content changes based on time of day and user stats.
 */

import * as Haptics from 'expo-haptics';
import { Lightbulb, RefreshCw, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { Colors } from '../UnifiedHomePage.types';

interface DailyTipProps {
  colors: Colors;
  streak: number;
  accuracy: number;
  sessionsThisWeek: number;
}

const TIPS = [
  {
    id: 'breathing',
    title: 'Breathing Control',
    content: 'Take a deep breath, hold at the natural pause, then squeeze. Consistent breathing improves groupings.',
    category: 'technique',
  },
  {
    id: 'trigger',
    title: 'Trigger Press',
    content: 'Focus on pressing straight back. Let the shot surprise you. Anticipation causes most misses.',
    category: 'technique',
  },
  {
    id: 'sight',
    title: 'Sight Alignment',
    content: 'Equal height, equal light. Keep your focus on the front sight, let the target blur slightly.',
    category: 'technique',
  },
  {
    id: 'stance',
    title: 'Natural Point of Aim',
    content: 'Close your eyes, assume your stance, open them. If you\'re not on target, adjust your feet, not your arms.',
    category: 'fundamentals',
  },
  {
    id: 'grip',
    title: 'Consistent Grip',
    content: 'Firm but not tense. Your grip should be the same pressure every shot. Practice dry-fire daily.',
    category: 'fundamentals',
  },
  {
    id: 'follow',
    title: 'Follow Through',
    content: 'Hold your sight picture after the shot breaks. This helps identify errors and builds muscle memory.',
    category: 'technique',
  },
  {
    id: 'mental',
    title: 'Mental Focus',
    content: 'Visualize each shot before taking it. See the bullet hitting the target. Confidence breeds accuracy.',
    category: 'mental',
  },
  {
    id: 'drills',
    title: 'Deliberate Practice',
    content: 'Quality over quantity. 50 focused rounds beat 200 rushed ones. Every shot should have purpose.',
    category: 'training',
  },
];

function getTipOfTheDay(streak: number, accuracy: number, sessionsThisWeek: number): typeof TIPS[0] {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);

  // Personalized tip selection based on stats
  if (streak >= 5) {
    return TIPS.find(t => t.id === 'mental') || TIPS[dayOfYear % TIPS.length];
  }
  if (accuracy < 50 && sessionsThisWeek > 0) {
    return TIPS.find(t => t.id === 'trigger') || TIPS[dayOfYear % TIPS.length];
  }
  if (sessionsThisWeek === 0) {
    return TIPS.find(t => t.id === 'drills') || TIPS[dayOfYear % TIPS.length];
  }

  return TIPS[dayOfYear % TIPS.length];
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function DailyTip({ colors, streak, accuracy, sessionsThisWeek }: DailyTipProps) {
  const [dismissed, setDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const scale = useSharedValue(1);

  const initialTip = getTipOfTheDay(streak, accuracy, sessionsThisWeek);
  const [currentTip, setCurrentTip] = useState(initialTip);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIndex = (tipIndex + 1) % TIPS.length;
    setTipIndex(nextIndex);
    setCurrentTip(TIPS[nextIndex]);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
  };

  if (dismissed) return null;

  const categoryColors: Record<string, string> = {
    technique: colors.indigo,
    fundamentals: colors.green,
    mental: colors.orange,
    training: colors.blue,
  };

  const tipColor = categoryColors[currentTip.category] || colors.primary;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(200)}
      style={s.container}
    >
      <View style={[s.card, { backgroundColor: `${tipColor}08`, borderColor: `${tipColor}20` }]}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={[s.iconBg, { backgroundColor: `${tipColor}15` }]}>
              <Lightbulb size={14} color={tipColor} />
            </View>
            <View>
              <Text style={[s.category, { color: tipColor }]}>
                {currentTip.category.toUpperCase()}
              </Text>
              <Text style={[s.title, { color: colors.text }]}>
                {currentTip.title}
              </Text>
            </View>
          </View>
          <View style={s.actions}>
            <TouchableOpacity onPress={handleRefresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <RefreshCw size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[s.content, { color: colors.text }]}>
          {currentTip.content}
        </Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    opacity: 0.85,
    paddingLeft: 40,
  },
});
