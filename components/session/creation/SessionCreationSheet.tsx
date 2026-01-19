/**
 * SessionCreationSheet - Modal wrapper for SessionCreationForm
 *
 * Drop-in replacement for StartDrillSheet that uses the unified form.
 * Works for both solo and training sessions.
 */

import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import type { BaseSessionConfig, DrillConfig } from '@/services/session/types';
import { createSession } from '@/services/sessionService';
import type { UserWeapon } from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SessionCreationForm, type SessionFormValues, type TrainingContext } from './SessionCreationForm';
import { purposeToDrillGoal } from './sessionCreation.constants';

// ============================================================================
// TYPES
// ============================================================================

export interface SessionCreationSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Training context - when provided, form is pre-filled */
  trainingContext?: TrainingContext;
  /** Pre-selected weapon */
  initialWeapon?: UserWeapon | null;
  /** Loading weapon state */
  loadingWeapon?: boolean;
  /** Team ID for weapon picker */
  teamId?: string | null;
  /** Custom title */
  title?: string;
  /** Where to return after session completes */
  returnTo?: string;
  returnId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SessionCreationSheet({
  visible,
  onClose,
  trainingContext,
  initialWeapon,
  loadingWeapon,
  teamId,
  title,
  returnTo,
  returnId,
}: SessionCreationSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  const { weather: openWeather } = useOpenWeather({ autoFetch: true });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: SessionFormValues) => {
      setIsSubmitting(true);

      try {
        const sessionWeather = toSessionWeatherData(openWeather, 'openweathermap');

        // Build drill config
        const drillConfig: DrillConfig = {
          name: trainingContext?.drill.drillName || `${values.purpose === 'grouping' ? 'Grouping' : 'Practice'} ${values.distance}m`,
          drill_goal: purposeToDrillGoal(values.purpose),
          target_type: values.targetType === 'paper' || values.targetType === 'tactical' ? values.targetType : 'paper',
          distance_m: values.distance,
          rounds_per_shooter: values.shotsPlanned,
          time_limit_seconds: values.timeLimit,
          position: values.position !== 'any' ? values.position : null,
          category_drill_id: trainingContext?.drill.drillId || null,
        };

        const config: BaseSessionConfig = {
          weapon_id: values.weaponId,
          weather: sessionWeather,
          team_id: trainingContext?.teamId || teamId || null,
          training_id: trainingContext?.trainingId || null,
          drill_id: trainingContext?.drill.drillId || null,
          drill_config: drillConfig,
          session_mode: 'solo',
          watch_controlled: false, // Set in SessionPrepView
          notes: values.notes || undefined,
          start_as_pending: true,
        };

        const session = await createSession(config);
        await loadSessions();

        onClose();

        // Navigate to active session
        router.push({
          pathname: '/(protected)/activeSession',
          params: {
            sessionId: session.id,
            ...(returnTo && { returnTo }),
            ...(returnId && { returnId }),
          },
        });
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to create session');
        setIsSubmitting(false);
      }
    },
    [openWeather, trainingContext, teamId, loadSessions, onClose, returnTo, returnId]
  );

  if (!visible) return null;

  const sheetTitle = title || (trainingContext ? 'Start Drill' : 'New Session');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.card }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{sheetTitle}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form */}
        <SessionCreationForm
          trainingContext={trainingContext}
          initialWeapon={initialWeapon}
          loadingWeapon={loadingWeapon}
          teamId={teamId}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Continue to Setup"
        />
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});
