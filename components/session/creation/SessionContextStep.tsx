/**
 * SessionContextStep - Configure session details (distance, rounds, drill)
 *
 * Step 3 in the 3-step flow. Weapon is already selected in step 2.
 */

import { PresetForm } from '@/components/drills';
import type { DrillType } from '@/constants/categoryDrills';
import { type CategoryDrill, getDrillById } from '@/constants/categoryDrills';
import { getCategoryConfig, getCategoryDistances } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillGoal, DrillPreset } from '@/services/presetService';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit3,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CategoryDrillPicker } from '../CategoryDrillPicker';
import {
  DISTANCE_PRESETS,
  POSITION_OPTIONS,
  SHOTS_PRESETS,
  TIME_PRESETS,
} from './sessionCreation.constants';
import type { Position, SessionContextState, SessionPurpose } from './sessionCreation.types';

// ============================================================================
// TYPES
// ============================================================================

interface SessionContextStepProps {
  purpose: SessionPurpose;
  context: SessionContextState;
  onUpdateContext: (partial: Partial<SessionContextState>) => void;
  onBack: () => void;
  weaponCategory?: string | null;
  selectedDrillId?: string | null;
  onDrillChange?: (drillId: string | null) => void;
}

// ============================================================================
// INLINE PILL PICKER
// ============================================================================

function PillPicker({
  options,
  selected,
  onSelect,
  allowCustom,
  customSuffix = '',
}: {
  options: number[];
  selected: number;
  onSelect: (v: number) => void;
  allowCustom?: boolean;
  customSuffix?: string;
}) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const isCustom = !options.includes(selected);
  const [editing, setEditing] = useState(false);
  const [customText, setCustomText] = useState(String(selected));

  const handleCustomSubmit = () => {
    const num = parseInt(customText, 10);
    console.log('[PillPicker] handleCustomSubmit:', { customText, num, isValid: !isNaN(num) && num > 0 });
    if (!isNaN(num) && num > 0) {
      console.log('[PillPicker] Calling onSelect with:', num);
      onSelect(num);
    }
    setEditing(false);
  };

  return (
    <View style={styles.pillsContainer}>
      {/* Preset options */}
      <View style={styles.pillsPresets}>
        {options.map((opt) => {
          const active = opt === selected && !editing;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.pill,
                { backgroundColor: active ? colors.text : colors.card },
                editing && { opacity: 0.5 },
              ]}
              disabled={editing}
              onPress={() => { Haptics.selectionAsync(); onSelect(opt); setEditing(false); }}
            >
              <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
                {opt}{customSuffix}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Custom input - pushed to the right */}
      {allowCustom && (
        editing ? (
          <View style={[
            styles.pill,
            styles.pillInputContainer,
            { backgroundColor: colors.card, borderColor: colors.text }
          ]}>
            <TextInput
              ref={inputRef}
              style={[styles.pillInputText, { color: colors.text }]}
              value={customText}
              onChangeText={setCustomText}
              onBlur={handleCustomSubmit}
              onSubmitEditing={handleCustomSubmit}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
            />
            {customSuffix ? (
              <Text style={[styles.pillInputSuffix, { color: colors.text }]}>{customSuffix}</Text>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: isCustom ? colors.text : colors.card },
            ]}
            onPress={() => { setCustomText(String(selected)); setEditing(true); }}
          >
            <Text style={[styles.pillText, { color: isCustom ? colors.background : colors.text }]}>
              {isCustom ? `${selected}${customSuffix}` : 'Other'}
            </Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

// ============================================================================
// TIME PILL PICKER (handles null + seconds)
// ============================================================================

function TimePillPicker({
  options,
  selected,
  onSelect,
  allowCustom = true,
}: {
  options: (number | null)[];
  selected: number | null;
  onSelect: (v: number | null) => void;
  allowCustom?: boolean;
}) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const isCustom = selected !== null && !options.includes(selected);
  const [editing, setEditing] = useState(false);
  const [customText, setCustomText] = useState(selected ? String(selected) : '60');

  const formatTime = (s: number | null) => 
    s === null ? 'None' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`;

  const handleCustomSubmit = () => {
    const num = parseInt(customText, 10);
    if (!isNaN(num) && num > 0) onSelect(num);
    setEditing(false);
  };

  return (
    <View style={styles.pillsContainer}>
      {/* Preset options */}
      <View style={styles.pillsPresets}>
        {options.map((opt) => {
          const active = opt === selected && !editing;
          return (
            <TouchableOpacity
              key={String(opt)}
              style={[
                styles.pill,
                { backgroundColor: active ? colors.text : colors.card },
              ]}
              onPress={() => { Haptics.selectionAsync(); onSelect(opt); setEditing(false); }}
            >
              <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
                {formatTime(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Custom input - pushed to the right */}
      {allowCustom && (
        editing ? (
          <View style={[
            styles.pill,
            styles.pillInputContainer,
            { backgroundColor: colors.card, borderColor: colors.text }
          ]}>
            <TextInput
              ref={inputRef}
              style={[styles.pillInputText, { color: colors.text }]}
              value={customText}
              onChangeText={setCustomText}
              onBlur={handleCustomSubmit}
              onSubmitEditing={handleCustomSubmit}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
            />
            <Text style={[styles.pillInputSuffix, { color: colors.text }]}>s</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: isCustom ? colors.text : colors.card },
            ]}
            onPress={() => { setCustomText(selected ? String(selected) : '60'); setEditing(true); }}
          >
            <Text style={[styles.pillText, { color: isCustom ? colors.background : colors.text }]}>
              {isCustom ? formatTime(selected) : 'Other'}
            </Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SessionContextStep({
  purpose,
  context,
  onUpdateContext,
  onBack,
  weaponCategory,
  selectedDrillId,
  onDrillChange,
}: SessionContextStepProps) {
  const colors = useColors();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDrillPicker, setShowDrillPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [isEditingDrill, setIsEditingDrill] = useState(false);

  const selectedDrill = useMemo(() => selectedDrillId ? getDrillById(selectedDrillId) : null, [selectedDrillId]);

  // Check if drill params have been modified
  const isDrillModified = useMemo(() => {
    if (!selectedDrill) return false;
    return (
      context.distance !== selectedDrill.distances[0] ||
      context.shotsPlanned !== selectedDrill.rounds ||
      context.timeLimit !== selectedDrill.totalTimeLimit
    );
  }, [selectedDrill, context.distance, context.shotsPlanned, context.timeLimit]);

  const effectiveCategory = (context.weaponCategory || weaponCategory) as WeaponCategory | null;
  const categoryConfig = useMemo(() => effectiveCategory ? getCategoryConfig(effectiveCategory) : null, [effectiveCategory]);

  const distancePresets = useMemo(() => {
    if (effectiveCategory) return getCategoryDistances(effectiveCategory);
    return DISTANCE_PRESETS[purpose] || DISTANCE_PRESETS.custom;
  }, [effectiveCategory, purpose]);

  const shotsPresets = SHOTS_PRESETS[purpose] || SHOTS_PRESETS.custom;

  const positionOptions = useMemo(() => {
    if (categoryConfig) {
      const positions = categoryConfig.drillDefaults.positions;
      return POSITION_OPTIONS.filter((p) => p.value === 'any' || positions.includes(p.value));
    }
    return POSITION_OPTIONS;
  }, [categoryConfig]);

  const handleDrillSelect = useCallback((drill: CategoryDrill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Use defaults if available, fall back to legacy fields
    const defaults = drill.defaults || {};
    onUpdateContext({
      distance: defaults.distance ?? drill.distances[0],
      shotsPlanned: defaults.rounds ?? drill.rounds,
      position: (defaults.position ?? drill.positions[0]) as Position,
      timeLimit: defaults.timeLimit !== undefined ? defaults.timeLimit : drill.totalTimeLimit,
      targetType: drill.targetType,
    });
    onDrillChange?.(drill.id);
    setShowDrillPicker(false);
  }, [onUpdateContext, onDrillChange]);

  const formatTime = (s: number | null) => (s === null ? 'None' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`);

  // Map purpose to drill goal for preset
  const purposeToDrillGoal = (p: SessionPurpose): DrillGoal => {
    const map: Record<SessionPurpose, DrillGoal> = {
      grouping: 'grouping',
      achievement: 'achievement',
      zeroing: 'zeroing',
      physical: 'physical',
      custom: 'grouping',
    };
    return map[p];
  };

  // Map purpose to drill types for filtering
  const purposeToDrillTypes = useMemo((): DrillType[] | undefined => {
    const map: Record<SessionPurpose, DrillType[]> = {
      zeroing: ['zeroing', 'diagnostic'],
      grouping: ['grouping', 'accuracy'],
      achievement: ['qualification', 'competition'],
      physical: ['stress', 'movement', 'speed'],
      custom: [], // Empty = show all
    };
    const types = map[purpose];
    return types.length > 0 ? types : undefined;
  }, [purpose]);

  const handleSaveAsPreset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPresetForm(true);
  }, []);

  const handlePresetCreated = useCallback((preset: DrillPreset) => {
    setShowPresetForm(false);
    setIsEditingDrill(false);
    Alert.alert('Saved', `"${preset.name}" saved to your presets`);
  }, []);

  const handleEditDrill = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditingDrill(true);
  }, []);

  const handleResetDrill = useCallback(() => {
    if (!selectedDrill) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const defaults = selectedDrill.defaults || {};
    onUpdateContext({
      distance: defaults.distance ?? selectedDrill.distances[0],
      shotsPlanned: defaults.rounds ?? selectedDrill.rounds,
      timeLimit: defaults.timeLimit !== undefined ? defaults.timeLimit : selectedDrill.totalTimeLimit,
      position: (defaults.position ?? selectedDrill.positions[0]) as Position,
    });
    setIsEditingDrill(false);
  }, [selectedDrill, onUpdateContext]);

  return (
    <View style={styles.container}>
      {/* Drill Toggle */}
      <TouchableOpacity
        style={styles.drillRow}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDrillPicker(true); }}
        activeOpacity={0.6}
      >
        <Text style={[styles.drillLabel, { color: colors.textMuted }]}>
          {selectedDrill ? 'Drill' : 'Use a drill?'}
        </Text>
        {selectedDrill ? (
          <View style={styles.drillSelected}>
            <Text style={[styles.drillName, { color: colors.text }]}>
              {selectedDrill.name}
              {isDrillModified && <Text style={{ color: colors.textMuted }}> (edited)</Text>}
            </Text>
            <Text style={[styles.drillChange, { color: colors.textMuted }]}>Change</Text>
          </View>
        ) : (
          <ChevronRight size={16} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {/* Drill edit controls when drill is selected */}
      {selectedDrill && (
        <>
          {/* Edit/Save actions */}
          <View style={styles.drillActions}>
            {!isEditingDrill ? (
              <TouchableOpacity
                style={[styles.drillActionBtn, { backgroundColor: colors.card }]}
                onPress={handleEditDrill}
              >
                <Edit3 size={14} color={colors.text} />
                <Text style={[styles.drillActionText, { color: colors.text }]}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <>
                {isDrillModified && (
                  <TouchableOpacity
                    style={[styles.drillActionBtn, { backgroundColor: colors.card }]}
                    onPress={handleResetDrill}
                  >
                    <X size={14} color={colors.textMuted} />
                    <Text style={[styles.drillActionText, { color: colors.textMuted }]}>Reset</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity
              style={[styles.drillActionBtn, { backgroundColor: colors.card }]}
              onPress={handleSaveAsPreset}
            >
              <Bookmark size={14} color={colors.text} />
              <Text style={[styles.drillActionText, { color: colors.text }]}>Save as Preset</Text>
            </TouchableOpacity>
          </View>

          {/* Editable params when editing */}
          {isEditingDrill && (
            <>
              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Distance</Text>
                <PillPicker
                  options={distancePresets.slice(0, 4)}
                  selected={context.distance}
                  onSelect={(d) => onUpdateContext({ distance: d })}
                  allowCustom
                  customSuffix="m"
                />
              </View>

              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Bullets</Text>
                <PillPicker
                  options={shotsPresets.slice(0, 4)}
                  selected={context.shotsPlanned}
                  onSelect={(s) => {
                    console.log('[SessionContextStep] Bullets onSelect:', s, 'current:', context.shotsPlanned);
                    onUpdateContext({ shotsPlanned: s });
                  }}
                  allowCustom
                />
              </View>

              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Time limit</Text>
                <TimePillPicker
                  options={TIME_PRESETS}
                  selected={context.timeLimit}
                  onSelect={(t) => onUpdateContext({ timeLimit: t })}
                />
              </View>
            </>
          )}

          {/* Summary when not editing */}
          {!isEditingDrill && (
            <View style={styles.drillSummary}>
              <Text style={[styles.drillSummaryText, { color: colors.textMuted }]}>
                {context.distance}m • {context.shotsPlanned} bullets{context.timeLimit ? ` • ${formatTime(context.timeLimit)}` : ''}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Custom params if no drill */}
      {!selectedDrill && (
        <>
          <View style={styles.paramRow}>
            <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Distance</Text>
            <PillPicker
              options={distancePresets.slice(0, 4)}
              selected={context.distance}
              onSelect={(d) => onUpdateContext({ distance: d })}
              allowCustom
              customSuffix="m"
            />
          </View>

          <View style={styles.paramRow}>
            <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Bullets</Text>
            <PillPicker
              options={shotsPresets.slice(0, 4)}
              selected={context.shotsPlanned}
              onSelect={(s) => {
                console.log('[SessionContextStep] Bullets (custom) onSelect:', s, 'current:', context.shotsPlanned);
                onUpdateContext({ shotsPlanned: s });
              }}
              allowCustom
            />
          </View>

          {/* Advanced toggle */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={[styles.advancedText, { color: colors.textMuted }]}>
              {showAdvanced ? 'Less options' : 'More options'}
            </Text>
            {showAdvanced ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
          </TouchableOpacity>

          {showAdvanced && (
            <>
              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Position</Text>
                <View style={styles.pills}>
                  {positionOptions.map((opt) => {
                    const active = context.position === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.pill,
                          { backgroundColor: active ? colors.text : colors.card },
                        ]}
                        onPress={() => { Haptics.selectionAsync(); onUpdateContext({ position: opt.value }); }}
                      >
                        <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Time limit</Text>
                <TimePillPicker
                  options={TIME_PRESETS}
                  selected={context.timeLimit}
                  onSelect={(t) => onUpdateContext({ timeLimit: t })}
                />
              </View>

              <View style={styles.notesRow}>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="Session notes..."
                  placeholderTextColor={colors.textMuted}
                  value={context.notes}
                  onChangeText={(notes) => onUpdateContext({ notes })}
                  multiline
                />
              </View>
            </>
          )}
        </>
      )}

      {/* Drill Picker Modal */}
      <Modal visible={showDrillPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDrillPicker(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Drill</Text>
            <TouchableOpacity onPress={() => setShowDrillPicker(false)}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <CategoryDrillPicker
            category={effectiveCategory}
            selectedDrillId={selectedDrillId}
            onSelectDrill={handleDrillSelect}
            showHeader={false}
            filterTypes={purposeToDrillTypes}
          />
        </View>
      </Modal>

      {/* Preset Form Modal */}
      <Modal visible={showPresetForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPresetForm(false)}>
        <PresetForm
          preset={{
            id: '',
            name: selectedDrill?.name ? `My ${selectedDrill.name}` : '',
            description: selectedDrill?.description || null,
            drill_goal: purposeToDrillGoal(purpose),
            target_type: (context.targetType === 'paper' || context.targetType === 'tactical') ? context.targetType : 'paper',
            weapon_category: effectiveCategory,
            distance_m: context.distance,
            rounds_per_shooter: context.shotsPlanned,
            time_limit_seconds: context.timeLimit,
            strings_count: selectedDrill?.strings || 1,
            is_default: false,
            created_at: '',
            updated_at: '',
          }}
          onComplete={handlePresetCreated}
          onCancel={() => setShowPresetForm(false)}
        />
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { paddingTop: 8 },

  // Params
  paramRow: { paddingVertical: 14 },
  paramLabel: { fontSize: 13, marginBottom: 10 },

  // Drill row
  drillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  drillLabel: { fontSize: 15 },
  drillSelected: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  drillName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  drillChange: { fontSize: 13 },
  drillActions: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  drillActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  drillActionText: { fontSize: 13, fontWeight: '500' },
  drillSummary: { paddingVertical: 8 },
  drillSummaryText: { fontSize: 14 },

  // Pills
  pillsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillsPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  pillText: { fontSize: 14, fontWeight: '500' },
  pillInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, gap: 2, paddingHorizontal: 12 },
  pillInputText: { fontSize: 14, fontWeight: '600', minWidth: 32, textAlign: 'center', paddingVertical: 0 },
  pillInputSuffix: { fontSize: 13, fontWeight: '500' },

  // Advanced
  advancedToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  advancedText: { fontSize: 13 },

  // Notes
  notesRow: { paddingVertical: 8 },
  notesInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },

  // Modal header
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  modalTitle: { fontSize: 17, fontWeight: '600' },
});
