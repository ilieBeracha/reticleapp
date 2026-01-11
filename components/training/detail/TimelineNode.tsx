/**
 * TimelineNode Component
 * Visual representation of a timeline node with connection line
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Lock } from 'lucide-react-native';
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

  return (
    <View style={styles.container}>
      {/* The Node */}
      <View
        style={[
          styles.node,
          {
            backgroundColor: status === 'completed' || status === 'active' ? nodeColor : colors.background,
            borderColor: nodeColor,
            borderWidth: status === 'upcoming' || status === 'locked' ? 2 : 0,
          },
        ]}
      >
        {status === 'completed' && <Check size={10} color="#fff" strokeWidth={3} />}
        {status === 'active' && <PulsingDot size={8} color="#fff" />}
        {status === 'locked' && <Lock size={8} color={colors.textMuted} />}
      </View>

      {/* The Line */}
      {!isLast && (
        <View
          style={[
            styles.line,
            {
              backgroundColor: status === 'completed' ? colors.green : colors.border,
              opacity: status === 'completed' ? 1 : 0.3,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 28,
    marginRight: 14,
  },
  node: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 6,
    marginBottom: 6,
    minHeight: 24,
    borderRadius: 1,
  },
});
