/**
 * CREATE SESSION - 3-Step Flow
 *
 * 1. Intent - What's my goal?
 * 2. Weapon - Which weapon?
 * 3. Context - Session details (distance, rounds, drill)
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
import { Ionicons } from '@expo/vector-icons';
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.textMuted} size="large" />
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

  const stepNumber = creation.state.step === 'intent' ? 1 : creation.state.step === 'weapon' ? 2 : 3;
  const stepLabels = ['Goal', 'Weapon', 'Details'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header with back/close + title */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.card }]}
          onPress={stepNumber > 1 ? creation.goBack : () => router.back()}
          activeOpacity={0.7}
        >
          {stepNumber > 1 ? (
            <ChevronLeft size={20} color={colors.text} />
          ) : (
            <Ionicons name="close" size={20} color={colors.text} />
          )}
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>New Session</Text>

        <View style={styles.headerButtonPlaceholder} />
      </View>

      {/* Step Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: colors.primary,
                width: `${(stepNumber / 3) * 100}%`,
              }
            ]} 
          />
        </View>
        <View style={styles.progressLabels}>
          {stepLabels.map((label, idx) => (
            <Text
              key={label}
              style={[
                styles.progressLabel,
                { 
                  color: stepNumber > idx ? colors.text : colors.textMuted,
                  fontWeight: stepNumber === idx + 1 ? '600' : '400',
                },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
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
        <>
          {/* Step 3 header with weapon badge */}
          <View style={styles.step3Header}>
            <Text style={[styles.step3Title, { color: colors.text }]}>
              Session details
            </Text>
            <TouchableOpacity
              style={[styles.weaponBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => creation.goToStep('weapon')}
              activeOpacity={0.7}
            >
              <Text style={[styles.weaponBadgeLabel, { color: colors.textMuted }]}>
                Weapon
              </Text>
              <Text style={[styles.weaponBadgeName, { color: colors.text }]} numberOfLines={1}>
                {creation.state.context.weaponName || 'Select'}
              </Text>
            </TouchableOpacity>
          </View>
          <SessionContextStep
            purpose={creation.state.purpose!}
            context={creation.state.context}
            onUpdateContext={creation.updateContext}
            onBack={creation.goBack}
            weaponCategory={selectedPreset?.weapon_category as any}
            selectedDrillId={creation.state.selectedDrillId}
            onDrillChange={creation.setDrill}
          />
        </>
      )}

      {/* Spacer - pushes button to bottom when content is short */}
      <View style={styles.spacer} />

      {/* Start Button - only show on step 3 since steps 1 and 2 auto-advance */}
      {isLastStep && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              { 
                backgroundColor: canContinue ? colors.primary : colors.secondary,
                opacity: canContinue ? 1 : 0.6,
              },
            ]}
            onPress={handleButtonPress}
            disabled={!canContinue || creation.state.isSubmitting}
            activeOpacity={0.85}
          >
            {creation.state.isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Play size={18} color="#fff" fill="#fff" />
                <Text style={styles.buttonText}>Start Session</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    paddingTop: 12,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  
  // Progress
  progressBar: {
    marginBottom: 24,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // Step 3 header
  step3Header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 4,
  },
  step3Title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  weaponBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 140,
  },
  weaponBadgeLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weaponBadgeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Spacer & Button
  spacer: {
    flexGrow: 1,
    minHeight: 32,
  },
  buttonContainer: {
    paddingTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
});
