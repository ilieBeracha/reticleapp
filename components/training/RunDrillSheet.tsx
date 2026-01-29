/**
 * RunDrillSheet
 *
 * Bottom sheet for executing a training drill.
 * Soldier picks values within commander's constraints, then runs the drill.
 *
 * Flow:
 * 1. Commander creates drill with rules (some may be NULL = soldier picks)
 * 2. Soldier taps "Start" on drill card → this sheet opens
 * 3. Soldier adjusts allowed values (distance within range, etc.)
 * 4. Soldier taps "Start" → session created → navigate to activeSession
 */

import { RANGE_CATEGORIES, type RangeCategory } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/services/supabase';
import { getOrCreateSetupSession } from '@/services/session/mutations';
import { getUserWeapon, type UserWeapon } from '@/services/weaponService';
import type { TrainingDrill } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Lock, MapPin, Minus, Plus, Target, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RunDrillSheetProps {
  visible: boolean;
  onClose: () => void;
  drill: TrainingDrill | null;
  trainingId: string;
  teamId: string;
}

const POSITIONS = [
  { value: 'standing', label: 'Standing' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'prone', label: 'Prone' },
  { value: 'sitting', label: 'Sitting' },
] as const;

// Quick distance options based on range category
const QUICK_DISTANCES: Record<RangeCategory, number[]> = {
  short: [25, 50, 100, 150, 200, 250],
  medium: [300, 350, 400, 450, 500, 550],
  long: [600, 700, 800, 900, 1000],
};

// Range category labels
const RANGE_LABELS: Record<RangeCategory, string> = {
  short: 'Short Range (0-300m)',
  medium: 'Medium Range (300-600m)',
  long: 'Long Range (600m+)',
};

export function RunDrillSheet({ visible, onClose, drill, trainingId, teamId }: RunDrillSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Soldier's choices
  const [distance, setDistance] = useState(25);
  const [bullets, setBullets] = useState(5);
  const [position, setPosition] = useState<string>('standing');

  // Weapon (auto-loaded)
  const [weapon, setWeapon] = useState<UserWeapon | null>(null);
  const [loadingWeapon, setLoadingWeapon] = useState(true);

  // Submit state
  const [isStarting, setIsStarting] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED VALUES FROM DRILL
  // ═══════════════════════════════════════════════════════════════════════════

  // Distance constraints
  const distanceCategory = drill?.distance_category as RangeCategory | null;
  const categoryBounds = distanceCategory ? RANGE_CATEGORIES.find((c) => c.value === distanceCategory) : null;
  const minDistance = categoryBounds?.min ?? 1;
  const maxDistance = categoryBounds?.max ?? 1000;

  // What's locked vs what soldier can pick
  const isDistanceLocked = drill?.distance_m != null;
  const isBulletsLocked = drill?.rounds_per_shooter != null;
  const isPositionLocked = drill?.position != null;

  // Quick distance buttons for the category
  const quickDistances = distanceCategory ? QUICK_DISTANCES[distanceCategory] : [25, 50, 100, 200, 300];

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE STATE FROM DRILL
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!drill) return;

    // Set distance: commander's exact value OR default within range
    if (drill.distance_m != null) {
      setDistance(drill.distance_m);
    } else if (distanceCategory) {
      // Default to first quick distance in range
      const defaults = QUICK_DISTANCES[distanceCategory];
      setDistance(defaults[0] || 100);
    }

    // Set bullets: commander's value OR default
    if (drill.rounds_per_shooter != null) {
      setBullets(drill.rounds_per_shooter);
    } else {
      setBullets(5);
    }

    // Set position: commander's value OR default
    if (drill.position) {
      setPosition(drill.position);
    } else {
      setPosition('standing');
    }
  }, [drill, distanceCategory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD DEFAULT WEAPON
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    async function loadDefaultWeapon() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's most recently used weapon
        const { data: weapons } = await supabase
          .from('user_weapons')
          .select('id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (weapons && weapons.length > 0) {
          const w = await getUserWeapon(weapons[0].id);
          if (w) setWeapon(w);
        }
      } catch (err) {
        console.error('[RunDrillSheet] Failed to load weapon:', err);
      } finally {
        setLoadingWeapon(false);
      }
    }

    if (visible) {
      setLoadingWeapon(true);
      loadDefaultWeapon();
    }
  }, [visible]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTANCE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleDistanceChange = useCallback(
    (delta: number) => {
      setDistance((prev) => {
        const next = prev + delta;
        // Clamp to range if category set
        if (distanceCategory) {
          return Math.max(minDistance, Math.min(maxDistance, next));
        }
        return Math.max(1, next);
      });
    },
    [distanceCategory, minDistance, maxDistance]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // START DRILL
  // ═══════════════════════════════════════════════════════════════════════════

  const handleStart = useCallback(async () => {
    if (!drill || !weapon) return;

    setIsStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Create session with soldier's choices
      const session = await getOrCreateSetupSession({
        weapon_id: weapon.id,
        team_id: teamId,
        training_id: trainingId,
        drill_id: drill.id,
        // Soldier's choices (actual values they're using)
        soldier_distance_m: distance,
        soldier_bullets: bullets,
        soldier_position: position,
      });

      onClose();

      // Navigate to active session
      router.push({
        pathname: '/(protected)/activeSession',
        params: { sessionId: session.id },
      });
    } catch (err) {
      console.error('[RunDrillSheet] Failed to start:', err);
      // TODO: Show error alert
    } finally {
      setIsStarting(false);
    }
  }, [drill, weapon, teamId, trainingId, distance, bullets, position, onClose]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (!drill) return null;

  const canStart = weapon != null && !loadingWeapon;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.secondary }]} onPress={onClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Drill Name */}
          <Text style={[styles.drillName, { color: colors.text }]}>{drill.name}</Text>

          {/* Weapon */}
          <View style={[styles.weaponRow, { backgroundColor: colors.secondary }]}>
            <Target size={16} color={colors.primary} />
            <Text style={[styles.weaponText, { color: colors.text }]}>
              {loadingWeapon ? 'Loading...' : weapon?.name || 'No weapon selected'}
            </Text>
          </View>

          {/* Distance */}
          <View style={styles.configSection}>
            <View style={styles.configHeader}>
              <MapPin size={16} color={colors.textMuted} />
              <Text style={[styles.configLabel, { color: colors.text }]}>Distance</Text>
              {isDistanceLocked && <Lock size={14} color={colors.textMuted} />}
            </View>

            {isDistanceLocked ? (
              <Text style={[styles.lockedValue, { color: colors.text }]}>{drill.distance_m}m</Text>
            ) : (
              <>
                {/* Range category label */}
                {distanceCategory && (
                  <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>{RANGE_LABELS[distanceCategory]}</Text>
                )}

                {/* Distance input with +/- buttons */}
                <View style={[styles.counterRow, { borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => handleDistanceChange(-25)}
                  >
                    <Minus size={20} color={colors.text} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.counterInput, { color: colors.text }]}
                    value={String(distance)}
                    onChangeText={(text) => {
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num > 0) setDistance(num);
                    }}
                    keyboardType="number-pad"
                  />
                  <Text style={[styles.counterUnit, { color: colors.textMuted }]}>m</Text>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => handleDistanceChange(25)}
                  >
                    <Plus size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Quick distance buttons */}
                <View style={styles.quickDistances}>
                  {quickDistances.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.quickBtn,
                        {
                          backgroundColor: distance === d ? colors.primary : colors.secondary,
                          borderColor: distance === d ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setDistance(d)}
                    >
                      <Text style={[styles.quickBtnText, { color: distance === d ? '#fff' : colors.text }]}>{d}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Bullets */}
          <View style={styles.configSection}>
            <View style={styles.configHeader}>
              <Zap size={16} color={colors.textMuted} />
              <Text style={[styles.configLabel, { color: colors.text }]}>Bullets</Text>
              {isBulletsLocked && <Lock size={14} color={colors.textMuted} />}
            </View>

            {isBulletsLocked ? (
              <Text style={[styles.lockedValue, { color: colors.text }]}>{drill.rounds_per_shooter}</Text>
            ) : (
              <View style={styles.bulletPicker}>
                {[5, 10, 15, 20].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[
                      styles.bulletOption,
                      { backgroundColor: bullets === n ? colors.primary : colors.secondary },
                    ]}
                    onPress={() => setBullets(n)}
                  >
                    <Text style={[styles.bulletText, { color: bullets === n ? '#fff' : colors.text }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Position */}
          <View style={styles.configSection}>
            <View style={styles.configHeader}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Position</Text>
              {isPositionLocked && <Lock size={14} color={colors.textMuted} />}
            </View>

            {isPositionLocked ? (
              <Text style={[styles.lockedValue, { color: colors.text }]}>
                {POSITIONS.find((p) => p.value === drill.position)?.label || drill.position}
              </Text>
            ) : (
              <View style={styles.positionPicker}>
                {POSITIONS.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.positionOption,
                      { backgroundColor: position === p.value ? colors.primary : colors.secondary },
                    ]}
                    onPress={() => setPosition(p.value)}
                  >
                    <Text style={[styles.positionText, { color: position === p.value ? '#fff' : colors.text }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary, opacity: canStart ? 1 : 0.5 }]}
            onPress={handleStart}
            disabled={!canStart || isStarting}
          >
            {isStarting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Target size={20} color="#fff" />
                <Text style={styles.startBtnText}>Run Drill</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  weaponText: {
    fontSize: 14,
    fontWeight: '500',
  },
  configSection: {
    marginBottom: 20,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  lockedValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  rangeLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    gap: 8,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  counterUnit: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  quickDistances: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bulletPicker: {
    flexDirection: 'row',
    gap: 10,
  },
  bulletOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bulletText: {
    fontSize: 16,
    fontWeight: '600',
  },
  positionPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  positionOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  positionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
