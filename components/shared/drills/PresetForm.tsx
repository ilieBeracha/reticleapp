/**
 * PresetForm - Create or edit drill presets
 * 
 * Allows setting:
 * - Name
 * - Drill goal (grouping/achievement/zeroing/physical)
 * - Weapon category filter
 * - Distance, shots, time limit
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  createPreset,
  updatePreset,
  type CreatePresetInput,
  type DrillGoal,
  type DrillPreset,
} from '@/services/presetService';
import { WEAPON_CATEGORIES, type WeaponCategory } from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import {
  Check,
  ChevronLeft,
  Crosshair,
  Target
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface PresetFormProps {
  /** Existing preset to edit (null for create mode) */
  preset?: DrillPreset | null;
  onComplete: (preset: DrillPreset) => void;
  onCancel: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DRILL_GOALS: { value: DrillGoal; label: string; Icon: React.ComponentType<any> }[] = [
  { value: 'grouping', label: 'Grouping', Icon: Crosshair },
  { value: 'engagement', label: 'Engagement', Icon: Target },
];

const TARGET_TYPES = [
  { value: 'paper' as const, label: 'Paper' },
  { value: 'tactical' as const, label: 'Tactical' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PresetForm({ preset, onComplete, onCancel }: PresetFormProps) {
  const colors = useColors();
  const isEditing = !!preset;
  
  // Form state
  const [name, setName] = useState(preset?.name || '');
  const [drillGoal, setDrillGoal] = useState<DrillGoal>(preset?.drill_goal || 'grouping');
  const [targetType, setTargetType] = useState<'paper' | 'tactical'>(preset?.target_type || 'paper');
  const [weaponCategory, setWeaponCategory] = useState<WeaponCategory | null>(
    preset?.weapon_category as WeaponCategory || null
  );
  const [distance, setDistance] = useState(preset?.distance_m?.toString() || '25');
  const [shots, setShots] = useState(preset?.rounds_per_shooter?.toString() || '5');
  const [timeLimit, setTimeLimit] = useState(preset?.time_limit_seconds?.toString() || '');
  const [description, setDescription] = useState(preset?.description || '');
  
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    const distanceNum = parseInt(distance, 10);
    const shotsNum = parseInt(shots, 10);
    
    if (isNaN(distanceNum) || distanceNum <= 0) {
      Alert.alert('Error', 'Distance must be a positive number');
      return;
    }
    
    if (isNaN(shotsNum) || shotsNum <= 0) {
      Alert.alert('Error', 'Shots must be a positive number');
      return;
    }

    setSaving(true);
    
    try {
      const input: CreatePresetInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        drill_goal: drillGoal,
        target_type: targetType,
        weapon_category: weaponCategory,
        distance_m: distanceNum,
        rounds_per_shooter: shotsNum,
        time_limit_seconds: timeLimit ? parseInt(timeLimit, 10) : null,
      };

      let result: DrillPreset;
      
      if (isEditing && preset) {
        result = await updatePreset(preset.id, input);
      } else {
        result = await createPreset(input);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(result);
    } catch (err: any) {
      console.error('Failed to save preset:', err);
      Alert.alert('Error', err.message || 'Failed to save preset');
    } finally {
      setSaving(false);
    }
  }, [name, description, drillGoal, targetType, weaponCategory, distance, shots, timeLimit, isEditing, preset, onComplete]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={onCancel}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? 'Edit Preset' : 'New Preset'}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Check size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Name */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g., 100m Grouping"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>

        {/* Drill Goal */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Goal *</Text>
          <View style={styles.chipRow}>
            {DRILL_GOALS.map((goal) => {
              const isSelected = drillGoal === goal.value;
              const Icon = goal.Icon;
              return (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.goalChip,
                    { backgroundColor: isSelected ? colors.text : colors.card },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDrillGoal(goal.value);
                  }}
                >
                  <Icon size={14} color={isSelected ? colors.background : colors.text} />
                  <Text
                    style={[
                      styles.goalText,
                      { color: isSelected ? colors.background : colors.text },
                    ]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Target Type */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Target Type</Text>
          <View style={styles.chipRow}>
            {TARGET_TYPES.map((type) => {
              const isSelected = targetType === type.value;
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.chip,
                    { backgroundColor: isSelected ? colors.text : colors.card },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTargetType(type.value);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? colors.background : colors.text },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Weapon Category */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            Weapon Category (optional)
          </Text>
          <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
            Filter weapons when starting this drill
          </Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: weaponCategory === null ? colors.text : colors.card },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setWeaponCategory(null);
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: weaponCategory === null ? colors.background : colors.text },
                ]}
              >
                Any
              </Text>
            </TouchableOpacity>
            {WEAPON_CATEGORIES.map((cat) => {
              const isSelected = weaponCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.chip,
                    { backgroundColor: isSelected ? colors.text : colors.card },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setWeaponCategory(cat.value);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? colors.background : colors.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Distance & Shots Row */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Distance (m) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={distance}
              onChangeText={setDistance}
              placeholder="25"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Shots *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={shots}
              onChangeText={setShots}
              placeholder="5"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Time Limit */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Time Limit (seconds)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={timeLimit}
            onChangeText={setTimeLimit}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes about this drill..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: name.trim() ? colors.text : colors.secondary }]}
          onPress={handleSave}
          disabled={!name.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Text style={[styles.saveBtnText, { color: colors.background }]}>
                {isEditing ? 'Save Changes' : 'Create Preset'}
              </Text>
              <Check size={18} color={colors.background} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: -4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

