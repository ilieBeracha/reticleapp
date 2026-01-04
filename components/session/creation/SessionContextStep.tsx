/**
 * SessionContextStep - Configure session details (distance, rounds, drill)
 *
 * Step 3 in the 3-step flow. Weapon is already selected in step 2.
 * Elegant, simple design with visual hierarchy.
 */

import { PresetForm } from '@/components/drills';
import { WeaponPicker } from '@/components/weapons';
import type { DrillType } from '@/constants/categoryDrills';
import { type CategoryDrill, getDrillById } from '@/constants/categoryDrills';
import { getCategoryConfig, getCategoryDistances } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillGoal, DrillPreset } from '@/services/presetService';
import type { UserWeapon } from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Edit3,
  LayoutTemplate,
  Ruler,
  SlidersHorizontal,
  Timer,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
// ELEGANT PILL PICKER
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
    if (!isNaN(num) && num > 0) onSelect(num);
    setEditing(false);
  };

  return (
    <View style={styles.pillsRow}>
      {options.map((opt) => {
        const active = opt === selected && !editing;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.text : 'transparent',
                borderColor: active ? colors.text : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(opt);
              setEditing(false);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: active ? colors.background : colors.text },
              ]}
            >
              {opt}
              {customSuffix}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Custom input */}
      {allowCustom &&
        (editing ? (
          <View
            style={[
              styles.pill,
              styles.pillEditing,
              { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
            ]}
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
            {customSuffix ? (
              <Text style={[styles.pillInputSuffix, { color: colors.textMuted }]}>
                {customSuffix}
              </Text>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.pill,
              {
                backgroundColor: isCustom ? colors.text : 'transparent',
                borderColor: isCustom ? colors.text : colors.border,
                borderStyle: isCustom ? 'solid' : 'dashed',
              },
            ]}
            onPress={() => {
              setCustomText(String(selected));
              setEditing(true);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: isCustom ? colors.background : colors.textMuted },
              ]}
            >
              {isCustom ? `${selected}${customSuffix}` : 'Other'}
            </Text>
          </TouchableOpacity>
        ))}
    </View>
  );
}

// ============================================================================
// TIME PILL PICKER
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
    <View style={styles.pillsRow}>
      {options.map((opt) => {
        const active = opt === selected && !editing;
        return (
          <TouchableOpacity
            key={String(opt)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.text : 'transparent',
                borderColor: active ? colors.text : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(opt);
              setEditing(false);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: active ? colors.background : colors.text },
              ]}
            >
              {formatTime(opt)}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Custom input */}
      {allowCustom &&
        (editing ? (
          <View
            style={[
              styles.pill,
              styles.pillEditing,
              { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
            ]}
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
            <Text style={[styles.pillInputSuffix, { color: colors.textMuted }]}>s</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.pill,
              {
                backgroundColor: isCustom ? colors.text : 'transparent',
                borderColor: isCustom ? colors.text : colors.border,
                borderStyle: isCustom ? 'solid' : 'dashed',
              },
            ]}
            onPress={() => {
              setCustomText(selected ? String(selected) : '60');
              setEditing(true);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                { color: isCustom ? colors.background : colors.textMuted },
              ]}
            >
              {isCustom ? formatTime(selected) : 'Other'}
            </Text>
          </TouchableOpacity>
        ))}
    </View>
  );
}

// ============================================================================
// PARAMETER CARD - Elegant field container
// ============================================================================

interface ParamCardProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  delay?: number;
}

function ParamCard({ icon, label, children, delay = 0 }: ParamCardProps) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(delay)}
      style={[styles.paramCard, { backgroundColor: colors.card }]}
    >
      <View style={styles.paramCardHeader}>
        <View style={[styles.paramCardIcon, { backgroundColor: `${colors.text}08` }]}>
          {icon}
        </View>
        <Text style={[styles.paramCardLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {children}
    </Animated.View>
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
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [isEditingDrill, setIsEditingDrill] = useState(false);

  const selectedDrill = useMemo(
    () => (selectedDrillId ? getDrillById(selectedDrillId) : null),
    [selectedDrillId]
  );

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

  const handleDrillSelect = useCallback(
    (drill: CategoryDrill) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    s === null ? 'None' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`;

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
      custom: [],
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
      timeLimit:
        defaults.timeLimit !== undefined ? defaults.timeLimit : selectedDrill.totalTimeLimit,
      position: (defaults.position ?? selectedDrill.positions[0]) as Position,
    });
    setIsEditingDrill(false);
  }, [selectedDrill, onUpdateContext]);

  const handleWeaponSelect = useCallback(
    (weapon: UserWeapon) => {
      const config = weapon.category ? getCategoryConfig(weapon.category) : null;
      const update: Partial<SessionContextState> = {
        weaponId: weapon.id,
        weaponName: weapon.name,
        weaponCategory: weapon.category || null,
      };
      if (config) {
        update.distance = config.distances.zeroDistance;
        update.position = config.drillDefaults.defaultPosition as Position;
      }
      onUpdateContext(update);
      setShowWeaponPicker(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [onUpdateContext]
  );

  return (
    <View style={styles.container}>
      {/* ──────────────────────────────────────────────────────────────────────
          HEADER with weapon badge
      ────────────────────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.question, { color: colors.text }]}>Session details</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Configure your shooting session
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.weaponBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowWeaponPicker(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.weaponBadgeLabel, { color: colors.textMuted }]}>Weapon</Text>
          <Text style={[styles.weaponBadgeName, { color: colors.text }]} numberOfLines={1}>
            {context.weaponName || 'Select'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ──────────────────────────────────────────────────────────────────────
          DRILL SELECTOR (Optional)
      ────────────────────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(300).delay(50)}>
        <TouchableOpacity
          style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowDrillPicker(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.drillCardIcon, { backgroundColor: `${colors.primary}15` }]}>
            <LayoutTemplate size={20} color={colors.primary} strokeWidth={1.5} />
          </View>
          <View style={styles.drillCardContent}>
            <Text style={[styles.drillCardLabel, { color: colors.textMuted }]}>
              {selectedDrill ? 'Drill Template' : 'Use a drill template?'}
            </Text>
            {selectedDrill ? (
              <Text style={[styles.drillCardName, { color: colors.text }]} numberOfLines={1}>
                {selectedDrill.name}
                {isDrillModified && (
                  <Text style={{ color: colors.textMuted, fontWeight: '400' }}> (edited)</Text>
                )}
              </Text>
            ) : (
              <Text style={[styles.drillCardHint, { color: colors.textMuted }]}>
                Optional • Sets defaults for you
              </Text>
            )}
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>

      {/* ──────────────────────────────────────────────────────────────────────
          DRILL ACTIONS (when selected)
      ────────────────────────────────────────────────────────────────────── */}
      {selectedDrill && (
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
            isDrillModified && (
              <TouchableOpacity
                style={[styles.drillActionBtn, { backgroundColor: colors.card }]}
                onPress={handleResetDrill}
              >
                <X size={14} color={colors.textMuted} />
                <Text style={[styles.drillActionText, { color: colors.textMuted }]}>Reset</Text>
              </TouchableOpacity>
            )
          )}
          <TouchableOpacity
            style={[styles.drillActionBtn, { backgroundColor: colors.card }]}
            onPress={handleSaveAsPreset}
          >
            <Bookmark size={14} color={colors.text} />
            <Text style={[styles.drillActionText, { color: colors.text }]}>Save as Preset</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          MAIN PARAMETERS
      ────────────────────────────────────────────────────────────────────── */}
      {(!selectedDrill || isEditingDrill) && (
        <View style={styles.paramsContainer}>
          {/* Distance */}
          <ParamCard
            icon={<Ruler size={18} color={colors.text} strokeWidth={1.5} />}
            label="Distance"
            delay={50}
          >
            <PillPicker
              options={distancePresets.slice(0, 4)}
              selected={context.distance}
              onSelect={(d) => onUpdateContext({ distance: d })}
              allowCustom
              customSuffix="m"
            />
          </ParamCard>

          {/* Bullets */}
          <ParamCard
            icon={<Circle size={18} color={colors.text} strokeWidth={1.5} />}
            label="Bullets"
            delay={100}
          >
            <PillPicker
              options={shotsPresets.slice(0, 4)}
              selected={context.shotsPlanned}
              onSelect={(s) => onUpdateContext({ shotsPlanned: s })}
              allowCustom
            />
          </ParamCard>

          {/* Advanced Toggle (when no drill) */}
          {!selectedDrill && (
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
              activeOpacity={0.6}
            >
              <SlidersHorizontal size={14} color={colors.textMuted} />
              <Text style={[styles.advancedText, { color: colors.textMuted }]}>
                {showAdvanced ? 'Less options' : 'More options'}
              </Text>
              {showAdvanced ? (
                <ChevronUp size={14} color={colors.textMuted} />
              ) : (
                <ChevronDown size={14} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          )}

          {/* Advanced Options */}
          {(showAdvanced || selectedDrill) && (
            <>
              {/* Position */}
              {!selectedDrill && (
                <ParamCard
                  icon={<Circle size={18} color={colors.text} strokeWidth={1.5} />}
                  label="Position"
                  delay={150}
                >
                  <View style={styles.pillsRow}>
                    {positionOptions.map((opt) => {
                      const active = context.position === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.pill,
                            {
                              backgroundColor: active ? colors.text : 'transparent',
                              borderColor: active ? colors.text : colors.border,
                            },
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            onUpdateContext({ position: opt.value });
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              { color: active ? colors.background : colors.text },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ParamCard>
              )}

              {/* Time Limit */}
              <ParamCard
                icon={<Timer size={18} color={colors.text} strokeWidth={1.5} />}
                label="Time Limit"
                delay={200}
              >
                <TimePillPicker
                  options={TIME_PRESETS}
                  selected={context.timeLimit}
                  onSelect={(t) => onUpdateContext({ timeLimit: t })}
                />
              </ParamCard>

              {/* Notes */}
              {!selectedDrill && showAdvanced && (
                <Animated.View entering={FadeInDown.duration(300).delay(250)}>
                  <TextInput
                    style={[
                      styles.notesInput,
                      { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                    ]}
                    placeholder="Session notes (optional)..."
                    placeholderTextColor={colors.textMuted}
                    value={context.notes}
                    onChangeText={(notes) => onUpdateContext({ notes })}
                    multiline
                  />
                </Animated.View>
              )}
            </>
          )}
        </View>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          DRILL SUMMARY (when not editing)
      ────────────────────────────────────────────────────────────────────── */}
      {selectedDrill && !isEditingDrill && (
        <Animated.View entering={FadeInDown.duration(300).delay(50)} style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, { backgroundColor: colors.card }]}>
              <Ruler size={16} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>{context.distance}m</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Distance</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.card }]}>
              <Circle size={16} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {context.shotsPlanned}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Bullets</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.card }]}>
              <Timer size={16} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatTime(context.timeLimit)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Time</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          MODALS
      ────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={showDrillPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDrillPicker(false)}
      >
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
              context.targetType === 'paper' || context.targetType === 'tactical'
                ? context.targetType
                : 'paper',
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

      <Modal
        visible={showWeaponPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeaponPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Weapon</Text>
            <TouchableOpacity onPress={() => setShowWeaponPicker(false)}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <WeaponPicker
            onSelect={handleWeaponSelect}
            onClose={() => setShowWeaponPicker(false)}
            selectedWeaponId={context.weaponId}
          />
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  question: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
  },
  weaponBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 140,
    flexShrink: 0,
  },
  weaponBadgeLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weaponBadgeName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DRILL CARD
  // ─────────────────────────────────────────────────────────────────────────
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  drillCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillCardContent: {
    flex: 1,
    gap: 2,
  },
  drillCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  drillCardName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  drillCardHint: {
    fontSize: 13,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DRILL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
  drillActions: {
    flexDirection: 'row',
    gap: 8,
  },
  drillActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  drillActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PARAMETERS CONTAINER
  // ─────────────────────────────────────────────────────────────────────────
  paramsContainer: {
    gap: 12,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PARAM CARD
  // ─────────────────────────────────────────────────────────────────────────
  paramCard: {
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  paramCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paramCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paramCardLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PILLS
  // ─────────────────────────────────────────────────────────────────────────
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    minWidth: 52,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pillEditing: {
    borderWidth: 2,
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 2,
  },
  pillInputText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
    paddingVertical: 0,
  },
  pillInputSuffix: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ADVANCED TOGGLE
  // ─────────────────────────────────────────────────────────────────────────
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  advancedText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NOTES
  // ─────────────────────────────────────────────────────────────────────────
  notesInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  summaryContainer: {
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL
  // ─────────────────────────────────────────────────────────────────────────
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
});
