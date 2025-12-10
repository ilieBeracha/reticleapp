import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ThemeColors, TrainingStatus } from './types';

interface TrainingActionsProps {
  status: TrainingStatus;
  actionLoading: boolean;
  colors: ThemeColors;
  canManageTraining: boolean;
  onStart: () => void;
  onFinish: () => void;
  onCancel: () => void;
}

export function TrainingActions({
  status,
  actionLoading,
  colors,
  canManageTraining,
  onStart,
  onFinish,
  onCancel,
}: TrainingActionsProps) {
  // Only commanders/owners can manage trainings
  if (!canManageTraining) {
    return null;
  }

  if (status !== 'planned' && status !== 'ongoing') {
    return null;
  }

  return (
    <View style={styles.container}>
      {status === 'planned' && (
        <>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={onStart}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.primaryText}>{actionLoading ? 'Starting...' : 'Start Training'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: '#EF4444' }]}
            onPress={onCancel}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color="#EF4444" />
            <Text style={styles.cancelText}>Cancel Training</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'ongoing' && (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: '#22C55E' }]}
          onPress={onFinish}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.primaryText}>
            {actionLoading ? 'Finishing...' : 'Mark as Completed'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
