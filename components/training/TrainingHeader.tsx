import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ThemeColors, TrainingStatus } from './types';
import { getStatusConfig } from './utils';

interface TrainingHeaderProps {
  title: string;
  description?: string | null;
  status: TrainingStatus;
  colors: ThemeColors;
}

export function TrainingHeader({ title, description, status, colors }: TrainingHeaderProps) {
  const statusConfig = getStatusConfig(status);

  return (
    <View style={styles.header}>
      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
        <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
