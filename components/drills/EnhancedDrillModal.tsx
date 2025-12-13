/**
 * Enhanced Drill Modal
 * Comprehensive drill creation/editing with all configuration options
 */
import { useColors } from '@/hooks/ui/useColors';
import type {
  CreateDrillInput,
  DrillCategory,
  DrillDifficulty,
  MovementType,
  ScoringMode,
  ShootingPosition,
  StartPosition,
  TargetSize,
  TargetType,
  WeaponCategory,
} from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Dumbbell,
  FileText,
  Move,
  Target,
  Trophy
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// OPTION CONFIGS
// ============================================================================

const SCORING_MODES: { value: ScoringMode; label: string; desc: string }[] = [
  { value: 'accuracy', label: 'Accuracy', desc: 'Hits / Shots fired' },
  { value: 'speed', label: 'Speed', desc: 'Time-based scoring' },
  { value: 'combined', label: 'Combined', desc: 'Time + Accuracy' },
  { value: 'pass_fail', label: 'Pass/Fail', desc: 'Meet threshold or not' },
  { value: 'points', label: 'Points', desc: 'Custom point scoring' },
];

const DIFFICULTIES: { value: DrillDifficulty; label: string; color: string }[] = [
  { value: 'beginner', label: 'Beginner', color: '#22C55E' },
  { value: 'intermediate', label: 'Intermediate', color: '#F59E0B' },
  { value: 'advanced', label: 'Advanced', color: '#EF4444' },
  { value: 'expert', label: 'Expert', color: '#7C3AED' },
];

const CATEGORIES: { value: DrillCategory; label: string }[] = [
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'speed', label: 'Speed' },
  { value: 'accuracy', label: 'Accuracy' },
  { value: 'stress', label: 'Stress/Pressure' },
  { value: 'tactical', label: 'Tactical' },
  { value: 'competition', label: 'Competition' },
  { value: 'qualification', label: 'Qualification' },
];

const POSITIONS: { value: ShootingPosition; label: string }[] = [
  { value: 'standing', label: 'Standing' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'prone', label: 'Prone' },
  { value: 'sitting', label: 'Sitting' },
  { value: 'barricade', label: 'Barricade' },
  { value: 'transition', label: 'Transition' },
  { value: 'freestyle', label: 'Freestyle' },
];

const START_POSITIONS: { value: StartPosition; label: string }[] = [
  { value: 'low_ready', label: 'Low Ready' },
  { value: 'high_ready', label: 'High Ready' },
  { value: 'holstered', label: 'Holstered' },
  { value: 'compressed_ready', label: 'Compressed' },
  { value: 'table_start', label: 'Table Start' },
  { value: 'surrender', label: 'Surrender' },
];

const WEAPONS: { value: WeaponCategory; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'rifle', label: 'Rifle' },
  { value: 'pistol', label: 'Pistol' },
  { value: 'carbine', label: 'Carbine' },
  { value: 'shotgun', label: 'Shotgun' },
  { value: 'precision_rifle', label: 'Precision' },
];

const TARGET_SIZES: { value: TargetSize; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'half', label: 'Half' },
  { value: 'head', label: 'Head' },
  { value: 'a_zone', label: 'A-Zone' },
  { value: 'c_zone', label: 'C-Zone' },
  { value: 'steel_8in', label: '8" Steel' },
  { value: 'steel_10in', label: '10" Steel' },
];

const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'advance', label: 'Advance' },
  { value: 'retreat', label: 'Retreat' },
  { value: 'lateral', label: 'Lateral' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'freestyle', label: 'Freestyle' },
];

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================
function SectionHeader({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  colors,
  hasValues,
}: {
  title: string;
  icon: any;
  isExpanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
  hasValues?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.sectionHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        <Icon size={18} color={hasValues ? '#93C5FD' : colors.textMuted} />
        <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>{title}</Text>
        {hasValues && <View style={[styles.hasValuesDot, { backgroundColor: '#93C5FD' }]} />}
      </View>
      {isExpanded ? (
        <ChevronUp size={18} color={colors.textMuted} />
      ) : (
        <ChevronDown size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// CHIP SELECTOR COMPONENT
// ============================================================================
function ChipSelector<T extends string>({
  options,
  value,
  onChange,
  colors,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T | undefined;
  onChange: (val: T | undefined) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const chipColor = opt.color || '#93C5FD';
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? `${chipColor}20` : colors.secondary,
                borderColor: isSelected ? chipColor : 'transparent',
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(isSelected ? undefined : opt.value);
            }}
          >
            <Text style={[styles.chipText, { color: isSelected ? chipColor : colors.text }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export interface EnhancedDrillModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (drill: CreateDrillInput & { id?: string }) => void;
  initialData?: Partial<CreateDrillInput & { id?: string }>;
  mode?: 'add' | 'edit';
}

export function EnhancedDrillModal({
  visible,
  onClose,
  onSave,
  initialData,
  mode = 'add',
}: EnhancedDrillModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // === BASIC ===
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [targetType, setTargetType] = useState<TargetType>(initialData?.target_type || 'paper');
  const [distance, setDistance] = useState(String(initialData?.distance_m || 100));
  const [rounds, setRounds] = useState(String(initialData?.rounds_per_shooter || 5));

  // === TIMING ===
  const [timeLimit, setTimeLimit] = useState(initialData?.time_limit_seconds ? String(initialData.time_limit_seconds) : '');
  const [parTime, setParTime] = useState(initialData?.par_time_seconds ? String(initialData.par_time_seconds) : '');

  // === SCORING ===
  const [scoringMode, setScoringMode] = useState<ScoringMode | undefined>(initialData?.scoring_mode);
  const [minAccuracy, setMinAccuracy] = useState(initialData?.min_accuracy_percent ? String(initialData.min_accuracy_percent) : '');
  const [pointsPerHit, setPointsPerHit] = useState(initialData?.points_per_hit ? String(initialData.points_per_hit) : '');
  const [penaltyPerMiss, setPenaltyPerMiss] = useState(initialData?.penalty_per_miss ? String(initialData.penalty_per_miss) : '');

  // === TARGETS ===
  const [targetCount, setTargetCount] = useState(initialData?.target_count ? String(initialData.target_count) : '1');
  const [targetSize, setTargetSize] = useState<TargetSize | undefined>(initialData?.target_size);
  const [shotsPerTarget, setShotsPerTarget] = useState(initialData?.shots_per_target ? String(initialData.shots_per_target) : '');
  const [targetExposure, setTargetExposure] = useState(initialData?.target_exposure_seconds ? String(initialData.target_exposure_seconds) : '');

  // === STAGE SETUP ===
  const [position, setPosition] = useState<ShootingPosition | undefined>(initialData?.position);
  const [startPosition, setStartPosition] = useState<StartPosition | undefined>(initialData?.start_position);
  const [weapon, setWeapon] = useState<WeaponCategory | undefined>(initialData?.weapon_category);
  const [stringsCount, setStringsCount] = useState(initialData?.strings_count ? String(initialData.strings_count) : '1');
  const [reloadRequired, setReloadRequired] = useState(initialData?.reload_required || false);
  const [movementType, setMovementType] = useState<MovementType | undefined>(initialData?.movement_type);
  const [movementDistance, setMovementDistance] = useState(initialData?.movement_distance_m ? String(initialData.movement_distance_m) : '');

  // === DIFFICULTY ===
  const [difficulty, setDifficulty] = useState<DrillDifficulty | undefined>(initialData?.difficulty);
  const [category, setCategory] = useState<DrillCategory | undefined>(initialData?.category);

  // === CONTENT ===
  const [instructions, setInstructions] = useState(initialData?.instructions || '');
  const [safetyNotes, setSafetyNotes] = useState(initialData?.safety_notes || '');

  const toggleSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a drill name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const drill: CreateDrillInput & { id?: string } = {
      id: initialData?.id || Date.now().toString(),
      name: name.trim(),
      description: description.trim() || undefined,
      target_type: targetType,
      distance_m: parseInt(distance, 10) || 100,
      rounds_per_shooter: parseInt(rounds, 10) || 5,

      // Timing
      time_limit_seconds: timeLimit ? parseInt(timeLimit, 10) : undefined,
      par_time_seconds: parTime ? parseInt(parTime, 10) : undefined,

      // Scoring
      scoring_mode: scoringMode,
      min_accuracy_percent: minAccuracy ? parseInt(minAccuracy, 10) : undefined,
      points_per_hit: pointsPerHit ? parseInt(pointsPerHit, 10) : undefined,
      penalty_per_miss: penaltyPerMiss ? parseInt(penaltyPerMiss, 10) : undefined,

      // Targets
      target_count: targetCount ? parseInt(targetCount, 10) : undefined,
      target_size: targetSize,
      shots_per_target: shotsPerTarget ? parseInt(shotsPerTarget, 10) : undefined,
      target_exposure_seconds: targetExposure ? parseInt(targetExposure, 10) : undefined,

      // Stage
      position,
      start_position: startPosition,
      weapon_category: weapon,
      strings_count: stringsCount ? parseInt(stringsCount, 10) : undefined,
      reload_required: reloadRequired || undefined,
      movement_type: movementType,
      movement_distance_m: movementDistance ? parseInt(movementDistance, 10) : undefined,

      // Difficulty
      difficulty,
      category,

      // Content
      instructions: instructions.trim() || undefined,
      safety_notes: safetyNotes.trim() || undefined,
    };

    onSave(drill);
    onClose();
  };

  // Check if sections have values
  const hasTimingValues = !!timeLimit || !!parTime;
  const hasScoringValues = !!scoringMode || !!minAccuracy || !!pointsPerHit;
  const hasTargetValues = (targetCount && targetCount !== '1') || !!targetSize || !!shotsPerTarget || !!targetExposure;
  const hasStageValues = !!position || !!startPosition || !!weapon || !!reloadRequired || !!movementType;
  const hasDifficultyValues = !!difficulty || !!category;
  const hasContentValues = !!instructions || !!safetyNotes;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.headerCancel, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {mode === 'edit' ? 'Edit Drill' : 'Add Drill'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={!name.trim()}>
            <Text style={[styles.headerSave, { color: name.trim() ? '#93C5FD' : colors.textMuted }]}>
              {mode === 'edit' ? 'Save' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ================================================================
              BASIC (Always visible)
          ================================================================ */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>BASIC</Text>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Drill Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g., Precision at 100m"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Brief description..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Target Type */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Target Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: targetType === 'paper' ? 'rgba(147,197,253,0.15)' : colors.card,
                      borderColor: targetType === 'paper' ? '#93C5FD' : colors.border,
                    },
                  ]}
                  onPress={() => setTargetType('paper')}
                >
                  <Target size={20} color={targetType === 'paper' ? '#93C5FD' : colors.textMuted} />
                  <Text style={[styles.typeBtnText, { color: targetType === 'paper' ? '#93C5FD' : colors.text }]}>
                    Paper
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: targetType === 'tactical' ? 'rgba(156,163,175,0.15)' : colors.card,
                      borderColor: targetType === 'tactical' ? colors.textMuted : colors.border,
                    },
                  ]}
                  onPress={() => setTargetType('tactical')}
                >
                  <Crosshair size={20} color={targetType === 'tactical' ? colors.text : colors.textMuted} />
                  <Text style={[styles.typeBtnText, { color: targetType === 'tactical' ? colors.text : colors.text }]}>
                    Tactical
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Distance, Shots */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Distance (m)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={distance}
                  onChangeText={setDistance}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Shots (bullets)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={rounds}
                  onChangeText={setRounds}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Rounds (repeats) - how many times the user must log results */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Rounds (repeats)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={stringsCount}
                onChangeText={setStringsCount}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* ================================================================
              TIMING
          ================================================================ */}
          <SectionHeader
            title="Timing"
            icon={Clock}
            isExpanded={expandedSections.has('timing')}
            onToggle={() => toggleSection('timing')}
            colors={colors}
            hasValues={hasTimingValues}
          />
          {expandedSections.has('timing') && (
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Time Limit (s)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="Max time"
                    placeholderTextColor={colors.textMuted}
                    value={timeLimit}
                    onChangeText={setTimeLimit}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Par Time (s)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="Target time"
                    placeholderTextColor={colors.textMuted}
                    value={parTime}
                    onChangeText={setParTime}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ================================================================
              SCORING
          ================================================================ */}
          <SectionHeader
            title="Scoring"
            icon={Trophy}
            isExpanded={expandedSections.has('scoring')}
            onToggle={() => toggleSection('scoring')}
            colors={colors}
            hasValues={hasScoringValues}
          />
          {expandedSections.has('scoring') && (
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Scoring Mode</Text>
                <ChipSelector options={SCORING_MODES} value={scoringMode} onChange={setScoringMode} colors={colors} />
              </View>
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Min Accuracy %</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="80"
                    placeholderTextColor={colors.textMuted}
                    value={minAccuracy}
                    onChangeText={setMinAccuracy}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Pts/Hit</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    value={pointsPerHit}
                    onChangeText={setPointsPerHit}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Penalty</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="-5"
                    placeholderTextColor={colors.textMuted}
                    value={penaltyPerMiss}
                    onChangeText={setPenaltyPerMiss}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ================================================================
              TARGETS
          ================================================================ */}
          <SectionHeader
            title="Targets"
            icon={Target}
            isExpanded={expandedSections.has('targets')}
            onToggle={() => toggleSection('targets')}
            colors={colors}
            hasValues={hasTargetValues}
          />
          {expandedSections.has('targets') && (
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Target Count</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    value={targetCount}
                    onChangeText={setTargetCount}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Shots/Target</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="2"
                    placeholderTextColor={colors.textMuted}
                    value={shotsPerTarget}
                    onChangeText={setShotsPerTarget}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Target Size</Text>
                <ChipSelector options={TARGET_SIZES} value={targetSize} onChange={setTargetSize} colors={colors} />
              </View>
              {targetType === 'tactical' && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Exposure Time (s)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="How long target is visible"
                    placeholderTextColor={colors.textMuted}
                    value={targetExposure}
                    onChangeText={setTargetExposure}
                    keyboardType="number-pad"
                  />
                </View>
              )}
            </View>
          )}

          {/* ================================================================
              STAGE SETUP
          ================================================================ */}
          <SectionHeader
            title="Stage Setup"
            icon={Move}
            isExpanded={expandedSections.has('stage')}
            onToggle={() => toggleSection('stage')}
            colors={colors}
            hasValues={hasStageValues}
          />
          {expandedSections.has('stage') && (
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Shooting Position</Text>
                <ChipSelector options={POSITIONS} value={position} onChange={setPosition} colors={colors} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Start Position</Text>
                <ChipSelector options={START_POSITIONS} value={startPosition} onChange={setStartPosition} colors={colors} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Weapon</Text>
                <ChipSelector options={WEAPONS} value={weapon} onChange={setWeapon} colors={colors} />
              </View>
              <View style={styles.fieldGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>Reload Required</Text>
                  <Switch
                    value={reloadRequired}
                    onValueChange={setReloadRequired}
                    trackColor={{ false: colors.secondary, true: '#93C5FD' }}
                  />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Movement</Text>
                <ChipSelector options={MOVEMENT_TYPES} value={movementType} onChange={setMovementType} colors={colors} />
              </View>
              {movementType && movementType !== 'none' && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Movement Distance (m)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                    placeholder="Distance to move"
                    placeholderTextColor={colors.textMuted}
                    value={movementDistance}
                    onChangeText={setMovementDistance}
                    keyboardType="number-pad"
                  />
                </View>
              )}
            </View>
          )}

          {/* ================================================================
              DIFFICULTY & CATEGORY
          ================================================================ */}
          <SectionHeader
            title="Difficulty & Category"
            icon={Dumbbell}
            isExpanded={expandedSections.has('difficulty')}
            onToggle={() => toggleSection('difficulty')}
            colors={colors}
            hasValues={hasDifficultyValues}
          />
          {expandedSections.has('difficulty') && (
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Difficulty</Text>
                <ChipSelector options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} colors={colors} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Category</Text>
                <ChipSelector options={CATEGORIES} value={category} onChange={setCategory} colors={colors} />
              </View>
            </View>
          )}

          {/* ================================================================
              CONTENT
          ================================================================ */}
          <SectionHeader
            title="Instructions & Notes"
            icon={FileText}
            isExpanded={expandedSections.has('content')}
            onToggle={() => toggleSection('content')}
            colors={colors}
            hasValues={hasContentValues}
          />
          {expandedSections.has('content') && (
            <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Instructions</Text>
                <TextInput
                  style={[styles.input, styles.inputLarge, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="Step-by-step instructions..."
                  placeholderTextColor={colors.textMuted}
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Safety Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.text }]}
                  placeholder="Important safety considerations..."
                  placeholderTextColor={colors.textMuted}
                  value={safetyNotes}
                  onChangeText={setSafetyNotes}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { 
    fontSize: 17, 
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerCancel: { 
    fontSize: 15, 
    fontWeight: '500',
  },
  headerSave: { 
    fontSize: 15, 
    fontWeight: '700',
  },

  // Body
  body: { 
    flex: 1, 
    paddingHorizontal: 16, 
    paddingTop: 16,
  },

  // Section
  section: { 
    marginBottom: 20,
  },
  sectionLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    letterSpacing: 0.8, 
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  // Section Header (collapsible)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  sectionHeaderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
  },
  sectionHeaderTitle: { 
    fontSize: 14, 
    fontWeight: '600',
  },
  hasValuesDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3,
  },

  // Section Content
  sectionContent: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: -4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  // Fields
  fieldGroup: { 
    marginBottom: 14,
  },
  fieldLabel: { 
    fontSize: 11, 
    fontWeight: '600', 
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  row: { 
    flexDirection: 'row', 
    gap: 10,
  },

  // Inputs
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  inputMultiline: {
    height: 72,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  inputLarge: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },

  // Type buttons
  typeRow: { 
    flexDirection: 'row', 
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  typeBtnText: { 
    fontSize: 14, 
    fontWeight: '600',
  },

  // Chips
  chipRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  chipText: { 
    fontSize: 12, 
    fontWeight: '600',
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
});
