/**
 * DrillConfigSheet
 *
 * Config panel for active session - shows drill parameters.
 * Locked sessions show read-only data.
 * Guided/Free sessions allow soldier to adjust distance, bullets, position.
 */

import { POSITIONS, QUICK_DISTANCES, RANGE_CATEGORIES, RANGE_LABELS, type RangeCategory } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { updateSession } from '@/services/session/mutations';
import type { SessionDrillConfig, SessionWithDetails } from '@/types/session';
import * as Haptics from 'expo-haptics';
import { Lock, MapPin, Minus, Plus, Settings, Target, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DrillConfigSheetProps {
  visible: boolean;
  onClose: () => void;
  session: SessionWithDetails;
  drill: SessionDrillConfig | null | undefined;
  onSessionUpdated: () => void;
}

export function DrillConfigSheet({ visible, onClose, session, drill, onSessionUpdated }: DrillConfigSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const executionPolicy = drill?.execution_policy || 'locked';
  const isLocked = executionPolicy === 'locked';
  const isGrouping = drill?.drill_goal === 'grouping';

  // Soldier values (editable state)
  const [distance, setDistance] = useState(25);
  const [bullets, setBullets] = useState(5);
  const [position, setPosition] = useState<string>('standing');
  const [saving, setSaving] = useState(false);

  // Track if changes were made
  const [hasChanges, setHasChanges] = useState(false);

  const distanceCategory = drill?.distance_category as RangeCategory | null;
  const categoryBounds = distanceCategory ? RANGE_CATEGORIES.find((c) => c.value === distanceCategory) : null;
  const minDistance = categoryBounds?.min ?? 1;
  const maxDistance = categoryBounds?.max ?? 1000;

  const isDistanceLocked = isLocked && drill?.distance_m != null;
  const isBulletsLocked = isLocked && drill?.rounds_per_shooter != null;
  const isPositionLocked = isLocked && drill?.position != null;

  const quickDistances = useMemo(
    () => (distanceCategory ? QUICK_DISTANCES[distanceCategory] : [25, 50, 100, 200]),
    [distanceCategory]
  );

  // Initialize from session values (soldier choices first, then drill defaults)
  useEffect(() => {
    if (!visible) return;

    setDistance(
      session.soldier_distance_m ?? drill?.distance_m ?? 25
    );
    setBullets(
      session.soldier_bullets ?? drill?.rounds_per_shooter ?? 5
    );
    setPosition(
      session.soldier_position ?? drill?.position ?? 'standing'
    );
    setHasChanges(false);
  }, [visible, session, drill]);

  const handleDistanceChange = useCallback(
    (delta: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDistance((prev) => {
        const newVal = Math.max(minDistance, Math.min(maxDistance, prev + delta));
        setHasChanges(true);
        return newVal;
      });
    },
    [minDistance, maxDistance]
  );

  const handleSave = useCallback(async () => {
    if (!hasChanges || isLocked) return;

    setSaving(true);
    try {
      await updateSession(session.id, {
        soldier_distance_m: distance,
        soldier_bullets: bullets,
        soldier_position: position,
      });
      onSessionUpdated();
      onClose();
    } catch (err) {
      console.error('[DrillConfigSheet] Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [hasChanges, isLocked, session.id, distance, bullets, position, onSessionUpdated, onClose]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.secondary }]} onPress={onClose}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <Animated.View entering={FadeInDown.duration(300)} style={styles.titleRow}>
              <Settings size={16} color={colors.textMuted} />
              <Text style={[styles.title, { color: colors.text }]}>
                {t('session.drillConfig', 'Drill Config')}
              </Text>
            </Animated.View>

            {/* Policy badge */}
            <View
              style={[
                styles.policyBadge,
                {
                  backgroundColor: isLocked ? `${colors.textMuted}12` : `${colors.green}12`,
                },
              ]}
            >
              {isLocked ? (
                <Lock size={11} color={colors.textMuted} />
              ) : (
                <Zap size={11} color={colors.green} />
              )}
              <Text
                style={[
                  styles.policyText,
                  { color: isLocked ? colors.textMuted : colors.green },
                ]}
              >
                {executionPolicy === 'locked'
                  ? t('training.policyLocked', 'Locked')
                  : executionPolicy === 'guided'
                    ? t('training.policyGuided', 'Adjustable')
                    : t('training.policyFree', 'Free')}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Weapon (always read-only) */}
            <Animated.View
              entering={FadeInDown.duration(300).delay(50)}
              style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.weaponIcon, { backgroundColor: `${colors.primary}12` }]}>
                <Target size={16} color={colors.primary} />
              </View>
              <View style={styles.weaponInfo}>
                <Text style={[styles.weaponLabel, { color: colors.textMuted }]}>
                  {t('session.weapon', 'Weapon')}
                </Text>
                <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
                  {session.weapon_name || t('session.noWeapon', 'No weapon')}
                </Text>
              </View>
            </Animated.View>

            {/* Distance */}
            <Animated.View entering={FadeInDown.duration(300).delay(100)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  {t('session.distance', 'Distance')}
                </Text>
                {isDistanceLocked && <Lock size={11} color={colors.textMuted} />}
                {!isDistanceLocked && distanceCategory && (
                  <Text style={[styles.rangeLabel, { color: colors.blue }]}>{RANGE_LABELS[distanceCategory]}</Text>
                )}
              </View>

              {isDistanceLocked ? (
                <View style={[styles.lockedValue, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.lockedValueText, { color: colors.text }]}>{drill?.distance_m}m</Text>
                  <Text style={[styles.lockedHint, { color: colors.textMuted }]}>
                    {t('training.lockedValue', 'Locked')}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.counter, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => handleDistanceChange(-25)}
                    >
                      <Minus size={18} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.counterCenter}>
                      <TextInput
                        style={[styles.counterInput, { color: colors.text }]}
                        value={String(distance)}
                        onChangeText={(val) => {
                          const n = parseInt(val, 10);
                          if (!isNaN(n) && n > 0) {
                            setDistance(n);
                            setHasChanges(true);
                          }
                        }}
                        keyboardType="number-pad"
                      />
                      <Text style={[styles.counterUnit, { color: colors.textMuted }]}>
                        {t('session.meters', 'meters')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => handleDistanceChange(25)}
                    >
                      <Plus size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quickRow}>
                    {quickDistances.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.quickChip,
                          {
                            backgroundColor: distance === d ? colors.text : colors.card,
                            borderColor: distance === d ? colors.text : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDistance(d);
                          setHasChanges(true);
                        }}
                      >
                        <Text style={[styles.quickText, { color: distance === d ? colors.background : colors.text }]}>
                          {d}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </Animated.View>

            {/* Bullets (engagement only) */}
            {!isGrouping && (
              <Animated.View entering={FadeInDown.duration(300).delay(150)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Zap size={14} color={colors.textMuted} />
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    {t('session.rounds', 'Rounds')}
                  </Text>
                  {isBulletsLocked && <Lock size={11} color={colors.textMuted} />}
                </View>

                {isBulletsLocked ? (
                  <View style={[styles.lockedValue, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.lockedValueText, { color: colors.text }]}>{drill?.rounds_per_shooter}</Text>
                    <Text style={[styles.lockedHint, { color: colors.textMuted }]}>
                      {t('training.lockedValue', 'Locked')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.optionGrid}>
                    {[5, 10, 15, 20].map((n) => (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.optionBtn,
                          {
                            backgroundColor: bullets === n ? colors.text : colors.card,
                            borderColor: bullets === n ? colors.text : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setBullets(n);
                          setHasChanges(true);
                        }}
                      >
                        <Text style={[styles.optionText, { color: bullets === n ? colors.background : colors.text }]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Animated.View>
            )}

            {/* Position */}
            <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  {t('session.position', 'Position')}
                </Text>
                {isPositionLocked && <Lock size={11} color={colors.textMuted} />}
              </View>

              {isPositionLocked ? (
                <View style={[styles.lockedValue, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.lockedValueText, { color: colors.text }]}>
                    {POSITIONS.find((p) => p.value === drill?.position)?.label || drill?.position}
                  </Text>
                  <Text style={[styles.lockedHint, { color: colors.textMuted }]}>
                    {t('training.lockedValue', 'Locked')}
                  </Text>
                </View>
              ) : (
                <View style={styles.positionGrid}>
                  {POSITIONS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.positionBtn,
                        {
                          backgroundColor: position === p.value ? colors.text : colors.card,
                          borderColor: position === p.value ? colors.text : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPosition(p.value);
                        setHasChanges(true);
                      }}
                    >
                      <Text
                        style={[styles.positionText, { color: position === p.value ? colors.background : colors.text }]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Save button (only for non-locked with changes) */}
          {!isLocked && (
            <View style={[styles.footer, { backgroundColor: colors.background, paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: hasChanges ? colors.text : colors.secondary,
                  },
                ]}
                onPress={hasChanges ? handleSave : onClose}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.saveBtnText,
                      { color: hasChanges ? colors.background : colors.textMuted },
                    ]}
                  >
                    {hasChanges ? t('common.save', 'Save') : t('common.close', 'Close')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  policyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
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
  weaponLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterCenter: {
    flex: 1,
    alignItems: 'center',
  },
  counterInput: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
  },
  counterUnit: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '800',
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  positionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lockedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockedValueText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  lockedHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
