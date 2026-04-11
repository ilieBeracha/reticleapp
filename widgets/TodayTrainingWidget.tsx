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

import type { TodayTrainingWidgetProps } from './widgets.types';

// NOTE: Anything this function references MUST be either (a) a parameter,
// (b) a global injected by node_modules/expo-widgets/bundle/index.ts into the
// widget extension's JavaScriptCore context (Text, VStack, HStack, Image,
// Spacer, font, foregroundStyle, padding, cornerRadius, background, widgetURL,
// Math, etc.), or (c) an inline literal. External module-local consts,
// helpers, or imported React components are NOT captured — the babel widgets
// plugin only stringifies the function body, so any external identifier
// becomes a runtime ReferenceError inside the extension and the widget renders
// blank. See node_modules/babel-preset-expo/build/widgets-plugin.js:109.
const TodayTrainingWidget = (props: TodayTrainingWidgetProps, environment: WidgetEnvironment) => {
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
          widgetURL('retic://sessions/plan'),
        ]}
      >
        <HStack spacing={6} alignment="center">
          <Image systemName="calendar" size={12} color="#94A3B8" />
          <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle('#94A3B8')]}>
            TODAY
          </Text>
          <Spacer />
        </HStack>

        <Text modifiers={[font({ weight: 'bold', size: isSmall ? 16 : 18 }), foregroundStyle('#334155')]}>
          No training
        </Text>

        {!isSmall ? (
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#94A3B8')]}>
            Plan a session in Retic to see it here.
          </Text>
        ) : null}

        <Spacer />

        <HStack spacing={6} alignment="center">
          <Image systemName="plus.circle.fill" size={13} color="#FF6B35" />
          <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle('#FF6B35')]}>
            Tap to plan
          </Text>
        </HStack>
      </VStack>
    );
  }

  // ── Populated branch ──────────────────────────────────────────────────
  // Inline every branching value: the widgets-plugin only stringifies the
  // body, so external helpers are out of scope. Icon identifiers are union
  // literals so TS accepts them as SF Symbols.
  let accent = '#64748B';
  let statusLabel = 'Planned';
  let statusIcon:
    | 'clock.fill'
    | 'dot.radiowaves.left.and.right'
    | 'checkmark.circle.fill'
    | 'calendar' = 'clock.fill';
  if (props.status === 'active') {
    accent = '#22C55E';
    statusLabel = 'Live';
    statusIcon = 'dot.radiowaves.left.and.right';
  } else if (props.status === 'completed') {
    accent = '#3B82F6';
    statusLabel = 'Done';
    statusIcon = 'checkmark.circle.fill';
  } else if (props.status === 'planned') {
    accent = '#FF6B35';
    statusLabel = 'Planned';
    statusIcon = 'calendar';
  }

  let countdownLabel: string;
  if (props.countdownMinutes <= 0) {
    countdownLabel = 'Now';
  } else if (props.countdownMinutes >= 60) {
    const hours = Math.floor(props.countdownMinutes / 60);
    const mins = props.countdownMinutes % 60;
    countdownLabel = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  } else {
    countdownLabel = `${props.countdownMinutes}m`;
  }

  return (
    <VStack
      spacing={isSmall ? 6 : 10}
      modifiers={[
        padding({ all: isSmall ? 14 : 18 }),
        background('#FFFFFF'),
        cornerRadius(18),
        widgetURL('retic://sessions/active'),
      ]}
    >
      <HStack spacing={6} alignment="center">
        <Image systemName={statusIcon} size={12} color={accent} />
        <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle(accent)]}>
          {statusLabel.toUpperCase()}
        </Text>
        <Spacer />
        <Text modifiers={[font({ weight: 'medium', size: 11 }), foregroundStyle('#94A3B8')]}>
          {props.startTime}
        </Text>
      </HStack>

      <Text
        modifiers={[
          font({ weight: 'bold', size: isSmall ? 16 : 19 }),
          foregroundStyle('#0F172A'),
        ]}
      >
        {props.title}
      </Text>

      {!isSmall ? (
        <HStack spacing={6} alignment="center">
          <Image systemName="mappin.and.ellipse" size={11} color="#94A3B8" />
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#64748B')]}>
            {props.location}
          </Text>
        </HStack>
      ) : null}

      <Spacer />

      <HStack spacing={8} alignment="center">
        <VStack spacing={0}>
          <Text
            modifiers={[
              font({ weight: 'bold', size: isSmall ? 20 : 24 }),
              foregroundStyle(accent),
            ]}
          >
            {countdownLabel}
          </Text>
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>
            {props.countdownMinutes <= 0 ? 'in progress' : 'until start'}
          </Text>
        </VStack>
        <Spacer />
      </HStack>
    </VStack>
  );
};

export default createWidget('TodayTrainingWidget', TodayTrainingWidget);
