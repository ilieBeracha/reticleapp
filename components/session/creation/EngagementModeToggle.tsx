/**
 * EngagementModeToggle
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * Toggle between Solo, Squad, and Group engagement modes.
 * Only shown when drill_goal === 'engagement'.
 * Grouping sessions are ALWAYS solo - no toggle shown.
 *
 * Modes:
 * - Solo: Individual execution, full target tracking
 * - Squad: Team execution with detailed individual targets
 * - Group: Team execution with simple shots/hits entry per person
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { User, Users, UsersRound } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { EngagementMode } from '../shared';

interface EngagementModeToggleProps {
  /** Current mode */
  value: EngagementMode;
  /** Called when mode changes */
  onChange: (mode: EngagementMode) => void;
  /** Whether toggle is disabled */
  disabled?: boolean;
}

export function EngagementModeToggle({ value, onChange, disabled = false }: EngagementModeToggleProps) {
  const { t } = useTranslation();
  const colors = useColors();

  const handlePress = (mode: EngagementMode) => {
    if (disabled || mode === value) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(mode);
  };

  const isSolo = value === 'solo';
  const isSquad = value === 'squad';
  const isGroup = value === 'group';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{t('session.mode')}</Text>
      <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Solo Option */}
        <TouchableOpacity
          style={[styles.option, isSolo && { backgroundColor: colors.primary }]}
          onPress={() => handlePress('solo')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <User size={16} color={isSolo ? '#fff' : colors.textMuted} strokeWidth={2} />
          <Text style={[styles.optionText, { color: isSolo ? '#fff' : colors.text }]}>{t('session.solo')}</Text>
        </TouchableOpacity>

        {/* Squad Option */}
        <TouchableOpacity
          style={[styles.option, isSquad && { backgroundColor: colors.primary }]}
          onPress={() => handlePress('squad')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Users size={16} color={isSquad ? '#fff' : colors.textMuted} strokeWidth={2} />
          <Text style={[styles.optionText, { color: isSquad ? '#fff' : colors.text }]}>{t('session.squad')}</Text>
        </TouchableOpacity>

        {/* Group Option */}
        <TouchableOpacity
          style={[styles.option, isGroup && { backgroundColor: colors.primary }]}
          onPress={() => handlePress('group')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <UsersRound size={16} color={isGroup ? '#fff' : colors.textMuted} strokeWidth={2} />
          <Text style={[styles.optionText, { color: isGroup ? '#fff' : colors.text }]}>{t('session.group')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 7,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
