import { WeaponPicker, CreateWeaponFlow } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { supabase } from '@/lib/supabase';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession } from '@/services/sessionService';
import { getAssignedWeapons, getOrCreatePersonalProfile, getUserWeapon, type UserWeapon } from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Crosshair, Plus, Target } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
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
  
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);

  // Auto-load assigned weapon
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

    async function loadTeamWeapon() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
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
        console.error('[StartDrillSheet] Failed to load team weapon:', error);
      } finally {
        if (!cancelled) setLoadingWeapon(false);
      }
    }

    loadTeamWeapon();

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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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

          {/* Weapon Selector */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Weapon</Text>
            {loadingWeapon ? (
              <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>Assigning weapon...</Text>
              </View>
            ) : selectedWeapon ? (
              <TouchableOpacity
                style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
                onPress={() => setShowWeaponPicker(true)}
              >
                <View style={[styles.weaponIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Crosshair size={20} color={colors.primary} />
                </View>
                <View style={styles.weaponInfo}>
                  <Text style={[styles.weaponName, { color: colors.text }]}>{selectedWeapon.name}</Text>
                  <Text style={[styles.weaponHint, { color: colors.textMuted }]}>Ready to use</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
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
