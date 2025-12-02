import { formatShortTime } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================
interface SessionHeaderProps {
  title?: string;
  startedAt: string;
  onClose: () => void;
  paddingTop: number;
}

// ============================================================================
// COMPONENT
// ============================================================================
export const SessionHeader = React.memo(function SessionHeader({
  title,
  startedAt,
  onClose,
  paddingTop,
}: SessionHeaderProps) {
  const startTime = formatShortTime(startedAt);

  return (
    <View style={[styles.container, { paddingTop: paddingTop + 8 }]}>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Ionicons name="chevron-down" size={26} color="#fff" />
      </TouchableOpacity>

      <View style={styles.center}>
        {title ? (
          <>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle}>Started {startTime}</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Practice Session</Text>
            <Text style={styles.subtitle}>{startTime}</Text>
          </>
        )}
      </View>

      {/* Spacer to balance the layout */}
      <View style={styles.spacer} />
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  spacer: {
    width: 44,
  },
});

