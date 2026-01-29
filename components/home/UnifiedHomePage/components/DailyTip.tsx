/**
 * DailyTip Component
 *
 * Shows personalized tips based on user's session history from Pinecone.
 * Tips are cached per day - only one AI-generated tip per user per day.
 * Falls back to static tips if AI is unavailable.
 */

import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDailyTip, type PersonalizedTip } from '@/services/insights/insightService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Lightbulb, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { Colors } from '@/types/home';

const DAILY_TIP_CACHE_KEY = 'daily_tip_cache';

interface DailyTipProps {
  colors: Colors;
  streak: number;
  accuracy: number;
  sessionsThisWeek: number;
  totalSessions?: number;
}

// Fallback tips when AI is loading or unavailable
const FALLBACK_TIPS: PersonalizedTip[] = [
  {
    title: 'Breathing Control',
    content: 'Take a deep breath, hold at the natural pause, then squeeze. Consistent breathing improves groupings.',
    category: 'technique',
    personalized: false,
  },
  {
    title: 'Trigger Press',
    content: 'Focus on pressing straight back. Let the shot surprise you. Anticipation causes most misses.',
    category: 'technique',
    personalized: false,
  },
  {
    title: 'Sight Alignment',
    content: 'Equal height, equal light. Keep your focus on the front sight, let the target blur slightly.',
    category: 'technique',
    personalized: false,
  },
  {
    title: 'Natural Point of Aim',
    content:
      "Close your eyes, assume your stance, open them. If you're not on target, adjust your feet, not your arms.",
    category: 'fundamentals',
    personalized: false,
  },
  {
    title: 'Consistent Grip',
    content: 'Firm but not tense. Your grip should be the same pressure every shot. Practice dry-fire daily.',
    category: 'fundamentals',
    personalized: false,
  },
  {
    title: 'Follow Through',
    content: 'Hold your sight picture after the shot breaks. This helps identify errors and builds muscle memory.',
    category: 'technique',
    personalized: false,
  },
  {
    title: 'Mental Focus',
    content: 'Visualize each shot before taking it. See the bullet hitting the target. Confidence breeds accuracy.',
    category: 'mental',
    personalized: false,
  },
  {
    title: 'Deliberate Practice',
    content: 'Quality over quantity. 50 focused rounds beat 200 rushed ones. Every shot should have purpose.',
    category: 'training',
    personalized: false,
  },
];

function getInitialTip(streak: number, accuracy: number, sessionsThisWeek: number): PersonalizedTip {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);

  // Personalized tip selection based on stats
  if (streak >= 5) {
    return FALLBACK_TIPS.find((t) => t.title === 'Mental Focus') || FALLBACK_TIPS[dayOfYear % FALLBACK_TIPS.length];
  }
  if (accuracy < 50 && sessionsThisWeek > 0) {
    return FALLBACK_TIPS.find((t) => t.title === 'Trigger Press') || FALLBACK_TIPS[dayOfYear % FALLBACK_TIPS.length];
  }
  if (sessionsThisWeek === 0) {
    return (
      FALLBACK_TIPS.find((t) => t.title === 'Deliberate Practice') || FALLBACK_TIPS[dayOfYear % FALLBACK_TIPS.length]
    );
  }

  return FALLBACK_TIPS[dayOfYear % FALLBACK_TIPS.length];
}

interface CachedTip {
  tip: PersonalizedTip;
  date: string; // YYYY-MM-DD
  userId: string;
}

async function getCachedTip(userId: string): Promise<PersonalizedTip | null> {
  try {
    const cached = await AsyncStorage.getItem(DAILY_TIP_CACHE_KEY);
    if (!cached) return null;

    const data: CachedTip = JSON.parse(cached);
    const today = format(new Date(), 'yyyy-MM-dd');

    // Check if cache is from today and for the same user
    if (data.date === today && data.userId === userId) {
      return data.tip;
    }

    return null;
  } catch (error) {
    console.error('Failed to get cached tip:', error);
    return null;
  }
}

async function cacheTip(userId: string, tip: PersonalizedTip): Promise<void> {
  try {
    const data: CachedTip = {
      tip,
      date: format(new Date(), 'yyyy-MM-dd'),
      userId,
    };
    await AsyncStorage.setItem(DAILY_TIP_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache tip:', error);
  }
}

export function DailyTip({ colors, streak, accuracy, sessionsThisWeek, totalSessions = 0 }: DailyTipProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentTip, setCurrentTip] = useState<PersonalizedTip>(() =>
    getInitialTip(streak, accuracy, sessionsThisWeek)
  );

  // Fetch personalized tip on mount - cached per day
  useEffect(() => {
    let mounted = true;

    const loadTip = async () => {
      // If no user or not enough sessions, use fallback
      if (!user?.id || totalSessions < 3) {
        setLoading(false);
        return;
      }

      // Check cache first
      const cachedTip = await getCachedTip(user.id);
      if (cachedTip) {
        if (mounted) {
          setCurrentTip(cachedTip);
          setLoading(false);
        }
        return;
      }

      // No cache - fetch new tip from AI
      try {
        const tip = await getPersonalizedDailyTip(user.id, {
          streak,
          accuracy,
          sessionsThisWeek,
          totalSessions,
        });

        if (mounted) {
          setCurrentTip(tip);
          // Cache the tip for today
          await cacheTip(user.id, tip);
        }
      } catch (error) {
        console.error('Failed to fetch personalized tip:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTip();

    return () => {
      mounted = false;
    };
  }, [user?.id]); // Only fetch on mount

  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const categoryColors: Record<string, string> = {
    technique: colors.indigo,
    fundamentals: colors.green,
    mental: colors.orange,
    training: colors.blue,
  };

  const tipColor = categoryColors[currentTip.category] || colors.primary;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={s.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleToggle}
        style={[s.card, { backgroundColor: `${tipColor}08`, borderColor: `${tipColor}20` }]}
      >
        <View style={s.header}>
          <View style={[s.iconBg, { backgroundColor: `${tipColor}15` }]}>
            {loading ? <ActivityIndicator size={12} color={tipColor} /> : <Lightbulb size={12} color={tipColor} />}
          </View>
          <View style={s.titleContainer}>
            <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
              {currentTip.title}
            </Text>
          </View>
          {currentTip.personalized && (
            <View style={[s.aiBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Sparkles size={8} color={colors.primary} />
              <Text style={[s.aiBadgeText, { color: colors.primary }]}>AI</Text>
            </View>
          )}
        </View>

        {expanded && (
          <Animated.View entering={FadeIn.duration(200)} style={s.expandedContent}>
            <Text style={[s.content, { color: colors.text }]}>{currentTip.content}</Text>
            {currentTip.personalized && currentTip.based_on && (
              <Text style={[s.basedOn, { color: colors.textMuted }]}>Based on: {currentTip.based_on}</Text>
            )}
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  card: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  content: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    opacity: 0.85,
  },
  basedOn: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
