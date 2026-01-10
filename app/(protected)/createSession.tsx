/**
 * CREATE SESSION - 2-Step Flow
 *
 * 1. Intent - What's my goal? (grouping/engagement)
 * 2. Details - Session configuration (weapon, distance, bullets)
 *
 * Weapon selection is a sheet within the Details step, not a separate step.
 * If user has no weapons, they can create one from the weapon picker.
 * 
 * Supports training context - when coming from trainingDetail with drillId,
 * the flow is simplified and prefilled with drill parameters.
 */

import { DrillPresetPicker, PresetForm } from '@/components/shared/drills';
import {
    SessionContextStep,
    SessionIntentStep,
    useSessionCreation,
} from '@/components/session/creation';
import type { Position, SessionPurpose, TargetType } from '@/components/session/creation/sessionCreation.types';
import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { supabase } from '@/lib/supabase';
import type { DrillPreset } from '@/services/presetService';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession, deleteSession, getMyActiveSession } from '@/services/sessionService';
import { getAssignedWeapons, getOrCreatePersonalProfile, type UserWeapon } from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, CornerDownRight, Crosshair, Plus, Target, Users } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
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
  
  // Parse all params - supports edit mode AND training context
  const params = useLocalSearchParams<{
    // Edit mode params
    editSessionId?: string;
    weaponId?: string;
    weaponName?: string;
    // Training context params (from trainingDetail)
    trainingId?: string;
    drillId?: string;
    teamId?: string;
    drillName?: string;
    // Shared params
    purpose?: string;
    distance?: string;
    shots?: string;
    timeLimit?: string;
    position?: string;
    targetType?: string;
    // Return navigation
    returnTo?: string;
    returnId?: string;
  }>();
  
  const isEditMode = !!params.editSessionId;
  const isTrainingContext = !!params.trainingId && !!params.drillId;
  const hasReturnDestination = !!params.returnTo;
  
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DrillPreset | null>(null);
  const [loadingTeamWeapon, setLoadingTeamWeapon] = useState(isTrainingContext);

  // Build initial state from params
  const initialState = useMemo(() => {
    if (isEditMode) {
      return {
        step: 'context' as const,
        purpose: (params.purpose as SessionPurpose) || 'grouping',
        context: {
          weaponId: params.weaponId || null,
          weaponName: params.weaponName || null,
          distance: params.distance ? parseInt(params.distance, 10) : 25,
          shotsPlanned: params.shots ? parseInt(params.shots, 10) : 5,
        },
      };
    }
    
    if (isTrainingContext) {
      // Coming from training - skip intent, go straight to context with prefilled values
      return {
        step: 'context' as const,
        purpose: (params.purpose as SessionPurpose) || 'grouping',
        context: {
          weaponId: null, // Will be loaded from team assignment
          weaponName: null,
          distance: params.distance ? parseInt(params.distance, 10) : 25,
          shotsPlanned: params.shots ? parseInt(params.shots, 10) : 5,
          timeLimit: params.timeLimit ? parseInt(params.timeLimit, 10) : null,
          position: (params.position as Position) || 'any',
          targetType: (params.targetType as TargetType) || 'paper',
        },
      };
    }
    
    return undefined;
  }, [isEditMode, isTrainingContext, params]);

  const creation = useSessionCreation({
    onSubmit: handleSubmit,
    initialState,
    // Pass training context for session creation
    trainingContext: isTrainingContext ? {
      trainingId: params.trainingId!,
      drillId: params.drillId!,
      teamId: params.teamId || null,
      drillName: params.drillName || 'Training Drill',
    } : undefined,
  });

  // Auto-load assigned weapon for team training
  useEffect(() => {
    if (!isTrainingContext || !params.teamId) {
      setLoadingTeamWeapon(false);
      return;
    }

    let cancelled = false;

    async function loadTeamWeapon() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setLoadingTeamWeapon(false);
          return;
        }

        const assignedWeapons = await getAssignedWeapons(params.teamId!, user.id);
        if (cancelled) return;

        if (assignedWeapons.length > 0) {
          const personalProfile = await getOrCreatePersonalProfile(assignedWeapons[0].id);
          if (cancelled) return;

          creation.updateContext({
            weaponId: personalProfile.id,
            weaponName: personalProfile.name,
          });
          console.log('[CreateSession] Auto-selected team weapon:', personalProfile.name);
        }
      } catch (error) {
        console.error('[CreateSession] Failed to load team weapon:', error);
      } finally {
        if (!cancelled) setLoadingTeamWeapon(false);
      }
    }

    loadTeamWeapon();

    return () => {
      cancelled = true;
    };
  }, [isTrainingContext, params.teamId]);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-START FOR TEAM TRAINING
  // When coming from a team training and weapon is loaded, auto-submit
  // ─────────────────────────────────────────────────────────────────────────
  
  const [autoStartTriggered, setAutoStartTriggered] = useState(false);
  
  useEffect(() => {
    // Only auto-start for team training context
    if (!isTrainingContext) return;
    // Don't auto-start twice
    if (autoStartTriggered) return;
    // Wait for weapon to load
    if (loadingTeamWeapon) return;
    // Wait for active session check to complete
    if (checkingSession) return;
    // Must have a weapon
    const hasWeapon = creation.state.context.weaponId !== null;
    if (!hasWeapon) return;
    // Don't auto-start if already submitting
    if (creation.state.isSubmitting) return;
    
    console.log('[CreateSession] Auto-starting team training drill...');
    setAutoStartTriggered(true);
    
    // Submit immediately - no delay needed since we show loading state
    creation.submit();
  }, [isTrainingContext, loadingTeamWeapon, checkingSession, creation.state.context.weaponId, creation.state.isSubmitting, autoStartTriggered, creation]);

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
      
      // Build final config with training context if applicable
      const finalConfig: BaseSessionConfig = {
        ...config,
        weather: sessionWeather,
        // Add training context if coming from training
        ...(isTrainingContext && {
          team_id: params.teamId || null,
          training_id: params.trainingId,
          drill_id: params.drillId,
        }),
      };

      // Update drill_config name if we have a drill name from training
      if (isTrainingContext && params.drillName && finalConfig.drill_config) {
        finalConfig.drill_config = {
          ...finalConfig.drill_config,
          name: params.drillName,
        };
      }
      
      if (sessionWeather) {
        console.log('[CreateSession] Weather attached:', {
          temp: sessionWeather.temperature_c,
          condition: sessionWeather.condition,
          wind: sessionWeather.wind_speed_mps,
        });
      }
      
      const session = await createSession(finalConfig);
      console.log('[CreateSession] Created session:', {
        id: session.id,
        weapon_id: session.weapon_id,
        weapon_name: session.weapon_name,
        has_weather: !!session.weather,
        training_id: session.training_id,
        drill_id: session.drill_id,
      });
      await loadSessions();
      
      // Navigate to activeSession with return info
      router.replace({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId: session.id,
          // Pass return destination so session end can navigate back
          ...(hasReturnDestination && {
            returnTo: params.returnTo,
            returnId: params.returnId,
          }),
        },
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

  // For team training: stay in loading until we're done auto-starting
  // The key insight is: once loadingTeamWeapon is false AND we have a weapon,
  // we WILL auto-start, so we should stay in loading state
  const hasWeaponForAutoStart = creation.state.context.weaponId !== null;
  const willAutoStart = isTrainingContext && !loadingTeamWeapon && !checkingSession && hasWeaponForAutoStart;
  const isAutoStarting = isTrainingContext && (
    loadingTeamWeapon ||  // Still loading weapon
    autoStartTriggered || // Already triggered auto-start
    willAutoStart         // About to trigger auto-start (covers the gap!)
  );
  
  if (checkingSession || isAutoStarting) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.textMuted} size="large" />
        {isAutoStarting && (
          <Text style={[styles.loadingText, { color: colors.textMuted, marginTop: 16 }]}>
            Starting drill...
          </Text>
        )}
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

  // For training context, we skip the intent step
  const effectiveStep = isTrainingContext ? 2 : (creation.state.step === 'intent' ? 1 : 2);
  const stepLabels = isTrainingContext ? ['Training', 'Configure'] : ['Goal', 'Details'];
  const headerTitle = isTrainingContext ? 'Start Drill' : 'New Session';

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
          onPress={effectiveStep > 1 && !isTrainingContext ? creation.goBack : () => router.back()}
          activeOpacity={0.7}
        >
          {effectiveStep > 1 && !isTrainingContext ? (
            <ChevronLeft size={20} color={colors.text} />
          ) : (
            <Ionicons name="close" size={20} color={colors.text} />
          )}
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>

        <View style={styles.headerButtonPlaceholder} />
      </View>

      {/* Training Context Banner */}
      {isTrainingContext && params.drillName && (
        <Animated.View entering={FadeInDown.duration(200)} style={[styles.trainingBanner, { backgroundColor: colors.card }]}>
          <View style={[styles.trainingIconWrap, { backgroundColor: colors.primary + '15' }]}>
            <Users size={18} color={colors.primary} />
          </View>
          <View style={styles.trainingInfo}>
            <Text style={[styles.trainingLabel, { color: colors.textMuted }]}>Training Drill</Text>
            <Text style={[styles.trainingName, { color: colors.text }]} numberOfLines={1}>
              {params.drillName}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Step Progress Bar - only show for non-training context */}
      {!isTrainingContext && (
        <View style={styles.progressBar}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: colors.primary,
                  width: `${(effectiveStep / 2) * 100}%`,
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
                    color: effectiveStep > idx ? colors.text : colors.textMuted,
                    fontWeight: effectiveStep === idx + 1 ? '600' : '400',
                  },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Step Content */}
      {creation.state.step === 'intent' && !isTrainingContext && (
        <SessionIntentStep
          selectedPurpose={creation.state.purpose}
          onSelectPurpose={handlePurposeSelect}
          onUseSavedDrill={handleUseSavedDrill}
        />
      )}

      {(creation.state.step === 'context' || isTrainingContext) && (
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

      {/* Start Button - show on step 2 or training context */}
      {(isLastStep || isTrainingContext) && (
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
            disabled={!canContinue || creation.state.isSubmitting || loadingTeamWeapon}
            activeOpacity={0.85}
          >
            {creation.state.isSubmitting || loadingTeamWeapon ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CornerDownRight size={18} color="#fff" fill="#fff" />
                <Text style={styles.buttonText}>
                  {isTrainingContext ? 'Start Drill' : 'Preview Session'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          {!hasWeapon && !loadingTeamWeapon && (
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
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
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
  
  // Training context banner
  trainingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    gap: 12,
  },
  trainingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingInfo: {
    flex: 1,
  },
  trainingLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  trainingName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});
