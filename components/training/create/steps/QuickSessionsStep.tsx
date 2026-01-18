/**
 * QuickSessionsStep - Simple session adding (like solo createSession)
 *
 * No drill catalog, no presets, no complexity.
 * Just add sessions: purpose, distance, shots, position.
 */

import { useColors } from '@/hooks/ui/useColors';
import { type TrainingDrillItem, type ShootingPosition } from '@/services/drills';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronUp,
  Circle,
  Crosshair,
  Minus,
  Plus,
  Target,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// TYPES
// ============================================================================

type SessionPurpose = 'grouping' | 'engagement';

interface QuickSessionsStepProps {
  sessions: TrainingDrillItem[];
  onAddSession: (session: TrainingDrillItem) => void;
  onRemoveSession: (id: string) => void;
  onMoveSession: (index: number, direction: 'up' | 'down') => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const POSITIONS = ['prone', 'sitting', 'kneeling', 'standing'] as const;
const DISTANCES = [25, 50, 100, 200, 300, 400, 500];
const DEFAULT_SHOTS = 5;

// ============================================================================
// SESSION CARD
// ============================================================================

interface SessionCardProps {
  session: TrainingDrillItem;
  index: number;
  total: number;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  colors: ReturnType<typeof useColors>;
}

function SessionCard({ session, index, total, onRemove, onMove, colors }: SessionCardProps) {
  const isGrouping = session.drill_goal === 'grouping';
  const purposeColor = isGrouping ? colors.blue : colors.orange;
  const purposeLabel = isGrouping ? 'Grouping' : 'Engagement';

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sessionCardHeader}>
        <View style={[styles.sessionNumber, { backgroundColor: `${purposeColor}15` }]}>
          <Text style={[styles.sessionNumberText, { color: purposeColor }]}>{index + 1}</Text>
        </View>
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
            {session.name || `Session ${index + 1}`}
          </Text>
          <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
            {purposeLabel} · {session.config.distance_m}m · {session.config.rounds} shots
            {session.config.position && ` · ${session.config.position}`}
          </Text>
        </View>
        <View style={styles.sessionActions}>
          {total > 1 && (
            <>
              <TouchableOpacity
                style={[styles.moveBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                onPress={() => onMove('up')}
                disabled={index === 0}
              >
                <ChevronUp size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moveBtn, { opacity: index === total - 1 ? 0.3 : 1 }]}
                onPress={() => onMove('down')}
                disabled={index === total - 1}
              >
                <ChevronDown size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.removeBtn, { backgroundColor: `${colors.red}15` }]}
            onPress={onRemove}
          >
            <Trash2 size={14} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// ADD SESSION FORM
// ============================================================================

interface AddSessionFormProps {
  onAdd: (session: TrainingDrillItem) => void;
  sessionCount: number;
  colors: ReturnType<typeof useColors>;
}

function AddSessionForm({ onAdd, sessionCount, colors }: AddSessionFormProps) {
  const [purpose, setPurpose] = useState<SessionPurpose>('grouping');
  const [distance, setDistance] = useState(100);
  const [shots, setShots] = useState(DEFAULT_SHOTS);
  const [position, setPosition] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const name = customName.trim() || `${purpose === 'grouping' ? 'Grouping' : 'Engagement'} ${distance}m`;

    // TrainingDrillItem from drillService - drill_id can be empty for quick sessions
    const newSession: TrainingDrillItem = {
      id: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      drill_id: '', // Empty string for non-canonical quick sessions
      name,
      description: undefined,
      drill_goal: purpose,
      target_type: 'paper',
      config: {
        distance_m: distance,
        rounds: shots,
        time_limit_seconds: null,
        position: (position as ShootingPosition | undefined | null) ?? null,
        strings_count: 1,
      },
    };

    onAdd(newSession);

    // Reset form
    setCustomName('');
    setShots(DEFAULT_SHOTS);
    setShowAdvanced(false);
  }, [purpose, distance, shots, position, customName, onAdd]);

  const adjustShots = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShots(prev => Math.max(1, Math.min(50, prev + delta)));
  };

  return (
    <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <Text style={[styles.addFormTitle, { color: colors.text }]}>Add Session</Text>

      {/* Purpose Selection */}
      <View style={styles.formSection}>
        <Text style={[styles.formLabel, { color: colors.textMuted }]}>What's the goal?</Text>
        <View style={styles.purposeRow}>
          <TouchableOpacity
            style={[
              styles.purposeBtn,
              { backgroundColor: purpose === 'grouping' ? `${colors.blue}15` : colors.secondary },
              purpose === 'grouping' && { borderColor: colors.blue, borderWidth: 1.5 },
            ]}
            onPress={() => setPurpose('grouping')}
          >
            <Crosshair
              size={20}
              color={purpose === 'grouping' ? colors.blue : colors.textMuted}
            />
            <Text
              style={[
                styles.purposeBtnText,
                { color: purpose === 'grouping' ? colors.blue : colors.textMuted },
              ]}
            >
              Grouping
            </Text>
            <Text style={[styles.purposeHint, { color: colors.textMuted }]}>
              Precision focus
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.purposeBtn,
              { backgroundColor: purpose === 'engagement' ? `${colors.orange}15` : colors.secondary },
              purpose === 'engagement' && { borderColor: colors.orange, borderWidth: 1.5 },
            ]}
            onPress={() => setPurpose('engagement')}
          >
            <Target
              size={20}
              color={purpose === 'engagement' ? colors.orange : colors.textMuted}
            />
            <Text
              style={[
                styles.purposeBtnText,
                { color: purpose === 'engagement' ? colors.orange : colors.textMuted },
              ]}
            >
              Engagement
            </Text>
            <Text style={[styles.purposeHint, { color: colors.textMuted }]}>
              Hit targets
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Distance */}
      <View style={styles.formSection}>
        <Text style={[styles.formLabel, { color: colors.textMuted }]}>Distance</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.distanceRow}
        >
          {DISTANCES.map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.distanceChip,
                { backgroundColor: distance === d ? colors.text : colors.secondary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDistance(d);
              }}
            >
              <Text
                style={[
                  styles.distanceChipText,
                  { color: distance === d ? colors.background : colors.textMuted },
                ]}
              >
                {d}m
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Shots */}
      <View style={styles.formSection}>
        <Text style={[styles.formLabel, { color: colors.textMuted }]}>Shots per person</Text>
        <View style={styles.shotsRow}>
          <TouchableOpacity
            style={[styles.shotsBtn, { backgroundColor: colors.secondary }]}
            onPress={() => adjustShots(-1)}
          >
            <Minus size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.shotsDisplay, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.shotsValue, { color: colors.text }]}>{shots}</Text>
          </View>
          <TouchableOpacity
            style={[styles.shotsBtn, { backgroundColor: colors.secondary }]}
            onPress={() => adjustShots(1)}
          >
            <Plus size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Advanced Toggle */}
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowAdvanced(!showAdvanced);
        }}
      >
        <Text style={[styles.advancedToggleText, { color: colors.textMuted }]}>
          {showAdvanced ? 'Hide options' : 'More options'}
        </Text>
        {showAdvanced ? (
          <ChevronUp size={14} color={colors.textMuted} />
        ) : (
          <ChevronDown size={14} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.advancedSection}>
          {/* Position */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textMuted }]}>Position (optional)</Text>
            <View style={styles.positionRow}>
              <TouchableOpacity
                style={[
                  styles.positionChip,
                  { backgroundColor: position === null ? colors.text : colors.secondary },
                ]}
                onPress={() => setPosition(null)}
              >
                <Text
                  style={[
                    styles.positionChipText,
                    { color: position === null ? colors.background : colors.textMuted },
                  ]}
                >
                  Any
                </Text>
              </TouchableOpacity>
              {POSITIONS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.positionChip,
                    { backgroundColor: position === p ? colors.text : colors.secondary },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPosition(p);
                  }}
                >
                  <Text
                    style={[
                      styles.positionChipText,
                      { color: position === p ? colors.background : colors.textMuted },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Name */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textMuted }]}>Custom name (optional)</Text>
            <TextInput
              style={[
                styles.nameInput,
                { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border },
              ]}
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Warmup, Cold bore..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.text }]}
        onPress={handleAdd}
      >
        <Plus size={18} color={colors.background} />
        <Text style={[styles.addBtnText, { color: colors.background }]}>Add Session</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuickSessionsStep({
  sessions,
  onAddSession,
  onRemoveSession,
  onMoveSession,
}: QuickSessionsStepProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.card }]}>
          <Target size={20} color={colors.text} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            What will you train?
          </Text>
          <Text style={[styles.headerHint, { color: colors.textMuted }]}>
            Add sessions · Everyone runs them in parallel
          </Text>
        </View>
      </View>

      {/* Existing Sessions */}
      {sessions.length > 0 && (
        <View style={styles.sessionsList}>
          {sessions.map((session, index) => (
            <SessionCard
              key={session.id}
              session={session}
              index={index}
              total={sessions.length}
              onRemove={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onRemoveSession(session.id);
              }}
              onMove={(dir) => onMoveSession(index, dir)}
              colors={colors}
            />
          ))}
        </View>
      )}

      {/* Add Form */}
      <AddSessionForm
        onAdd={onAddSession}
        sessionCount={sessions.length}
        colors={colors}
      />

      {/* Empty hint */}
      {sessions.length === 0 && (
        <View style={styles.emptyHint}>
          <Circle size={16} color={colors.textMuted} />
          <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>
            Add at least one session to continue
          </Text>
        </View>
      )}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    paddingTop: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerHint: {
    fontSize: 14,
  },

  // Sessions list
  sessionsList: {
    gap: 8,
  },
  sessionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  sessionNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sessionMeta: {
    fontSize: 12,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moveBtn: {
    padding: 6,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 4,
  },

  // Add form
  addForm: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 16,
    gap: 16,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  formSection: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Purpose
  purposeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  purposeBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  purposeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  purposeHint: {
    fontSize: 11,
  },

  // Distance
  distanceRow: {
    gap: 8,
    paddingVertical: 2,
  },
  distanceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  distanceChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Shots
  shotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shotsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotsDisplay: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotsValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Advanced
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  advancedSection: {
    gap: 16,
  },
  positionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  positionChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  nameInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 4,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty hint
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  emptyHintText: {
    fontSize: 13,
  },
});

export default QuickSessionsStep;
