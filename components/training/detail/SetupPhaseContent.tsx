/**
 * SetupPhaseContent Component
 * Shows weapon assignment and team readiness - horizontal spread layout
 */

import type { SessionWithDetails } from '@/services/sessionService';
import type { UserWeapon } from '@/services/weaponService';
import { Check, Crosshair, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Colors } from './types';

interface SetupPhaseContentProps {
  training: any;
  userWeapon: UserWeapon | null;
  teamSessions: SessionWithDetails[];
  colors: Colors;
  canManageTraining: boolean;
  onAssignWeapon: () => void;
}

export function SetupPhaseContent({
  training,
  userWeapon,
  teamSessions,
  colors,
  canManageTraining,
  onAssignWeapon,
}: SetupPhaseContentProps) {
  const completedSessions = teamSessions.filter((s) => s.status === 'completed').length;
  const isReady = !!userWeapon;
  const isOngoing = training.status === 'ongoing';
  const showTeamProgress = training.team_id && isOngoing && completedSessions > 0;

  return (
    <View style={styles.container}>
      {/* Horizontal spread - Weapon & Team side by side */}
      <View style={styles.row}>
        {/* Weapon */}
        <View style={[styles.item, { backgroundColor: colors.card }]}>
          <View style={[styles.iconDot, { backgroundColor: isReady ? colors.green + '15' : colors.orange + '15' }]}>
            <Crosshair size={14} color={isReady ? colors.green : colors.orange} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[styles.itemValue, { color: isReady ? colors.text : colors.orange }]} numberOfLines={1}>
              {userWeapon ? userWeapon.name : 'No weapon'}
            </Text>
          </View>
          {isReady ? (
            <Check size={14} color={colors.green} strokeWidth={3} />
          ) : canManageTraining ? (
            <TouchableOpacity onPress={onAssignWeapon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.actionText, { color: colors.primary }]}>Assign</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Team Progress */}
        {showTeamProgress && (
          <View style={[styles.item, { backgroundColor: colors.card }]}>
            <View style={[styles.iconDot, { backgroundColor: colors.secondary }]}>
              <Users size={14} color={colors.textMuted} />
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemValue, { color: colors.text }]}>{completedSessions} done</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  iconDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
