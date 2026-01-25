/**
 * TimelineNode Component
 *
 * Large, prominent timeline node with connection line.
 * Creates a visual journey through the training phases.
 */

import { Check, Circle, Lock } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { PulsingDot } from './AnimatedComponents';
import type { TimelineNodeProps } from './types';

export function TimelineNode({ status, isLast, colors }: TimelineNodeProps) {
  const getNodeColor = () => {
    switch (status) {
      case 'completed':
        return colors.green;
      case 'active':
        return colors.primary;
      case 'upcoming':
        return colors.border;
      case 'locked':
        return colors.border;
      default:
        return colors.border;
    }
  };

  const nodeColor = getNodeColor();
  const isActive = status === 'active';
  const isCompleted = status === 'completed';

  return (
    <View style={styles.container}>
      {/* The Node - Larger & More Prominent */}
      <View
        style={[
          styles.nodeOuter,
          {
            backgroundColor: isActive ? nodeColor + '15' : 'transparent',
            borderColor: isActive ? nodeColor + '30' : 'transparent',
          },
        ]}
      >
        <View
          style={[
            styles.node,
            {
              backgroundColor: isCompleted || isActive ? nodeColor : colors.background,
              borderColor: nodeColor,
              borderWidth: status === 'upcoming' || status === 'locked' ? 2 : 0,
            },
          ]}
        >
          {isCompleted && <Check size={14} color="#fff" strokeWidth={3} />}
          {isActive && <PulsingDot size={10} color="#fff" />}
          {status === 'locked' && <Lock size={10} color={colors.textMuted} />}
          {status === 'upcoming' && <Circle size={6} color={colors.textMuted} fill={colors.textMuted} />}
        </View>
      </View>

      {/* The Line - Thicker & More Prominent */}
      {!isLast && (
        <View style={styles.lineContainer}>
          <View
            style={[
              styles.line,
              {
                backgroundColor: isCompleted ? colors.green : colors.border,
                opacity: isCompleted ? 1 : 0.25,
              },
            ]}
          />
          {/* Gradient fade effect */}
          <View style={[styles.lineFade, { backgroundColor: isCompleted ? colors.green + '20' : 'transparent' }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 44,
    marginRight: 12,
  },
  nodeOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  node: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  lineContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    minHeight: 40,
  },
  line: {
    width: 3,
    flex: 1,
    borderRadius: 1.5,
  },
  lineFade: {
    position: 'absolute',
    width: 12,
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
});
