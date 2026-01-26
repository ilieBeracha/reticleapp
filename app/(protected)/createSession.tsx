/**
 * CREATE SESSION - Single Page
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * All configuration in one view: purpose toggle, weapon, drill details.
 * Presets available via header bookmark icon.
 */

import { CaptureModePickerInline, type CaptureMode } from '@/components/session/CaptureModePicker';
import {
  EngagementModeToggle,
  SessionContextStep,
  useSessionCreation,
} from '@/components/session/creation';
import type { Position, SessionPurpose } from '@/components/session/creation/sessionCreation.types';
import { DrillPresetPicker, PresetForm } from '@/components/shared/drills';
import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { usePermissions } from '@/hooks/usePermissions';
import type { DrillPreset } from '@/services/presetService';
import { createEngagement } from '@/services/session/participants';
import type { BaseSessionConfig, EngagementMode } from '@/services/session/types';
import { createSession, deleteSession, getMyActiveSession } from '@/services/sessionService';
import { type UserWeapon } from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, CornerDownRight, Crosshair, Plus, Target } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  const { canManageTraining } = usePermissions();

  // Fetch weather in background (non-blocking)
  const { weather: openWeather } = useOpenWeather({ autoFetch: true });
  
  // Squad mode state
  const [engagementMode, setEngagementMode] = useState<EngagementMode>('solo');

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
    // Team context - when passed, this is a team session
    teamId?: string;
    trainingId?: string;
  }>();

  const isEditMode = !!params.editSessionId;
  const hasReturnDestination = !!params.returnTo;
  
  // Team context from params (NOT from store - explicit is better)
  const teamId = params.teamId || null;
  const trainingId = params.trainingId || null;
  const isTeamSession = !!teamId;

  const [checkingSession, setCheckingSession] = useState(true);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DrillPreset | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('phone');
  const [sensitivity, setSensitivity] = useState(3.5); // Default: 3.5 (standard)

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
    const isSquadMode = engagementMode === 'squad';
    
    try {
      // Attach weather data and capture mode
      const sessionWeather = toSessionWeatherData(openWeather, 'openweathermap');
      const isWatchMode = captureMode === 'watch';

      const finalConfig: BaseSessionConfig = {
        ...config,
        weather: sessionWeather,
        watch_controlled: isWatchMode,
        // Include team and training if this is a team session
        team_id: teamId,
        training_id: trainingId,
        // Include sensitivity in drill config when using watch
        drill_config: config.drill_config
          ? {
              ...config.drill_config,
              ...(isWatchMode && { detection_sensitivity: sensitivity }),
            }
          : null,
      };

      // Step 1: Create session
      const session = await createSession(finalConfig);
      
      // Step 2: Create engagement
      // Squad engagements start as 'pending' (waiting for participants)
      // Solo engagements start as 'active' (ready to go)
      const engagement = await createEngagement({
        sessionId: session.id,
        engagementMode,
        status: isSquadMode ? 'pending' : 'active',
      });

      await loadSessions();

      // Navigate based on mode:
      // - Squad mode: back to training detail (commander invites from there)
      // - Solo mode: directly to active session
      if (isSquadMode && trainingId) {
        // Squad engagement created - go back to training where commander can invite
        router.replace({
          pathname: '/(protected)/trainingDetail',
          params: { id: trainingId },
        });
      } else {
        router.replace({
          pathname: '/(protected)/activeSession',
          params: {
            sessionId: session.id,
            engagementId: engagement.id,
            ...(hasReturnDestination && {
              returnTo: params.returnTo,
              returnId: params.returnId,
            }),
          },
        });
      }
    } catch (error: any) {
      console.error('[CreateSession] Failed:', error);
      Alert.alert('Error', error.message || 'Failed to start session');
    }
  }

  const handleModeChange = useCallback((mode: EngagementMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEngagementMode(mode);
  }, []);

  const handleStartPress = useCallback(() => {
    creation.submit();
  }, [creation]);

  const handleUseSavedDrill = useCallback(() => {
    setShowPresetPicker(true);
  }, []);

  const handlePurposeSelect = useCallback(
    (purpose: SessionPurpose) => {
      creation.setPurpose(purpose);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        creation.goForward();
      }, 150);
    },
    [creation]
  );

  const handlePresetSelect = useCallback(
    (preset: DrillPreset) => {
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
    },
    [creation]
  );

  const handleCreateNewPreset = useCallback(() => {
    setShowPresetPicker(false);
    setShowPresetForm(true);
  }, []);

  const handlePresetCreated = useCallback(
    (newPreset: DrillPreset) => {
      setShowPresetForm(false);
      handlePresetSelect(newPreset);
    },
    [handlePresetSelect]
  );

  const handleOpenWeaponPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWeaponPicker(true);
  }, []);

  const handleWeaponSelect = useCallback(
    (weapon: UserWeapon) => {
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
    },
    [creation]
  );

  const handleAddNewWeapon = useCallback(() => {
    setShowWeaponPicker(false);
    setShowCreateWeapon(true);
  }, []);

  const handleWeaponCreatedById = useCallback(
    async (weaponId: string) => {
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
    },
    [handleWeaponSelect]
  );

  if (checkingSession) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.textMuted} size="large" />
      </View>
    );
  }

  const hasWeapon = creation.state.context.weaponId !== null;
  const isEngagementPurpose = creation.state.purpose === 'engagement';
  // Squad toggle only shows for team sessions + engagement + commander permissions
  const showSquadToggle = isTeamSession && isEngagementPurpose && canManageTraining;
  const isSquadMode = engagementMode === 'squad';
  
  const canStart =
    creation.state.purpose !== null &&
    hasWeapon &&
    creation.state.context.distance > 0 &&
    creation.state.context.shotsPlanned > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isTeamSession ? 'Team Session' : 'New Session'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.card }]}
            onPress={handleUseSavedDrill}
            activeOpacity={0.7}
          >
            <Ionicons name="bookmark-outline" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Purpose toggle - inline */}
        <View style={styles.purposeRow}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Goal</Text>
          <View style={[styles.purposeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.purposeOption,
                creation.state.purpose === 'grouping' && [
                  styles.purposeOptionActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => handlePurposeSelect('grouping')}
              activeOpacity={0.7}
            >
              <Crosshair size={16} color={creation.state.purpose === 'grouping' ? '#fff' : colors.textMuted} />
              <Text
                style={[styles.purposeText, { color: creation.state.purpose === 'grouping' ? '#fff' : colors.text }]}
              >
                Grouping
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.purposeOption,
                creation.state.purpose === 'engagement' && [
                  styles.purposeOptionActive,
                  { backgroundColor: colors.orange },
                ],
              ]}
              onPress={() => handlePurposeSelect('engagement')}
              activeOpacity={0.7}
            >
              <Target size={16} color={creation.state.purpose === 'engagement' ? '#fff' : colors.textMuted} />
              <Text
                style={[styles.purposeText, { color: creation.state.purpose === 'engagement' ? '#fff' : colors.text }]}
              >
                Engagement
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weapon selector */}
        <View style={styles.weaponSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Weapon</Text>
          {creation.isLoadingWeapon ? (
            <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>Loading your weapon...</Text>
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
                <Text style={[styles.weaponHint, { color: colors.textMuted }]}>Tap to change</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.weaponEmptyCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
              onPress={handleOpenWeaponPicker}
              activeOpacity={0.7}
            >
              <View style={[styles.weaponEmptyIcon, { backgroundColor: `${colors.primary}10` }]}>
                <Target size={24} color={colors.primary} strokeWidth={1.5} />
              </View>
              <View style={styles.weaponEmptyContent}>
                <Text style={[styles.weaponEmptyTitle, { color: colors.text }]}>Select a weapon</Text>
                <Text style={[styles.weaponEmptySubtitle, { color: colors.textMuted }]}>Required to start</Text>
              </View>
              <View style={[styles.weaponSelectBtn, { backgroundColor: colors.primary }]}>
                <Plus size={16} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Squad Mode Toggle - only for engagement with active team */}
        {showSquadToggle && (
          <View style={styles.squadSection}>
            <EngagementModeToggle
              value={engagementMode}
              onChange={handleModeChange}
              disabled={!hasWeapon}
            />
          </View>
        )}

        {/* Squad mode hint */}
        {isSquadMode && (
          <View style={[styles.squadHint, { backgroundColor: colors.card }]}>
            <Text style={[styles.squadHintText, { color: colors.textMuted }]}>
              Squad engagement will be created. Invite participants from the training screen.
            </Text>
          </View>
        )}

        {/* Drill details (always visible) */}
        {creation.state.purpose && (
          <SessionContextStep
            purpose={creation.state.purpose}
            context={creation.state.context}
            onUpdateContext={creation.updateContext}
            onBack={() => {}}
            weaponCategory={selectedPreset?.weapon_category as any}
            selectedDrillId={creation.state.selectedDrillId}
            onDrillChange={creation.setDrill}
            hideWeaponSection
          />
        )}

        {/* Capture Mode - only show when watch is connected */}
        {creation.isWatchConnected && creation.state.purpose && (
          <View style={styles.captureModeSection}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Recording</Text>
            <CaptureModePickerInline
              selectedMode={captureMode}
              onModeChange={setCaptureMode}
              sensitivity={sensitivity}
              onSensitivityChange={setSensitivity}
              showSensitivity={true}
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Button - always visible */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <View style={[styles.bottomBarInner, { borderTopColor: colors.border }]}>
          {!hasWeapon && creation.state.purpose && (
            <Text style={[styles.weaponRequiredHint, { color: colors.orange }]}>Select a weapon to continue</Text>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: canStart ? colors.primary : colors.secondary,
                opacity: canStart ? 1 : 0.5,
              },
            ]}
            onPress={handleStartPress}
            disabled={!canStart || creation.state.isSubmitting}
            activeOpacity={0.85}
          >
            {creation.state.isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CornerDownRight size={18} color="#fff" fill="#fff" />
                <Text style={styles.buttonText}>
                  {isSquadMode ? 'Create Squad Session' : 'Start Session'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

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

  // Header
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Purpose toggle
  purposeRow: {
    marginBottom: 24,
  },
  purposeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  purposeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9,
  },
  purposeOptionActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  purposeText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Weapon section
  weaponSection: {
    marginBottom: 20,
  },
  // Squad section
  squadSection: {
    marginBottom: 16,
  },
  squadHint: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  squadHintText: {
    fontSize: 13,
    textAlign: 'center',
  },
  // Capture mode section
  captureModeSection: {
    marginTop: 8,
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

  // Bottom Bar
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
