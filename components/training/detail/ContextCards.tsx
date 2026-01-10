/**
 * ContextCards Component
 * Displays weapon assignment and team activity context
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Crosshair, Users } from 'lucide-react-native';
import type { ContextCardsProps } from './types';

export function ContextCards({
  training,
  userWeapon,
  teamSessions,
  colors,
  canManageTraining,
  onAssignWeapon,
}: ContextCardsProps) {
  const completedSessions = teamSessions.filter(s => s.status === 'completed').length;

  return (
    <View style={styles.container}>
      {/* User's Weapon */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Crosshair size={18} color={userWeapon ? colors.text : colors.textMuted} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Assigned Weapon</Text>
          <Text style={[styles.value, { color: userWeapon ? colors.text : colors.orange }]}>
            {userWeapon ? userWeapon.name : 'No weapon assigned'}
          </Text>
        </View>
        {canManageTraining && !userWeapon && (
          <TouchableOpacity onPress={onAssignWeapon} style={styles.assignBtn}>
            <Text style={[styles.assignBtnText, { color: colors.primary }]}>Assign</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Team Progress Summary */}
      {training.team_id && (
        <View style={[styles.card, { backgroundColor: colors.card, marginTop: 10 }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Users size={18} color={colors.text} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Team Activity</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {completedSessions} completed sessions
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  assignBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  assignBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
