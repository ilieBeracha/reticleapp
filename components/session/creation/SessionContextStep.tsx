/**
 * SessionContextStep - Configure your session
 */

import { PresetForm } from '@/components/drills';
import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { type CategoryDrill, getDrillById } from '@/constants/categoryDrills';
import { getCategoryConfig, getCategoryDistances } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillGoal, DrillPreset } from '@/services/presetService';
import { createUserWeapon, type GlobalWeapon, type UserWeapon } from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Edit3,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CategoryDrillPicker } from '../CategoryDrillPicker';
import type { DrillType } from '@/constants/categoryDrills';
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
  customSuffix,
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
    if (!isNaN(num) && num > 0) onSelect(num);
    setEditing(false);
  };

  return (
    <View style={styles.pills}>
      {options.map((opt) => {
        const active = opt === selected && !editing;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.pill,
              { backgroundColor: active ? colors.text : colors.card },
            ]}
            onPress={() => { Haptics.selectionAsync(); onSelect(opt); setEditing(false); }}
          >
            <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
              {opt}{customSuffix}
            </Text>
          </TouchableOpacity>
        );
      })}
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
            <Text style={[styles.pillInputSuffix, { color: colors.text }]}>{customSuffix}</Text>
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
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [showDrillPicker, setShowDrillPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [isEditingDrill, setIsEditingDrill] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [selectedCatalogWeapon, setSelectedCatalogWeapon] = useState<GlobalWeapon | null>(null);

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

  // Handlers
  const handleWeaponSelect = useCallback((weapon: UserWeapon) => {
    const config = weapon.category ? getCategoryConfig(weapon.category) : null;
    const update: Partial<SessionContextState> = {
      weaponId: weapon.id,
      weaponName: weapon.name,
      weaponCategory: weapon.category || null,
    };
    if (config && !context.weaponId) {
      update.distance = config.distances.zeroDistance;
      update.position = config.drillDefaults.defaultPosition as Position;
    }
    if (onDrillChange && selectedDrillId) onDrillChange(null);
    onUpdateContext(update);
    setShowWeaponPicker(false);
  }, [onUpdateContext, context.weaponId, onDrillChange, selectedDrillId]);

  const handleCatalogWeaponSelect = useCallback(async (catalogWeapon: GlobalWeapon) => {
    try {
      const userWeapon = await createUserWeapon({
        name: catalogWeapon.name,
        base_weapon_id: catalogWeapon.id,
        category: catalogWeapon.category,
        caliber: catalogWeapon.caliber || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdateContext({
        weaponId: userWeapon.id,
        weaponName: userWeapon.name,
        weaponCategory: userWeapon.category || null,
      });
      setShowWeaponPicker(false);
    } catch {
      setSelectedCatalogWeapon(catalogWeapon);
      setShowWeaponPicker(false);
      setShowCreateWeapon(true);
    }
  }, [onUpdateContext]);

  const handleWeaponCreated = useCallback(async (weaponId: string) => {
    setShowCreateWeapon(false);
    setSelectedCatalogWeapon(null);
    try {
      const { getUserWeapon } = await import('@/services/weaponService');
      const weapon = await getUserWeapon(weaponId);
      if (weapon) {
        onUpdateContext({ weaponId: weapon.id, weaponName: weapon.name, weaponCategory: weapon.category || null });
      }
    } catch {
      setPickerKey((k) => k + 1);
      setShowWeaponPicker(true);
    }
  }, [onUpdateContext]);

  const handleDrillSelect = useCallback((drill: CategoryDrill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpdateContext({
      distance: drill.distances[0],
      shotsPlanned: drill.rounds,
      position: drill.positions[0] as Position,
      timeLimit: drill.totalTimeLimit,
      targetType: drill.targetType,
    });
    onDrillChange?.(drill.id);
    setShowDrillPicker(false);
  }, [onUpdateContext, onDrillChange]);

  const formatTime = (s: number | null) => (s === null ? 'None' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`);
  const formatPosition = (p: Position) => POSITION_OPTIONS.find((o) => o.value === p)?.label || p;

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
    onUpdateContext({
      distance: selectedDrill.distances[0],
      shotsPlanned: selectedDrill.rounds,
      timeLimit: selectedDrill.totalTimeLimit,
      position: selectedDrill.positions[0] as Position,
    });
    setIsEditingDrill(false);
  }, [selectedDrill, onUpdateContext]);

  return (
    <View style={styles.container}>
      {/* Weapon Row */}
      <TouchableOpacity
        style={styles.weaponRow}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowWeaponPicker(true); }}
        activeOpacity={0.6}
      >
        <Crosshair size={20} color={context.weaponId ? colors.text : colors.textMuted} strokeWidth={1.5} />
        <View style={styles.weaponText}>
          <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
            {context.weaponName || 'Select weapon'}
          </Text>
          {categoryConfig && (
            <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>{categoryConfig.label}</Text>
          )}
        </View>
        {context.weaponId ? (
          <Check size={16} color={colors.text} strokeWidth={2.5} />
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {/* Parameters - only if weapon selected */}
      {context.weaponId && effectiveCategory && (
        <View style={styles.params}>
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
                    <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Rounds</Text>
                    <PillPicker
                      options={shotsPresets.slice(0, 4)}
                      selected={context.shotsPlanned}
                      onSelect={(s) => onUpdateContext({ shotsPlanned: s })}
                      allowCustom
                    />
                  </View>

                  <View style={styles.paramRow}>
                    <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Time limit</Text>
                    <View style={styles.pills}>
                      {TIME_PRESETS.map((t) => {
                        const active = context.timeLimit === t;
                        return (
                          <TouchableOpacity
                            key={String(t)}
                            style={[
                              styles.pill,
                              { backgroundColor: active ? colors.text : colors.card },
                            ]}
                            onPress={() => { Haptics.selectionAsync(); onUpdateContext({ timeLimit: t }); }}
                          >
                            <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
                              {formatTime(t)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

              {/* Summary when not editing */}
              {!isEditingDrill && (
                <View style={styles.drillSummary}>
                  <Text style={[styles.drillSummaryText, { color: colors.textMuted }]}>
                    {context.distance}m • {context.shotsPlanned} rounds{context.timeLimit ? ` • ${formatTime(context.timeLimit)}` : ''}
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
                <Text style={[styles.paramLabel, { color: colors.textMuted }]}>Rounds</Text>
                <PillPicker
                  options={shotsPresets.slice(0, 4)}
                  selected={context.shotsPlanned}
                  onSelect={(s) => onUpdateContext({ shotsPlanned: s })}
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
                    <View style={styles.pills}>
                      {TIME_PRESETS.map((t) => {
                        const active = context.timeLimit === t;
                        return (
                          <TouchableOpacity
                            key={String(t)}
                            style={[
                              styles.pill,
                              { backgroundColor: active ? colors.text : colors.card },
                            ]}
                            onPress={() => { Haptics.selectionAsync(); onUpdateContext({ timeLimit: t }); }}
                          >
                            <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
                              {formatTime(t)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
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
        </View>
      )}

      {/* Modals */}
      <Modal visible={showWeaponPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowWeaponPicker(false)}>
        <WeaponPicker
          key={pickerKey}
          selectedWeaponId={context.weaponId}
          onSelect={handleWeaponSelect}
          onSelectCatalog={handleCatalogWeaponSelect}
          onAddNew={() => { setShowWeaponPicker(false); setShowCreateWeapon(true); }}
          onClose={() => setShowWeaponPicker(false)}
          weaponCategory={weaponCategory as any}
        />
      </Modal>

      <Modal visible={showCreateWeapon} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateWeapon(false)}>
        <CreateWeaponFlow
          onComplete={handleWeaponCreated}
          onCancel={() => { setShowCreateWeapon(false); setShowWeaponPicker(true); }}
        />
      </Modal>

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

  // Weapon row
  weaponRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  weaponText: { flex: 1 },
  weaponName: { fontSize: 17, fontWeight: '500' },
  weaponMeta: { fontSize: 13, marginTop: 2 },

  // Params
  params: { marginTop: 8 },
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
