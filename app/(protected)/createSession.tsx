/**
 * CREATE SESSION - 2-Step Flow
 *
 * 1. Intent - What's your goal?
 * 2. Details - Session details (distance, rounds, drill)
 *
 * Weapon is auto-selected from default or shown as a badge in step 2.
 */

import { DrillPresetPicker, PresetForm } from '@/components/drills';
import {
  SessionContextStep,
  SessionIntentStep,
  SessionWeaponStep,
  useSessionCreation,
} from '@/components/session/creation';
import type { SessionPurpose } from '@/components/session/creation/sessionCreation.types';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillPreset } from '@/services/presetService';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession, deleteSession, getMyActiveSession } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronLeft, Play } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DrillPreset | null>(null);

  const creation = useSessionCreation({
    onSubmit: handleSubmit,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK FOR ACTIVE SESSION
  // ─────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const checkActiveSession = async () => {
        try {
          const activeSession = await getMyActiveSession();
          
          if (activeSession) {
            Alert.alert('Active Session', 'You have an active session. Continue or start fresh?', [
                {
                  text: 'Continue',
                  onPress: () => {
                    router.replace({
                      pathname: '/(protected)/activeSession',
                      params: { sessionId: activeSession.id },
                    });
                  },
                },
                {
                  text: 'Delete & Start New',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteSession(activeSession.id);
                      if (!cancelled) setCheckingSession(false);
                    } catch (err) {
                      console.error('Failed to delete session:', err);
                      Alert.alert('Error', 'Failed to delete session');
                      router.back();
                    }
                  },
                },
                { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            ]);
          } else {
            if (!cancelled) setCheckingSession(false);
          }
        } catch {
          if (!cancelled) setCheckingSession(false);
        }
      };
      
      checkActiveSession();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  async function handleSubmit(config: BaseSessionConfig) {
    try {
      console.log('[CreateSession] Submitting with weapon_id:', config.weapon_id);
      const session = await createSession(config);
      console.log('[CreateSession] Created session:', {
        id: session.id,
        weapon_id: session.weapon_id,
        weapon_name: session.weapon_name,
      });
      await loadSessions();
      
      router.replace({
        pathname: '/(protected)/activeSession',
        params: { sessionId: session.id },
      });
    } catch (error: any) {
      console.error('[CreateSession] Failed:', error);
      Alert.alert('Error', error.message || 'Failed to start session');
    }
  }

  const handleUseSavedDrill = useCallback(() => {
    setShowPresetPicker(true);
  }, []);

  // Auto-advance to step 2 when purpose is selected
  const handlePurposeSelect = useCallback((purpose: SessionPurpose) => {
    creation.setPurpose(purpose);
    // Small delay for visual feedback before advancing
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      creation.goForward();
    }, 150);
  }, [creation]);

  // Purpose label for step 2 header
  const getPurposeLabel = (purpose: SessionPurpose | null): string => {
    const labels: Record<SessionPurpose, string> = {
      grouping: 'Grouping',
      achievement: 'Target Hits',
      zeroing: 'Zeroing',
      physical: 'Stress Drill',
      custom: 'Custom',
    };
    return purpose ? labels[purpose] : '';
  };

  const handlePresetSelect = useCallback((preset: DrillPreset) => {
    setSelectedPreset(preset);
    setShowPresetPicker(false);
    
    // Map drill_goal to SessionPurpose
    const purposeMap: Record<string, 'grouping' | 'achievement' | 'zeroing' | 'physical' | 'custom'> = {
      grouping: 'grouping',
      achievement: 'achievement',
      zeroing: 'zeroing',
      physical: 'physical',
    };
    const purpose = purposeMap[preset.drill_goal] || 'custom';
    
    // Set purpose and prefill context
    creation.setPurpose(purpose);
    creation.updateContext({
      distance: preset.distance_m,
      shotsPlanned: preset.rounds_per_shooter,
      timeLimit: preset.time_limit_seconds || null,
    });
    
    // Store preset id for reference
    creation.selectPreset(preset.id);
    
    // Go to context step
    creation.goForward();
  }, [creation]);

  const handleCreateNewPreset = useCallback(() => {
    setShowPresetPicker(false);
    setShowPresetForm(true);
  }, []);

  const handlePresetCreated = useCallback((newPreset: DrillPreset) => {
    setShowPresetForm(false);
    // Optionally auto-select the new preset
    handlePresetSelect(newPreset);
  }, [handlePresetSelect]);

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (checkingSession) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BUTTON CONFIG
  // ─────────────────────────────────────────────────────────────────────────

  // 3 steps: intent → weapon → context → submit
  const isLastStep = creation.state.step === 'context';
  const canContinue =
    creation.state.step === 'intent'
      ? creation.state.purpose !== null
      : creation.state.step === 'weapon'
      ? creation.state.context.weaponId !== null
      : creation.state.step === 'context'
      ? creation.state.context.distance > 0 && creation.state.context.shotsPlanned > 0
      : false;

  const handleButtonPress = () => {
    if (isLastStep) {
      creation.submit();
    } else {
      creation.goForward();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // 2 user-facing steps: Goal → Details (weapon is auto-selected or shown as badge)
  const stepNumber = creation.state.step === 'intent' ? 1 : 2;
  const stepLabels = ['Goal', 'Details'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, {  paddingTop: insets.top - 20 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Minimal header with back + progress */}
      <View style={styles.header}>
        {stepNumber > 1 ? (
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={creation.goBack}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        {/* Step progress with labels - 2 steps */}
        <View style={styles.progressContainer}>
          {[1, 2].map((step, idx) => (
            <View key={step} style={styles.progressItem}>
              <View
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: stepNumber >= step ? colors.text : colors.border,
                    transform: [{ scale: stepNumber === step ? 1.2 : 1 }],
                  },
                ]}
              />
              <Text
                style={[
                  styles.progressLabel,
                  { color: stepNumber >= step ? colors.text : colors.textMuted },
                ]}
              >
                {stepLabels[idx]}
              </Text>
              {idx < 1 && (
                <View
                  style={[
                    styles.progressLine,
                    { backgroundColor: stepNumber > step ? colors.text : colors.border },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        <View style={styles.backButtonPlaceholder} />
      </View>

      {/* Step Content */}
      {creation.state.step === 'intent' && (
        <SessionIntentStep
          selectedPurpose={creation.state.purpose}
          onSelectPurpose={handlePurposeSelect}
          onUseSavedDrill={handleUseSavedDrill}
        />
      )}

      {creation.state.step === 'weapon' && (
        <SessionWeaponStep
          context={creation.state.context}
          onUpdateContext={creation.updateContext}
          onContinue={creation.goForward}
          isLoadingWeapon={creation.isLoadingWeapon}
        />
      )}

      {creation.state.step === 'context' && (
        <SessionContextStep
          purpose={creation.state.purpose!}
          context={creation.state.context}
          onUpdateContext={creation.updateContext}
          onBack={creation.goBack}
          weaponCategory={selectedPreset?.weapon_category as any}
          selectedDrillId={creation.state.selectedDrillId}
          onDrillChange={creation.setDrill}
        />
      )}

      {/* Spacer - pushes button to bottom when content is short */}
      <View style={styles.spacer} />

      {/* Button - only show on step 3 since steps 1 and 2 auto-advance */}
      {isLastStep && (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: canContinue ? colors.text : colors.secondary },
          ]}
          onPress={handleButtonPress}
          disabled={!canContinue || creation.state.isSubmitting}
          activeOpacity={0.85}
        >
          {creation.state.isSubmitting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Text
                style={[
                  styles.buttonText,
                  { color: canContinue ? colors.background : colors.textMuted },
                ]}
              >
                Start Session
              </Text>
              <Play
                size={16}
                color={canContinue ? colors.background : colors.textMuted}
                fill={canContinue ? colors.background : colors.textMuted}
              />
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Preset Picker Modal */}
      <Modal
        visible={showPresetPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPresetPicker(false)}
      >
        <DrillPresetPicker
          onSelect={handlePresetSelect}
          onCreateNew={handleCreateNewPreset}
          onClose={() => setShowPresetPicker(false)}
        />
      </Modal>

      {/* Preset Form Modal */}
      <Modal
        visible={showPresetForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPresetForm(false)}
      >
        <PresetForm
          onComplete={handlePresetCreated}
          onCancel={() => {
            setShowPresetForm(false);
            setShowPresetPicker(true);
          }}
        />
      </Modal>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // PAGE TITLE
  // ─────────────────────────────────────────────────────────────────────────
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // HEADER & PROGRESS
  // ─────────────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 36,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressLine: {
    width: 24,
    height: 2,
    marginHorizontal: 8,
    borderRadius: 1,
  },

  
  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // BUTTON
  // ─────────────────────────────────────────────────────────────────────────
  spacer: {
    flexGrow: 1,
    minHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
