import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { getCurrentUser } from '@/services/authService';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession } from '@/services/sessionService';
import {
  getAssignedWeapons,
  getOrCreatePersonalProfile,
  getUserWeapon,
  type UserWeapon,
} from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, CornerDownRight, Crosshair, Plus, Target } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StartDrillSheetProps {
  visible: boolean;
  onClose: () => void;
  drill: any;
  trainingId: string;
  teamId?: string;
  initialWeapon?: UserWeapon | null;
}

export function StartDrillSheet({ visible, onClose, drill, trainingId, teamId, initialWeapon }: StartDrillSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  const { weather: openWeather } = useOpenWeather({ autoFetch: true });

  const [selectedWeapon, setSelectedWeapon] = useState<UserWeapon | null>(null);
  const [loadingWeapon, setLoadingWeapon] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);

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
        const user = await getCurrentUser();
        if (cancelled) return;

        if (!user) {
          setLoadingWeapon(false);
          return;
        }

        const assignedWeapons = await getAssignedWeapons(teamId!, user.id);
        if (cancelled) return;

        if (assignedWeapons.length > 0) {
          const personalProfile = await getOrCreatePersonalProfile(assignedWeapons[0].id);
          if (cancelled) return;
          setSelectedWeapon(personalProfile);
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
        start_as_pending: false,
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

  const handleWeaponSelect = useCallback(async (weapon: UserWeapon) => {
    setShowWeaponPicker(false);

    if ('team_id' in weapon && weapon.team_id) {
      try {
        setLoadingWeapon(true);
        const personalProfile = await getOrCreatePersonalProfile(weapon.id);
        setSelectedWeapon(personalProfile);
      } catch (error) {
        console.error('[StartDrillSheet] Failed to create personal profile:', error);
        setSelectedWeapon(weapon);
      } finally {
        setLoadingWeapon(false);
      }
    } else {
      setSelectedWeapon(weapon);
    }
  }, []);

  const handleWeaponCreatedById = useCallback(
    async (weaponId: string) => {
      setShowCreateWeapon(false);
      try {
        const weapon = await getUserWeapon(weaponId);
        if (weapon) {
          handleWeaponSelect(weapon);
        }
      } catch (error) {
        console.error('[StartDrillSheet] Failed to fetch created weapon:', error);
      }
    },
    [handleWeaponSelect]
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.card }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Start Drill</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Drill info - compact */}
          <View style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.drillIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Target size={20} color={colors.primary} />
            </View>
            <View style={styles.drillInfo}>
              <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
                {drill?.name || 'Training Drill'}
              </Text>
              <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
                {drill?.distance_m}m · {drill?.rounds_per_shooter} shots
                {drill?.time_limit_seconds ? ` · ${drill.time_limit_seconds}s` : ''}
              </Text>
            </View>
          </View>

          {/* Weapon selector */}
          <View style={styles.weaponSection}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Weapon</Text>
            {loadingWeapon ? (
              <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>Loading your weapon...</Text>
              </View>
            ) : selectedWeapon ? (
              <TouchableOpacity
                style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowWeaponPicker(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.weaponIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Crosshair size={20} color={colors.primary} strokeWidth={1.5} />
                </View>
                <View style={styles.weaponInfo}>
                  <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
                    {selectedWeapon.name}
                  </Text>
                  <Text style={[styles.weaponHint, { color: colors.textMuted }]}>Tap to change</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.weaponEmptyCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                onPress={() => setShowWeaponPicker(true)}
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
        </View>

        {/* Bottom button */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          <View style={[styles.bottomBarInner, { borderTopColor: colors.border }]}>
            {!selectedWeapon && !loadingWeapon && (
              <Text style={[styles.weaponRequiredHint, { color: colors.orange }]}>Select a weapon to continue</Text>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: selectedWeapon ? colors.primary : colors.secondary,
                  opacity: selectedWeapon ? 1 : 0.5,
                },
              ]}
              onPress={handleStart}
              disabled={!selectedWeapon || isSubmitting || loadingWeapon}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CornerDownRight size={18} color="#fff" fill="#fff" />
                  <Text style={styles.buttonText}>Start Session</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Weapon Picker Modal */}
        <Modal
          visible={showWeaponPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowWeaponPicker(false)}
        >
          <WeaponPicker
            selectedWeaponId={selectedWeapon?.id || null}
            onSelect={handleWeaponSelect}
            onClose={() => setShowWeaponPicker(false)}
            onAddNew={() => {
              setShowWeaponPicker(false);
              setShowCreateWeapon(true);
            }}
            teamId={teamId}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
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

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Drill card
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 24,
  },
  drillIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillInfo: {
    flex: 1,
    gap: 2,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  drillMeta: {
    fontSize: 12,
    fontWeight: '500',
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

  // Bottom bar
  bottomBar: {
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
