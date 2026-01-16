/**
 * DrillSelectionStep V2 - Professional Data-Focused Design
 * 
 * Clean, form-like interface with inline editing.
 * No playful animations, just efficient data entry.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { DrillConfig, TrainingDrillItem, ShootingPosition } from '@/services/drills';
import * as Haptics from 'expo-haptics';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import {
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

interface DrillSelectionStepV2Props {
  drills: TrainingDrillItem[];
  onAddDrill: (drill: TrainingDrillItem) => void;
  onUpdateDrill: (drill: TrainingDrillItem) => void;
  onRemoveDrill: (id: string) => void;
}

type DrillGoal = 'engagement' | 'grouping';

interface DrillTypeConfig {
  goal: DrillGoal;
  label: string;
  shortLabel: string;
  targetType: 'tactical' | 'paper';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DRILL_TYPES: DrillTypeConfig[] = [
  { goal: 'engagement', label: 'Engagement', shortLabel: 'ENG', targetType: 'tactical' },
  { goal: 'grouping', label: 'Grouping', shortLabel: 'GRP', targetType: 'paper' },
];

const DISTANCES = [25, 50, 100, 150, 200, 300, 400, 500];
const POSITIONS: ShootingPosition[] = ['standing', 'kneeling', 'sitting', 'prone'];
const POSITION_LABELS: Record<ShootingPosition, string> = {
  standing: 'Standing',
  kneeling: 'Kneeling',
  sitting: 'Sitting',
  prone: 'Prone',
};
const DEFAULT_CONFIG: DrillConfig = {
  distance_m: 100,
  bullets: 5,
  time_limit_seconds: null,
  position: null,
  strings_count: 1,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillSelectionStepV2({
  drills,
  onAddDrill,
  onUpdateDrill,
  onRemoveDrill,
}: DrillSelectionStepV2Props) {
  const colors = useColors();

  const generateId = useCallback(() => 
    `drill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, []
  );

  const handleAddDrill = useCallback((type: DrillTypeConfig) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const item: TrainingDrillItem = {
      id: generateId(),
      drill_id: type.goal,
      config: { ...DEFAULT_CONFIG },
      name: type.label,
      description: `${type.targetType === 'tactical' ? 'Tactical' : 'Paper'} target`,
      drill_goal: type.goal,
      target_type: type.targetType,
    };

    onAddDrill(item);
  }, [generateId, onAddDrill]);

  const handleUpdate = useCallback((drill: TrainingDrillItem, updates: Partial<DrillConfig>) => {
    onUpdateDrill({
      ...drill,
      config: { ...drill.config, ...updates },
    });
  }, [onUpdateDrill]);

  const handleRemove = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemoveDrill(id);
  }, [onRemoveDrill]);

  // Summary stats
  const stats = useMemo(() => {
    const totalBullets = drills.reduce((sum, d) => sum + (d.config.bullets * d.config.strings_count), 0);
    const engagementCount = drills.filter(d => d.drill_goal === 'engagement').length;
    const groupingCount = drills.filter(d => d.drill_goal === 'grouping').length;
    return { totalBullets, engagementCount, groupingCount };
  }, [drills]);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ═══════════════════════════════════════════════════════════════════
          ADD DRILL BUTTONS
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={styles.addRow}>
        {DRILL_TYPES.map((type) => (
          <TouchableOpacity
            key={type.goal}
            style={[styles.addBtn, { 
              backgroundColor: colors.card, 
              borderColor: colors.border 
            }]}
            onPress={() => handleAddDrill(type)}
            activeOpacity={0.7}
          >
            <Text style={[styles.addBtnPlus, { color: colors.textMuted }]}>+</Text>
            <Text style={[styles.addBtnText, { color: colors.text }]}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════
          DRILLS LIST
      ═══════════════════════════════════════════════════════════════════ */}
      {drills.length > 0 && (
        <View style={styles.drillsSection}>
          {/* Header */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Drills ({drills.length})
            </Text>
            <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>
              {stats.totalBullets} bullets total
            </Text>
          </View>

          {/* Drills */}
          <View style={[styles.drillsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {drills.map((drill, index) => (
              <DrillConfigRow
                key={drill.id}
                drill={drill}
                index={index}
                isLast={index === drills.length - 1}
                onUpdate={(updates) => handleUpdate(drill, updates)}
                onRemove={() => handleRemove(drill.id)}
                colors={colors}
              />
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {drills.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
            No drills added
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Add engagement or grouping drills above
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================================
// DRILL CONFIG ROW
// ============================================================================

function DrillConfigRow({
  drill,
  index,
  isLast,
  onUpdate,
  onRemove,
  colors,
}: {
  drill: TrainingDrillItem;
  index: number;
  isLast: boolean;
  onUpdate: (updates: Partial<DrillConfig>) => void;
  onRemove: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isEngagement = drill.drill_goal === 'engagement';

  return (
    <View style={[styles.drillRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      {/* Row 1: Type + Number + Remove */}
      <View style={styles.drillHeader}>
        <View style={styles.drillTypeWrap}>
          <View style={[
            styles.drillTypeBadge, 
            { backgroundColor: isEngagement ? '#F59E0B15' : '#22C55E15' }
          ]}>
            <Text style={[
              styles.drillTypeText, 
              { color: isEngagement ? '#D97706' : '#16A34A' }
            ]}>
              {isEngagement ? 'ENG' : 'GRP'}
            </Text>
          </View>
          <Text style={[styles.drillNumber, { color: colors.textMuted }]}>#{index + 1}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeBtn}
        >
          <Trash2 size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Row 2: Config Fields */}
      <View style={styles.configFields}>
        {/* Distance */}
        <ConfigField 
          label="Distance" 
          colors={colors}
          style={{ flex: 1.2 }}
        >
          <DistanceSelector
            value={drill.config.distance_m}
            onChange={(v) => onUpdate({ distance_m: v })}
            colors={colors}
          />
        </ConfigField>

        {/* Bullets */}
        <ConfigField 
          label="Bullets" 
          colors={colors}
          style={{ flex: 1 }}
        >
          <NumberStepper
            value={drill.config.bullets}
            min={1}
            max={50}
            onChange={(v) => onUpdate({ bullets: v })}
            colors={colors}
          />
        </ConfigField>

        {/* Strings */}
        <ConfigField 
          label="Strings" 
          colors={colors}
          style={{ flex: 1 }}
        >
          <NumberStepper
            value={drill.config.strings_count}
            min={1}
            max={10}
            onChange={(v) => onUpdate({ strings_count: v })}
            colors={colors}
          />
        </ConfigField>
      </View>

      {/* Row 3: Optional Fields */}
      <View style={styles.optionalFields}>
        {/* Position */}
        <ConfigField 
          label="Position" 
          colors={colors}
          style={{ flex: 1 }}
        >
          <PositionSelector
            value={drill.config.position}
            onChange={(v) => onUpdate({ position: v })}
            colors={colors}
          />
        </ConfigField>

        {/* Time Limit */}
        <ConfigField 
          label="Time (sec)" 
          colors={colors}
          style={{ flex: 1 }}
        >
          <TimeInput
            value={drill.config.time_limit_seconds}
            onChange={(v) => onUpdate({ time_limit_seconds: v })}
            colors={colors}
          />
        </ConfigField>
      </View>
    </View>
  );
}

// ============================================================================
// CONFIG FIELD WRAPPER
// ============================================================================

function ConfigField({
  label,
  children,
  colors,
  style,
}: {
  label: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  style?: object;
}) {
  return (
    <View style={[styles.configField, style]}>
      <Text style={[styles.configLabel, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

// ============================================================================
// DISTANCE SELECTOR
// ============================================================================

function DistanceSelector({
  value,
  onChange,
  colors,
}: {
  value: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const currentIndex = DISTANCES.indexOf(value);
  
  const handlePrev = () => {
    Haptics.selectionAsync();
    if (currentIndex > 0) onChange(DISTANCES[currentIndex - 1]);
  };
  
  const handleNext = () => {
    Haptics.selectionAsync();
    if (currentIndex < DISTANCES.length - 1) onChange(DISTANCES[currentIndex + 1]);
  };

  return (
    <View style={[styles.stepperContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <TouchableOpacity 
        style={styles.stepperBtn} 
        onPress={handlePrev}
        disabled={currentIndex <= 0}
      >
        <Minus size={14} color={currentIndex <= 0 ? colors.border : colors.text} />
      </TouchableOpacity>
      <Text style={[styles.stepperValue, { color: colors.text }]}>{value}m</Text>
      <TouchableOpacity 
        style={styles.stepperBtn} 
        onPress={handleNext}
        disabled={currentIndex >= DISTANCES.length - 1}
      >
        <Plus size={14} color={currentIndex >= DISTANCES.length - 1 ? colors.border : colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// NUMBER STEPPER
// ============================================================================

function NumberStepper({
  value,
  min,
  max,
  onChange,
  colors,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const handleDecrement = () => {
    Haptics.selectionAsync();
    if (value > min) onChange(value - 1);
  };
  
  const handleIncrement = () => {
    Haptics.selectionAsync();
    if (value < max) onChange(value + 1);
  };

  return (
    <View style={[styles.stepperContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <TouchableOpacity 
        style={styles.stepperBtn} 
        onPress={handleDecrement}
        disabled={value <= min}
      >
        <Minus size={14} color={value <= min ? colors.border : colors.text} />
      </TouchableOpacity>
      <Text style={[styles.stepperValue, { color: colors.text }]}>{value}</Text>
      <TouchableOpacity 
        style={styles.stepperBtn} 
        onPress={handleIncrement}
        disabled={value >= max}
      >
        <Plus size={14} color={value >= max ? colors.border : colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// POSITION SELECTOR
// ============================================================================

function PositionSelector({
  value,
  onChange,
  colors,
}: {
  value: ShootingPosition | null | undefined;
  onChange: (v: ShootingPosition | null) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const currentIndex = value ? POSITIONS.indexOf(value) : -1;
  
  const handleCycle = () => {
    Haptics.selectionAsync();
    const nextIndex = (currentIndex + 1) % (POSITIONS.length + 1);
    onChange(nextIndex === POSITIONS.length ? null : POSITIONS[nextIndex]);
  };

  const displayValue = value ? POSITION_LABELS[value] : 'Any';

  return (
    <TouchableOpacity
      style={[styles.selectBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
      onPress={handleCycle}
    >
      <Text style={[styles.selectValue, { color: value ? colors.text : colors.textMuted }]}>
        {displayValue}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// TIME INPUT
// ============================================================================

function TimeInput({
  value,
  onChange,
  colors,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const handleChange = (text: string) => {
    const num = parseInt(text, 10);
    if (text === '' || text === '0') {
      onChange(null);
    } else if (!isNaN(num) && num > 0 && num <= 999) {
      onChange(num);
    }
  };

  return (
    <View style={[styles.inputContainer, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <TextInput
        style={[styles.textInput, { color: colors.text }]}
        value={value ? String(value) : ''}
        onChangeText={handleChange}
        placeholder="—"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },

  // Add Row
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  addBtnPlus: {
    fontSize: 20,
    fontWeight: '300',
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Section
  drillsSection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionMeta: {
    fontSize: 12,
  },

  // Drills Container
  drillsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Drill Row
  drillRow: {
    padding: 14,
    gap: 12,
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drillTypeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  drillTypeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  drillNumber: {
    fontSize: 12,
  },
  removeBtn: {
    padding: 4,
  },

  // Config Fields
  configFields: {
    flexDirection: 'row',
    gap: 10,
  },
  optionalFields: {
    flexDirection: 'row',
    gap: 10,
  },
  configField: {
    gap: 4,
  },
  configLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },

  // Select Button
  selectBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  selectValue: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Text Input
  inputContainer: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textInput: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    padding: 0,
    minHeight: 22,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptySubtitle: {
    fontSize: 13,
  },
});
