/**
 * AddStandardModal
 *
 * Create or edit a performance standard.
 * Modern, elegant design.
 */

import { useColors } from '@/hooks/ui/useColors';
import { createStandard, updateStandard, type CreateStandardInput, type TeamStandard } from '@/services/standards/standardsService';
import * as Haptics from 'expo-haptics';
import { Check, Crosshair, Target, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface AddStandardModalProps {
  visible: boolean;
  teamId: string;
  editingStandard: TeamStandard | null;
  onClose: () => void;
  onSave: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEAPON_CATEGORIES = [
  { value: null, label: 'Any' },
  { value: 'rifle', label: 'Rifle' },
  { value: 'pistol', label: 'Pistol' },
  { value: 'shotgun', label: 'Shotgun' },
];

const COMMON_DISTANCES = [25, 50, 100, 200, 300, 400, 500];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddStandardModal({ visible, teamId, editingStandard, onClose, onSave }: AddStandardModalProps) {
  const colors = useColors();
  const isEditing = !!editingStandard;

  // Form state
  const [nameSuffix, setNameSuffix] = useState(''); // User-editable part
  const [description, setDescription] = useState('');
  const [drillGoal, setDrillGoal] = useState<'grouping' | 'engagement'>('grouping');
  const [useRange, setUseRange] = useState(false);
  const [distanceM, setDistanceM] = useState('100');
  const [distanceMaxM, setDistanceMaxM] = useState('200');
  const [showCustomDistance, setShowCustomDistance] = useState(false);
  const [weaponCategory, setWeaponCategory] = useState<string | null>(null);
  const [expectedGroupingCm, setExpectedGroupingCm] = useState('');
  const [expectedAccuracyPct, setExpectedAccuracyPct] = useState('');
  const [expectedTimeSeconds, setExpectedTimeSeconds] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-computed distance prefix (always in sync)
  const distancePrefix = useRange ? `${distanceM}-${distanceMaxM}m` : `${distanceM}m`;

  // Full name combines prefix + suffix
  const fullName = nameSuffix ? `${distancePrefix} ${nameSuffix}` : distancePrefix;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (editingStandard) {
        // Extract suffix from existing name (remove distance prefix if present)
        const existingName = editingStandard.name;
        const distMatch = existingName.match(/^\d+(?:-\d+)?m\s*/);
        const suffix = distMatch ? existingName.slice(distMatch[0].length) : existingName;
        setNameSuffix(suffix);
        setDescription(editingStandard.description || '');
        setDrillGoal(editingStandard.drill_goal);
        setDistanceM(String(editingStandard.distance_m));
        setWeaponCategory(editingStandard.weapon_category);
        setExpectedGroupingCm(editingStandard.expected_grouping_cm?.toString() || '');
        setExpectedAccuracyPct(editingStandard.expected_accuracy_pct?.toString() || '');
        setExpectedTimeSeconds(editingStandard.expected_time_seconds?.toString() || '');
        // Check if distance is custom
        setShowCustomDistance(!COMMON_DISTANCES.includes(editingStandard.distance_m));
        setUseRange(false);
        setDistanceMaxM('200');
      } else {
        setNameSuffix('');
        setDescription('');
        setDrillGoal('grouping');
        setDistanceM('100');
        setDistanceMaxM('200');
        setUseRange(false);
        setShowCustomDistance(false);
        setWeaponCategory(null);
        setExpectedGroupingCm('');
        setExpectedAccuracyPct('');
        setExpectedTimeSeconds('');
      }
    }
  }, [visible, editingStandard]);

  // Auto-generate suffix based on weapon and goal (only if suffix is empty)
  useEffect(() => {
    if (!isEditing && !nameSuffix) {
      const weapon = weaponCategory ? `${weaponCategory.charAt(0).toUpperCase() + weaponCategory.slice(1)} ` : '';
      const goal = drillGoal === 'grouping' ? 'Grouping' : 'Engagement';
      setNameSuffix(`${weapon}${goal}`);
    }
  }, [weaponCategory, drillGoal, isEditing, nameSuffix]);

  // Check if distance is in common list
  const isDistanceInList = COMMON_DISTANCES.includes(Number(distanceM));

  // Display string for distance
  const distanceDisplay = useRange ? `${distanceM}–${distanceMaxM}m` : `${distanceM}m`;

  // Validation
  const canSave = () => {
    if (!fullName.trim()) return false;
    if (!distanceM || isNaN(Number(distanceM))) return false;

    // If using range, validate max distance
    if (useRange) {
      if (!distanceMaxM || isNaN(Number(distanceMaxM))) return false;
      if (Number(distanceMaxM) <= Number(distanceM)) return false; // Max must be > min
    }

    if (drillGoal === 'grouping') {
      if (!expectedGroupingCm || isNaN(Number(expectedGroupingCm))) return false;
    } else {
      if (!expectedAccuracyPct || isNaN(Number(expectedAccuracyPct))) return false;
    }

    return true;
  };

  // Save handler
  const handleSave = async () => {
    if (!canSave()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      // Build description with range info if applicable
      let finalDescription = description.trim();
      if (useRange) {
        const rangeNote = `Distance range: ${distanceM}-${distanceMaxM}m`;
        finalDescription = finalDescription ? `${rangeNote}. ${finalDescription}` : rangeNote;
      }

      const input: CreateStandardInput = {
        team_id: teamId,
        name: fullName.trim(),
        description: finalDescription || undefined,
        drill_goal: drillGoal,
        distance_m: Number(distanceM), // Store min distance
        weapon_category: weaponCategory,
        expected_grouping_cm: drillGoal === 'grouping' ? Number(expectedGroupingCm) : null,
        expected_accuracy_pct: drillGoal === 'engagement' ? Number(expectedAccuracyPct) : null,
        expected_time_seconds: expectedTimeSeconds ? Number(expectedTimeSeconds) : null,
      };

      if (isEditing && editingStandard) {
        await updateStandard(editingStandard.id, input);
      } else {
        await createStandard(input);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save standard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Grabber */}
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.text }]}>{isEditing ? 'Edit Standard' : 'New Standard'}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Define performance expectations</Text>
          </View>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.secondary }]} onPress={onClose}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Drill Goal - Primary Choice */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, { color: colors.text }]}>Type</Text>
            <View style={styles.goalRow}>
              <TouchableOpacity
                style={[
                  styles.goalCard,
                  drillGoal === 'grouping' && styles.goalCardSelected,
                  {
                    backgroundColor: drillGoal === 'grouping' ? colors.text : colors.secondary,
                    borderColor: drillGoal === 'grouping' ? colors.text : 'transparent',
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDrillGoal('grouping');
                }}
                activeOpacity={0.8}
              >
                <Target size={22} color={drillGoal === 'grouping' ? colors.background : colors.text} />
                <Text style={[styles.goalLabel, { color: drillGoal === 'grouping' ? colors.background : colors.text }]}>
                  Grouping
                </Text>
                <Text
                  style={[
                    styles.goalHint,
                    { color: drillGoal === 'grouping' ? colors.background + 'AA' : colors.textMuted },
                  ]}
                >
                  Measure dispersion
                </Text>
                {drillGoal === 'grouping' && (
                  <View style={[styles.goalCheck, { backgroundColor: colors.background }]}>
                    <Check size={12} color={colors.text} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalCard,
                  drillGoal === 'engagement' && styles.goalCardSelected,
                  {
                    backgroundColor: drillGoal === 'engagement' ? colors.text : colors.secondary,
                    borderColor: drillGoal === 'engagement' ? colors.text : 'transparent',
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDrillGoal('engagement');
                }}
                activeOpacity={0.8}
              >
                <Crosshair size={22} color={drillGoal === 'engagement' ? colors.background : colors.text} />
                <Text
                  style={[styles.goalLabel, { color: drillGoal === 'engagement' ? colors.background : colors.text }]}
                >
                  Engagement
                </Text>
                <Text
                  style={[
                    styles.goalHint,
                    { color: drillGoal === 'engagement' ? colors.background + 'AA' : colors.textMuted },
                  ]}
                >
                  Measure accuracy %
                </Text>
                {drillGoal === 'engagement' && (
                  <View style={[styles.goalCheck, { backgroundColor: colors.background }]}>
                    <Check size={12} color={colors.text} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Distance */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Distance</Text>
                <View style={[styles.distanceBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.distanceBadgeText, { color: colors.primary }]}>{distanceDisplay}</Text>
                </View>
              </View>

              {/* Compact Range Toggle */}
              <View style={[styles.rangeTogglePill, { backgroundColor: colors.secondary }]}>
                <TouchableOpacity
                  style={[styles.rangeTogglePillOption, !useRange && { backgroundColor: colors.text }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setUseRange(false);
                  }}
                >
                  <Text
                    style={[styles.rangeTogglePillText, { color: !useRange ? colors.background : colors.textMuted }]}
                  >
                    Fixed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rangeTogglePillOption, useRange && { backgroundColor: colors.text }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setUseRange(true);
                  }}
                >
                  <Text
                    style={[styles.rangeTogglePillText, { color: useRange ? colors.background : colors.textMuted }]}
                  >
                    Range
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Range Inputs - Compact */}
            {useRange ? (
              <View style={styles.rangeInputRow}>
                <View style={[styles.rangeInputBox, { backgroundColor: colors.secondary }]}>
                  <TextInput
                    style={[styles.rangeInput, { color: colors.text }]}
                    value={distanceM}
                    onChangeText={setDistanceM}
                    keyboardType="number-pad"
                    placeholder="100"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.rangeInputUnit, { color: colors.textMuted }]}>m</Text>
                </View>
                <Text style={[styles.rangeSeparator, { color: colors.textMuted }]}>–</Text>
                <View style={[styles.rangeInputBox, { backgroundColor: colors.secondary }]}>
                  <TextInput
                    style={[styles.rangeInput, { color: colors.text }]}
                    value={distanceMaxM}
                    onChangeText={setDistanceMaxM}
                    keyboardType="number-pad"
                    placeholder="200"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.rangeInputUnit, { color: colors.textMuted }]}>m</Text>
                </View>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.distanceScroller}
                >
                  {COMMON_DISTANCES.map((d) => {
                    const isSelected = distanceM === String(d) && !showCustomDistance;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.distanceChip,
                          {
                            backgroundColor: isSelected ? colors.text : 'transparent',
                            borderColor: isSelected ? colors.text : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDistanceM(String(d));
                          setShowCustomDistance(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.distanceChipValue, { color: isSelected ? colors.background : colors.text }]}
                        >
                          {d}
                        </Text>
                        <Text
                          style={[
                            styles.distanceChipUnit,
                            { color: isSelected ? colors.background + 'AA' : colors.textMuted },
                          ]}
                        >
                          m
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom */}
                  <TouchableOpacity
                    style={[
                      styles.distanceChip,
                      styles.distanceChipCustom,
                      {
                        backgroundColor: showCustomDistance || !isDistanceInList ? colors.text : 'transparent',
                        borderColor: showCustomDistance || !isDistanceInList ? colors.text : colors.border,
                        borderStyle: 'dashed',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowCustomDistance(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.distanceChipValue,
                        { color: showCustomDistance || !isDistanceInList ? colors.background : colors.textMuted },
                      ]}
                    >
                      {showCustomDistance || !isDistanceInList ? distanceM : '···'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Custom Input */}
                {showCustomDistance && (
                  <View style={[styles.customInputRow, { backgroundColor: colors.secondary }]}>
                    <TextInput
                      style={[styles.customInput, { color: colors.text }]}
                      value={distanceM}
                      onChangeText={setDistanceM}
                      keyboardType="number-pad"
                      placeholder="Enter distance"
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                    />
                    <Text style={[styles.customInputUnit, { color: colors.textMuted }]}>meters</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Weapon Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, { color: colors.text }]}>Weapon</Text>
            <View style={styles.weaponRow}>
              {WEAPON_CATEGORIES.map((w) => {
                const isSelected = weaponCategory === w.value;
                return (
                  <TouchableOpacity
                    key={w.label}
                    style={[
                      styles.weaponChip,
                      {
                        backgroundColor: isSelected ? colors.text : 'transparent',
                        borderColor: isSelected ? colors.text : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setWeaponCategory(w.value);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.weaponChipText, { color: isSelected ? colors.background : colors.text }]}>
                      {w.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Expected Value - The Key Metric */}
          <View style={[styles.section, styles.metricSection, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              {drillGoal === 'grouping' ? 'MAX GROUPING' : 'MIN ACCURACY'}
            </Text>
            <View style={styles.metricInputRow}>
              <TextInput
                style={[styles.metricInput, { color: colors.text }]}
                value={drillGoal === 'grouping' ? expectedGroupingCm : expectedAccuracyPct}
                onChangeText={drillGoal === 'grouping' ? setExpectedGroupingCm : setExpectedAccuracyPct}
                keyboardType="numeric"
                placeholder={drillGoal === 'grouping' ? '8' : '80'}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.metricUnit, { color: colors.text }]}>{drillGoal === 'grouping' ? 'cm' : '%'}</Text>
            </View>
            <Text style={[styles.metricHint, { color: colors.textMuted }]}>
              {drillGoal === 'grouping'
                ? 'Shots must group within this diameter'
                : 'Shooter must achieve at least this hit rate'}
            </Text>
          </View>

          {/* Time Limit (Optional) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, { color: colors.text }]}>
              Time Limit <Text style={{ color: colors.textMuted, fontWeight: '400' }}>(optional)</Text>
            </Text>
            <View style={[styles.timeInputRow, { backgroundColor: colors.secondary }]}>
              <TextInput
                style={[styles.timeInput, { color: colors.text }]}
                value={expectedTimeSeconds}
                onChangeText={setExpectedTimeSeconds}
                keyboardType="number-pad"
                placeholder="No limit"
                placeholderTextColor={colors.textMuted}
              />
              {expectedTimeSeconds && <Text style={[styles.timeUnit, { color: colors.textMuted }]}>seconds</Text>}
            </View>
          </View>

          {/* Name - Distance prefix (auto) + editable suffix */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, { color: colors.text }]}>Name</Text>
            <View style={[styles.nameInputRow, { backgroundColor: colors.secondary }]}>
              <View style={[styles.namePrefix, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.namePrefixText, { color: colors.primary }]}>{distancePrefix}</Text>
              </View>
              <TextInput
                style={[styles.nameSuffixInput, { color: colors.text }]}
                value={nameSuffix}
                onChangeText={setNameSuffix}
                placeholder="Rifle Grouping"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Text style={[styles.namePreview, { color: colors.textMuted }]}>Preview: {fullName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, { color: colors.text }]}>
              Notes <Text style={{ color: colors.textMuted, fontWeight: '400' }}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.secondary, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Additional context for this standard"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: canSave() && !saving ? colors.text : colors.secondary }]}
            onPress={handleSave}
            disabled={!canSave() || saving}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnText, { color: canSave() && !saving ? colors.background : colors.textMuted }]}>
              {saving ? 'Saving...' : isEditing ? 'Update Standard' : 'Create Standard'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleStandalone: {
    marginBottom: 12,
  },

  // Goal Cards
  goalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    position: 'relative',
  },
  goalCardSelected: {
    // Selected state handled by backgroundColor/borderColor
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  goalHint: {
    fontSize: 12,
    marginTop: 2,
  },
  goalCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Distance
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Compact Range Toggle Pill
  rangeTogglePill: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  rangeTogglePillOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rangeTogglePillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Compact Range Inputs
  rangeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rangeInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  rangeInputUnit: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 2,
  },
  rangeSeparator: {
    fontSize: 16,
    fontWeight: '600',
  },

  distanceScroller: {
    gap: 10,
    paddingVertical: 2,
  },
  distanceChip: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceChipCustom: {
    width: 54,
  },
  distanceChipValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  distanceChipUnit: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 14,
  },
  customInputUnit: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Weapon
  weaponRow: {
    flexDirection: 'row',
    gap: 10,
  },
  weaponChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  weaponChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Metric (Primary Value)
  metricSection: {
    padding: 20,
    borderRadius: 16,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  metricInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricInput: {
    fontSize: 48,
    fontWeight: '700',
    minWidth: 80,
  },
  metricUnit: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 4,
    opacity: 0.6,
  },
  metricHint: {
    fontSize: 12,
    marginTop: 8,
  },

  // Time
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  timeInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 14,
  },
  timeUnit: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Text Inputs
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },

  // Name input with prefix
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  namePrefix: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  namePrefixText: {
    fontSize: 15,
    fontWeight: '700',
  },
  nameSuffixInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
  },
  namePreview: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
