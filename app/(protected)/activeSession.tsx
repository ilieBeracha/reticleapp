/**
 * Active Session Screen
 *
 * Clean router that picks the right view based on session state.
 * All UI logic lives in the view components.
 *
 * View Selection:
 * 1. Loading        → Loading spinner
 * 2. Not found      → Error screen with exit
 * 3. Pending        → SessionPrepView (pre-session setup)
 * 4. Group mode     → GroupSessionView
 * 5. Squad mode     → SquadSessionView
 * 6. Watch states   → WatchFailedView, WatchStartingView, WatchPreviewView, WatchWaitingView
 * 7. Team training  → TeamTrainingView (focused, locked)
 * 8. Solo           → SoloSessionView (full features)
 */

import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { updateSession } from '@/services/session/mutations';
import { supabase } from '@/services/supabase';
import {
  getOrCreatePersonalProfile,
  getWeaponPickerData,
  getUserWeapons,
  markWeaponUsed,
  type TeamWeapon,
  type UserWeapon,
} from '@/services/weaponService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Crosshair, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DrillConfigSheet } from '@/components/session/activeSession/DrillConfigSheet';
import { GroupSessionView } from '@/components/session/activeSession/GroupSessionView';
import { SessionPrepView } from '@/components/session/activeSession/SessionPrepView';
import { SoloSessionView } from '@/components/session/activeSession/SoloSessionView';
import { SquadSessionView } from '@/components/session/activeSession/SquadSessionView';
import { TeamTrainingView } from '@/components/session/activeSession/TeamTrainingView';
import { styles } from '@/components/session/activeSession/activeSession.styles';
import { WatchFailedView } from '@/components/session/activeSession/watch/WatchFailedView';
import { WatchPreviewView } from '@/components/session/activeSession/watch/WatchPreviewView';
import { WatchStartingView } from '@/components/session/activeSession/watch/WatchStartingView';
import { WatchWaitingView } from '@/components/session/activeSession/watch/WatchWaitingView';
import { useActiveSession } from '@/hooks/session/useActiveSession';

export default function ActiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useTranslation();
  const {
    sessionId,
    engagementMode: routeEngagementMode,
    viewOnly,
  } = useLocalSearchParams<{
    sessionId: string;
    engagementMode?: 'solo' | 'squad' | 'group';
    viewOnly?: string;
  }>();

  const isViewOnly = viewOnly === 'true';

  const {
    session,
    targets,
    loading,
    refreshing,
    ending,
    elapsedTime,
    drill,
    hasDrill,
    drillProgress,
    watchState,
    isTeamTraining,
    handleRefresh,
    handleManualRoute,
    handleScanRoute,
    handleTargetPress,
    handleEndSession,
    handleClose,
    handleContinueWithoutWatch,
    handleRetryWatchConnection,
    canAddTarget,
    isSquadEngagement,
    participants,
    loadData,
  } = useActiveSession({ sessionId });

  const { weather, loading: weatherLoading, error: weatherError } = useOpenWeather();

  // Get current user ID for commander check
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Config sheet state
  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const handleOpenConfig = () => setShowConfigSheet(true);
  const handleCloseConfig = () => setShowConfigSheet(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // WEAPON SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  // For team training: show team weapons (assigned + pool)
  // For solo: show personal weapons
  const [weapons, setWeapons] = useState<UserWeapon[]>([]);
  const [teamWeaponsAssigned, setTeamWeaponsAssigned] = useState<TeamWeapon[]>([]);
  const [teamWeaponsPool, setTeamWeaponsPool] = useState<TeamWeapon[]>([]);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [changingWeapon, setChangingWeapon] = useState(false);
  const [teamWeaponsLoaded, setTeamWeaponsLoaded] = useState(false);
  // Track the current team_weapon_id for proper selection comparison
  const [currentTeamWeaponId, setCurrentTeamWeaponId] = useState<string | null>(null);

  // Load weapons when session is available
  // For team training: auto-select assigned weapon if no weapon is set
  useEffect(() => {
    if (!session?.id) return;

    const loadWeapons = async () => {
      try {
        if (isTeamTraining && session.team_id) {
          // Team training: load team weapons (assigned first, then pool)
          console.log('[ActiveSession] Loading team weapons for team:', session.team_id);
          const pickerData = await getWeaponPickerData({ teamId: session.team_id });
          console.log('[ActiveSession] Team weapons loaded:', {
            assignedToMe: pickerData.assignedToMe.length,
            poolWeapons: pickerData.poolWeapons.length,
            currentWeaponId: session.weapon_id,
          });
          setTeamWeaponsAssigned(pickerData.assignedToMe);
          setTeamWeaponsPool(pickerData.poolWeapons);
          setWeapons([]); // Clear personal weapons
          setTeamWeaponsLoaded(true);

          // Fetch current weapon's team_weapon_id for selection comparison
          let needsAutoSelect = !session.weapon_id;
          if (session.weapon_id) {
            const { data: currentWeapon } = await supabase
              .from('user_weapons')
              .select('team_weapon_id')
              .eq('id', session.weapon_id)
              .single();

            if (currentWeapon?.team_weapon_id) {
              // Current weapon is linked to a team weapon - valid
              setCurrentTeamWeaponId(currentWeapon.team_weapon_id);
            } else {
              // Current weapon is NOT a team weapon - need to clear and auto-select
              console.log('[ActiveSession] Current weapon is not a team weapon, will auto-select');
              setCurrentTeamWeaponId(null);
              needsAutoSelect = true;
            }
          } else {
            setCurrentTeamWeaponId(null);
          }

          // Auto-select assigned weapon if session has no weapon or wrong weapon type
          if (needsAutoSelect) {
            if (pickerData.assignedToMe.length > 0) {
              const assignedWeapon = pickerData.assignedToMe[0];
              try {
                // Create personal profile for the team weapon
                const personalProfile = await getOrCreatePersonalProfile(assignedWeapon.id);
                await updateSession(session.id, { weapon_id: personalProfile.id });
                setCurrentTeamWeaponId(assignedWeapon.id); // Track the team weapon id
                markWeaponUsed(personalProfile.id).catch(console.warn);
                await handleRefresh();
              } catch (err) {
                console.error('[ActiveSession] Failed to auto-select assigned weapon:', err);
              }
            } else if (session.weapon_id) {
              // No assigned weapons but session has wrong (personal) weapon - clear it
              console.log('[ActiveSession] Clearing invalid personal weapon from team session');
              try {
                await updateSession(session.id, { weapon_id: null });
                handleRefresh();
              } catch (err) {
                console.error('[ActiveSession] Failed to clear weapon:', err);
              }
            }
          }
        } else {
          // Solo: load personal weapons
          const userWeapons = await getUserWeapons();
          setWeapons(userWeapons);
          setTeamWeaponsAssigned([]);
          setTeamWeaponsPool([]);
          setTeamWeaponsLoaded(false);
          setCurrentTeamWeaponId(null);
        }
      } catch (err) {
        console.error('[ActiveSession] Failed to load weapons:', err);
      }
    };

    loadWeapons();
  }, [session?.id, session?.team_id, session?.weapon_id, isTeamTraining]);

  // For team training: no assigned weapon = cannot start session
  const hasNoAssignedWeapon = isTeamTraining && teamWeaponsLoaded && teamWeaponsAssigned.length === 0;

  const handleWeaponChange = useCallback(
    async (weaponId: string) => {
      // For team weapons, compare against currentTeamWeaponId
      const isAlreadySelected = isTeamTraining
        ? weaponId === currentTeamWeaponId
        : weaponId === session?.weapon_id;

      if (!session?.id || isAlreadySelected) {
        setShowWeaponPicker(false);
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setChangingWeapon(true);

      try {
        let userWeaponId = weaponId;

        // Check if this is a team weapon (needs personal profile for sessions.weapon_id FK)
        const isTeamWeaponSelected =
          teamWeaponsAssigned.some((tw) => tw.id === weaponId) ||
          teamWeaponsPool.some((tw) => tw.id === weaponId);

        if (isTeamWeaponSelected) {
          // Get or create a user_weapon linked to this team_weapon
          const personalProfile = await getOrCreatePersonalProfile(weaponId);
          userWeaponId = personalProfile.id;
          // Track the team weapon id for selection comparison
          setCurrentTeamWeaponId(weaponId);
        } else {
          setCurrentTeamWeaponId(null);
        }

        await updateSession(session.id, { weapon_id: userWeaponId });
        // Mark weapon as used (non-blocking)
        markWeaponUsed(userWeaponId).catch(console.warn);
        await handleRefresh();
      } catch (err) {
        console.error('[ActiveSession] Failed to change weapon:', err);
      } finally {
        setChangingWeapon(false);
        setShowWeaponPicker(false);
      }
    },
    [session?.id, session?.weapon_id, currentTeamWeaponId, isTeamTraining, handleRefresh, teamWeaponsAssigned, teamWeaponsPool]
  );

  const handleOpenWeaponPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWeaponPicker(true);
  }, []);

  // Distance selection handler for team training (when commander set a range)
  const handleDistanceSet = useCallback(
    async (distance: number) => {
      if (!session?.id) return;
      try {
        await updateSession(session.id, { soldier_distance_m: distance });
        await handleRefresh();
      } catch (err) {
        console.error('[ActiveSession] Failed to set distance:', err);
      }
    },
    [session?.id, handleRefresh]
  );

  const handleCloseWeaponPicker = useCallback(() => {
    setShowWeaponPicker(false);
  }, []);

  // Weapon picker modal JSX (inline to avoid component recreation)
  const weaponPickerModal = showWeaponPicker ? (
    <Modal
      visible={true}
      animationType="fade"
      transparent
      onRequestClose={handleCloseWeaponPicker}
    >
      <Pressable style={localStyles.pickerOverlay} onPress={handleCloseWeaponPicker}>
        <Pressable
          style={[localStyles.pickerSheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[localStyles.pickerHeader, { backgroundColor: colors.card }]}>
            <View style={[localStyles.pickerHandle, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={[localStyles.pickerCloseBtn, { backgroundColor: colors.secondary }]}
              onPress={handleCloseWeaponPicker}
            >
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={localStyles.pickerTitleRow}>
              <Crosshair size={16} color={colors.textMuted} />
              <Text style={[localStyles.pickerTitle, { color: colors.text }]}>
                {t('session.selectWeapon', 'Select Weapon')}
              </Text>
            </View>
          </View>

          <ScrollView
            style={localStyles.pickerScroll}
            contentContainerStyle={[localStyles.pickerContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            {isTeamTraining ? (
              // Team training: show assigned weapons first, then pool
              <>
                {teamWeaponsAssigned.length === 0 && teamWeaponsPool.length === 0 ? (
                  <View style={localStyles.emptyWeapons}>
                    <Text style={[localStyles.emptyWeaponsText, { color: colors.textMuted }]}>
                      {t('session.noTeamWeapons', 'No team weapons available')}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Assigned weapons section */}
                    {teamWeaponsAssigned.length > 0 && (
                      <>
                        <Text style={[localStyles.sectionLabel, { color: colors.textMuted }]}>
                          {t('session.assignedToYou', 'Assigned to you')}
                        </Text>
                        {teamWeaponsAssigned.map((weapon) => {
                          const isSelected = weapon.id === currentTeamWeaponId;
                          return (
                            <TouchableOpacity
                              key={weapon.id}
                              style={[
                                localStyles.weaponItem,
                                {
                                  backgroundColor: isSelected ? `${colors.primary}15` : colors.card,
                                  borderColor: isSelected ? colors.primary : colors.border,
                                },
                              ]}
                              onPress={() => handleWeaponChange(weapon.id)}
                              disabled={changingWeapon}
                            >
                              <View style={[localStyles.weaponIcon, { backgroundColor: `${colors.primary}12` }]}>
                                <Crosshair size={18} color={colors.primary} />
                              </View>
                              <View style={localStyles.weaponInfo}>
                                <Text
                                  style={[
                                    localStyles.weaponName,
                                    { color: isSelected ? colors.primary : colors.text },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {weapon.name}
                                </Text>
                                {weapon.caliber && (
                                  <Text style={[localStyles.weaponCaliber, { color: colors.textMuted }]}>
                                    {weapon.caliber}
                                  </Text>
                                )}
                              </View>
                              <View style={[localStyles.assignedBadge, { backgroundColor: `${colors.primary}15` }]}>
                                <Text style={[localStyles.assignedBadgeText, { color: colors.primary }]}>
                                  {t('session.assigned', 'Assigned')}
                                </Text>
                              </View>
                              {isSelected && <Check size={20} color={colors.primary} />}
                              {changingWeapon && weapon.id === currentTeamWeaponId && (
                                <ActivityIndicator size="small" color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </>
                    )}

                    {/* Pool weapons section */}
                    {teamWeaponsPool.length > 0 && (
                      <>
                        <Text style={[localStyles.sectionLabel, { color: colors.textMuted, marginTop: teamWeaponsAssigned.length > 0 ? 16 : 0 }]}>
                          {t('session.teamPool', 'Team Pool')}
                        </Text>
                        {teamWeaponsPool.map((weapon) => {
                          const isSelected = weapon.id === currentTeamWeaponId;
                          return (
                            <TouchableOpacity
                              key={weapon.id}
                              style={[
                                localStyles.weaponItem,
                                {
                                  backgroundColor: isSelected ? `${colors.primary}15` : colors.card,
                                  borderColor: isSelected ? colors.primary : colors.border,
                                },
                              ]}
                              onPress={() => handleWeaponChange(weapon.id)}
                              disabled={changingWeapon}
                            >
                              <View style={[localStyles.weaponIcon, { backgroundColor: colors.secondary }]}>
                                <Crosshair size={18} color={colors.textMuted} />
                              </View>
                              <View style={localStyles.weaponInfo}>
                                <Text
                                  style={[
                                    localStyles.weaponName,
                                    { color: isSelected ? colors.primary : colors.text },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {weapon.name}
                                </Text>
                                {weapon.caliber && (
                                  <Text style={[localStyles.weaponCaliber, { color: colors.textMuted }]}>
                                    {weapon.caliber}
                                  </Text>
                                )}
                              </View>
                              {isSelected && <Check size={20} color={colors.primary} />}
                              {changingWeapon && weapon.id === currentTeamWeaponId && (
                                <ActivityIndicator size="small" color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              // Solo: show personal weapons
              <>
                {weapons.length === 0 ? (
                  <View style={localStyles.emptyWeapons}>
                    <Text style={[localStyles.emptyWeaponsText, { color: colors.textMuted }]}>
                      {t('session.noWeapons', 'No weapons found')}
                    </Text>
                  </View>
                ) : (
                  weapons.map((weapon) => {
                    const isSelected = weapon.id === session?.weapon_id;
                    return (
                      <TouchableOpacity
                        key={weapon.id}
                        style={[
                          localStyles.weaponItem,
                          {
                            backgroundColor: isSelected ? `${colors.primary}15` : colors.card,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => handleWeaponChange(weapon.id)}
                        disabled={changingWeapon}
                      >
                        <View style={[localStyles.weaponIcon, { backgroundColor: `${colors.primary}12` }]}>
                          <Crosshair size={18} color={colors.primary} />
                        </View>
                        <View style={localStyles.weaponInfo}>
                          <Text
                            style={[
                              localStyles.weaponName,
                              { color: isSelected ? colors.primary : colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {weapon.name}
                          </Text>
                          {weapon.caliber && (
                            <Text style={[localStyles.weaponCaliber, { color: colors.textMuted }]}>
                              {weapon.caliber}
                            </Text>
                          )}
                        </View>
                        {isSelected && <Check size={20} color={colors.primary} />}
                        {changingWeapon && weapon.id === session?.weapon_id && (
                          <ActivityIndicator size="small" color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  ) : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOT FOUND / COMPLETED STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (!session || (session.status !== 'active' && session.status !== 'pending')) {
    const isCompleted = session?.status === 'completed';
    const hasTraining = !!session?.training_id;

    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'alert-circle'}
            size={48}
            color={isCompleted ? colors.green : colors.destructive}
          />
        </View>
        <Text style={[styles.statusTitle, { color: colors.text }]}>
          {isCompleted ? t('session.sessionComplete') : t('session.sessionNotFound')}
        </Text>

        <View style={localStyles.exitButtonsWrap}>
          {hasTraining && session?.training_id ? (
            <>
              <TouchableOpacity
                style={[localStyles.exitPrimaryBtn, { backgroundColor: colors.text }]}
                onPress={() =>
                  router.replace({
                    pathname: '/(protected)/trainingDetail',
                    params: { id: session.training_id },
                  })
                }
              >
                <Text style={[localStyles.exitPrimaryText, { color: colors.background }]}>
                  {t('session.returnToTraining')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.exitSecondaryBtn}
                onPress={() => router.replace('/(protected)/(tabs)')}
              >
                <Text style={[localStyles.exitSecondaryText, { color: colors.textMuted }]}>
                  {t('session.exitToHome')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: colors.secondary }]}
              onPress={() => router.replace('/(protected)/(tabs)')}
            >
              <Text style={[styles.statusButtonText, { color: colors.text }]}>{t('session.goHome')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PENDING STATE → SessionPrepView
  // ═══════════════════════════════════════════════════════════════════════════

  // Drill config is always locked - soldiers can only change weapon
  if (session.status === 'pending') {
    return (
      <SessionPrepView
        session={session}
        insets={insets}
        onSessionActivated={() => handleRefresh()}
        onBack={undefined}
        onClose={handleClose}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SQUAD/GROUP MODE
  // ═══════════════════════════════════════════════════════════════════════════

  const actualEngagementMode = session?.engagement?.engagement_mode || routeEngagementMode;
  const isGroupEngagement = actualEngagementMode === 'group';
  const isCommander = currentUserId === session.user_id;

  if (isGroupEngagement) {
    return (
      <GroupSessionView
        sessionId={sessionId}
        engagementId={session.engagement?.id || ''}
        session={{
          id: session.id,
          user_id: session.user_id,
          drill_name: session.drill_name,
          drill_config: session.drill_config as any,
          training_id: session.training_id,
        }}
        participants={participants}
        isCommander={isCommander && !isViewOnly}
        isViewOnly={isViewOnly}
        onRefresh={loadData}
        onEndSession={handleEndSession}
      />
    );
  }

  if (isSquadEngagement) {
    return (
      <SquadSessionView
        sessionId={sessionId}
        engagementId={session.engagement?.id || ''}
        session={{
          id: session.id,
          user_id: session.user_id,
          drill_name: session.drill_name,
          drill_config: session.drill_config as any,
          training_id: session.training_id,
        }}
        participants={participants}
        targets={targets}
        isCommander={isCommander && !isViewOnly}
        isViewOnly={isViewOnly}
        onRefresh={loadData}
        onEndSession={handleEndSession}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WATCH STATES
  // ═══════════════════════════════════════════════════════════════════════════

  const drillName = session.drill_name || session.training_title || 'Practice Session';

  if (watchState.isWatchControlled) {
    if (watchState.watchStartFailed) {
      return (
        <WatchFailedView
          insets={insets}
          drillName={drillName}
          watchStarting={watchState.watchStarting}
          onClose={handleClose}
          onRetry={handleRetryWatchConnection}
          onContinueWithoutWatch={handleContinueWithoutWatch}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    if (watchState.watchStarting) {
      return (
        <WatchStartingView
          insets={insets}
          drillName={drillName}
          onClose={handleClose}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    if (watchState.watchAppNotOpen) {
      return (
        <WatchPreviewView
          insets={insets}
          drillName={drillName}
          drill={drill}
          isWatchConnected={false}
          watchAppNotOpen={true}
          ending={ending}
          onClose={handleClose}
          onContinueWithoutWatch={handleContinueWithoutWatch}
          weaponName={session.weapon_name}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    if (watchState.watchPreviewQueued) {
      return (
        <WatchPreviewView
          insets={insets}
          drillName={drillName}
          drill={drill}
          isWatchConnected={watchState.watchActivelyControlling}
          watchAppNotOpen={false}
          ending={ending}
          onClose={handleClose}
          onContinueWithoutWatch={handleContinueWithoutWatch}
          weaponName={session.weapon_name}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    return (
      <WatchWaitingView
        insets={insets}
        session={session}
        drillName={drillName}
        drill={drill}
        isWatchConnected={watchState.watchActivelyControlling}
        ending={ending}
        onClose={handleClose}
        onEndSession={handleEndSession}
        isTeamTraining={isTeamTraining}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM TRAINING MODE
  // ═══════════════════════════════════════════════════════════════════════════

  if (isTeamTraining) {
    // Block session if no assigned weapon
    if (hasNoAssignedWeapon) {
      return (
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <View style={[localStyles.noWeaponCard, { backgroundColor: colors.card }]}>
            <View style={[localStyles.noWeaponIcon, { backgroundColor: `${colors.orange}15` }]}>
              <Ionicons name="alert-circle" size={32} color={colors.orange} />
            </View>
            <Text style={[localStyles.noWeaponTitle, { color: colors.text }]}>
              {t('session.noAssignedWeapon', 'No Weapon Assigned')}
            </Text>
            <Text style={[localStyles.noWeaponText, { color: colors.textMuted }]}>
              {t('session.noAssignedWeaponDesc', 'You need an assigned weapon to participate in team training. Contact your commander to get a weapon assigned.')}
            </Text>
            <TouchableOpacity
              style={[localStyles.noWeaponBtn, { backgroundColor: colors.secondary }]}
              onPress={handleClose}
            >
              <Text style={[localStyles.noWeaponBtnText, { color: colors.text }]}>
                {t('common.goBack', 'Go Back')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <>
        <TeamTrainingView
          session={session}
          targets={targets}
          insets={insets}
          elapsedTime={elapsedTime}
          drill={drill}
          drillProgress={drillProgress}
          watchState={watchState}
          canAddTarget={canAddTarget}
          onScanRoute={handleScanRoute}
          onTargetPress={handleTargetPress}
          onEndSession={handleEndSession}
          onRefresh={handleRefresh}
          ending={ending}
          onWeaponPress={teamWeaponsAssigned.length > 0 ? handleOpenWeaponPicker : undefined}
          onDistanceSet={handleDistanceSet}
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
        />
        {weaponPickerModal}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLO SESSION (default)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <SoloSessionView
        session={session}
        targets={targets}
        insets={insets}
        elapsedTime={elapsedTime}
        drill={drill}
        hasDrill={hasDrill}
        drillProgress={drillProgress}
        watchState={watchState}
        canAddTarget={canAddTarget}
        refreshing={refreshing}
        ending={ending}
        weather={weather}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        isConfigEditable={false}
        onRefresh={handleRefresh}
        onScanRoute={handleScanRoute}
        onManualRoute={handleManualRoute}
        onTargetPress={handleTargetPress}
        onEndSession={handleEndSession}
        onClose={handleClose}
        onOpenConfig={handleOpenConfig}
      />
      {showConfigSheet && (
        <DrillConfigSheet
          visible={showConfigSheet}
          onClose={handleCloseConfig}
          session={session}
          drill={drill}
          onSessionUpdated={handleRefresh}
        />
      )}
    </>
  );
}

const localStyles = StyleSheet.create({
  exitButtonsWrap: {
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 32,
    gap: 12,
  },
  exitPrimaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
  },
  exitPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exitSecondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  exitSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Weapon picker modal styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  pickerCloseBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  pickerScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  pickerContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  emptyWeapons: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyWeaponsText: {
    fontSize: 14,
  },
  weaponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  weaponCaliber: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  assignedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  assignedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // No assigned weapon blocking view
  noWeaponCard: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  noWeaponIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noWeaponTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  noWeaponText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  noWeaponBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  noWeaponBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
