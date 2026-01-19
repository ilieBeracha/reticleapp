/**
 * QuickSessionsStep - Simple session adding (like solo createSession)
 *
 * No drill catalog, no presets, no complexity.
 * Just add sessions: purpose, distance, shots, position.
 */

import { useColors } from '@/hooks/ui/useColors';
import { type TrainingDrillItem } from '@/services/drills';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronUp,
  Circle,
  Crosshair,
  Plus,
  Target,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
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

// Smart defaults for quick session creation
const DEFAULT_DISTANCE = 100;
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
// ADD SESSION FORM - Ultra minimal
// ============================================================================

interface AddSessionFormProps {
  onAdd: (session: TrainingDrillItem) => void;
  sessionCount: number;
  colors: ReturnType<typeof useColors>;
  onCancel?: () => void;
}

function AddSessionForm({ onAdd, colors, onCancel }: AddSessionFormProps) {
  const [customName, setCustomName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const handleQuickAdd = useCallback((type: SessionPurpose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const name = customName.trim() || (type === 'grouping' ? 'Grouping' : 'Engagement');

    const newSession: TrainingDrillItem = {
      id: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      drill_id: '',
      name,
      description: undefined,
      drill_goal: type,
      target_type: 'paper',
      config: {
        distance_m: DEFAULT_DISTANCE,
        rounds: DEFAULT_SHOTS,
        time_limit_seconds: null,
        position: null,  // Any
        strings_count: 1,
      },
    };

    onAdd(newSession);
    setCustomName('');
    setShowNameInput(false);
  }, [customName, onAdd]);

  return (
    <View style={[styles.quickAddContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Optional name input */}
      {showNameInput ? (
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.quickNameInput, { backgroundColor: colors.secondary, color: colors.text }]}
            value={customName}
            onChangeText={setCustomName}
            placeholder="Session name (optional)"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <TouchableOpacity onPress={() => { setShowNameInput(false); setCustomName(''); }}>
            <Text style={[styles.nameDone, { color: colors.textMuted }]}>×</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addNameBtn}
          onPress={() => setShowNameInput(true)}
        >
          <Text style={[styles.addNameText, { color: colors.textMuted }]}>+ Add name</Text>
        </TouchableOpacity>
      )}

      {/* Two big tap targets */}
      <View style={styles.quickAddRow}>
        <TouchableOpacity
          style={[styles.quickAddBtn, { backgroundColor: `${colors.blue}12`, borderColor: `${colors.blue}30` }]}
          onPress={() => handleQuickAdd('grouping')}
          activeOpacity={0.7}
        >
          <Crosshair size={20} color={colors.blue} />
          <Text style={[styles.quickAddBtnText, { color: colors.blue }]}>Grouping</Text>
          <Text style={[styles.quickAddHint, { color: colors.textMuted }]}>Precision</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAddBtn, { backgroundColor: `${colors.orange}12`, borderColor: `${colors.orange}30` }]}
          onPress={() => handleQuickAdd('engagement')}
          activeOpacity={0.7}
        >
          <Target size={20} color={colors.orange} />
          <Text style={[styles.quickAddBtnText, { color: colors.orange }]}>Engagement</Text>
          <Text style={[styles.quickAddHint, { color: colors.textMuted }]}>Hit targets</Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={[styles.quickAddFooter, { color: colors.textMuted }]}>
        Tap to add · {DEFAULT_DISTANCE}m · {DEFAULT_SHOTS} shots
      </Text>

      {/* Cancel if available */}
      {onCancel && (
        <TouchableOpacity style={styles.quickCancelBtn} onPress={onCancel}>
          <Text style={[styles.quickCancelText, { color: colors.textMuted }]}>Cancel</Text>
        </TouchableOpacity>
      )}
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
  const [showForm, setShowForm] = useState(true); // Open by default

  const handleAdd = useCallback((session: TrainingDrillItem) => {
    onAddSession(session);
    // After adding, collapse the form
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowForm(false);
  }, [onAddSession]);

  const handleOpenForm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowForm(true);
  }, []);

  // If no sessions, always show form
  const formVisible = sessions.length === 0 || showForm;

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

      {/* Add Form OR Add Another button */}
      {formVisible ? (
        <AddSessionForm
          onAdd={handleAdd}
          sessionCount={sessions.length}
          colors={colors}
          onCancel={sessions.length > 0 ? () => setShowForm(false) : undefined}
        />
      ) : (
        <TouchableOpacity
          style={[styles.addAnotherBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleOpenForm}
        >
          <Plus size={16} color={colors.primary} />
          <Text style={[styles.addAnotherText, { color: colors.primary }]}>Add another session</Text>
        </TouchableOpacity>
      )}

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

  // Quick add form - ultra minimal
  quickAddContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickNameInput: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  nameDone: {
    fontSize: 22,
    paddingHorizontal: 8,
  },
  addNameBtn: {
    alignSelf: 'flex-start',
  },
  addNameText: {
    fontSize: 13,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAddBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  quickAddBtnText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  quickAddHint: {
    fontSize: 11,
  },
  quickAddFooter: {
    fontSize: 11,
    textAlign: 'center',
  },
  quickCancelBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  quickCancelText: {
    fontSize: 13,
  },

  // Legacy compact styles (keeping for reference)
  compactChips: {
    flexDirection: 'row',
    gap: 4,
  },
  shotsRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shotsBtnCompact: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotsValueCompact: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  advancedToggleCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  advancedToggleTextCompact: {
    fontSize: 11,
    fontWeight: '500',
  },
  advancedSectionCompact: {
    flexDirection: 'row',
    gap: 10,
  },
  positionChipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  positionChipTextCompact: {
    fontSize: 10,
    fontWeight: '600',
  },
  nameInputCompact: {
    height: 30,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addBtnTextCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Legacy styles (keep for compatibility)
  formSection: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
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

  // Add another button
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addAnotherText: {
    fontSize: 14,
    fontWeight: '500',
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
