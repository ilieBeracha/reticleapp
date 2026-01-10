/**
 * CREATE SESSION - 2-Step Flow
 *
 * 1. Intent - What's my goal? (grouping/engagement)
 * 2. Details - Session configuration (weapon, distance, bullets)
 *
 * Weapon selection is a sheet within the Details step, not a separate step.
 * If user has no weapons, they can create one from the weapon picker.
 */

import { DrillPresetPicker, PresetForm } from '@/components/drills';
import {
    SessionContextStep,
    SessionIntentStep,
    useSessionCreation,
} from '@/components/session/creation';
import type { Position, SessionPurpose } from '@/components/session/creation/sessionCreation.types';
import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import type { DrillPreset } from '@/services/presetService';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession, deleteSession, getMyActiveSession } from '@/services/sessionService';
import type { UserWeapon } from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, CornerDownRight, Crosshair, Plus, Target } from 'lucide-react-native';
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
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  
  // Fetch weather in background (non-blocking)
  const { weather: openWeather } = useOpenWeather({ autoFetch: true });
  
  // Edit mode params (coming back from SessionPrepView)
  const params = useLocalSearchParams<{
    editSessionId?: string;
    weaponId?: string;
    weaponName?: string;
    purpose?: string;
    distance?: string;
    shots?: string;
  }>();
  
  const isEditMode = !!params.editSessionId;
  
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DrillPreset | null>(null);

  const creation = useSessionCreation({
    onSubmit: handleSubmit,
    // Pre-fill from edit params
    initialState: isEditMode ? {
      step: 'context' as const,
      purpose: (params.purpose as SessionPurpose) || 'grouping',
      context: {
        weaponId: params.weaponId || null,
        weaponName: params.weaponName || null,
        distance: params.distance ? parseInt(params.distance, 10) : 25,
        shotsPlanned: params.shots ? parseInt(params.shots, 10) : 5,
      },
    } : undefined,
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
      
      // Attach weather data if available (non-blocking - session creates even without weather)
      const sessionWeather = toSessionWeatherData(openWeather, 'openweathermap');
      const configWithWeather: BaseSessionConfig = {
        ...config,
        weather: sessionWeather,
      };
      
      if (sessionWeather) {
        console.log('[CreateSession] Weather attached:', {
          temp: sessionWeather.temperature_c,
          condition: sessionWeather.condition,
          wind: sessionWeather.wind_speed_mps,
        });
      }
      
      const session = await createSession(configWithWeather);
      console.log('[CreateSession] Created session:', {
        id: session.id,
        weapon_id: session.weapon_id,
        weapon_name: session.weapon_name,
        has_weather: !!session.weather,
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
    const purposeMap: Record<string, 'grouping' | 'engagement'> = {
      grouping: 'grouping',
      engagement: 'engagement',
    };
    const purpose = purposeMap[preset.drill_goal] || 'engagement';
    
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

  // Weapon selection handlers
  const handleOpenWeaponPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWeaponPicker(true);
  }, []);

  const handleWeaponSelect = useCallback((weapon: UserWeapon) => {
    const config = weapon.category ? getCategoryConfig(weapon.category) : null;
    const update: Partial<typeof creation.state.context> = {
      weaponId: weapon.id,
      weaponName: weapon.name,
      weaponCategory: weapon.category || null,
    };
    if (config) {
      update.distance = config.distances.zeroDistance;
      update.position = config.drillDefaults.defaultPosition as Position;
    }
    creation.updateContext(update);
    setShowWeaponPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [creation]);

  const handleAddNewWeapon = useCallback(() => {
    setShowWeaponPicker(false);
    // Open weapon creation modal
    setShowCreateWeapon(true);
  }, []);

  const handleWeaponCreatedById = useCallback(async (weaponId: string) => {
    setShowCreateWeapon(false);
    // Fetch the created weapon and select it
    try {
      const { getUserWeapon } = await import('@/services/weaponService');
      const weapon = await getUserWeapon(weaponId);
      if (weapon) {
        handleWeaponSelect(weapon);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('[CreateSession] Failed to fetch created weapon:', error);
      // Still close the modal even if fetch fails
    }
  }, [handleWeaponSelect]);

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

  // 2 steps: intent → context → submit
  const isLastStep = creation.state.step === 'context';
  const hasWeapon = creation.state.context.weaponId !== null;
  const canContinue =
    creation.state.step === 'intent'
      ? creation.state.purpose !== null
      : creation.state.step === 'context'
      ? hasWeapon && creation.state.context.distance > 0 && creation.state.context.shotsPlanned > 0
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

  const stepNumber = creation.state.step === 'intent' ? 1 : 2;
  const stepLabels = ['Goal', 'Details'];

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
                width: `${(stepNumber / 2) * 100}%`,
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

      {creation.state.step === 'context' && (
        <>
          {/* Step 2 header */}
          <View style={styles.step2Header}>
            <Text style={[styles.step2Title, { color: colors.text }]}>
              Session details
            </Text>
          </View>

          {/* Weapon Selector Card */}
          <View style={styles.weaponSection}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Weapon</Text>
            {creation.isLoadingWeapon ? (
              <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>
                  Loading your weapon...
                </Text>
              </View>
            ) : hasWeapon ? (
              <TouchableOpacity
                style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleOpenWeaponPicker}
                activeOpacity={0.7}
              >
                <View style={[styles.weaponIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Crosshair size={20} color={colors.primary} strokeWidth={1.5} />
                </View>
                <View style={styles.weaponInfo}>
                  <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
                    {creation.state.context.weaponName}
                  </Text>
                  <Text style={[styles.weaponHint, { color: colors.textMuted }]}>
                    Tap to change
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Animated.View entering={FadeIn.duration(200)}>
                <TouchableOpacity
                  style={[styles.weaponEmptyCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                  onPress={handleOpenWeaponPicker}
                  activeOpacity={0.7}
                >
                  <View style={[styles.weaponEmptyIcon, { backgroundColor: `${colors.primary}10` }]}>
                    <Target size={24} color={colors.primary} strokeWidth={1.5} />
                  </View>
                  <View style={styles.weaponEmptyContent}>
                    <Text style={[styles.weaponEmptyTitle, { color: colors.text }]}>
                      Select a weapon
                    </Text>
                    <Text style={[styles.weaponEmptySubtitle, { color: colors.textMuted }]}>
                      Required to start session
                    </Text>
                  </View>
                  <View style={[styles.weaponSelectBtn, { backgroundColor: colors.primary }]}>
                    <Plus size={16} color="#fff" strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Rest of the context form */}
          <SessionContextStep
            purpose={creation.state.purpose!}
            context={creation.state.context}
            onUpdateContext={creation.updateContext}
            onBack={creation.goBack}
            weaponCategory={selectedPreset?.weapon_category as any}
            selectedDrillId={creation.state.selectedDrillId}
            onDrillChange={creation.setDrill}
            hideWeaponSection // Hide weapon section since we show it above
          />
        </>
      )}

      {/* Spacer - pushes button to bottom when content is short */}
      <View style={styles.spacer} />

      {/* Start Button - only show on step 2 since step 1 auto-advances */}
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
                <CornerDownRight size={18} color="#fff" fill="#fff" />
                <Text style={styles.buttonText}>Preview Session</Text>
              </>
            )}
          </TouchableOpacity>
          
          {!hasWeapon && (
            <Text style={[styles.weaponRequiredHint, { color: colors.orange }]}>
              Select a weapon to continue
            </Text>
          )}
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
          filterByPurpose={creation.state.purpose}
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

      {/* Weapon Picker Modal */}
      <Modal
        visible={showWeaponPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeaponPicker(false)}
      >
        <WeaponPicker
          selectedWeaponId={creation.state.context.weaponId}
          onSelect={handleWeaponSelect}
          onClose={() => setShowWeaponPicker(false)}
          onAddNew={handleAddNewWeapon}
        />
      </Modal>

      {/* Create Weapon Modal */}
      <Modal
        visible={showCreateWeapon}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateWeapon(false)}
      >
        <CreateWeaponFlow
          onComplete={handleWeaponCreatedById}
          onCancel={() => {
            setShowCreateWeapon(false);
            setShowWeaponPicker(true); // Go back to weapon picker
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

  // Step 2 header
  step2Header: {
    marginBottom: 20,
    paddingTop: 4,
  },
  step2Title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Weapon section
  weaponSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  weaponIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponInfo: {
    flex: 1,
    gap: 2,
  },
  weaponName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  weaponHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  weaponLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Weapon empty state
  weaponEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 12,
  },
  weaponEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponEmptyContent: {
    flex: 1,
    gap: 2,
  },
  weaponEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  weaponEmptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  weaponSelectBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  weaponRequiredHint: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
});
