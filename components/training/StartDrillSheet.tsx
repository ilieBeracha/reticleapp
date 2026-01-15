import { WeaponPicker, CreateWeaponFlow, PolicyExplainer } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import {
  isAssignedPolicy,
  isCatalogPolicy,
  isPersonalPolicy,
  type WeaponPolicy,
} from '@/constants/weaponPolicy';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { supabase } from '@/lib/supabase';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession } from '@/services/sessionService';
import { getMyRoleInTeam, getTeamWeaponPolicy } from '@/services/teamService';
import {
  getAssignedWeapons,
  getOrCreatePersonalProfile,
  getTeamDefaultWeapon,
  getTeamWeapons,
  getUserWeapon,
  type UserWeapon,
} from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Crosshair, Plus, Target } from 'lucide-react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrainingBlockedView, type BlockReason } from './TrainingBlockedView';

interface StartDrillSheetProps {
  visible: boolean;
  onClose: () => void;
  drill: any;
  trainingId: string;
  teamId?: string;
  initialWeapon?: UserWeapon | null;
}

export function StartDrillSheet({
  visible,
  onClose,
  drill,
  trainingId,
  teamId,
  initialWeapon,
}: StartDrillSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  const { weather: openWeather } = useOpenWeather({ autoFetch: true });

  const [selectedWeapon, setSelectedWeapon] = useState<UserWeapon | null>(null);
  const [loadingWeapon, setLoadingWeapon] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weaponPolicy, setWeaponPolicy] = useState<WeaponPolicy | null>(null);
  const [teamWeaponsCount, setTeamWeaponsCount] = useState<number>(0);
  const [isCommanderOrOwner, setIsCommanderOrOwner] = useState(false);
  
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  
  // Determine if training is blocked based on policy
  const blockStatus = useMemo((): { blocked: boolean; reason: BlockReason } | null => {
    if (loadingWeapon) return null;
    
    // If we have a weapon, never blocked
    if (selectedWeapon) return { blocked: false, reason: 'unknown' };
    
    // Commanders/owners are never blocked by assignment policy - they manage it
    if (isCommanderOrOwner) return { blocked: false, reason: 'unknown' };
    
    // Check policy-based restrictions for members
    if (isAssignedPolicy(weaponPolicy)) {
      // For assigned policy, members must have weapon assigned
      return { blocked: true, reason: 'no_assignment' };
    }
    
    if (isCatalogPolicy(weaponPolicy)) {
      // For catalog policy, team must have weapons in catalog
      if (teamWeaponsCount === 0) {
        return { blocked: true, reason: 'empty_catalog' };
      }
      return { blocked: false, reason: 'unknown' };
    }
    
    // For personal policy or no teamId, user just needs to select a weapon
    return { blocked: false, reason: 'unknown' };
  }, [loadingWeapon, selectedWeapon, weaponPolicy, teamWeaponsCount, isCommanderOrOwner]);

  // Auto-load assigned weapon and team weapon policy
  useEffect(() => {
    if (!visible) return;
    
    if (initialWeapon) {
      setSelectedWeapon(initialWeapon);
      setLoadingWeapon(false);
      return;
    }

    if (!teamId) {
      setLoadingWeapon(false);
      return;
    }

    let cancelled = false;

    async function loadTeamData() {
      try {
        // Fetch weapon policy, auth, team weapons count, and user role in parallel
        const [policy, authResult, teamWeapons, userRole] = await Promise.all([
          getTeamWeaponPolicy(teamId!),
          supabase.auth.getUser(),
          getTeamWeapons(teamId!),
          getMyRoleInTeam(teamId!),
        ]);
        
        if (cancelled) return;
        
        setWeaponPolicy(policy);
        setTeamWeaponsCount(teamWeapons.length);
        setIsCommanderOrOwner(userRole === 'owner' || userRole === 'commander');
        
        const user = authResult.data?.user;
        if (!user) {
          setLoadingWeapon(false);
          return;
        }

        // For assigned policy, auto-load assigned weapon
        if (isAssignedPolicy(policy)) {
          const assignedWeapons = await getAssignedWeapons(teamId!, user.id);
          if (cancelled) return;

          if (assignedWeapons.length > 0) {
            const personalProfile = await getOrCreatePersonalProfile(assignedWeapons[0].id);
            if (cancelled) return;
            setSelectedWeapon(personalProfile);
          }
        }
        
        // For catalog policy, try to auto-select team default weapon
        if (isCatalogPolicy(policy) && teamWeapons.length > 0) {
          const defaultTeamWeapon = await getTeamDefaultWeapon(teamId!);
          if (cancelled) return;
          
          if (defaultTeamWeapon) {
            const personalProfile = await getOrCreatePersonalProfile(defaultTeamWeapon.id);
            if (cancelled) return;
            setSelectedWeapon(personalProfile);
          }
        }
      } catch (error) {
        console.error('[StartDrillSheet] Failed to load team data:', error);
      } finally {
        if (!cancelled) setLoadingWeapon(false);
      }
    }

    loadTeamData();

    return () => {
      cancelled = true;
    };
  }, [visible, teamId, initialWeapon]);

  const handleStart = async () => {
    if (!selectedWeapon) return;
    
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const sessionWeather = toSessionWeatherData(openWeather, 'openweathermap');
      
      const config: BaseSessionConfig = {
        weapon_id: selectedWeapon.id,
        weather: sessionWeather,
        team_id: teamId || null,
        training_id: trainingId || null,
        drill_id: drill.id,
        drill_config: {
          name: drill.name,
          drill_goal: drill.drill_goal || 'engagement',
          target_type: drill.target_type || 'paper',
          distance_m: drill.distance_m,
          rounds_per_shooter: drill.rounds_per_shooter,
          time_limit_seconds: drill.time_limit_seconds,
        },
        session_mode: 'solo',
        watch_controlled: false,
        start_as_pending: true,
      };

      const session = await createSession(config);
      await loadSessions();
      
      onClose();
      
      router.push({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId: session.id,
          returnTo: 'trainingDetail',
          returnId: trainingId,
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start session');
      setIsSubmitting(false);
    }
  };

  const handleWeaponSelect = useCallback((weapon: UserWeapon) => {
    setSelectedWeapon(weapon);
    setShowWeaponPicker(false);
  }, []);

  const handleWeaponCreatedById = useCallback(async (weaponId: string) => {
    setShowCreateWeapon(false);
    try {
      const weapon = await getUserWeapon(weaponId);
      if (weapon) {
        handleWeaponSelect(weapon);
      }
    } catch (error) {
      console.error('[StartDrillSheet] Failed to fetch created weapon:', error);
    }
  }, [handleWeaponSelect]);

  if (!visible) return null;

  // Check if training is blocked
  const isTrainingBlocked = blockStatus?.blocked === true;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Show blocked view when training cannot proceed */}
        {isTrainingBlocked && blockStatus ? (
          <View style={styles.blockedContainer}>
            {/* Header for blocked state */}
            <View style={[styles.blockedHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={onClose} style={[styles.sheetCloseBtn, { backgroundColor: colors.card }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Start Drill</Text>
              <View style={{ width: 40 }} />
            </View>
            
            {/* Drill info badge */}
            <View style={[styles.drillBadgeSmall, { backgroundColor: colors.card }]}>
              <Target size={16} color={colors.primary} />
              <Text style={[styles.drillBadgeText, { color: colors.text }]}>
                {drill?.name || 'Training Drill'}
              </Text>
            </View>
            
            {/* Blocked View */}
            <TrainingBlockedView
              weaponPolicy={weaponPolicy || 'assigned'}
              reason={blockStatus.reason}
            />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={onClose} style={[styles.sheetCloseBtn, { backgroundColor: colors.card }]}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Start Drill</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Drill Hero */}
              <View style={[styles.drillHero, { backgroundColor: colors.card }]}>
                <View style={[styles.drillHeroIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Target size={32} color={colors.primary} />
                </View>
                <Text style={[styles.drillHeroTitle, { color: colors.text }]}>{drill?.name || 'Training Drill'}</Text>
                <View style={styles.drillHeroBadge}>
                  <Text style={[styles.drillHeroBadgeText, { color: colors.textMuted }]}>
                    {drill?.distance_m}m • {drill?.rounds_per_shooter} shots
                  </Text>
                </View>
              </View>

              {/* Policy indicator for team trainings */}
              {teamId && weaponPolicy && (
                <View style={styles.policySection}>
                  <PolicyExplainer
                    policy={weaponPolicy}
                    userRole="member"
                    hasWeapon={!!selectedWeapon}
                    catalogCount={teamWeaponsCount}
                    compact
                  />
                </View>
              )}

              {/* Weapon Selector */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Weapon</Text>
                {loadingWeapon ? (
                  <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>Loading weapon...</Text>
                  </View>
                ) : selectedWeapon ? (
                  <TouchableOpacity
                    style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                    onPress={() => !isAssignedPolicy(weaponPolicy) && setShowWeaponPicker(true)}
                    disabled={isAssignedPolicy(weaponPolicy)}
                  >
                    <View style={[styles.weaponIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Crosshair size={20} color={colors.primary} />
                    </View>
                    <View style={styles.weaponInfo}>
                      <Text style={[styles.weaponName, { color: colors.text }]}>{selectedWeapon.name}</Text>
                      <Text style={[styles.weaponHint, { color: colors.textMuted }]}>
                        {isAssignedPolicy(weaponPolicy) ? 'Assigned to you' : 'Tap to change'}
                      </Text>
                    </View>
                    {!isAssignedPolicy(weaponPolicy) && (
                      <ChevronRight size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.weaponEmptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowWeaponPicker(true)}
                  >
                    <View style={[styles.weaponEmptyIcon, { backgroundColor: colors.secondary }]}>
                      <Plus size={20} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.weaponEmptyTitle, { color: colors.textMuted }]}>Select Weapon</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Settings (Read only / display) */}
              <View style={styles.specsRow}>
                <View style={[styles.specItem, { backgroundColor: colors.card }]}>
                  <Text style={[styles.specLabel, { color: colors.textMuted }]}>DISTANCE</Text>
                  <Text style={[styles.specValue, { color: colors.text }]}>{drill?.distance_m}m</Text>
                </View>
                <View style={[styles.specItem, { backgroundColor: colors.card }]}>
                  <Text style={[styles.specLabel, { color: colors.textMuted }]}>ROUNDS</Text>
                  <Text style={[styles.specValue, { color: colors.text }]}>{drill?.rounds_per_shooter}</Text>
                </View>
                {drill?.time_limit_seconds && (
                  <View style={[styles.specItem, { backgroundColor: colors.card }]}>
                    <Text style={[styles.specLabel, { color: colors.textMuted }]}>TIME</Text>
                    <Text style={[styles.specValue, { color: colors.text }]}>{drill.time_limit_seconds}s</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer Action */}
            <View style={[styles.sheetFooter, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={[
                  styles.startButton, 
                  { 
                    backgroundColor: selectedWeapon ? colors.text : colors.secondary, 
                    opacity: selectedWeapon ? 1 : 0.6 
                  }
                ]}
                onPress={handleStart}
                disabled={!selectedWeapon || isSubmitting || loadingWeapon}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Target size={20} color={colors.background} />
                    <Text style={[styles.startButtonText, { color: colors.background }]}>
                      Continue to Setup
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.setupHint, { color: colors.textMuted }]}>
                Configure watch & detection in next step
              </Text>
            </View>
          </>
        )}

        {/* Modals */}
        <Modal visible={showWeaponPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowWeaponPicker(false)}>
          <WeaponPicker
            selectedWeaponId={selectedWeapon?.id || null}
            onSelect={handleWeaponSelect}
            onClose={() => setShowWeaponPicker(false)}
            onAddNew={() => {
              setShowWeaponPicker(false);
              setShowCreateWeapon(true);
            }}
            teamId={teamId}
            weaponPolicy={weaponPolicy}
          />
        </Modal>
        
        <Modal visible={showCreateWeapon} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateWeapon(false)}>
          <CreateWeaponFlow
            onComplete={handleWeaponCreatedById}
            onCancel={() => {
              setShowCreateWeapon(false);
              setShowWeaponPicker(true);
            }}
          />
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Blocked state styles
  blockedContainer: {
    flex: 1,
  },
  blockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  drillBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  drillBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Policy section
  policySection: {
    marginBottom: 20,
  },
  
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillHero: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
  },
  drillHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  drillHeroTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  drillHeroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  drillHeroBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 24,
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
  weaponEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  specItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  specValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  startButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  setupHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
