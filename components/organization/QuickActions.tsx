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
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>QUICK ACTIONS</Text>
      
      <View style={styles.grid}>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            { 
              backgroundColor: colors.card,  
            }
          ]}
          onPress={onStartSession}
          activeOpacity={0.9}
        >
          <View style={styles.content}>
           
            <Text style={styles.actionTitle}>Start Session</Text>
            <Text style={styles.actionDesc}>Launch a new training</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {canManageTeams && onCreateTeam && (
          <TouchableOpacity
            style={[
              styles.secondaryButton, 
              { 
                backgroundColor: colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={onCreateTeam}
            activeOpacity={0.7}
          >
            <View style={[styles.secondaryIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="people-outline" size={22} color={colors.text} />
            </View>
            <View>
              <Text style={[styles.secondaryTitle, { color: colors.text }]}>Create Team</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  grid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
  },
  content: {
    gap: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  actionDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  
  // Secondary
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  secondaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

export default QuickActions;
