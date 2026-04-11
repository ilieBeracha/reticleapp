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

import type { TrainingDashboardWidgetProps } from './widgets.types';

// NOTE: Same scoping rule as the other widget files — every identifier inside
// this function must be a parameter, inline literal, Math, or a global from
// node_modules/expo-widgets/bundle/index.ts. No module-local helpers; the
// babel widgets-plugin only captures the function body string.
const TrainingDashboardWidget = (
  props: TrainingDashboardWidgetProps,
  _environment: WidgetEnvironment
) => {
  'widget';

  // Inline formatting — all in the function body, safe for JSC
  const accuracy = Math.max(0, Math.round(props.weeklyAccuracy));
  const sessions = Math.max(0, props.weeklySessions);
  const streak = Math.max(0, props.streakDays);

  // Defensive slice to at most 3 items. The widget is `systemLarge` which is
  // roughly 329x382 pt — enough for ~3 rows plus header + footer.
  const items = Array.isArray(props.trainings) ? props.trainings.slice(0, 3) : [];
  const hasAnyTraining = items.length > 0;

  return (
    <VStack
      spacing={12}
      modifiers={[
        padding({ all: 18 }),
        background('#FFFFFF'),
        cornerRadius(22),
        widgetURL('retic://home'),
      ]}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <HStack spacing={8} alignment="center">
        <VStack spacing={2}>
          <HStack spacing={6} alignment="center">
            <Image systemName="scope" size={12} color="#FF6B35" />
            <Text
              modifiers={[
                font({ weight: 'semibold', size: 11 }),
                foregroundStyle('#FF6B35'),
              ]}
            >
              RETIC · TRAINING
            </Text>
          </HStack>
          <Text
            modifiers={[font({ weight: 'bold', size: 22 }), foregroundStyle('#0F172A')]}
          >
            Your week
          </Text>
        </VStack>
        <Spacer />
        <VStack spacing={2}>
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>
            Updated
          </Text>
          <Text
            modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle('#64748B')]}
          >
            {props.updatedAt}
          </Text>
        </VStack>
      </HStack>

      {/* ── KPI strip ──────────────────────────────────────────────────── */}
      <HStack spacing={10} alignment="center">
        <VStack
          spacing={2}
          modifiers={[
            padding({ horizontal: 12, vertical: 10 }),
            background('#F1F5F9'),
            cornerRadius(14),
          ]}
        >
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#64748B')]}>
            Sessions
          </Text>
          <Text
            modifiers={[font({ weight: 'bold', size: 18 }), foregroundStyle('#0F172A')]}
          >
            {sessions}
          </Text>
        </VStack>

        <VStack
          spacing={2}
          modifiers={[
            padding({ horizontal: 12, vertical: 10 }),
            background('#F1F5F9'),
            cornerRadius(14),
          ]}
        >
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#64748B')]}>
            Accuracy
          </Text>
          <Text
            modifiers={[font({ weight: 'bold', size: 18 }), foregroundStyle('#3B82F6')]}
          >
            {accuracy}%
          </Text>
        </VStack>

        <VStack
          spacing={2}
          modifiers={[
            padding({ horizontal: 12, vertical: 10 }),
            background('#F1F5F9'),
            cornerRadius(14),
          ]}
        >
          <HStack spacing={3} alignment="center">
            <Image systemName="flame.fill" size={10} color="#FF6B35" />
            <Text modifiers={[font({ size: 10 }), foregroundStyle('#64748B')]}>
              Streak
            </Text>
          </HStack>
          <Text
            modifiers={[font({ weight: 'bold', size: 18 }), foregroundStyle('#0F172A')]}
          >
            {streak}d
          </Text>
        </VStack>

        <Spacer />
      </HStack>

      {/* ── Upcoming list header ──────────────────────────────────────── */}
      <HStack spacing={6} alignment="center">
        <Image systemName="calendar" size={11} color="#94A3B8" />
        <Text
          modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle('#94A3B8')]}
        >
          UPCOMING
        </Text>
        <Spacer />
      </HStack>

      {/* ── Upcoming list ─────────────────────────────────────────────── */}
      {hasAnyTraining ? (
        <VStack spacing={6}>
          {items.map((item) => {
            // Inline the state -> color mapping, no external helper. Icon id
            // is a union literal so TS accepts it as an SF Symbol.
            let rowAccent = '#64748B';
            let rowIcon:
              | 'calendar'
              | 'dot.radiowaves.left.and.right'
              | 'bolt.fill'
              | 'checkmark.circle.fill' = 'calendar';
            if (item.state === 'live') {
              rowAccent = '#22C55E';
              rowIcon = 'dot.radiowaves.left.and.right';
            } else if (item.state === 'next') {
              rowAccent = '#FF6B35';
              rowIcon = 'bolt.fill';
            } else if (item.state === 'completed') {
              rowAccent = '#3B82F6';
              rowIcon = 'checkmark.circle.fill';
            }

            return (
              <HStack
                key={item.id}
                spacing={10}
                alignment="center"
                modifiers={[
                  padding({ horizontal: 12, vertical: 10 }),
                  background('#F8FAFC'),
                  cornerRadius(12),
                ]}
              >
                <Image systemName={rowIcon} size={14} color={rowAccent} />
                <VStack spacing={1}>
                  <Text
                    modifiers={[
                      font({ weight: 'semibold', size: 13 }),
                      foregroundStyle('#0F172A'),
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text modifiers={[font({ size: 11 }), foregroundStyle('#64748B')]}>
                    {item.when} · {item.location}
                  </Text>
                </VStack>
                <Spacer />
                <Text
                  modifiers={[
                    font({ weight: 'semibold', size: 10 }),
                    foregroundStyle(rowAccent),
                  ]}
                >
                  {item.state.toUpperCase()}
                </Text>
              </HStack>
            );
          })}
        </VStack>
      ) : (
        <VStack
          spacing={4}
          modifiers={[
            padding({ all: 16 }),
            background('#F8FAFC'),
            cornerRadius(14),
          ]}
        >
          <Text
            modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle('#334155')]}
          >
            Nothing scheduled
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle('#94A3B8')]}>
            Plan a session in Retic to see it listed here.
          </Text>
        </VStack>
      )}

      <Spacer />

      {/* ── Quick action CTA ──────────────────────────────────────────── */}
      <HStack
        spacing={8}
        alignment="center"
        modifiers={[
          padding({ horizontal: 14, vertical: 12 }),
          background('#FF6B35'),
          cornerRadius(14),
        ]}
      >
        <Image systemName="play.circle.fill" size={16} color="#FFFFFF" />
        <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#FFFFFF')]}>
          Start a session
        </Text>
        <Spacer />
        <Image systemName="arrow.right" size={13} color="#FFFFFF" />
      </HStack>
    </VStack>
  );
};

export default createWidget('TrainingDashboardWidget', TrainingDashboardWidget);
