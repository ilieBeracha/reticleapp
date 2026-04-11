import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

import type { ActiveDrillActivityProps } from './widgets.types';

// SAME SCOPE RULE AS OTHER WIDGET FILES:
// Anything inside this function must be a parameter, inline literal, Math, or
// a global injected by node_modules/expo-widgets/bundle/index.ts. Module-local
// helpers are stripped by the babel widgets-plugin and will ReferenceError in
// JavaScriptCore at render time.
const ActiveDrillActivity = (props: ActiveDrillActivityProps, _environment: unknown) => {
  'widget';

  // ── Placeholder branch ────────────────────────────────────────────────
  // Live Activities only start when the app explicitly calls start(), so this
  // branch is defensive — if an activity ever goes live before real data is
  // available (e.g. drill metadata still loading), render an elegant holding
  // state instead of crashing.
  if (!props.hasData) {
    return {
      banner: (
        <VStack
          spacing={4}
          modifiers={[
            padding({ all: 14 }),
            background('#F8FAFC'),
            cornerRadius(16),
          ]}
        >
          <HStack spacing={6} alignment="center">
            <Image systemName="hourglass" size={12} color="#94A3B8" />
            <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle('#94A3B8')]}>
              PREPARING DRILL
            </Text>
            <Spacer />
          </HStack>
          <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle('#334155')]}>
            Getting ready…
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle('#94A3B8')]}>
            Waiting for drill data.
          </Text>
        </VStack>
      ),
      compactLeading: (
        <Image systemName="hourglass" size={12} color="#94A3B8" />
      ),
      compactTrailing: (
        <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle('#94A3B8')]}>
          --
        </Text>
      ),
      minimal: <Image systemName="hourglass" size={10} color="#94A3B8" />,
      expandedLeading: (
        <VStack spacing={2}>
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>
            Score
          </Text>
          <Text modifiers={[font({ weight: 'bold', size: 20 }), foregroundStyle('#334155')]}>
            --
          </Text>
        </VStack>
      ),
      expandedTrailing: (
        <VStack spacing={2}>
          <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>
            Remaining
          </Text>
          <Text modifiers={[font({ weight: 'bold', size: 20 }), foregroundStyle('#334155')]}>
            --
          </Text>
        </VStack>
      ),
      expandedBottom: (
        <VStack spacing={2}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle('#94A3B8')]}>
            Preparing drill…
          </Text>
        </VStack>
      ),
    };
  }

  // ── Populated branch ──────────────────────────────────────────────────
  const drillName = props.drillName && props.drillName.length > 0 ? props.drillName : 'Active Drill';
  const stage = props.stage && props.stage.length > 0 ? props.stage : 'In progress';
  const elapsedSeconds = Math.max(0, props.elapsedSeconds);
  const remainingSeconds = Math.max(0, props.remainingSeconds);
  const score = Math.max(0, Math.round(props.score));

  // Format MM:SS inline
  const remMin = Math.floor(remainingSeconds / 60);
  const remSec = remainingSeconds % 60;
  const remainingLabel = `${remMin}:${remSec < 10 ? '0' : ''}${remSec}`;

  const elapMin = Math.floor(elapsedSeconds / 60);
  const elapSec = elapsedSeconds % 60;
  const elapsedLabel = `${elapMin}:${elapSec < 10 ? '0' : ''}${elapSec}`;

  return {
    banner: (
      <VStack
        spacing={4}
        modifiers={[padding({ all: 14 }), background('#FFFFFF'), cornerRadius(16)]}
      >
        <HStack spacing={6} alignment="center">
          <Image systemName="dot.radiowaves.left.and.right" size={12} color="#22C55E" />
          <Text modifiers={[font({ weight: 'semibold', size: 11 }), foregroundStyle('#22C55E')]}>
            LIVE DRILL
          </Text>
          <Spacer />
          <Text modifiers={[font({ weight: 'medium', size: 11 }), foregroundStyle('#94A3B8')]}>
            {elapsedLabel}
          </Text>
        </HStack>
        <Text modifiers={[font({ weight: 'bold', size: 17 }), foregroundStyle('#0F172A')]}>
          {drillName}
        </Text>
        <HStack spacing={6} alignment="center">
          <Image systemName="flag.fill" size={11} color="#64748B" />
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#64748B')]}>
            {stage}
          </Text>
          <Spacer />
          <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle('#22C55E')]}>
            {score} pts
          </Text>
        </HStack>
      </VStack>
    ),
    compactLeading: (
      <HStack spacing={4} alignment="center">
        <Image systemName="scope" size={12} color="#22C55E" />
        <Text modifiers={[font({ weight: 'bold', size: 12 }), foregroundStyle('#0F172A')]}>
          {score}
        </Text>
      </HStack>
    ),
    compactTrailing: (
      <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle('#22C55E')]}>
        {remainingLabel}
      </Text>
    ),
    minimal: (
      <Text modifiers={[font({ weight: 'bold', size: 10 }), foregroundStyle('#22C55E')]}>
        {score}
      </Text>
    ),
    expandedLeading: (
      <VStack spacing={2}>
        <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>
          Score
        </Text>
        <Text modifiers={[font({ weight: 'bold', size: 24 }), foregroundStyle('#0F172A')]}>
          {score}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack spacing={2}>
        <Text modifiers={[font({ size: 10 }), foregroundStyle('#94A3B8')]}>
          Remaining
        </Text>
        <Text modifiers={[font({ weight: 'bold', size: 24 }), foregroundStyle('#22C55E')]}>
          {remainingLabel}
        </Text>
      </VStack>
    ),
    expandedBottom: (
      <HStack spacing={12} alignment="center">
        <HStack spacing={4} alignment="center">
          <Image systemName="flag.fill" size={11} color="#64748B" />
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#334155')]}>
            {stage}
          </Text>
        </HStack>
        <Spacer />
        <HStack spacing={4} alignment="center">
          <Image systemName="clock.fill" size={11} color="#64748B" />
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#334155')]}>
            {elapsedLabel}
          </Text>
        </HStack>
      </HStack>
    ),
  };
};

export default createLiveActivity('ActiveDrillActivity', ActiveDrillActivity);
