/**
 * DrillSelectionStep V2 - Simplified Drill Selection
 * 
 * Uses the new canonical drills architecture:
 * - Canonical drills (global, read-only "verbs")
 * - Team presets (saved configurations)
 * 
 * Flow:
 * 1. Select a canonical drill
 * 2. Configure distance/rounds/etc
 * 3. Optionally save as team preset
 */

import { useColors } from '@/hooks/ui/useColors';
import type {
  CanonicalDrill,
  DrillCategory,
  DrillConfig,
  ShootingPosition,
  TeamDrillPreset,
  TrainingDrillItem,
} from '@/services/drills';
import { buildTrainingDrillItem, validateDrillConfig } from '@/services/drills';
import * as Haptics from 'expo-haptics';
import {
  Check,
  Focus,
  Plus,
  Save,
  Star,
  Target,
  Trophy,
  X,
  Zap
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout, SlideOutLeft } from 'react-native-reanimated';

// Common shooting distances (in meters)
const COMMON_DISTANCES = [25, 50, 100, 200, 300, 400, 500];

// ============================================================================
// TYPES
// ============================================================================

interface DrillSelectionStepV2Props {
  /** Currently added training drills */
  drills: TrainingDrillItem[];
  /** Canonical drills grouped by category */
  canonicalDrills: Record<DrillCategory, CanonicalDrill[]>;
  /** Team's saved presets */
  teamPresets: TeamDrillPreset[];
  /** Loading state */
  loading?: boolean;
  /** Add a drill to the program */
  onAddDrill: (drill: TrainingDrillItem) => void;
  /** Remove a drill from the program */
  onRemoveDrill: (id: string) => void;
  /** Open adjust modal for a drill */
  onAdjustDrill: (drill: TrainingDrillItem) => void;
  /** Save a preset */
  onSavePreset?: (drillId: string, config: DrillConfig, label?: string) => Promise<void>;
  /** Can create presets? */
  canCreatePresets?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_CONFIG: Record<DrillCategory, { label: string; icon: any; color: string }> = {
  zeroing: { label: 'Zeroing', icon: Focus, color: '#3B82F6' },
  grouping: { label: 'Grouping', icon: Target, color: '#22C55E' },
  speed: { label: 'Speed', icon: Zap, color: '#F59E0B' },
  qualification: { label: 'Qualification', icon: Trophy, color: '#8B5CF6' },
};

const POSITIONS: { value: ShootingPosition; label: string }[] = [
  { value: 'prone', label: 'Prone' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'sitting', label: 'Sitting' },
  { value: 'standing', label: 'Standing' },
];

// ============================================================================
// DRILL CARD
// ============================================================================

function DrillCard({
  drill,
  preset,
  isAdded,
  onPress,
  colors,
}: {
  drill: CanonicalDrill;
  preset?: TeamDrillPreset;
  isAdded: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const categoryConfig = drill.category ? CATEGORY_CONFIG[drill.category] : null;
  const goalColor = drill.drill_goal === 'grouping' ? '#22C55E' : '#F59E0B';
  
  return (
    <TouchableOpacity
      style={[
        styles.drillCard,
        { 
          backgroundColor: isAdded ? colors.text : colors.card,
          borderColor: isAdded ? colors.text : colors.border,
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.goalDot, { backgroundColor: goalColor }]} />
      <View style={styles.drillCardContent}>
        <Text 
          style={[styles.drillName, { color: isAdded ? colors.background : colors.text }]}
          numberOfLines={1}
        >
          {preset?.label || drill.name}
        </Text>
        <View style={styles.drillMetaRow}>
          <Text style={[styles.drillMeta, { color: isAdded ? colors.background + '99' : colors.textMuted }]}>
            {drill.default_shots} shots
            {drill.supports_time && ' · timed'}
          </Text>
          {preset && (
            <View style={[styles.presetBadge, { backgroundColor: colors.primary + '20' }]}>
              <Star size={10} color={colors.primary} fill={colors.primary} />
            </View>
          )}
        </View>
      </View>
      {isAdded ? (
        <Check size={16} color={colors.background} strokeWidth={2.5} />
      ) : (
        <Plus size={16} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// PROGRAM ITEM (added drill)
// ============================================================================

function ProgramItem({
  drill,
  index,
  onRemove,
  onAdjust,
  colors,
}: {
  drill: TrainingDrillItem;
  index: number;
  onRemove: () => void;
  onAdjust: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const goalColor = drill.drill_goal === 'grouping' ? '#22C55E' : '#F59E0B';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(200)}
      exiting={SlideOutLeft.duration(150)}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        style={[styles.programItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAdjust();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.programIndex, { backgroundColor: colors.text }]}>
          <Text style={[styles.programIndexText, { color: colors.background }]}>{index + 1}</Text>
        </View>
        <View style={styles.programInfo}>
          <Text style={[styles.programName, { color: colors.text }]} numberOfLines={1}>
            {drill.name}
          </Text>
          <View style={styles.programMetaRow}>
            <View style={[styles.programGoalBadge, { backgroundColor: goalColor + '20' }]}>
              <View style={[styles.programGoalDot, { backgroundColor: goalColor }]} />
              <Text style={[styles.programGoalText, { color: goalColor }]}>
                {drill.drill_goal === 'grouping' ? 'Grouping' : 'Engagement'}
              </Text>
            </View>
            <Text style={[styles.programParams, { color: colors.textMuted }]}>
              {drill.config.distance_m}m · {drill.config.rounds} rds
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRemove();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.removeBtn}
        >
          <Text style={[styles.removeBtnText, { color: colors.destructive }]}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionHeader({
  icon: Icon,
  title,
  color,
  count,
  colors,
}: {
  icon: any;
  title: string;
  color: string;
  count?: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: color + '15' }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {count !== undefined && (
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{count}</Text>
      )}
    </View>
  );
}

// ============================================================================
// CONFIGURE MODAL
// ============================================================================

function ConfigureModal({
  visible,
  drill,
  preset,
  onClose,
  onAdd,
  onSavePreset,
  canSavePreset,
  colors,
}: {
  visible: boolean;
  drill: CanonicalDrill | null;
  preset?: TeamDrillPreset;
  onClose: () => void;
  onAdd: (config: DrillConfig) => void;
  onSavePreset?: (config: DrillConfig) => void;
  canSavePreset?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const [distance, setDistance] = useState(100);
  const [customDistance, setCustomDistance] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [rounds, setRounds] = useState(5);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [position, setPosition] = useState<ShootingPosition | null>(null);
  
  // Reset state when drill or preset changes
  useEffect(() => {
    if (drill) {
      // For fixed_shots drills, always use the canonical shot count
      const effectiveRounds = drill.fixed_shots 
        ? drill.default_shots 
        : (preset?.rounds ?? drill.default_shots);
      
      const initialDistance = preset?.distance_m ?? (drill.allowed_distances?.[0] ?? 100);
      setDistance(initialDistance);
      setRounds(effectiveRounds);
      setTimeLimit(preset?.time_limit_seconds ?? null);
      setPosition(preset?.position ?? null);
      setShowCustomInput(false);
      setCustomDistance('');
    }
  }, [drill, preset]);

  // Determine if drill has restricted distances
  const hasRestrictedDistances = drill?.allowed_distances && drill.allowed_distances.length > 0;
  
  // Available distances: use restricted list OR common distances
  const availableDistances = hasRestrictedDistances 
    ? drill!.allowed_distances! 
    : COMMON_DISTANCES;
  
  // Check if current distance is in the available list (for "Other" state)
  const isDistanceInList = availableDistances.includes(distance);
  
  // For fixed_shots, always use drill's default (enforced, not configurable)
  const effectiveRounds = drill?.fixed_shots ? drill.default_shots : rounds;
  
  // Build config
  const config: DrillConfig = {
    distance_m: distance,
    rounds: effectiveRounds,
    time_limit_seconds: timeLimit,
    position: position,
    strings_count: drill?.default_strings ?? 1,
  };

  // Validation - don't include fixed_shots warning as an error
  const validation = drill ? validateDrillConfig(drill, config) : { valid: true, errors: [] };

  const handleAdd = () => {
    if (!drill || !validation.valid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAdd(config);
    onClose();
  };

  if (!drill) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={e => e.stopPropagation()}>
          <View style={[styles.modalGrabber, { backgroundColor: colors.border }]} />
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{drill.name}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          {drill.description && (
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>{drill.description}</Text>
          )}

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Distance */}
            <View style={styles.configSection}>
              <Text style={[styles.configLabel, { color: colors.text }]}>Distance</Text>
              
              {/* Restricted distances info */}
              {hasRestrictedDistances && (
                <Text style={[styles.configHint, { color: colors.textMuted }]}>
                  This drill requires specific distances
                </Text>
              )}
              
              <View style={styles.configOptions}>
                {availableDistances.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.configChip,
                      { 
                        backgroundColor: distance === d && !showCustomInput ? colors.text : colors.secondary,
                        borderColor: distance === d && !showCustomInput ? colors.text : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDistance(d);
                      setShowCustomInput(false);
                      setCustomDistance('');
                    }}
                  >
                    <Text style={[
                      styles.configChipText,
                      { color: distance === d && !showCustomInput ? colors.background : colors.text }
                    ]}>
                      {d}m
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {/* Custom distance option (only for unrestricted drills) */}
                {!hasRestrictedDistances && (
                  <TouchableOpacity
                    style={[
                      styles.configChip,
                      { 
                        backgroundColor: showCustomInput || !isDistanceInList ? colors.text : colors.secondary,
                        borderColor: showCustomInput || !isDistanceInList ? colors.text : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowCustomInput(true);
                    }}
                  >
                    <Text style={[
                      styles.configChipText,
                      { color: showCustomInput || !isDistanceInList ? colors.background : colors.text }
                    ]}>
                      Other
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Custom distance input */}
              {showCustomInput && !hasRestrictedDistances && (
                <View style={[styles.customInputContainer, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.customInput, { color: colors.text }]}
                    placeholder="Enter distance"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={customDistance}
                    onChangeText={(text) => {
                      setCustomDistance(text);
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num > 0) {
                        setDistance(num);
                      }
                    }}
                    autoFocus
                  />
                  <Text style={[styles.customInputSuffix, { color: colors.textMuted }]}>meters</Text>
                </View>
              )}
            </View>

            {/* Rounds */}
            {!drill.fixed_shots && (
              <View style={styles.configSection}>
                <Text style={[styles.configLabel, { color: colors.text }]}>Rounds</Text>
                <View style={styles.configOptions}>
                  {[3, 5, 10, 20].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.configChip,
                        { 
                          backgroundColor: rounds === r ? colors.text : colors.secondary,
                          borderColor: rounds === r ? colors.text : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setRounds(r);
                      }}
                    >
                      <Text style={[
                        styles.configChipText,
                        { color: rounds === r ? colors.background : colors.text }
                      ]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Time Limit */}
            {drill.supports_time && (
              <View style={styles.configSection}>
                <Text style={[styles.configLabel, { color: colors.text }]}>Time Limit</Text>
                <View style={styles.configOptions}>
                  {[null, 30, 60, 120].map((t) => (
                    <TouchableOpacity
                      key={t ?? 'none'}
                      style={[
                        styles.configChip,
                        { 
                          backgroundColor: timeLimit === t ? colors.text : colors.secondary,
                          borderColor: timeLimit === t ? colors.text : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTimeLimit(t);
                      }}
                    >
                      <Text style={[
                        styles.configChipText,
                        { color: timeLimit === t ? colors.background : colors.text }
                      ]}>
                        {t ? `${t}s` : 'None'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Position */}
            {drill.supports_position && (
              <View style={styles.configSection}>
                <Text style={[styles.configLabel, { color: colors.text }]}>Position</Text>
                <View style={styles.configOptions}>
                  {POSITIONS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.configChip,
                        { 
                          backgroundColor: position === p.value ? colors.text : colors.secondary,
                          borderColor: position === p.value ? colors.text : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPosition(position === p.value ? null : p.value);
                      }}
                    >
                      <Text style={[
                        styles.configChipText,
                        { color: position === p.value ? colors.background : colors.text }
                      ]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Fixed shots info (informational, not an error) */}
            {drill.fixed_shots && (
              <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  This drill uses exactly {drill.default_shots} shots
                </Text>
              </View>
            )}

            {/* Validation Errors */}
            {validation.errors.length > 0 && (
              <View style={[styles.validationBox, { backgroundColor: colors.destructive + '15' }]}>
                {validation.errors.map((err, i) => (
                  <Text key={i} style={[styles.validationText, { color: colors.destructive }]}>{err}</Text>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalActions}>
            {canSavePreset && onSavePreset && (
              <TouchableOpacity
                style={[styles.savePresetBtn, { borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSavePreset(config);
                }}
              >
                <Save size={16} color={colors.textMuted} />
                <Text style={[styles.savePresetText, { color: colors.textMuted }]}>Save Preset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: validation.valid ? colors.text : colors.secondary }
              ]}
              onPress={handleAdd}
              disabled={!validation.valid}
            >
              <Text style={[
                styles.addBtnText,
                { color: validation.valid ? colors.background : colors.textMuted }
              ]}>
                Add to Training
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillSelectionStepV2({
  drills,
  canonicalDrills,
  teamPresets,
  loading,
  onAddDrill,
  onRemoveDrill,
  onAdjustDrill,
  onSavePreset,
  canCreatePresets,
}: DrillSelectionStepV2Props) {
  const colors = useColors();
  
  // Modal state
  const [selectedDrill, setSelectedDrill] = useState<CanonicalDrill | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<TeamDrillPreset | undefined>(undefined);
  const [configModalVisible, setConfigModalVisible] = useState(false);

  // Track which drills are already added (by drill_id)
  const addedDrillIds = useMemo(() => new Set(drills.map(d => d.drill_id)), [drills]);

  // Map presets by drill_id for quick lookup
  const presetsByDrill = useMemo(() => {
    const map = new Map<string, TeamDrillPreset[]>();
    for (const preset of teamPresets) {
      const existing = map.get(preset.drill_id) || [];
      existing.push(preset);
      map.set(preset.drill_id, existing);
    }
    return map;
  }, [teamPresets]);

  // Handle drill selection
  const handleSelectDrill = (drill: CanonicalDrill, preset?: TeamDrillPreset) => {
    setSelectedDrill(drill);
    setSelectedPreset(preset);
    setConfigModalVisible(true);
  };

  // Handle add from config modal
  const handleAddFromConfig = (config: DrillConfig) => {
    if (!selectedDrill) return;
    const item = buildTrainingDrillItem(selectedDrill, config, selectedPreset?.id);
    onAddDrill(item);
    setConfigModalVisible(false);
    setSelectedDrill(null);
    setSelectedPreset(undefined);
  };

  // Handle save preset
  const handleSavePreset = async (config: DrillConfig) => {
    if (!selectedDrill || !onSavePreset) return;
    await onSavePreset(selectedDrill.id, config);
  };

  // Total rounds calculation
  const totalRounds = drills.reduce((sum, d) => sum + d.config.rounds * d.config.strings_count, 0);

  // Categories to show (in order)
  const categoryOrder: DrillCategory[] = ['zeroing', 'grouping', 'speed', 'qualification'];

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Program Section (Added Drills) */}
      {drills.length > 0 && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.section}>
          <View style={styles.programHeader}>
            <Text style={[styles.programTitle, { color: colors.text }]}>PROGRAM</Text>
            <Text style={[styles.programStats, { color: colors.textMuted }]}>
              {drills.length} {drills.length === 1 ? 'drill' : 'drills'} · {totalRounds} rounds
            </Text>
          </View>
          <View style={styles.programList}>
            {drills.map((drill, index) => (
              <ProgramItem
                key={drill.id}
                drill={drill}
                index={index}
                onRemove={() => onRemoveDrill(drill.id)}
                onAdjust={() => onAdjustDrill(drill)}
                colors={colors}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Team Presets (if any) */}
      {teamPresets.length > 0 && (
        <View style={styles.section}>
          <SectionHeader 
            icon={Star}
            title="Team Presets"
            color="#F59E0B"
            count={teamPresets.length}
            colors={colors}
          />
          <View style={styles.drillGrid}>
            {teamPresets.slice(0, 4).map((preset) => {
              const drill = preset.drill;
              if (!drill) return null;
              return (
                <DrillCard
                  key={preset.id}
                  drill={drill}
                  preset={preset}
                  isAdded={addedDrillIds.has(preset.drill_id)}
                  onPress={() => handleSelectDrill(drill, preset)}
                  colors={colors}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Canonical Drills by Category */}
      {categoryOrder.map((category) => {
        const categoryDrills = canonicalDrills[category] || [];
        if (categoryDrills.length === 0) return null;
        
        const config = CATEGORY_CONFIG[category];
        
        return (
          <View key={category} style={styles.section}>
            <SectionHeader 
              icon={config.icon}
              title={config.label}
              color={config.color}
              count={categoryDrills.length}
              colors={colors}
            />
            <View style={styles.drillGrid}>
              {categoryDrills.map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  isAdded={addedDrillIds.has(drill.id)}
                  onPress={() => handleSelectDrill(drill)}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        );
      })}

      {/* Configure Modal */}
      <ConfigureModal
        visible={configModalVisible}
        drill={selectedDrill}
        preset={selectedPreset}
        onClose={() => {
          setConfigModalVisible(false);
          setSelectedDrill(null);
          setSelectedPreset(undefined);
        }}
        onAdd={handleAddFromConfig}
        onSavePreset={canCreatePresets ? handleSavePreset : undefined}
        canSavePreset={canCreatePresets}
        colors={colors}
      />
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
  },

  // Program
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  programTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  programStats: {
    fontSize: 12,
  },
  programList: {
    gap: 8,
  },
  programItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  programIndex: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programIndexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  programMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  programGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  programGoalDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  programGoalText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  programParams: {
    fontSize: 12,
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 24,
  },

  // Drill Grid
  drillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    minWidth: '47%',
    flex: 1,
  },
  goalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  drillCardContent: {
    flex: 1,
  },
  drillName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  drillMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drillMeta: {
    fontSize: 11,
  },
  presetBadge: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    maxHeight: '80%',
  },
  modalGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  
  // Config Section
  configSection: {
    marginBottom: 20,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  configHint: {
    fontSize: 11,
    marginBottom: 8,
  },
  configOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  configChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  configChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Custom Input
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  customInputSuffix: {
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Info Box (informational messages)
  infoBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Validation
  validationBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  validationText: {
    fontSize: 13,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  savePresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  savePresetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
