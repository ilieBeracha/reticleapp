/**
 * AddModifierModal
 *
 * Create or edit a condition modifier.
 * Modern, elegant design.
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  createModifier,
  updateModifier,
  type CreateModifierInput,
  type ModifierConditionType,
  type StandardModifier,
} from '@/services/standards/standardsService';
import * as Haptics from 'expo-haptics';
import { Check, Clock, CloudRain, Heart, Thermometer, Wind, X, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface AddModifierModalProps {
  visible: boolean;
  teamId: string;
  editingModifier: StandardModifier | null;
  onClose: () => void;
  onSave: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

interface ConditionOption {
  type: ModifierConditionType;
  name: string;
  description: string;
  icon: typeof CloudRain;
  thresholdKey?: string;
  thresholdLabel?: string;
  thresholdPlaceholder?: string;
  defaultThreshold?: number;
}

const CONDITION_OPTIONS: ConditionOption[] = [
  {
    type: 'weather_rain',
    name: 'Rain',
    description: 'When weather conditions include rain',
    icon: CloudRain,
  },
  {
    type: 'weather_wind',
    name: 'High Wind',
    description: 'When wind speed exceeds threshold',
    icon: Wind,
    thresholdKey: 'wind_kmh_gt',
    thresholdLabel: 'Wind speed above',
    thresholdPlaceholder: '15',
    defaultThreshold: 15,
  },
  {
    type: 'weather_cold',
    name: 'Cold',
    description: 'When temperature is below threshold',
    icon: Thermometer,
    thresholdKey: 'temp_c_lt',
    thresholdLabel: 'Temperature below',
    thresholdPlaceholder: '5',
    defaultThreshold: 5,
  },
  {
    type: 'weather_hot',
    name: 'Hot',
    description: 'When temperature is above threshold',
    icon: Thermometer,
    thresholdKey: 'temp_c_gt',
    thresholdLabel: 'Temperature above',
    thresholdPlaceholder: '35',
    defaultThreshold: 35,
  },
  {
    type: 'fatigue_shots',
    name: 'Shots',
    description: 'After firing many rounds in a session',
    icon: Zap,
    thresholdKey: 'shots_gt',
    thresholdLabel: 'Shots fired above',
    thresholdPlaceholder: '50',
    defaultThreshold: 50,
  },
  {
    type: 'fatigue_time',
    name: 'Duration',
    description: 'After extended time in session',
    icon: Clock,
    thresholdKey: 'duration_minutes_gt',
    thresholdLabel: 'Duration above',
    thresholdPlaceholder: '30',
    defaultThreshold: 30,
  },
  {
    type: 'fatigue_hr',
    name: 'Heart Rate',
    description: 'When average heart rate exceeds threshold',
    icon: Heart,
    thresholdKey: 'hr_bpm_gt',
    thresholdLabel: 'Heart rate above',
    thresholdPlaceholder: '140',
    defaultThreshold: 140,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddModifierModal({ visible, teamId, editingModifier, onClose, onSave }: AddModifierModalProps) {
  const colors = useColors();
  const isEditing = !!editingModifier;

  // Form state
  const [selectedCondition, setSelectedCondition] = useState<ConditionOption | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');
  const [effectType, setEffectType] = useState<'tolerance' | 'invalidate' | 'override'>('tolerance');
  const [groupingPenalty, setGroupingPenalty] = useState('');
  const [accuracyPenalty, setAccuracyPenalty] = useState('');
  const [timePenalty, setTimePenalty] = useState('');
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (editingModifier) {
        const condition = CONDITION_OPTIONS.find((c) => c.type === editingModifier.condition_type);
        setSelectedCondition(condition || null);

        if (condition?.thresholdKey) {
          setThresholdValue(String(editingModifier.condition_threshold[condition.thresholdKey] || ''));
        }

        setEffectType(editingModifier.modifier_effect_type || 'tolerance');
        setGroupingPenalty(editingModifier.grouping_penalty_cm?.toString() || '');
        setAccuracyPenalty(editingModifier.accuracy_penalty_pct?.toString() || '');
        setTimePenalty(editingModifier.time_penalty_seconds?.toString() || '');
        setCustomName(editingModifier.name);
      } else {
        setSelectedCondition(null);
        setThresholdValue('');
        setEffectType('tolerance');
        setGroupingPenalty('');
        setAccuracyPenalty('');
        setTimePenalty('');
        setCustomName('');
      }
    }
  }, [visible, editingModifier]);

  // Validation
  const canSave = () => {
    if (!selectedCondition) return false;

    // If condition has threshold, it must be filled
    if (selectedCondition.thresholdKey && !thresholdValue) return false;

    // For tolerance effect, must have at least one penalty
    if (effectType === 'tolerance') {
      const hasGrouping = groupingPenalty && Number(groupingPenalty) > 0;
      const hasAccuracy = accuracyPenalty && Number(accuracyPenalty) > 0;
      const hasTime = timePenalty && Number(timePenalty) > 0;
      if (!hasGrouping && !hasAccuracy && !hasTime) return false;
    }

    // For invalidate/override, no penalties needed
    return true;
  };

  // Save handler
  const handleSave = async () => {
    if (!canSave() || !selectedCondition) {
      const msg =
        effectType === 'tolerance'
          ? 'Please fill in all required fields and at least one penalty'
          : 'Please fill in all required fields';
      Alert.alert('Validation Error', msg);
      return;
    }

    setSaving(true);

    try {
      const threshold: Record<string, number> = {};
      if (selectedCondition.thresholdKey && thresholdValue) {
        threshold[selectedCondition.thresholdKey] = Number(thresholdValue);
      }

      const input: CreateModifierInput = {
        team_id: teamId,
        condition_type: selectedCondition.type,
        condition_threshold: threshold,
        modifier_effect_type: effectType,
        grouping_penalty_cm: effectType === 'tolerance' && groupingPenalty ? Number(groupingPenalty) : 0,
        accuracy_penalty_pct: effectType === 'tolerance' && accuracyPenalty ? Number(accuracyPenalty) : 0,
        time_penalty_seconds: effectType === 'tolerance' && timePenalty ? Number(timePenalty) : 0,
        name: customName || selectedCondition.name,
        description: selectedCondition.description,
      };

      if (isEditing && editingModifier) {
        await updateModifier(editingModifier.id, input);
      } else {
        await createModifier(input);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save modifier');
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
            <Text style={[styles.title, { color: colors.text }]}>{isEditing ? 'Edit Modifier' : 'New Modifier'}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Adjust standards for conditions</Text>
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
          {/* Condition Type - Primary Choice */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trigger Condition</Text>
            <View style={styles.conditionGrid}>
              {CONDITION_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedCondition?.type === option.type;

                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.conditionCard,
                      {
                        backgroundColor: isSelected ? colors.orange : colors.secondary,
                        borderColor: isSelected ? colors.orange : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCondition(option);
                      if (option.defaultThreshold) {
                        setThresholdValue(String(option.defaultThreshold));
                      } else {
                        setThresholdValue('');
                      }
                      if (!customName) {
                        setCustomName(option.name);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon size={20} color={isSelected ? '#fff' : colors.textMuted} />
                    <Text style={[styles.conditionName, { color: isSelected ? '#fff' : colors.text }]}>
                      {option.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.conditionCheck, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                        <Check size={10} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Threshold (if applicable) */}
          {selectedCondition?.thresholdKey && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{selectedCondition.thresholdLabel}</Text>
              <View style={[styles.thresholdRow, { backgroundColor: colors.secondary }]}>
                <TextInput
                  style={[styles.thresholdInput, { color: colors.text }]}
                  value={thresholdValue}
                  onChangeText={setThresholdValue}
                  keyboardType="number-pad"
                  placeholder={selectedCondition.thresholdPlaceholder}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.thresholdUnit, { color: colors.textMuted }]}>
                  {selectedCondition.thresholdKey === 'wind_kmh_gt'
                    ? 'km/h'
                    : selectedCondition.thresholdKey?.includes('temp')
                      ? '°C'
                      : selectedCondition.thresholdKey === 'shots_gt'
                        ? 'shots'
                        : selectedCondition.thresholdKey === 'duration_minutes_gt'
                          ? 'min'
                          : selectedCondition.thresholdKey === 'hr_bpm_gt'
                            ? 'BPM'
                            : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Effect Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Effect</Text>
            <View style={styles.effectRow}>
              <TouchableOpacity
                style={[
                  styles.effectCard,
                  effectType === 'tolerance' && styles.effectCardSelected,
                  {
                    backgroundColor: effectType === 'tolerance' ? colors.text : colors.secondary,
                    borderColor: effectType === 'tolerance' ? colors.text : 'transparent',
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEffectType('tolerance');
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.effectLabel, { color: effectType === 'tolerance' ? colors.background : colors.text }]}
                >
                  Tolerance
                </Text>
                <Text
                  style={[
                    styles.effectHint,
                    { color: effectType === 'tolerance' ? colors.background + 'AA' : colors.textMuted },
                  ]}
                >
                  Adjust threshold
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.effectCard,
                  effectType === 'override' && styles.effectCardSelected,
                  {
                    backgroundColor: effectType === 'override' ? colors.destructive : colors.secondary,
                    borderColor: effectType === 'override' ? colors.destructive : 'transparent',
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEffectType('override');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.effectLabel, { color: effectType === 'override' ? '#fff' : colors.text }]}>
                  Force Fail
                </Text>
                <Text
                  style={[
                    styles.effectHint,
                    { color: effectType === 'override' ? 'rgba(255,255,255,0.7)' : colors.textMuted },
                  ]}
                >
                  Always FAIL
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Penalties Section - Only for tolerance effect */}
          {effectType === 'tolerance' && (
            <View style={[styles.section, styles.penaltySection, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.penaltySectionTitle, { color: colors.textMuted }]}>ADJUSTMENTS</Text>
              <Text style={[styles.penaltySectionHint, { color: colors.textMuted }]}>
                At least one required. Values are added/subtracted from base standard.
              </Text>

              {/* Grouping Penalty */}
              <View style={styles.penaltyRow}>
                <Text style={[styles.penaltyLabel, { color: colors.text }]}>Grouping</Text>
                <View style={[styles.penaltyInputRow, { backgroundColor: colors.card }]}>
                  <Text style={[styles.penaltyPrefix, { color: colors.orange }]}>+</Text>
                  <TextInput
                    style={[styles.penaltyInput, { color: colors.text }]}
                    value={groupingPenalty}
                    onChangeText={setGroupingPenalty}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.penaltySuffix, { color: colors.textMuted }]}>cm</Text>
                </View>
              </View>

              {/* Accuracy Penalty */}
              <View style={styles.penaltyRow}>
                <Text style={[styles.penaltyLabel, { color: colors.text }]}>Accuracy</Text>
                <View style={[styles.penaltyInputRow, { backgroundColor: colors.card }]}>
                  <Text style={[styles.penaltyPrefix, { color: colors.orange }]}>−</Text>
                  <TextInput
                    style={[styles.penaltyInput, { color: colors.text }]}
                    value={accuracyPenalty}
                    onChangeText={setAccuracyPenalty}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.penaltySuffix, { color: colors.textMuted }]}>%</Text>
                </View>
              </View>

              {/* Time Penalty */}
              <View style={[styles.penaltyRow, { marginBottom: 0 }]}>
                <Text style={[styles.penaltyLabel, { color: colors.text }]}>Time</Text>
                <View style={[styles.penaltyInputRow, { backgroundColor: colors.card }]}>
                  <Text style={[styles.penaltyPrefix, { color: colors.orange }]}>+</Text>
                  <TextInput
                    style={[styles.penaltyInput, { color: colors.text }]}
                    value={timePenalty}
                    onChangeText={setTimePenalty}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.penaltySuffix, { color: colors.textMuted }]}>sec</Text>
                </View>
              </View>
            </View>
          )}

          {/* Custom Name */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Name <Text style={{ color: colors.textMuted, fontWeight: '400' }}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.secondary, color: colors.text }]}
              value={customName}
              onChangeText={setCustomName}
              placeholder={selectedCondition?.name || 'Modifier name'}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: canSave() && !saving ? colors.orange : colors.secondary }]}
            onPress={handleSave}
            disabled={!canSave() || saving}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnText, { color: canSave() && !saving ? '#fff' : colors.textMuted }]}>
              {saving ? 'Saving...' : isEditing ? 'Update Modifier' : 'Create Modifier'}
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Condition Grid
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  conditionCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
    position: 'relative',
  },
  conditionName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  conditionCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Threshold
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  thresholdInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 14,
  },
  thresholdUnit: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Effect Cards
  effectRow: {
    flexDirection: 'row',
    gap: 12,
  },
  effectCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  effectCardSelected: {
    // Handled by backgroundColor/borderColor
  },
  effectLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  effectHint: {
    fontSize: 12,
    marginTop: 2,
  },

  // Penalty Section
  penaltySection: {
    padding: 16,
    borderRadius: 16,
  },
  penaltySectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  penaltySectionHint: {
    fontSize: 11,
    marginBottom: 16,
  },
  penaltyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  penaltyLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  penaltyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  penaltyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    width: 16,
  },
  penaltyInput: {
    fontSize: 18,
    fontWeight: '600',
    width: 50,
    textAlign: 'center',
  },
  penaltySuffix: {
    fontSize: 12,
    fontWeight: '500',
    width: 30,
  },

  // Text Input
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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
