/**
 * QuickSessionsStep - Add sessions to training via bottom sheet
 *
 * Shows the session list with an "Add Session" button.
 * Tapping opens a bottom sheet with the same form as createSession.tsx
 * (purpose toggle + SessionContextStep). On submit, closes sheet and adds to list.
 */

import { EngagementModeToggle, SessionContextStep } from '@/components/session/creation';
import type { SessionContextState, SessionPurpose } from '@/components/session/creation/sessionCreation.types';
import type { EngagementMode } from '@/services/session/types';
import { useColors } from '@/hooks/ui/useColors';
import { type TrainingDrillItem } from '@/services/drills';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp, Circle, Crosshair, Plus, Target, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
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
  const isSquad = session.config?.engagement_mode === 'squad';
  const purposeColor = isGrouping ? colors.blue : colors.orange;
  const purposeLabel = isGrouping ? 'Grouping' : isSquad ? 'Squad Engagement' : 'Engagement';

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
          <TouchableOpacity style={[styles.removeBtn, { backgroundColor: `${colors.red}15` }]} onPress={onRemove}>
            <Trash2 size={14} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// ADD SESSION BOTTOM SHEET
// ============================================================================

const DEFAULT_CONTEXT: SessionContextState = {
  weaponId: null,
  weaponName: null,
  weaponCategory: null,
  distance: 25,
  position: 'any',
  targetType: 'paper',
  shotsPlanned: 5,
  timeLimit: null,
  stressDrill: false,
  ammoType: null,
  windCondition: null,
  timeOfDay: 'day',
  notes: '',
};

interface AddSessionSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (session: TrainingDrillItem) => void;
}

function AddSessionSheet({ visible, onClose, onAdd }: AddSessionSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [purpose, setPurpose] = useState<SessionPurpose>('grouping');
  const [context, setContext] = useState<SessionContextState>(DEFAULT_CONTEXT);
  const [engagementMode, setEngagementMode] = useState<EngagementMode>('solo');

  // Reset engagement mode when purpose changes
  const handlePurposeSelect = useCallback((p: SessionPurpose) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurpose(p);
    // Reset to solo when switching away from engagement
    if (p !== 'engagement') {
      setEngagementMode('solo');
    }
  }, []);

  const handleUpdateContext = useCallback((partial: Partial<SessionContextState>) => {
    setContext((prev) => ({ ...prev, ...partial }));
  }, []);

  const mapPosition = (pos: string | null): 'standing' | 'kneeling' | 'prone' | 'sitting' | null => {
    if (!pos || pos === 'any') return null;
    if (pos === 'seated') return 'sitting';
    if (['standing', 'kneeling', 'prone', 'sitting'].includes(pos)) {
      return pos as 'standing' | 'kneeling' | 'prone' | 'sitting';
    }
    return null;
  };

  const handleSubmit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newSession: TrainingDrillItem = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      drill_id: '',
      name: `${purpose === 'grouping' ? 'Grouping' : engagementMode === 'squad' ? 'Squad Engagement' : 'Engagement'} ${context.distance}m`,
      description: context.notes || undefined,
      drill_goal: purpose,
      target_type: context.targetType === 'paper' || context.targetType === 'tactical' ? context.targetType : 'paper',
      config: {
        distance_m: context.distance,
        rounds: context.shotsPlanned,
        time_limit_seconds: context.timeLimit,
        position: mapPosition(context.position),
        strings_count: 1,
        // Include engagement mode for engagement drills
        ...(purpose === 'engagement' && { engagement_mode: engagementMode }),
      },
    };

    onAdd(newSession);
    // Reset for next time
    setContext(DEFAULT_CONTEXT);
    setEngagementMode('solo');
    onClose();
  }, [purpose, context, engagementMode, onAdd, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <TouchableOpacity style={[styles.sheetCloseBtn, { backgroundColor: colors.card }]} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Session</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form */}
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Purpose Toggle */}
          <View style={styles.purposeRow}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Goal</Text>
            <View style={[styles.purposeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.purposeOption,
                  purpose === 'grouping' && [styles.purposeOptionActive, { backgroundColor: colors.primary }],
                ]}
                onPress={() => handlePurposeSelect('grouping')}
                activeOpacity={0.7}
              >
                <Crosshair size={16} color={purpose === 'grouping' ? '#fff' : colors.textMuted} />
                <Text style={[styles.purposeText, { color: purpose === 'grouping' ? '#fff' : colors.text }]}>
                  Grouping
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.purposeOption,
                  purpose === 'engagement' && [styles.purposeOptionActive, { backgroundColor: colors.orange }],
                ]}
                onPress={() => handlePurposeSelect('engagement')}
                activeOpacity={0.7}
              >
                <Target size={16} color={purpose === 'engagement' ? '#fff' : colors.textMuted} />
                <Text style={[styles.purposeText, { color: purpose === 'engagement' ? '#fff' : colors.text }]}>
                  Engagement
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Squad Mode Toggle - only for engagement */}
          {purpose === 'engagement' && (
            <EngagementModeToggle
              value={engagementMode}
              onChange={setEngagementMode}
            />
          )}

          {/* Session Details */}
          <SessionContextStep
            purpose={purpose}
            context={context}
            onUpdateContext={handleUpdateContext}
            onBack={() => {}}
            hideWeaponSection
          />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.sheetFooter, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.sheetSubmitBtn, { backgroundColor: colors.text }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Plus size={18} color={colors.background} />
            <Text style={[styles.sheetSubmitText, { color: colors.background }]}>Add Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuickSessionsStep({ sessions, onAddSession, onRemoveSession, onMoveSession }: QuickSessionsStepProps) {
  const colors = useColors();
  const [showSheet, setShowSheet] = useState(false);

  const handleAdd = useCallback(
    (session: TrainingDrillItem) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onAddSession(session);
    },
    [onAddSession]
  );

  const handleOpenSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSheet(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.card }]}>
          <Target size={20} color={colors.text} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>What will you train?</Text>
          <Text style={[styles.headerHint, { color: colors.textMuted }]}>
            Add sessions · Everyone runs them in parallel
          </Text>
        </View>
      </View>

      {/* Sessions List */}
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
          styles.addBtn,
          {
            backgroundColor: sessions.length === 0 ? colors.primary : colors.card,
            borderColor: sessions.length === 0 ? colors.primary : colors.border,
          },
        ]}
        onPress={handleOpenSheet}
        activeOpacity={0.7}
      >
        <Plus size={18} color={sessions.length === 0 ? '#fff' : colors.primary} />
        <Text style={[styles.addBtnText, { color: sessions.length === 0 ? '#fff' : colors.primary }]}>
          {sessions.length === 0 ? 'Add First Session' : 'Add Another Session'}
        </Text>
      </TouchableOpacity>

      {/* Empty hint */}
      {sessions.length === 0 && (
        <View style={styles.emptyHint}>
          <Circle size={16} color={colors.textMuted} />
          <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>Add at least one session to continue</Text>
        </View>
      )}

      {/* Bottom Sheet */}
      <AddSessionSheet visible={showSheet} onClose={() => setShowSheet(false)} onAdd={handleAdd} />
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

  // Add Button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
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

  // Sheet
  sheetContainer: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sheetCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  sheetSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  sheetSubmitText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Purpose Toggle (in sheet)
  purposeRow: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  purposeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  purposeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9,
  },
  purposeOptionActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  purposeText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

export default QuickSessionsStep;
