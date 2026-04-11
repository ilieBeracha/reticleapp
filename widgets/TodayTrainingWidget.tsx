import { Text, VStack } from '@expo/ui/swift-ui';
import { foregroundStyle, font } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayTrainingWidgetProps } from './widgets.types';

const statusColor = (status: TodayTrainingWidgetProps['status']) => {
  if (status === 'active') return '#22C55E';
  if (status === 'completed') return '#3B82F6';
  if (status === 'planned') return '#F59E0B';
  return '#6B7280';
};

const TodayTrainingWidget = (props: TodayTrainingWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const accent = statusColor(props.status);
  const countdownLabel = !props.hasData ? '--' : props.countdownMinutes <= 0 ? 'Now' : `${props.countdownMinutes} min`;
  const isSmall = environment.widgetFamily === 'systemSmall';

  return (
    <VStack>
      <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle('#111827')]}>Today</Text>
      <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle('#111827')]}>{props.title}</Text>
      {!isSmall ? <Text modifiers={[foregroundStyle('#374151')]}>{props.location}</Text> : null}
      <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(accent)]}>
        {props.startTime} - {countdownLabel}
      </Text>
      {!props.hasData && !isSmall ? (
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#6B7280')]}>Create a session to populate this widget.</Text>
      ) : null}
    </VStack>
  );
};

export default createWidget('TodayTrainingWidget', TodayTrainingWidget);
