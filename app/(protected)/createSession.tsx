/**
 * CREATE SESSION - Drill-First Flow
 * 
 * User can:
 * 1. Configure a Quick/Custom Drill (distance, shots, type)
 * 2. Pick from Drill Library (saved templates)
 * 3. Pick from Active Training Drills
 */
import { useColors } from '@/hooks/ui/useColors';
import { getTeamDrillTemplates } from '@/services/drillTemplateService';
import {
  createSession,
  deleteSession,
  getMyActiveSession,
  type SessionWithDetails,
} from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { DrillTemplate, TrainingDrill } from '@/types/workspace';
import { formatMaxShots, INFINITE_SHOTS_SENTINEL, isInfiniteShots } from '@/utils/drillShots';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronRight, Crosshair, Minus, Play, Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type DrillGoal = 'grouping' | 'achievement';
type TargetType = 'paper' | 'tactical';

interface CustomDrillConfig {
  name: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds: number | null;
}

interface TrainingDrillOption {
  id: string;
  name: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number | null;
  trainingId: string;
  trainingTitle: string;
  teamName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DISTANCE_PRESETS = [10, 15, 25, 50, 100];
const SHOTS_PRESETS = [5, 10, 15, 20, 30];
const TIME_PRESETS = [30, 60, 90, 120];
const MAX_SHOTS_STEP = 1;
const MAX_SHOTS_LIMIT = 500;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function CreateSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { trainingId } = useLocalSearchParams<{ trainingId?: string }>();

  const { teams } = useTeamStore();
  const { loadSessions } = useSessionStore();
  const { myUpcomingTrainings, loadMyUpcomingTrainings } = useTrainingStore();

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [checkingSession, setCheckingSession] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Custom drill config
  const [customDrill, setCustomDrill] = useState<CustomDrillConfig>({
    name: '',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 25,
    rounds_per_shooter: INFINITE_SHOTS_SENTINEL, // paper(scan) drills default to infinite max
    time_limit_seconds: null,
  });

  // Training drill selection
  const [selectedTrainingDrill, setSelectedTrainingDrill] = useState<TrainingDrillOption | null>(null);

  // Drill library (templates)
  const [drillTemplates, setDrillTemplates] = useState<DrillTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DrillTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const isPaperDrill = customDrill.target_type === 'paper';
  const maxShotsIsInfinite = isPaperDrill && isInfiniteShots(customDrill.rounds_per_shooter);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  useFocusEffect(
    useCallback(() => {
      const checkActiveSession = async () => {
        try {
          const activeSession = await getMyActiveSession();
          if (activeSession) {
            Alert.alert(
              'Active Session',
              `You have an active session${activeSession.drill_name ? ` for "${activeSession.drill_name}"` : ''}. What would you like to do?`,
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    router.replace({
                      pathname: '/(protected)/activeSession',
                      params: { sessionId: activeSession.id },
                    });
                  },
                },
                {
                  text: 'Delete & Start New',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteSession(activeSession.id);
                      setCheckingSession(false);
                    } catch (err) {
                      console.error('Failed to delete session:', err);
                      Alert.alert('Error', 'Failed to delete session');
                      router.back();
                    }
                  },
                },
                { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
              ]
            );
          } else {
            setCheckingSession(false);
          }
        } catch {
          setCheckingSession(false);
        }
      };

      const loadDrillTemplates = async () => {
        if (teams.length === 0) return;
        
        setLoadingTemplates(true);
        try {
          // Load templates from all teams
          const allTemplates: DrillTemplate[] = [];
          for (const team of teams) {
            const teamTemplates = await getTeamDrillTemplates(team.id);
            allTemplates.push(...teamTemplates);
          }
          setDrillTemplates(allTemplates);
        } catch (err) {
          console.error('Failed to load drill templates:', err);
        } finally {
          setLoadingTemplates(false);
        }
      };

      checkActiveSession();
      loadMyUpcomingTrainings();
      loadDrillTemplates();
    }, [loadMyUpcomingTrainings, teams])
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const trainingDrillOptions = useMemo((): TrainingDrillOption[] => {
    const options: TrainingDrillOption[] = [];

    myUpcomingTrainings
      .filter((t) => t.status === 'ongoing' || t.status === 'planned')
      .forEach((training) => {
        (training.drills || []).forEach((drill: TrainingDrill) => {
          options.push({
            id: drill.id,
            name: drill.name,
            drill_goal: drill.drill_goal || 'achievement',
            target_type: drill.target_type,
            distance_m: drill.distance_m,
            rounds_per_shooter: drill.rounds_per_shooter,
            time_limit_seconds: drill.time_limit_seconds,
            trainingId: training.id,
            trainingTitle: training.title,
            teamName: training.team?.name,
          });
        });
      });

    return options;
  }, [myUpcomingTrainings]);

  const hasTrainingDrills = trainingDrillOptions.length > 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleTrainingDrillSelect = useCallback((drill: TrainingDrillOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTrainingDrill((prev) => (prev?.id === drill.id ? null : drill));
    // Clear template selection when training drill is selected
    setSelectedTemplate(null);
  }, []);

  const handleTemplateSelect = useCallback((template: DrillTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTemplate((prev) => (prev?.id === template.id ? null : template));
    // Clear training drill selection when template is selected
    setSelectedTrainingDrill(null);
  }, []);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let session: SessionWithDetails;

      if (selectedTrainingDrill) {
        // Route to training live screen for training drills
        router.replace({
          pathname: '/(protected)/trainingLive',
          params: {
            trainingId: selectedTrainingDrill.trainingId,
            drillId: selectedTrainingDrill.id,
          },
        });
        return;
      } else if (selectedTemplate) {
        // Create session with drill template
        const primaryTeam = teams[0];

        session = await createSession({
          team_id: primaryTeam?.id ?? undefined,
          session_mode: 'solo',
          drill_template_id: selectedTemplate.id,
        });
      } else {
        // Create session with custom drill config
        const primaryTeam = teams[0];

        session = await createSession({
          team_id: primaryTeam?.id ?? undefined,
          session_mode: 'solo',
          custom_drill_config: {
            name: customDrill.name || 'Quick Practice',
            drill_goal: customDrill.drill_goal,
            target_type: customDrill.target_type,
            distance_m: customDrill.distance_m,
            rounds_per_shooter: customDrill.rounds_per_shooter,
            time_limit_seconds: customDrill.time_limit_seconds,
          },
        });
      }

      await loadSessions();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: '/(protected)/activeSession',
        params: { sessionId: session.id },
      });
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to start session');
    } finally {
      setIsStarting(false);
    }
  }, [selectedTrainingDrill, selectedTemplate, customDrill, teams, loadSessions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER - Loading
  // ═══════════════════════════════════════════════════════════════════════════

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.text} size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Checking sessions...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER - Main
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: '#10B98115' }]}>
          <Play size={28} color="#10B981" fill="#10B981" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>New Session</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Configure your drill or join a training
        </Text>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          QUICK PRACTICE SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="flash" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Practice</Text>
        </View>

        {/* Drill Name */}
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Name (optional)</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Quick Practice"
              placeholderTextColor={colors.textMuted}
              value={customDrill.name}
              onChangeText={(text) => setCustomDrill((prev) => ({ ...prev, name: text }))}
            />
          </View>
        </View>

        {/* Drill Type */}
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Drill Goal</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                {
                  backgroundColor: customDrill.drill_goal === 'grouping' ? '#10B98115' : colors.card,
                  borderColor: customDrill.drill_goal === 'grouping' ? '#10B981' : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                // Grouping is always paper
                setCustomDrill((prev) => ({
                  ...prev,
                  drill_goal: 'grouping',
                  target_type: 'paper',
                  rounds_per_shooter: INFINITE_SHOTS_SENTINEL,
                }));
                setSelectedTrainingDrill(null);
              }}
            >
              <Text style={[styles.typeBadge, { color: '#10B981' }]}>G</Text>
              <Text style={[styles.typeLabel, { color: customDrill.drill_goal === 'grouping' ? '#10B981' : colors.text }]}>
                Grouping
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                {
                  backgroundColor: customDrill.drill_goal === 'achievement' ? '#93C5FD15' : colors.card,
                  borderColor: customDrill.drill_goal === 'achievement' ? '#93C5FD' : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setCustomDrill((prev) => ({ ...prev, drill_goal: 'achievement' }));
                setSelectedTrainingDrill(null);
              }}
            >
              <Text style={[styles.typeBadge, { color: '#93C5FD' }]}>A</Text>
              <Text style={[styles.typeLabel, { color: customDrill.drill_goal === 'achievement' ? '#93C5FD' : colors.text }]}>
                Achievement
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Target Type - Only show for Achievement */}
        {customDrill.drill_goal === 'achievement' && (
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Target Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: customDrill.target_type === 'paper' ? colors.primary + '15' : colors.card,
                    borderColor: customDrill.target_type === 'paper' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCustomDrill((prev) => ({
                    ...prev,
                    target_type: 'paper',
                    // When switching to scan drills, default max shots to infinite.
                    rounds_per_shooter: INFINITE_SHOTS_SENTINEL,
                  }));
                }}
              >
                <Camera size={18} color={customDrill.target_type === 'paper' ? colors.primary : colors.textMuted} />
                <Text style={[styles.typeLabel, { color: customDrill.target_type === 'paper' ? colors.primary : colors.text }]}>
                  Paper (Scan)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: customDrill.target_type === 'tactical' ? colors.primary + '15' : colors.card,
                    borderColor: customDrill.target_type === 'tactical' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCustomDrill((prev) => ({
                    ...prev,
                    target_type: 'tactical',
                    // Tactical drills require a concrete rounds-per-round value.
                    rounds_per_shooter: Math.max(1, Math.min(100, prev.rounds_per_shooter || 5)),
                  }));
                }}
              >
                <Crosshair size={18} color={customDrill.target_type === 'tactical' ? colors.primary : colors.textMuted} />
                <Text style={[styles.typeLabel, { color: customDrill.target_type === 'tactical' ? colors.primary : colors.text }]}>
                  Tactical (Manual)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Distance */}
        <View style={styles.inputRow}>
          <View style={styles.inputLabelRow}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Distance</Text>
            <View style={[styles.stepper, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCustomDrill((prev) => ({ ...prev, distance_m: Math.max(5, prev.distance_m - 5) }));
                }}
              >
                <Minus size={16} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: colors.text }]}>{customDrill.distance_m}m</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCustomDrill((prev) => ({ ...prev, distance_m: Math.min(500, prev.distance_m + 5) }));
                }}
              >
                <Plus size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.presetRow}>
            {DISTANCE_PRESETS.map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: customDrill.distance_m === val ? colors.primary : colors.card,
                    borderColor: customDrill.distance_m === val ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCustomDrill((prev) => ({ ...prev, distance_m: val }));
                }}
              >
                <Text style={{ color: customDrill.distance_m === val ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>
                  {val}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shots / Max shots */}
        <View style={styles.inputRow}>
          <View style={styles.inputLabelRow}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              {isPaperDrill ? 'Max shots' : 'Shots'}
            </Text>
            {isPaperDrill && (
              <TouchableOpacity
                style={[
                  styles.toggleChip,
                  { backgroundColor: maxShotsIsInfinite ? colors.primary : colors.card },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCustomDrill((prev) => ({
                    ...prev,
                    rounds_per_shooter: isInfiniteShots(prev.rounds_per_shooter) ? 20 : INFINITE_SHOTS_SENTINEL,
                  }));
                }}
              >
                <Text style={{ color: maxShotsIsInfinite ? '#fff' : colors.textMuted, fontWeight: '600', fontSize: 13 }}>
                  {maxShotsIsInfinite ? 'Infinite' : 'Set infinite'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={[styles.stepper, { backgroundColor: colors.card, opacity: isPaperDrill && maxShotsIsInfinite ? 0.85 : 1 }]}>
              <TouchableOpacity
                style={styles.stepperBtn}
                disabled={isPaperDrill && maxShotsIsInfinite}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCustomDrill((prev) => ({
                    ...prev,
                    rounds_per_shooter: Math.max(
                      1,
                      Math.min(
                        isPaperDrill ? MAX_SHOTS_LIMIT : 100,
                        prev.rounds_per_shooter - MAX_SHOTS_STEP
                      )
                    ),
                  }));
                }}
              >
                <Minus size={16} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: colors.text }]}>
                {isPaperDrill ? formatMaxShots(customDrill.rounds_per_shooter) : customDrill.rounds_per_shooter}
              </Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                disabled={isPaperDrill && maxShotsIsInfinite}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCustomDrill((prev) => ({
                    ...prev,
                    rounds_per_shooter: Math.max(
                      1,
                      Math.min(
                        isPaperDrill ? MAX_SHOTS_LIMIT : 100,
                        prev.rounds_per_shooter + MAX_SHOTS_STEP
                      )
                    ),
                  }));
                }}
              >
                <Plus size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          {(!isPaperDrill || !maxShotsIsInfinite) && (
            <View style={styles.presetRow}>
              {SHOTS_PRESETS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: customDrill.rounds_per_shooter === val ? colors.primary : colors.card,
                      borderColor: customDrill.rounds_per_shooter === val ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomDrill((prev) => ({ ...prev, rounds_per_shooter: val }));
                  }}
                >
                  <Text style={{ color: customDrill.rounds_per_shooter === val ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Time Limit */}
        <View style={styles.inputRow}>
          <View style={styles.inputLabelRow}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Time Limit</Text>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                { backgroundColor: customDrill.time_limit_seconds ? colors.primary : colors.card },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setCustomDrill((prev) => ({
                  ...prev,
                  time_limit_seconds: prev.time_limit_seconds ? null : 60,
                }));
              }}
            >
              <Text style={{ color: customDrill.time_limit_seconds ? '#fff' : colors.textMuted, fontWeight: '600', fontSize: 13 }}>
                {customDrill.time_limit_seconds ? `${customDrill.time_limit_seconds}s` : 'None'}
              </Text>
            </TouchableOpacity>
          </View>
          {customDrill.time_limit_seconds && (
            <View style={styles.presetRow}>
              {TIME_PRESETS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: customDrill.time_limit_seconds === val ? colors.primary : colors.card,
                      borderColor: customDrill.time_limit_seconds === val ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCustomDrill((prev) => ({ ...prev, time_limit_seconds: val }));
                  }}
                >
                  <Text style={{ color: customDrill.time_limit_seconds === val ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>
                    {val}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          DRILL LIBRARY SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      {drillTemplates.length > 0 && (
        <View style={styles.section}>
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>or from library</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {loadingTemplates ? (
            <ActivityIndicator size="small" color={colors.textMuted} style={{ paddingVertical: 20 }} />
          ) : (
            <View style={styles.trainingList}>
              {drillTemplates.map((template) => {
                const isSelected = selectedTemplate?.id === template.id;
                const goalColor = template.drill_goal === 'grouping' ? '#10B981' : '#93C5FD';

                return (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.trainingCard,
                      {
                        backgroundColor: isSelected ? goalColor + '10' : colors.card,
                        borderColor: isSelected ? goalColor : colors.border,
                      },
                    ]}
                    onPress={() => handleTemplateSelect(template)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.trainingBadge, { backgroundColor: goalColor + '20' }]}>
                      <Text style={[styles.trainingBadgeText, { color: goalColor }]}>
                        {template.drill_goal === 'grouping' ? 'G' : 'A'}
                      </Text>
                    </View>
                    <View style={styles.trainingContent}>
                      <Text style={[styles.trainingName, { color: colors.text }]} numberOfLines={1}>
                        {template.name}
                      </Text>
                      <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
                        {template.distance_m}m ·{' '}
                        {template.target_type === 'paper'
                          ? `Scan (max ${formatMaxShots(template.rounds_per_shooter)})`
                          : `${template.rounds_per_shooter} shots`}
                        {template.time_limit_seconds ? ` · ${template.time_limit_seconds}s` : ''}
                      </Text>
                      <Text style={[styles.trainingSource, { color: colors.textMuted }]} numberOfLines={1}>
                        {template.target_type === 'paper' ? '📄 Paper' : '🎯 Tactical'}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View style={[styles.checkIcon, { backgroundColor: goalColor }]}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    ) : (
                      <ChevronRight size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TRAINING DRILLS SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      {hasTrainingDrills && (
        <View style={styles.section}>
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>or join training</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.trainingList}>
            {trainingDrillOptions.map((drill) => {
              const isSelected = selectedTrainingDrill?.id === drill.id;
              const goalColor = drill.drill_goal === 'grouping' ? '#10B981' : '#93C5FD';

              return (
                <TouchableOpacity
                  key={drill.id}
                  style={[
                    styles.trainingCard,
                    {
                      backgroundColor: isSelected ? goalColor + '10' : colors.card,
                      borderColor: isSelected ? goalColor : colors.border,
                    },
                  ]}
                  onPress={() => handleTrainingDrillSelect(drill)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.trainingBadge, { backgroundColor: goalColor + '20' }]}>
                    <Text style={[styles.trainingBadgeText, { color: goalColor }]}>
                      {drill.drill_goal === 'grouping' ? 'G' : 'A'}
                    </Text>
                  </View>
                  <View style={styles.trainingContent}>
                    <Text style={[styles.trainingName, { color: colors.text }]} numberOfLines={1}>
                      {drill.name}
                    </Text>
                    <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
                      {drill.distance_m}m ·{' '}
                      {drill.target_type === 'paper'
                        ? `Scan (max ${formatMaxShots(drill.rounds_per_shooter)})`
                        : `${drill.rounds_per_shooter} shots`}
                      {drill.time_limit_seconds ? ` · ${drill.time_limit_seconds}s` : ''}
                    </Text>
                    <Text style={[styles.trainingSource, { color: colors.textMuted }]} numberOfLines={1}>
                      {drill.trainingTitle}
                    </Text>
                  </View>
                  {isSelected ? (
                    <View style={[styles.checkIcon, { backgroundColor: goalColor }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  ) : (
                    <ChevronRight size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          START BUTTON
      ══════════════════════════════════════════════════════════════════════ */}
      <TouchableOpacity
        style={[styles.startButton, { backgroundColor: isStarting ? colors.muted : '#10B981' }]}
        onPress={handleStart}
        disabled={isStarting}
        activeOpacity={0.8}
      >
        {isStarting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Play size={20} color="#fff" fill="#fff" />
            <Text style={styles.startButtonText}>
              {selectedTrainingDrill
                ? `Start: ${selectedTrainingDrill.name}`
                : selectedTemplate
                ? `Start: ${selectedTemplate.name}`
                : customDrill.target_type === 'paper'
                ? `Start: ${customDrill.distance_m}m · Scan (max ${formatMaxShots(customDrill.rounds_per_shooter)})`
                : `Start: ${customDrill.distance_m}m · ${customDrill.rounds_per_shooter} shots`}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 14 },

  // Header
  header: { alignItems: 'center', paddingVertical: 24 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Section
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },

  // Input Row
  inputRow: { marginBottom: 16 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputWrapper: { borderRadius: 12, borderWidth: 1 },
  input: { height: 44, paddingHorizontal: 14, fontSize: 15 },

  // Type Row
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, borderWidth: 1.5 },
  typeBadge: { fontSize: 16, fontWeight: '700' },
  typeLabel: { fontSize: 14, fontWeight: '600' },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, overflow: 'hidden' },
  stepperBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  stepperValue: { fontSize: 15, fontWeight: '700', minWidth: 50, textAlign: 'center' },

  // Presets
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },

  // Toggle
  toggleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13, fontWeight: '500' },

  // Training List
  trainingList: { gap: 10 },
  trainingCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  trainingBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trainingBadgeText: { fontSize: 16, fontWeight: '700' },
  trainingContent: { flex: 1, gap: 2 },
  trainingName: { fontSize: 15, fontWeight: '600' },
  trainingMeta: { fontSize: 13 },
  trainingSource: { fontSize: 11, marginTop: 2 },
  checkIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  // Start Button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
    marginTop: 24,
    marginBottom: 20,
  },
  startButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
