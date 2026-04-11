import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { PerformanceSnapshotWidgetProps } from './widgets.types';

// NOTE: Any identifier referenced inside this function must be either a
// function parameter, an inline literal, Math, or one of the globals injected
// by node_modules/expo-widgets/bundle/index.ts (Text, VStack, HStack, Image,
// Spacer, font, foregroundStyle, padding, cornerRadius, background, widgetURL).
// Do NOT reference module-local helpers — the babel widgets-plugin only
// stringifies the function body, so any external ident becomes a JSC
// ReferenceError and the widget renders blank.
const PerformanceSnapshotWidget = (
  props: PerformanceSnapshotWidgetProps,
  environment: WidgetEnvironment
) => {
  'widget';

  const isSmall = environment.widgetFamily === 'systemSmall';

  // ── Placeholder branch ────────────────────────────────────────────────
  if (!props.hasData) {
    return (
      <VStack
        spacing={isSmall ? 6 : 8}
        modifiers={[
          padding({ all: isSmall ? 14 : 18 }),
          background('#F8FAFC'),
          cornerRadius(18),
          widgetURL('retic:///insights'),
        ]}
      >
        <HStack spacing={6} alignment="center">
          <Image systemName="chart.line.uptrend.xyaxis" size={12} color="#94A3B8" />
          <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle('#94A3B8')]}>
            PERFORMANCE
          </Text>
          <Spacer />
        </HStack>

        <Text
          modifiers={[
            font({ weight: 'bold', size: isSmall ? 16 : 18 }),
            foregroundStyle('#334155'),
          ]}
        >
          No stats yet
        </Text>

        {!isSmall ? (
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#94A3B8')]}>
            Complete a session to see metrics.
          </Text>
        ) : null}

        <Spacer />

        <HStack spacing={6} alignment="center">
          <Image systemName="target" size={13} color="#3B82F6" />
          <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle('#3B82F6')]}>
            Start session
          </Text>
        </HStack>
      </VStack>
    );
  }

  // ── Populated branch ──────────────────────────────────────────────────
  const scoreVal = Math.max(0, Math.round(props.lastScore));
  const accuracyVal = Math.max(0, Math.round(props.weeklyAccuracy));
  const streakVal = Math.max(0, props.streakDays);

  // Choose accent by score band
  let accent = '#3B82F6';
  if (scoreVal >= 90) accent = '#22C55E';
  else if (scoreVal >= 75) accent = '#3B82F6';
  else if (scoreVal >= 50) accent = '#FF6B35';
  else accent = '#EF4444';

  return (
    <VStack
      spacing={isSmall ? 6 : 10}
      modifiers={[
        padding({ all: isSmall ? 14 : 18 }),
        background('#FFFFFF'),
        cornerRadius(18),
        widgetURL('retic:///insights'),
      ]}
    >
      <HStack spacing={6} alignment="center">
        <Image systemName="chart.line.uptrend.xyaxis" size={12} color={accent} />
        <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(accent)]}>
          PERFORMANCE
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>
          {props.updatedAt}
        </Text>
      </HStack>

      <HStack spacing={4} alignment="lastTextBaseline">
        <Text
          modifiers={[
            font({ weight: 'bold', size: isSmall ? 32 : 40 }),
            foregroundStyle('#0F172A'),
          ]}
        >
          {scoreVal}
        </Text>
        <Text modifiers={[font({ weight: 'medium', size: 13 }), foregroundStyle('#94A3B8')]}>
          pts
        </Text>
        <Spacer />
      </HStack>

      <Spacer />

      <HStack spacing={isSmall ? 10 : 14} alignment="center">
        <VStack spacing={1}>
          <HStack spacing={4} alignment="center">
            <Image systemName="scope" size={10} color="#64748B" />
            <Text modifiers={[font({ size: 10 }), foregroundStyle('#64748B')]}>
              Accuracy
            </Text>
          </HStack>
          <Text
            modifiers={[
              font({ weight: 'semibold', size: isSmall ? 13 : 15 }),
              foregroundStyle('#0F172A'),
            ]}
          >
            {accuracyVal}%
          </Text>
        </VStack>

        <Spacer />

        <VStack spacing={1}>
          <HStack spacing={4} alignment="center">
            <Image systemName="flame.fill" size={10} color="#FF6B35" />
            <Text modifiers={[font({ size: 10 }), foregroundStyle('#64748B')]}>
              Streak
            </Text>
          </HStack>
          <Text
            modifiers={[
              font({ weight: 'semibold', size: isSmall ? 13 : 15 }),
              foregroundStyle('#0F172A'),
            ]}
          >
            {streakVal}d
          </Text>
        </VStack>
      </HStack>
    </VStack>
  );
};

export default createWidget('PerformanceSnapshotWidget', PerformanceSnapshotWidget);
