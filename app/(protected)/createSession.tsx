/**
 * CREATE SESSION - Solo Practice
 */
import { useColors } from '@/hooks/ui/useColors';
import {
  createSession,
  deleteSession,
  getMyActiveSession
} from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { INFINITE_SHOTS_SENTINEL } from '@/utils/drillShots';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Camera, Check, Crosshair, Minus, Play, Plus, Repeat } from 'lucide-react-native';
import { useCallback, useState } from 'react';
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
type InputMethod = 'scan' | 'manual';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DISTANCE_PRESETS = [10, 15, 25, 50, 100];
const TIME_PRESETS = [30, 60, 90, 120];
const BULLET_PRESETS = [3, 5, 10, 15];
const MAX_MANUAL_BULLETS = 15;
const MAX_SOLO_ROUNDS = 2; // Max rounds for solo practice

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function CreateSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { teams } = useTeamStore();
  const { loadSessions } = useSessionStore();

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [checkingSession, setCheckingSession] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  
  const [name, setName] = useState('');
  const [drillGoal, setDrillGoal] = useState<DrillGoal>('grouping');
  const [inputMethod, setInputMethod] = useState<InputMethod>('scan');
  const [bullets, setBullets] = useState(5);
  const [rounds, setRounds] = useState(1);
  const [distance, setDistance] = useState(25);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

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

      checkActiveSession();
    }, [])
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const primaryTeam = teams[0];

      // Consistency rule:
      // - grouping => paper + scan (infinite shots sentinel)
      // - achievement => scan => paper (infinite), manual => tactical (fixed bullets)
      const targetType: TargetType =
        drillGoal === 'grouping' ? 'paper' : inputMethod === 'scan' ? 'paper' : 'tactical';
      const roundsPerShooter =
        drillGoal === 'grouping' ? INFINITE_SHOTS_SENTINEL : inputMethod === 'scan' ? INFINITE_SHOTS_SENTINEL : bullets;

      const session = await createSession({
        team_id: primaryTeam?.id ?? undefined,
        session_mode: 'solo',
        custom_drill_config: {
          name: name || 'Solo Practice',
          drill_goal: drillGoal,
          target_type: targetType,
          input_method: drillGoal === 'grouping' ? 'scan' : inputMethod, // User's choice (grouping always scan)
          distance_m: distance,
          rounds_per_shooter: roundsPerShooter,
          time_limit_seconds: timeLimit,
          strings_count: rounds,
        },
      });

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
  }, [name, drillGoal, inputMethod, bullets, rounds, distance, timeLimit, teams, loadSessions]);

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
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: '#10B98115' }]}>
          <Play size={28} color="#10B981" fill="#10B981" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Solo Practice</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Configure your session
        </Text>
      </View>

      {/* Session Name */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Session Name</Text>
        <TextInput
          style={[styles.cardInput, { color: colors.text }]}
          placeholder="Solo Practice"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Drill Goal */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Goal</Text>
        <View style={[styles.segmented, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.segmentedOption,
              drillGoal === 'grouping' && { backgroundColor: '#10B981' },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setDrillGoal('grouping');
              setInputMethod('scan');
              setRounds(1); // Grouping is always 1 round
            }}
          >
            <Text style={[styles.segmentedText, { color: drillGoal === 'grouping' ? '#fff' : colors.text }]}>
              Grouping
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentedOption,
              drillGoal === 'achievement' && { backgroundColor: '#3B82F6' },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setDrillGoal('achievement');
            }}
          >
            <Text style={[styles.segmentedText, { color: drillGoal === 'achievement' ? '#fff' : colors.text }]}>
              Achievement
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Input Method Selection - Always shown */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Input Method</Text>
        <View style={[styles.segmented, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.segmentedOption,
              inputMethod === 'scan' && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setInputMethod('scan');
            }}
          >
            <Camera size={16} color={inputMethod === 'scan' ? '#fff' : colors.textMuted} />
            <Text style={[styles.segmentedText, { color: inputMethod === 'scan' ? '#fff' : colors.text }]}>
              Scan Target
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentedOption,
              inputMethod === 'manual' && { backgroundColor: colors.primary },
              drillGoal === 'grouping' && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (drillGoal === 'grouping') return;
              Haptics.selectionAsync();
              setInputMethod('manual');
            }}
            disabled={drillGoal === 'grouping'}
          >
            <Crosshair size={16} color={inputMethod === 'manual' ? '#fff' : colors.textMuted} />
            <Text style={[styles.segmentedText, { color: inputMethod === 'manual' ? '#fff' : colors.text }]}>
              Manual Entry
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bullet Count - Only for Manual Input */}
      {inputMethod === 'manual' && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: colors.textMuted, marginBottom: 0 }]}>Bullets per Entry</Text>
            <View style={[styles.stepper, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBullets((prev) => Math.max(1, prev - 1));
                }}
              >
                <Minus size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: colors.text }]}>{bullets}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBullets((prev) => Math.min(MAX_MANUAL_BULLETS, prev + 1));
                }}
              >
                <Plus size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.chipRow}>
            {BULLET_PRESETS.map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.chip,
                  { backgroundColor: bullets === val ? colors.primary : colors.background },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBullets(val);
                }}
              >
                <Text style={[styles.chipText, { color: bullets === val ? '#fff' : colors.text }]}>
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Rounds Count - Only for Achievement drills */}
      {drillGoal === 'achievement' && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.roundsIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Repeat size={14} color={colors.primary} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.textMuted, marginBottom: 0 }]}>Rounds</Text>
            </View>
          </View>
          <View style={styles.roundsRow}>
            <TouchableOpacity
              style={[
                styles.roundsOption,
                { 
                  backgroundColor: rounds === 1 ? `${colors.primary}10` : colors.background, 
                  borderColor: rounds === 1 ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setRounds(1);
              }}
              activeOpacity={0.7}
            >
              {rounds === 1 && (
                <View style={[styles.roundsCheck, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="#fff" strokeWidth={3} />
                </View>
              )}
              <Text style={[styles.roundsNumber, { color: rounds === 1 ? colors.primary : colors.text }]}>1</Text>
              <Text style={[styles.roundsLabel, { color: rounds === 1 ? colors.primary : colors.textMuted }]}>Round</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roundsOption,
                { 
                  backgroundColor: rounds === 2 ? `${colors.primary}10` : colors.background, 
                  borderColor: rounds === 2 ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setRounds(2);
              }}
              activeOpacity={0.7}
            >
              {rounds === 2 && (
                <View style={[styles.roundsCheck, { backgroundColor: colors.primary }]}>
                  <Check size={12} color="#fff" strokeWidth={3} />
                </View>
              )}
              <Text style={[styles.roundsNumber, { color: rounds === 2 ? colors.primary : colors.text }]}>2</Text>
              <Text style={[styles.roundsLabel, { color: rounds === 2 ? colors.primary : colors.textMuted }]}>Rounds</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Distance */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardLabel, { color: colors.textMuted, marginBottom: 0 }]}>Distance</Text>
          <View style={[styles.stepper, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setDistance((prev) => Math.max(5, prev - 5));
              }}
            >
              <Minus size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: colors.text }]}>{distance}m</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                Haptics.selectionAsync();
                setDistance((prev) => Math.min(500, prev + 5));
              }}
            >
              <Plus size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.chipRow}>
          {DISTANCE_PRESETS.map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.chip,
                { backgroundColor: distance === val ? colors.primary : colors.background },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setDistance(val);
              }}
            >
              <Text style={[styles.chipText, { color: distance === val ? '#fff' : colors.text }]}>
                {val}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Time Limit */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardRow}>
          <Text style={[styles.cardLabel, { color: colors.textMuted, marginBottom: 0 }]}>Time Limit</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: timeLimit ? colors.primary : colors.background }]}
            onPress={() => {
              Haptics.selectionAsync();
              setTimeLimit((prev) => (prev ? null : 60));
            }}
          >
            <Text style={[styles.toggleText, { color: timeLimit ? '#fff' : colors.textMuted }]}>
              {timeLimit ? `${timeLimit}s` : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>
        {timeLimit && (
          <View style={styles.chipRow}>
            {TIME_PRESETS.map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.chip,
                  { backgroundColor: timeLimit === val ? colors.primary : colors.background },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTimeLimit(val);
                }}
              >
                <Text style={[styles.chipText, { color: timeLimit === val ? '#fff' : colors.text }]}>
                  {val}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Start Button */}
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
            <Text style={styles.startButtonText}>Start Session</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },

  // Card
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  cardInput: {
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Segmented Control
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  segmentedOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
  },
  segmentedText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  stepperBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
  },

  // Toggle Button
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Rounds Selector
  roundsIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  roundsOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 14,
    borderWidth: 2,
    position: 'relative',
  },
  roundsCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundsNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  roundsLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Start Button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
