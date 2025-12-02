import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ============================================================================
// COMPONENT
// ============================================================================
export const EmptyTargets = React.memo(function EmptyTargets() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="disc-outline" size={48} color="rgba(255,255,255,0.2)" />
      </View>
      <Text style={styles.title}>No Targets Yet</Text>
      <Text style={styles.subtitle}>
        Tap the button below to add your first target
      </Text>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

