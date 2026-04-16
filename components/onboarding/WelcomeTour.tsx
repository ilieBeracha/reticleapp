/**
 * WelcomeTour - 4-step first-launch welcome modal.
 *
 * Rendered at the root of the protected layout. Only appears once per
 * device, gated by `useOnboardingStore().hasSeenWelcome`. Each step slides
 * horizontally with Reanimated; users can skip or swipe through.
 */

import { PressableScale } from '@/components/shared/PressableScale';
import { useColors } from '@/hooks/ui/useColors';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { BarChart3, Flame, Target, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

type StepIcon = typeof Target;

interface Step {
  icon: StepIcon;
  tint: 'blue' | 'orange' | 'purple' | 'green';
  titleKey: string;
  bodyKey: string;
  fallbackTitle: string;
  fallbackBody: string;
}

const STEPS: Step[] = [
  {
    icon: Target,
    tint: 'blue',
    titleKey: 'onboarding.welcome.title',
    bodyKey: 'onboarding.welcome.body',
    fallbackTitle: 'Welcome to Reticle',
    fallbackBody: 'Track every round, understand every shot, improve every session.',
  },
  {
    icon: Flame,
    tint: 'orange',
    titleKey: 'onboarding.streak.title',
    bodyKey: 'onboarding.streak.body',
    fallbackTitle: 'Build a streak',
    fallbackBody: 'Train daily to grow your streak. Unlock achievements as you hit milestones.',
  },
  {
    icon: BarChart3,
    tint: 'purple',
    titleKey: 'onboarding.insights.title',
    bodyKey: 'onboarding.insights.body',
    fallbackTitle: 'See your progress',
    fallbackBody: 'Accuracy trends, weapon breakdowns, and context-aware coaching — all in Insights.',
  },
  {
    icon: Users,
    tint: 'green',
    titleKey: 'onboarding.teams.title',
    bodyKey: 'onboarding.teams.body',
    fallbackTitle: 'Train with your squad',
    fallbackBody: 'Create a team, invite shooters, and compare standards in real time.',
  },
];

export function WelcomeTour() {
  const colors = useColors();
  const { t } = useTranslation();
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const hasSeen = useOnboardingStore((s) => s.hasSeenWelcome);
  const markSeen = useOnboardingStore((s) => s.markWelcomeSeen);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  // Show only after hydration confirms we've never seen it.
  useEffect(() => {
    if (hydrated && !hasSeen) setVisible(true);
  }, [hydrated, hasSeen]);

  const handleClose = async () => {
    setVisible(false);
    await markSeen();
  };

  const handleNext = () => {
    if (index < STEPS.length - 1) setIndex(index + 1);
    else handleClose();
  };

  if (!visible) return null;

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const tint = tintColor(step.tint, colors);
  const Icon = step.icon;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.72)' }]}>
        <Animated.View
          key={index}
          entering={FadeIn.duration(240)}
          exiting={FadeOut.duration(120)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: tint + '20', borderColor: tint }]}>
            <Icon size={44} color={tint} strokeWidth={1.8} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {t(step.titleKey, { defaultValue: step.fallbackTitle })}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {t(step.bodyKey, { defaultValue: step.fallbackBody })}
          </Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? tint : colors.border,
                    width: i === index ? 22 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            {!isLast && (
              <PressableScale onPress={handleClose} style={styles.skipBtn} haptic="selection">
                <Text style={[styles.skipText, { color: colors.textMuted }]}>
                  {t('common.skip', { defaultValue: 'Skip' })}
                </Text>
              </PressableScale>
            )}
            <PressableScale
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: tint }]}
              haptic={isLast ? 'success' : 'light'}
              hapticOnRelease
            >
              <Text style={styles.nextText}>
                {isLast
                  ? t('onboarding.getStarted', { defaultValue: "Let's go" })
                  : t('common.next', { defaultValue: 'Next' })}
              </Text>
            </PressableScale>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function tintColor(c: Step['tint'], colors: ReturnType<typeof useColors>): string {
  switch (c) {
    case 'blue':
      return colors.blue;
    case 'orange':
      return colors.orange;
    case 'purple':
      return colors.purple;
    case 'green':
      return colors.green;
  }
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: Math.min(SCREEN_W - 48, 360),
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, width: '100%' },
  skipBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  skipText: { fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  nextText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
