import { Text, VStack } from '@expo/ui/swift-ui';
import { foregroundStyle, font } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { PerformanceSnapshotWidgetProps } from './widgets.types';

const PerformanceSnapshotWidget = (props: PerformanceSnapshotWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const isSmall = environment.widgetFamily === 'systemSmall';
  const title = props.hasData ? `Score ${Math.round(props.lastScore)}` : 'No stats yet';
  const accuracyLine = props.hasData ? `Accuracy ${Math.round(props.weeklyAccuracy)}%` : 'Complete a session to see metrics';
  const streakLine = props.hasData ? `Streak ${props.streakDays} days` : 'Streak starts after first session';
  const updatedLine = props.hasData ? `Updated ${props.updatedAt}` : 'Updated --';

  return (
    <VStack>
      <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle('#111827')]}>Performance</Text>
      <Text modifiers={[font({ weight: 'bold', size: 18 }), foregroundStyle('#111827')]}>{title}</Text>
      <Text modifiers={[foregroundStyle('#374151')]}>{accuracyLine}</Text>
      {!isSmall ? <Text modifiers={[foregroundStyle('#374151')]}>{streakLine}</Text> : null}
      <Text modifiers={[font({ size: 11 }), foregroundStyle('#6B7280')]}>{updatedLine}</Text>
    </VStack>
  );
};

export default createWidget('PerformanceSnapshotWidget', PerformanceSnapshotWidget);
