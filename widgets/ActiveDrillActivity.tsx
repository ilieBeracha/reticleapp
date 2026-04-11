import { Text, VStack } from '@expo/ui/swift-ui';
import { foregroundStyle, font } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

import type { ActiveDrillActivityProps } from './widgets.types';

const ActiveDrillActivity = (props: ActiveDrillActivityProps, _environment: unknown) => {
  'widget';
  const drillName = props.drillName || 'Active Drill';
  const stage = props.stage || 'In progress';
  const elapsedSeconds = Math.max(0, props.elapsedSeconds);
  const remainingSeconds = Math.max(0, props.remainingSeconds);
  const score = Math.max(0, Math.round(props.score));

  return {
    banner: (
      <VStack>
        <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle('#111827')]}>{drillName}</Text>
        <Text modifiers={[foregroundStyle('#374151')]}>Stage: {stage}</Text>
        <Text modifiers={[foregroundStyle('#374151')]}>Elapsed: {elapsedSeconds}s</Text>
      </VStack>
    ),
    compactLeading: <Text modifiers={[font({ weight: 'bold' }), foregroundStyle('#111827')]}>Drill</Text>,
    compactTrailing: <Text modifiers={[foregroundStyle('#111827')]}>{remainingSeconds}s</Text>,
    minimal: <Text modifiers={[foregroundStyle('#111827')]}>{score}</Text>,
    expandedLeading: (
      <VStack>
        <Text modifiers={[font({ weight: 'semibold' }), foregroundStyle('#111827')]}>Score</Text>
        <Text modifiers={[font({ weight: 'bold', size: 20 }), foregroundStyle('#111827')]}>{score}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack>
        <Text modifiers={[font({ weight: 'semibold' }), foregroundStyle('#111827')]}>Remaining</Text>
        <Text modifiers={[font({ weight: 'bold', size: 20 }), foregroundStyle('#111827')]}>
          {remainingSeconds}s
        </Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack>
        <Text modifiers={[foregroundStyle('#374151')]}>Stage {stage}</Text>
        <Text modifiers={[foregroundStyle('#374151')]}>Elapsed {elapsedSeconds}s</Text>
      </VStack>
    ),
  };
};

export default createLiveActivity('ActiveDrillActivity', ActiveDrillActivity);
