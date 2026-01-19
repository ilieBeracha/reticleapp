/**
 * QuickSessionsStep - Add sessions to training using unified SessionCreationForm
 *
 * Uses the same form as solo createSession for consistency.
 * Opens SessionCreationForm in a modal when adding a session.
 */

import {
  SessionCreationForm,
  type SessionFormValues,
} from '@/components/session/creation';
import { useColors } from '@/hooks/ui/useColors';
import { type TrainingDrillItem } from '@/services/drills';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronUp,
  Circle,
  Plus,
  Target,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// TYPES
// ============================================================================

interface QuickSessionsStepProps {
  sessions: TrainingDrillItem[];
  onAddSession: (session: TrainingDrillItem) => void;
  onRemoveSession: (id: string) => void;
  onMoveSession: (index: number, direction: 'up' | 'down') => void;
}

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
// ADD SESSION MODAL - Uses unified SessionCreationForm
// ============================================================================

interface AddSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (session: TrainingDrillItem) => void;
}

function AddSessionModal({ visible, onClose, onAdd }: AddSessionModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleSubmit = useCallback((values: SessionFormValues) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Map 'seated' to 'sitting' for ShootingPosition compatibility
    const mapPosition = (pos: string | null): 'standing' | 'kneeling' | 'prone' | 'sitting' | null => {
      if (!pos || pos === 'any') return null;
      if (pos === 'seated') return 'sitting';
      if (['standing', 'kneeling', 'prone', 'sitting'].includes(pos)) {
        return pos as 'standing' | 'kneeling' | 'prone' | 'sitting';
      }
      return null;
    };

    const newSession: TrainingDrillItem = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      drill_id: '',
      name: `${values.purpose === 'grouping' ? 'Grouping' : 'Engagement'} ${values.distance}m`,
      description: values.notes || undefined,
      drill_goal: values.purpose,
      target_type: values.targetType === 'paper' || values.targetType === 'tactical' ? values.targetType : 'paper',
      config: {
        distance_m: values.distance,
        rounds: values.shotsPlanned,
        time_limit_seconds: values.timeLimit,
        position: mapPosition(values.position),
        strings_count: 1,
      },
    };

    onAdd(newSession);
    onClose();
  }, [onAdd, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.modalCloseBtn, { backgroundColor: colors.card }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Session</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form - hide weapon (soldiers pick when they start) */}
        <SessionCreationForm
          onSubmit={handleSubmit}
          submitLabel="Add Session"
          hideWeapon
        />
      </View>
    </Modal>
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
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAdd = useCallback((session: TrainingDrillItem) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onAddSession(session);
  }, [onAddSession]);

  const handleOpenModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(true);
  }, []);

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

      {/* Add Session Button */}
      <TouchableOpacity
        style={[
          styles.addSessionBtn,
          { 
            backgroundColor: sessions.length === 0 ? colors.primary : colors.card, 
            borderColor: sessions.length === 0 ? colors.primary : colors.border,
          }
        ]}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <Plus size={18} color={sessions.length === 0 ? '#fff' : colors.primary} />
        <Text style={[
          styles.addSessionBtnText, 
          { color: sessions.length === 0 ? '#fff' : colors.primary }
        ]}>
          {sessions.length === 0 ? 'Add First Session' : 'Add Another Session'}
        </Text>
      </TouchableOpacity>

      {/* Empty hint */}
      {sessions.length === 0 && (
        <View style={styles.emptyHint}>
          <Circle size={16} color={colors.textMuted} />
          <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>
            Add at least one session to continue
          </Text>
        </View>
      )}

      {/* Add Session Modal */}
      <AddSessionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
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

  // Add Session Button
  addSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  addSessionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
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
