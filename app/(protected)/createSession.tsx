/**
 * CREATE SESSION - Step-Based Flow
 * 
 * View container with ScrollView for content and fixed footer for button.
 */

import { DrillPresetPicker, PresetForm } from '@/components/drills';
import {
  SessionContextStep,
  SessionIntentStep,
  useSessionCreation,
} from '@/components/session/creation';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillPreset } from '@/services/presetService';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession, deleteSession, getMyActiveSession } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ArrowRight, Play } from 'lucide-react-native';
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

  // Only 2 steps: intent → context → submit
  const isLastStep = creation.state.step === 'context';
  const canContinue =
    creation.state.step === 'intent'
      ? creation.state.purpose !== null
      : creation.state.step === 'context'
      ? creation.state.context.weaponId !== null && // Weapon is required
        creation.state.context.distance > 0 && 
        creation.state.context.shotsPlanned > 0
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Step Content */}
      {creation.state.step === 'intent' && (
        <SessionIntentStep
          selectedPurpose={creation.state.purpose}
          onSelectPurpose={creation.setPurpose}
          onUseSavedDrill={handleUseSavedDrill}
        />
      )}

      {creation.state.step === 'context' && (
        <SessionContextStep
          purpose={creation.state.purpose!}
          context={creation.state.context}
          onUpdateContext={creation.updateContext}
          onBack={creation.goBack}
          weaponCategory={selectedPreset?.weapon_category as any}
        />
      )}

      {/* Spacer - pushes button to bottom when content is short */}
      <View style={styles.spacer} />

      {/* Button */}
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
              {isLastStep ? 'Start Session' : 'Continue'}
          </Text>
            {isLastStep ? (
              <Play
                size={16}
                color={canContinue ? colors.background : colors.textMuted}
                fill={canContinue ? colors.background : colors.textMuted}
              />
            ) : (
              <ArrowRight
                size={16}
                color={canContinue ? colors.background : colors.textMuted}
                strokeWidth={2}
              />
            )}
          </>
        )}
        </TouchableOpacity>

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
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  spacer: {
    flexGrow: 1,
    minHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
