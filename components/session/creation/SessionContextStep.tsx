/**
 * SessionContextStep - Configure session details (distance, bullets, drill)
 *
 * Step 2 in the 2-step flow. Contains distance, bullets, position, and drill settings.
 * Weapon selection is handled externally as a sheet.
 */

import { PresetForm } from '@/components/shared/drills/PresetForm';
import type { DrillType } from '@/constants/categoryDrills';
import { type CategoryDrill, getDrillById } from '@/constants/categoryDrills';
import { RANGE_CATEGORIES } from '@/constants/drill';
import { DISTANCE_PRESETS, POSITION_OPTIONS, SHOTS_PRESETS, TIME_PRESETS } from '@/constants/sessionCreation';
import { getCategoryConfig, getCategoryDistances } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillGoal, DrillPreset } from '@/services/presetService';
import type { Position, RangeCategory, SessionContextState, SessionPurpose } from '@/types/sessionCreation';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { Bookmark, ChevronDown, ChevronUp, Edit3, X } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CategoryDrillPicker } from '../CategoryDrillPicker';

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
  /** Hide weapon section - when weapon is shown externally (e.g., in parent component) */
  hideWeaponSection?: boolean;
  /** Show range category option (short/medium/long) for training configuration */
  showRangeCategory?: boolean;
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
  placeholder = 'Custom',
}: {
  options: number[];
  selected: number;
  onSelect: (v: number) => void;
  allowCustom?: boolean;
  customSuffix?: string;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  // 0 = no selection (treat as unset)
  const hasValue = selected > 0;
  const isCustom = hasValue && !options.includes(selected);
  const [editing, setEditing] = useState(false);
  const [customText, setCustomText] = useState(hasValue ? String(selected) : '');

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
          // Only show as active if we have a value and it matches
          const active = hasValue && opt === selected && !editing;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.pill,
                { backgroundColor: active ? colors.text : colors.card },
                editing && { opacity: 0.5 },
              ]}
              disabled={editing}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(opt);
                setEditing(false);
              }}
            >
              <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
                {opt}
                {customSuffix}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom input - pushed to the right */}
      {allowCustom &&
        (editing ? (
          <View
            style={[styles.pill, styles.pillInputContainer, { backgroundColor: colors.card, borderColor: colors.text }]}
          >
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
            {customSuffix ? <Text style={[styles.pillInputSuffix, { color: colors.text }]}>{customSuffix}</Text> : null}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: isCustom ? colors.text : colors.card }]}
            onPress={() => {
              setCustomText(hasValue ? String(selected) : '');
              setEditing(true);
            }}
          >
            <Text
              style={[
                styles.pillText,
                { color: isCustom ? colors.background : hasValue ? colors.text : colors.textMuted },
              ]}
            >
              {isCustom
                ? `${selected}${customSuffix}`
                : hasValue
                  ? String(selected)
                  : placeholder || t('common.custom')}
            </Text>
          </TouchableOpacity>
        ))}
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
  options: number[];
  selected: number;
  onSelect: (v: number) => void;
  allowCustom?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const isCustom = !options.includes(selected);
  const [editing, setEditing] = useState(false);
  const [customText, setCustomText] = useState(String(selected));

  const formatTime = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`);

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
              style={[styles.pill, { backgroundColor: active ? colors.text : colors.card }]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(opt);
                setEditing(false);
              }}
            >
              <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
                {formatTime(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom input - pushed to the right */}
      {allowCustom &&
        (editing ? (
          <View
            style={[styles.pill, styles.pillInputContainer, { backgroundColor: colors.card, borderColor: colors.text }]}
          >
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
            style={[styles.pill, { backgroundColor: isCustom ? colors.text : colors.card }]}
            onPress={() => {
              setCustomText(String(selected));
              setEditing(true);
            }}
          >
            <Text style={[styles.pillText, { color: isCustom ? colors.background : colors.text }]}>
              {isCustom ? formatTime(selected) : t('common.other')}
            </Text>
          </TouchableOpacity>
        ))}
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
  showRangeCategory = false,
}: SessionContextStepProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useRangeMode, setUseRangeMode] = useState(false);
  const [showDrillPicker, setShowDrillPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [isEditingDrill, setIsEditingDrill] = useState(false);

  const selectedDrill = useMemo(() => (selectedDrillId ? getDrillById(selectedDrillId) : null), [selectedDrillId]);

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
  const categoryConfig = useMemo(
    () => (effectiveCategory ? getCategoryConfig(effectiveCategory) : null),
    [effectiveCategory]
  );

  const distancePresets = useMemo(() => {
    if (effectiveCategory) return getCategoryDistances(effectiveCategory);
    return DISTANCE_PRESETS[purpose] || DISTANCE_PRESETS.engagement;
  }, [effectiveCategory, purpose]);

  const shotsPresets = SHOTS_PRESETS[purpose] || SHOTS_PRESETS.engagement;

  const positionOptions = useMemo(() => {
    const allOptions = POSITION_OPTIONS.map((opt) => ({
      ...opt,
      label: t(`session.positionOptions.${opt.value}`),
    }));
    if (categoryConfig) {
      const positions = categoryConfig.drillDefaults.positions;
      return allOptions.filter((p) => p.value === 'any' || positions.includes(p.value));
    }
    return allOptions;
  }, [categoryConfig, t]);

  const handleDrillSelect = useCallback(
    (drill: CategoryDrill) => {
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
    },
    [onUpdateContext, onDrillChange]
  );

  const formatTime = (s: number | null) =>
    s === null ? t('common.none') : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`;

  // Map purpose to drill goal for preset
  const purposeToDrillGoal = (p: SessionPurpose): DrillGoal => {
    const map: Record<string, DrillGoal> = {
      grouping: 'grouping',
      engagement: 'engagement',
      custom: 'grouping',
    };
    return map[p];
  };

  // Map purpose to drill types for filtering
  const purposeToDrillTypes = useMemo((): DrillType[] | undefined => {
    const map: Record<string, DrillType[]> = {
      grouping: ['grouping', 'accuracy'],
      engagement: ['qualification', 'competition'],
    };
    const types = map[purpose];
    return types.length > 0 ? types : undefined;
  }, [purpose]);

  const handleSaveAsPreset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPresetForm(true);
  }, []);

  const handlePresetCreated = useCallback(
    (preset: DrillPreset) => {
      setShowPresetForm(false);
      setIsEditingDrill(false);
      Alert.alert(t('common.saved'), t('session.presetSaved', { name: preset.name }));
    },
    [t]
  );

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
                <Text style={[styles.drillActionText, { color: colors.text }]}>{t('common.edit')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                {isDrillModified && (
                  <TouchableOpacity
                    style={[styles.drillActionBtn, { backgroundColor: colors.card }]}
                    onPress={handleResetDrill}
                  >
                    <X size={14} color={colors.textMuted} />
                    <Text style={[styles.drillActionText, { color: colors.textMuted }]}>{t('common.reset')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity
              style={[styles.drillActionBtn, { backgroundColor: colors.card }]}
              onPress={handleSaveAsPreset}
            >
              <Bookmark size={14} color={colors.text} />
              <Text style={[styles.drillActionText, { color: colors.text }]}>{t('session.saveAsPreset')}</Text>
            </TouchableOpacity>
          </View>

          {/* Editable params when editing */}
          {isEditingDrill && (
            <>
              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textMuted }]}>{t('session.distance')}</Text>
                <PillPicker
                  options={distancePresets.slice(0, 4)}
                  selected={context.distance}
                  onSelect={(d) => onUpdateContext({ distance: d })}
                  allowCustom
                  customSuffix="m"
                />
              </View>

              {/* Only show bullets for engagement - grouping gets count from scan */}
              {purpose !== 'grouping' && (
                <View style={styles.paramRow}>
                  <Text style={[styles.paramLabel, { color: colors.textMuted }]}>{t('session.bullets')}</Text>
                  <PillPicker
                    options={shotsPresets.slice(0, 4)}
                    selected={context.shotsPlanned}
                    onSelect={(s) => onUpdateContext({ shotsPlanned: s })}
                    allowCustom
                  />
                </View>
              )}

              <View style={styles.paramRow}>
                <Text style={[styles.paramLabel, { color: colors.textMuted }]}>{t('session.timeLimit')}</Text>
                <TimePillPicker
                  options={TIME_PRESETS}
                  selected={context.timeLimit ?? 60}
                  onSelect={(t) => onUpdateContext({ timeLimit: t })}
                />
              </View>
            </>
          )}

          {/* Summary when not editing */}
          {!isEditingDrill && (
            <View style={styles.drillSummary}>
              <Text style={[styles.drillSummaryText, { color: colors.textMuted }]}>
                {context.distance}m
                {purpose !== 'grouping' ? ` • ${context.shotsPlanned} ${t('session.bullets').toLowerCase()}` : ''}
                {context.timeLimit ? ` • ${formatTime(context.timeLimit)}` : ''}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Custom params if no drill */}
      {!selectedDrill && (
        <>
          <View style={styles.paramRow}>
            {/* Tappable label to toggle between exact/range - only when showRangeCategory */}
            {showRangeCategory ? (
              <TouchableOpacity
                style={styles.distanceLabelRow}
                onPress={() => {
                  Haptics.selectionAsync();
                  setUseRangeMode(!useRangeMode);
                  // Clear selection when switching
                  onUpdateContext({ distance: 0, distanceCategory: null });
                }}
              >
                <Text style={[styles.paramLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                  {useRangeMode ? t('training.distanceRange') : t('session.distance')}
                </Text>
                <View style={[styles.distanceModeBadge, { backgroundColor: colors.card }]}>
                  <Text style={[styles.distanceModeBadgeText, { color: colors.textMuted }]}>
                    {useRangeMode ? t('training.tapForExact') : t('training.tapForRange')}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.paramLabel, { color: colors.textMuted }]}>{t('session.distance')}</Text>
            )}

            {/* Exact distance picker */}
            {!useRangeMode && (
              <PillPicker
                options={distancePresets.slice(0, 4)}
                selected={context.distance}
                onSelect={(d) => onUpdateContext({ distance: d, distanceCategory: null })}
                allowCustom
                customSuffix="m"
              />
            )}

            {/* Range category picker */}
            {useRangeMode && showRangeCategory && (
              <>
                <View style={styles.rangeModeRow}>
                  {RANGE_CATEGORIES.map((cat) => {
                    const isSelected = context.distanceCategory === cat.value;
                    const label =
                      cat.value === 'short'
                        ? t('training.short')
                        : cat.value === 'medium'
                          ? t('training.medium')
                          : t('training.long');
                    return (
                      <TouchableOpacity
                        key={cat.value}
                        style={[styles.rangeModeBtn, { backgroundColor: isSelected ? colors.text : colors.card }]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          onUpdateContext({ distanceCategory: cat.value as RangeCategory, distance: 0 });
                        }}
                      >
                        <Text
                          style={[styles.rangeModeBtnText, { color: isSelected ? colors.background : colors.text }]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* Range description */}
                {context.distanceCategory && (
                  <Text style={[styles.rangeHint, { color: colors.textMuted }]}>
                    {context.distanceCategory === 'short' && t('training.shortRangeDesc')}
                    {context.distanceCategory === 'medium' && t('training.mediumRangeDesc')}
                    {context.distanceCategory === 'long' && t('training.longRangeDesc')}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Only show bullets for engagement - grouping gets count from scan */}
          {purpose !== 'grouping' && (
            <View style={styles.paramRow}>
              <Text style={[styles.paramLabel, { color: colors.textMuted }]}>{t('session.bullets')}</Text>
              <PillPicker
                options={shotsPresets.slice(0, 4)}
                selected={context.shotsPlanned}
                onSelect={(s) => onUpdateContext({ shotsPlanned: s })}
                allowCustom
              />
            </View>
          )}

          {/* Position - always visible */}
          <View style={styles.paramRow}>
            <Text style={[styles.paramLabel, { color: colors.textMuted }]}>{t('session.position')}</Text>
            <View style={styles.pills}>
              {positionOptions.map((opt) => {
                const active = context.position === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pill, { backgroundColor: active ? colors.text : colors.card }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onUpdateContext({ position: opt.value });
                    }}
                  >
                    <Text style={[styles.pillText, { color: active ? colors.background : colors.text }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Advanced toggle */}
          <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
            <Text style={[styles.advancedText, { color: colors.textMuted }]}>
              {showAdvanced ? t('session.lessOptions') : t('session.moreOptions')}
            </Text>
            {showAdvanced ? (
              <ChevronUp size={14} color={colors.textMuted} />
            ) : (
              <ChevronDown size={14} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          {showAdvanced && (
            <>
              {/* Time Limit Toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Text style={[styles.paramLabel, { color: colors.text, marginBottom: 0 }]}>
                    {t('session.timeLimit')}
                  </Text>
                  <Text style={[styles.toggleHint, { color: colors.textMuted }]}>{t('session.setCountdownTimer')}</Text>
                </View>
                <Switch
                  value={context.timeLimit !== null}
                  onValueChange={(enabled) => {
                    Haptics.selectionAsync();
                    onUpdateContext({ timeLimit: enabled ? 60 : null });
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>

              {/* Time picker - only show when enabled */}
              {context.timeLimit !== null && (
                <View style={[styles.paramRow, { paddingTop: 0 }]}>
                  <TimePillPicker
                    options={TIME_PRESETS}
                    selected={context.timeLimit}
                    onSelect={(t) => onUpdateContext({ timeLimit: t })}
                  />
                </View>
              )}

              {/* Stress Drill Toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Text style={[styles.paramLabel, { color: colors.text, marginBottom: 0 }]}>
                    {t('session.stressDrill')}
                  </Text>
                  <Text style={[styles.toggleHint, { color: colors.textMuted }]}>
                    {t('session.stressDrillDescription')}
                  </Text>
                </View>
                <Switch
                  value={context.stressDrill}
                  onValueChange={(enabled) => {
                    Haptics.selectionAsync();
                    onUpdateContext({ stressDrill: enabled });
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>

              <View style={styles.notesRow}>
                <TextInput
                  style={[
                    styles.notesInput,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder={t('session.sessionNotes')}
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
      <Modal
        visible={showDrillPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDrillPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('session.selectDrill')}</Text>
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
      <Modal
        visible={showPresetForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPresetForm(false)}
      >
        <PresetForm
          preset={{
            id: '',
            name: selectedDrill?.name ? `My ${selectedDrill.name}` : '',
            description: selectedDrill?.description || null,
            drill_goal: purposeToDrillGoal(purpose),
            target_type:
              context.targetType === 'paper' || context.targetType === 'tactical' ? context.targetType : 'paper',
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
  container: { },

  // Params
  paramRow: {  },
  paramLabel: { fontSize: 13, marginBottom: 10, alignSelf: 'flex-start' },

  // Drill row
  drillRow: {  },
  drillLabel: { fontSize: 15 },
  drillSelected: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  drillName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  drillChange: { fontSize: 13 },
  drillActions: { flexDirection: 'row', gap: 8, paddingVertical: 12 },
  drillActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
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

  // Range category mode
  rangeModeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeModeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  rangeModeBtnText: { fontSize: 13, fontWeight: '600' },
  rangeHint: { fontSize: 12, marginTop: 8 },
  distanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  distanceModeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceModeBadgeText: { fontSize: 11 },

  // Advanced
  advancedToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  advancedText: { fontSize: 13 },

  // Toggle row
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  toggleLabel: { flex: 1 },
  toggleHint: { fontSize: 12, marginTop: 2 },

  // Notes
  notesRow: { paddingVertical: 8 },
  notesInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },

  // Modal header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
});
