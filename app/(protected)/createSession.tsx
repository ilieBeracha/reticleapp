/**
 * CREATE SESSION - 2-Step Flow
 *
 * 1. Intent - What's my goal? (grouping/engagement)
 * 2. Details - Session configuration (weapon, distance, bullets)
 *
 * Weapon selection is a sheet within the Details step, not a separate step.
 * If user has no weapons, they can create one from the weapon picker.
 */

import {
  SessionContextStep,
  SessionIntentStep,
  useSessionCreation,
} from '@/components/session/creation';
import type { Position, SessionPurpose } from '@/components/session/creation/sessionCreation.types';
import { DrillPresetPicker, PresetForm } from '@/components/shared/drills';
import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import type { DrillPreset } from '@/services/presetService';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession, deleteSession, getMyActiveSession } from '@/services/sessionService';
import { type UserWeapon } from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, CornerDownRight, Crosshair, Plus, Target } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
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

export default function CreateSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  
  // Fetch weather in background (non-blocking)
  const { weather: openWeather } = useOpenWeather({ autoFetch: true });
  
  const params = useLocalSearchParams<{
    editSessionId?: string;
    weaponId?: string;
    weaponName?: string;
    purpose?: string;
    distance?: string;
    shots?: string;
    timeLimit?: string;
    position?: string;
    targetType?: string;
    returnTo?: string;
    returnId?: string;
  }>();
  
  const isEditMode = !!params.editSessionId;
  const hasReturnDestination = !!params.returnTo;
  
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DrillPreset | null>(null);

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
    return undefined;
  }, [isEditMode, params]);

  const creation = useSessionCreation({
    onSubmit: handleSubmit,
    initialState,
  });

  // Check for active session
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

  async function handleSubmit(config: BaseSessionConfig) {
    try {
      // Attach weather data if available
      const sessionWeather = toSessionWeatherData(openWeather, 'openweathermap');
      
      const finalConfig: BaseSessionConfig = {
        ...config,
        weather: sessionWeather,
      };
      
      const session = await createSession(finalConfig);
      await loadSessions();
      
      // Navigate to activeSession with return info
      router.replace({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId: session.id,
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

  const handlePurposeSelect = useCallback((purpose: SessionPurpose) => {
    creation.setPurpose(purpose);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      creation.goForward();
    }, 150);
  }, [creation]);

  const handlePresetSelect = useCallback((preset: DrillPreset) => {
    setSelectedPreset(preset);
    setShowPresetPicker(false);
    
    const purposeMap: Record<string, 'grouping' | 'engagement'> = {
      grouping: 'grouping',
      engagement: 'engagement',
    };
    const purpose = purposeMap[preset.drill_goal] || 'engagement';
    
    creation.setPurpose(purpose);
    creation.updateContext({
      distance: preset.distance_m,
      shotsPlanned: preset.rounds_per_shooter,
      timeLimit: preset.time_limit_seconds || null,
    });
    
    creation.selectPreset(preset.id);
    creation.goForward();
  }, [creation]);

  const handleCreateNewPreset = useCallback(() => {
    setShowPresetPicker(false);
    setShowPresetForm(true);
  }, []);

  const handlePresetCreated = useCallback((newPreset: DrillPreset) => {
    setShowPresetForm(false);
    handlePresetSelect(newPreset);
  }, [handlePresetSelect]);

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
    setShowCreateWeapon(true);
  }, []);

  const handleWeaponCreatedById = useCallback(async (weaponId: string) => {
    setShowCreateWeapon(false);
    try {
      const { getUserWeapon } = await import('@/services/weaponService');
      const weapon = await getUserWeapon(weaponId);
      if (weapon) {
        handleWeaponSelect(weapon);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('[CreateSession] Failed to fetch created weapon:', error);
    }
  }, [handleWeaponSelect]);

  if (checkingSession) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.textMuted} size="large" />
      </View>
    );
  }

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

  const effectiveStep = creation.state.step === 'intent' ? 1 : 2;
  const stepLabels = ['Goal', 'Details'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.card }]}
            onPress={effectiveStep > 1 ? creation.goBack : () => router.back()}
            activeOpacity={0.7}
          >
            {effectiveStep > 1 ? (
              <ChevronLeft size={18} color={colors.text} />
            ) : (
              <Ionicons name="close" size={18} color={colors.text} />
            )}
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Session</Text>
            <Text style={[styles.headerStep, { color: colors.textMuted }]}>
              Step {effectiveStep} of 2
            </Text>
          </View>

          <View style={styles.headerButtonPlaceholder} />
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {stepLabels.map((label, idx) => {
            const isActive = effectiveStep === idx + 1;
            const isComplete = effectiveStep > idx + 1;
            return (
              <View key={label} style={styles.progressStep}>
                <View 
                  style={[
                    styles.progressDot,
                    { 
                      backgroundColor: isActive || isComplete ? colors.primary : colors.border,
                    },
                    isActive && styles.progressDotActive,
                  ]} 
                />
                <Text
                  style={[
                    styles.progressLabel,
                    { 
                      color: isActive ? colors.text : colors.textMuted,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
          <View style={[styles.progressLine, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressLineFill, 
                { 
                  backgroundColor: colors.primary,
                  width: effectiveStep > 1 ? '100%' : '0%',
                }
              ]} 
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

      {creation.state.step === 'intent' && (
        <SessionIntentStep
          selectedPurpose={creation.state.purpose}
          onSelectPurpose={handlePurposeSelect}
          onUseSavedDrill={handleUseSavedDrill}
        />
      )}

      {creation.state.step === 'context' && (
        <>
          <View style={styles.step2Header}>
            <Text style={[styles.step2Title, { color: colors.text }]}>
              Session details
            </Text>
          </View>

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

          <SessionContextStep
            purpose={creation.state.purpose!}
            context={creation.state.context}
            onUpdateContext={creation.updateContext}
            onBack={creation.goBack}
            weaponCategory={selectedPreset?.weapon_category as any}
            selectedDrillId={creation.state.selectedDrillId}
            onDrillChange={creation.setDrill}
            hideWeaponSection
          />
        </>
      )}

      </ScrollView>

      {/* Fixed Bottom Button */}
      {isLastStep && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          <View style={[styles.bottomBarInner, { borderTopColor: colors.border }]}>
            {!hasWeapon && (
              <Text style={[styles.weaponRequiredHint, { color: colors.orange }]}>
                Select a weapon to continue
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                { 
                  backgroundColor: canContinue ? colors.primary : colors.secondary,
                  opacity: canContinue ? 1 : 0.5,
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
                  <Text style={styles.buttonText}>
                    Start Session
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

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
            setShowWeaponPicker(true);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header Container (fixed at top)
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPlaceholder: {
    width: 36,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerStep: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  
  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingHorizontal: 20,
  },
  progressStep: {
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  progressLine: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 5,
    height: 2,
    borderRadius: 1,
  },
  progressLineFill: {
    height: '100%',
    borderRadius: 1,
  },
  
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  // Step 2 header
  step2Header: {
    marginBottom: 20,
    paddingTop: 4,
  },
  step2Title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Weapon section
  weaponSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  weaponIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponInfo: {
    flex: 1,
    gap: 2,
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  weaponHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  weaponLoadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Weapon empty state
  weaponEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 10,
  },
  weaponEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponEmptyContent: {
    flex: 1,
    gap: 2,
  },
  weaponEmptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  weaponEmptySubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  weaponSelectBtn: {
    width: 30,
    height: 30,
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
  
  // Bottom Bar (fixed)
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  bottomBarInner: {
    paddingTop: 12,
    borderTopWidth: 1,
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
    color: '#fff',
    letterSpacing: -0.2,
  },
  weaponRequiredHint: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
});
