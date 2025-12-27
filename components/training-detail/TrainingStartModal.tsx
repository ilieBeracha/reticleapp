/**
 * Training Start Modal
 * 
 * Allows commanders to configure drill instance values (distance, shots, time)
 * before starting a training. These values override the drill defaults.
 */
import { useColors } from '@/hooks/ui/useColors';
import type { TrainingDrill } from '@/types/workspace';
import { formatMaxShots, isInfiniteShots } from '@/utils/drillShots';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Clock, MapPin, Minus, Play, Plus, Target, Zap } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================
export interface DrillInstanceOverrides {
  distance_m?: number;
  rounds_per_shooter?: number;
  time_limit_seconds?: number | null;
  strings_count?: number | null;
}

export interface DrillWithOverrides {
  drill: TrainingDrill;
  overrides: DrillInstanceOverrides;
}

interface TrainingStartModalProps {
  visible: boolean;
  onClose: () => void;
  onStart: (drillOverrides: Map<string, DrillInstanceOverrides>) => Promise<void>;
  drills: TrainingDrill[];
  trainingTitle: string;
}

// ============================================================================
// VALUE STEPPER COMPONENT
// ============================================================================
interface ValueStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label: string;
  icon: React.ReactNode;
  presets?: number[];
  colors: ReturnType<typeof useColors>;
  isInfinite?: boolean;
}

function ValueStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  unit = '',
  label,
  icon,
  presets,
  colors,
  isInfinite = false,
}: ValueStepperProps) {
  const handleDecrement = useCallback(() => {
    if (value > min) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - step);
    }
  }, [value, min, step, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + step);
    }
  }, [value, max, step, onChange]);

  return (
    <View style={stepperStyles.container}>
      <View style={stepperStyles.header}>
        <View style={[stepperStyles.iconBox, { backgroundColor: colors.secondary }]}>
          {icon}
        </View>
        <Text style={[stepperStyles.label, { color: colors.text }]}>{label}</Text>
      </View>
      
      <View style={stepperStyles.controls}>
        <TouchableOpacity
          style={[stepperStyles.btn, { backgroundColor: colors.secondary }]}
          onPress={handleDecrement}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <Minus size={20} color={value <= min ? colors.textMuted : colors.text} />
        </TouchableOpacity>

        <View style={stepperStyles.valueContainer}>
          <Text style={[stepperStyles.value, { color: colors.text }]}>
            {isInfinite ? '∞' : value}
          </Text>
          {unit && !isInfinite && (
            <Text style={[stepperStyles.unit, { color: colors.textMuted }]}>{unit}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[stepperStyles.btn, { backgroundColor: colors.secondary }]}
          onPress={handleIncrement}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Plus size={20} color={value >= max ? colors.textMuted : colors.text} />
        </TouchableOpacity>
      </View>

      {presets && presets.length > 0 && (
        <View style={stepperStyles.presets}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                stepperStyles.preset,
                { backgroundColor: value === preset ? `${colors.primary}20` : colors.secondary },
                value === preset && { borderColor: colors.primary, borderWidth: 1 },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(preset);
              }}
            >
              <Text
                style={[
                  stepperStyles.presetText,
                  { color: value === preset ? colors.primary : colors.textMuted },
                ]}
              >
                {preset}{unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 12,
    marginTop: -4,
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

// ============================================================================
// DRILL CONFIG CARD
// ============================================================================
interface DrillConfigCardProps {
  drill: TrainingDrill;
  overrides: DrillInstanceOverrides;
  onUpdate: (overrides: DrillInstanceOverrides) => void;
  expanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
  index: number;
}

function DrillConfigCard({
  drill,
  overrides,
  onUpdate,
  expanded,
  onToggle,
  colors,
  index,
}: DrillConfigCardProps) {
  const isGrouping = drill.drill_goal === 'grouping';
  const isPaper = drill.target_type === 'paper';
  const goalColor = isGrouping ? '#10B981' : '#93C5FD';

  const currentDistance = overrides.distance_m ?? drill.distance_m;
  const currentShots = overrides.rounds_per_shooter ?? drill.rounds_per_shooter;
  const currentTime = overrides.time_limit_seconds ?? drill.time_limit_seconds;
  const currentStrings = overrides.strings_count ?? drill.strings_count ?? 1;

  return (
    <View style={[cardStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header - Always visible */}
      <TouchableOpacity
        style={cardStyles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[cardStyles.indexBadge, { backgroundColor: goalColor }]}>
          <Text style={cardStyles.indexText}>{index + 1}</Text>
        </View>
        
        <View style={cardStyles.headerContent}>
          <Text style={[cardStyles.drillName, { color: colors.text }]} numberOfLines={1}>
            {drill.name}
          </Text>
          <View style={cardStyles.headerMeta}>
            <Text style={[cardStyles.metaText, { color: colors.textMuted }]}>
              {currentDistance}m • {isPaper ? `max ${formatMaxShots(currentShots)}` : `${currentShots} shots`}
              {currentStrings > 1 ? ` • ${currentStrings}x` : ''}
              {currentTime ? ` • ${currentTime}s` : ''}
            </Text>
          </View>
        </View>

        <View style={[cardStyles.badge, { backgroundColor: `${goalColor}15` }]}>
          <Text style={[cardStyles.badgeText, { color: goalColor }]}>
            {isGrouping ? 'GRP' : 'ACH'}
          </Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {/* Expanded Config */}
      {expanded && (
        <View style={[cardStyles.expandedContent, { borderTopColor: colors.border }]}>
          {/* Distance */}
          <ValueStepper
            value={currentDistance}
            onChange={(val) => onUpdate({ ...overrides, distance_m: val })}
            min={1}
            max={500}
            step={5}
            unit="m"
            label="Distance"
            icon={<MapPin size={16} color={colors.primary} />}
            presets={[7, 15, 25, 50, 100]}
            colors={colors}
          />

          {/* Shots per entry (only for tactical, paper uses this as max) */}
          <ValueStepper
            value={isInfiniteShots(currentShots) ? 30 : currentShots}
            onChange={(val) => onUpdate({ ...overrides, rounds_per_shooter: val })}
            min={1}
            max={100}
            step={1}
            unit={isPaper ? 'max' : 'rds'}
            label={isPaper ? 'Max Shots (per scan)' : 'Shots per Entry'}
            icon={<Zap size={16} color={colors.primary} />}
            presets={isPaper ? [5, 10, 20, 30] : [3, 5, 10, 15]}
            colors={colors}
            isInfinite={isInfiniteShots(currentShots)}
          />

          {/* Rounds/Strings */}
          <ValueStepper
            value={currentStrings}
            onChange={(val) => onUpdate({ ...overrides, strings_count: val })}
            min={1}
            max={10}
            step={1}
            unit="x"
            label="Rounds"
            icon={<Ionicons name="repeat" size={16} color={colors.primary} />}
            presets={[1, 2, 3, 5]}
            colors={colors}
          />

          {/* Time Limit (optional) */}
          <ValueStepper
            value={currentTime ?? 0}
            onChange={(val) => onUpdate({ ...overrides, time_limit_seconds: val || null })}
            min={0}
            max={300}
            step={5}
            unit="s"
            label="Time Limit (optional)"
            icon={<Clock size={16} color={colors.primary} />}
            presets={[0, 30, 60, 120]}
            colors={colors}
          />
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  expandedContent: {
    padding: 16,
    borderTopWidth: 1,
  },
});

// ============================================================================
// MAIN MODAL
// ============================================================================
export function TrainingStartModal({
  visible,
  onClose,
  onStart,
  drills,
  trainingTitle,
}: TrainingStartModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [starting, setStarting] = useState(false);
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(
    drills.length > 0 ? drills[0].id : null
  );
  
  // Track overrides for each drill
  const [drillOverrides, setDrillOverrides] = useState<Map<string, DrillInstanceOverrides>>(
    new Map()
  );

  const handleUpdateDrill = useCallback((drillId: string, overrides: DrillInstanceOverrides) => {
    setDrillOverrides(prev => {
      const next = new Map(prev);
      next.set(drillId, overrides);
      return next;
    });
  }, []);

  const handleStart = useCallback(async () => {
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onStart(drillOverrides);
    } catch (error) {
      console.error('Failed to start training:', error);
    } finally {
      setStarting(false);
    }
  }, [onStart, drillOverrides]);

  const hasOverrides = useMemo(() => {
    return drillOverrides.size > 0 && Array.from(drillOverrides.values()).some(o => 
      o.distance_m !== undefined || 
      o.rounds_per_shooter !== undefined || 
      o.time_limit_seconds !== undefined ||
      o.strings_count !== undefined
    );
  }, [drillOverrides]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} disabled={starting}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Start Training</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {trainingTitle}
            </Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.secondary }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Configure drill parameters before starting. Tap a drill to adjust distance, shots, and time limits.
            </Text>
          </View>

          {/* Drills List */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            DRILLS ({drills.length})
          </Text>

          {drills.map((drill, index) => (
            <DrillConfigCard
              key={drill.id}
              drill={drill}
              overrides={drillOverrides.get(drill.id) || {}}
              onUpdate={(overrides) => handleUpdateDrill(drill.id, overrides)}
              expanded={expandedDrillId === drill.id}
              onToggle={() => setExpandedDrillId(prev => prev === drill.id ? null : drill.id)}
              colors={colors}
              index={index}
            />
          ))}

          {drills.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Target size={32} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Drills</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                This training has no drills configured.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
          {hasOverrides && (
            <Text style={[styles.overrideHint, { color: colors.textMuted }]}>
              Custom values will override drill defaults
            </Text>
          )}
          
          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: drills.length > 0 ? colors.primary : colors.muted },
            ]}
            onPress={handleStart}
            disabled={starting || drills.length === 0}
            activeOpacity={0.8}
          >
            {starting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Play size={20} color="#fff" fill="#fff" />
                <Text style={styles.startButtonText}>Start Training</Text>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  overrideHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 10,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default TrainingStartModal;












