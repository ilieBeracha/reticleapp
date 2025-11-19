import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuickActionsProps {
  onStartSession: () => void;
  onCreateTeam?: () => void;
  canManageTeams: boolean;
}

const QuickActions = memo(function QuickActions({ 
  onStartSession, 
  onCreateTeam, 
  canManageTeams 
}: QuickActionsProps) {
  const colors = useColors();

  return (
    <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.primary }]}
        onPress={onStartSession}
        activeOpacity={0.8}
      >
        <Ionicons name="play-circle" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Start Session</Text>
      </TouchableOpacity>

      {canManageTeams && onCreateTeam && (
        <TouchableOpacity
          style={[styles.actionButtonSecondary, { borderColor: colors.border }]}
          onPress={onCreateTeam}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={20} color={colors.text} />
          <Text style={[styles.actionButtonSecondaryText, { color: colors.text }]}>Create Team</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  actionsCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  actionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

export default QuickActions;

