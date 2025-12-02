import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================
interface StatCardProps {
  value: string | number;
  label: string;
  accent?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================
export const StatCard = React.memo(function StatCard({
  value,
  label,
  accent = false,
}: StatCardProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, accent && styles.valueAccent]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  valueAccent: {
    color: '#10B981',
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});

