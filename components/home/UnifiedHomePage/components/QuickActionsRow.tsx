/**
 * QuickActionsRow Component
 *
 * Horizontal scrollable quick action buttons for common tasks.
 * Makes the home page more interactive and engaging.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { BarChart3, BookOpen, Trophy, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { Colors } from '../UnifiedHomePage.types';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  route: string;
}

interface QuickActionsRowProps {
  colors: Colors;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function QuickActionButton({ action, colors, index }: { action: QuickAction; colors: Colors; index: number }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(action.route as any);
  };

  return (
    <Animated.View entering={FadeInRight.duration(300).delay(index * 50)}>
      <AnimatedTouchable
        style={[s.actionButton, { backgroundColor: colors.card }, animStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[s.iconCircle, { backgroundColor: `${action.color}15` }]}>{action.icon}</View>
        <Text style={[s.label, { color: colors.text }]} numberOfLines={1}>
          {action.label}
        </Text>
      </AnimatedTouchable>
    </Animated.View>
  );
}

export function QuickActionsRow({ colors }: QuickActionsRowProps) {
  const { t } = useTranslation();
  const actions: QuickAction[] = [
    {
      id: 'weapon',
      label: t('weapons.weapons'),
      icon: <BookOpen size={16} color={colors.indigo} />,
      color: colors.indigo,
      route: '/(protected)/weaponLibrary',
    },
    {
      id: 'stats',
      label: t('stats.title'),
      icon: <BarChart3 size={16} color={colors.green} />,
      color: colors.green,
      route: '/(protected)/stats',
    },
    {
      id: 'team',
      label: t('teams.team'),
      icon: <Users size={16} color={colors.blue} />,
      color: colors.blue,
      route: '/(protected)/(tabs)/team',
    },
    {
      id: 'achievements',
      label: t('achievements.badges'),
      icon: <Trophy size={16} color={colors.orange} />,
      color: colors.orange,
      route: '/(protected)/achievements',
    },
  ];

  return (
    <View style={s.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {actions.map((action, index) => (
          <QuickActionButton key={action.id} action={action} colors={colors} index={index} />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: -15,
  },
  scrollContent: {
    paddingHorizontal: 15,
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 10,

    borderRadius: 12,
    minWidth: 100,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
