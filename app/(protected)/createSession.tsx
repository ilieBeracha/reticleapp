/**
 * CREATE SESSION - Drill Selection + Configuration
 * 
 * Flow:
 * 1. Pick drill type (Grouping / Achievement)
 * 2. Configure: distance, shots, time, position
 * 3. Start → SessionPrepView
 */
import { useColors } from '@/hooks/ui/useColors';
import type { DrillConfig } from '@/services/session/types';
import {
  createSession,
  deleteSession,
  getMyActiveSession
} from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Check,
  Clock,
  Crosshair,
  Hand,
  MapPin,
  Play,
  Plus,
  Target,
  Trophy,
  User,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type DrillGoal = 'grouping' | 'achievement';
type InputMethod = 'scan' | 'manual';
type Position = 'standing' | 'kneeling' | 'prone' | 'any';

const DISTANCE_OPTIONS = [7, 15, 25, 50, 100];
const SHOTS_OPTIONS = [3, 5, 10, 20, 50];
const TIME_OPTIONS = [null, 30, 60, 120, 300]; // null = no limit
const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'standing', label: 'Standing' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'prone', label: 'Prone' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CreateSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  
  // View state
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [checkingSession, setCheckingSession] = useState(true);
  const [starting, setStarting] = useState(false);
  
  // Selected drill type
  const [drillGoal, setDrillGoal] = useState<DrillGoal>('grouping');
  const [inputMethod, setInputMethod] = useState<InputMethod>('scan');
  
  // Configuration
  const [distance, setDistance] = useState(25);
  const [shots, setShots] = useState(5);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [position, setPosition] = useState<Position>('any');

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK FOR ACTIVE SESSION
  // ─────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const checkActiveSession = async () => {
        try {
          const activeSession = await getMyActiveSession();
          
          if (activeSession) {
            Alert.alert(
              'Active Session',
              'You have an active session. Continue or start fresh?',
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
                      if (!cancelled) setCheckingSession(false);
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
            if (!cancelled) setCheckingSession(false);
          }
        } catch {
          if (!cancelled) setCheckingSession(false);
        }
      };
      
      checkActiveSession();
      return () => { cancelled = true; };
    }, [])
  );

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleSelectDrill = (goal: DrillGoal, input: InputMethod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrillGoal(goal);
    setInputMethod(input);
    setStep('configure');
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('select');
  };

  const handleStart = async () => {
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const config: DrillConfig = {
      name: drillGoal === 'grouping' ? 'Grouping Practice' : 'Achievement Practice',
      drill_goal: drillGoal,
      target_type: inputMethod === 'scan' ? 'paper' : drillGoal === 'grouping' ? 'paper' : 'tactical',
      input_method: inputMethod,
      distance_m: distance,
      rounds_per_shooter: shots,
      time_limit_seconds: timeLimit,
      strings_count: 1,
    };

    try {
      const session = await createSession({
        team_id: null,
        training_id: null,
        drill_id: null,
        drill_config: config,
        session_mode: 'solo',
        watch_controlled: false,
        start_as_pending: true,
      });
      
      await loadSessions();
      
      router.replace({
        pathname: '/(protected)/activeSession',
        params: { sessionId: session.id },
      });
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to start session');
      setStarting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (checkingSession) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: CONFIGURE
  // ─────────────────────────────────────────────────────────────────────────

  if (step === 'configure') {
    const isGrouping = drillGoal === 'grouping';
    
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with back */}
        <View style={styles.configHeaderRow}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: colors.secondary }]} 
            onPress={handleBack}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.configTypeBadge, { backgroundColor: isGrouping ? '#3B82F620' : '#F59E0B20' }]}>
            {isGrouping ? (
              <Crosshair size={14} color="#3B82F6" />
            ) : (
              <Trophy size={14} color="#F59E0B" />
            )}
            <Text style={[styles.configTypeBadgeText, { color: isGrouping ? '#3B82F6' : '#F59E0B' }]}>
              {isGrouping ? 'Grouping' : 'Achievement'}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.configTitle, { color: colors.text }]}>Configure Session</Text>

        {/* Distance */}
        <View style={styles.configSection}>
          <View style={styles.configLabelRow}>
            <MapPin size={16} color={colors.textMuted} />
            <Text style={[styles.configLabel, { color: colors.text }]}>Distance</Text>
          </View>
          <View style={styles.chipRow}>
            {DISTANCE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.chip,
                  { 
                    backgroundColor: distance === d ? colors.primary : colors.card,
                    borderColor: distance === d ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => { setDistance(d); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.chipText, { color: distance === d ? '#fff' : colors.text }]}>
                  {d}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shots */}
        <View style={styles.configSection}>
          <View style={styles.configLabelRow}>
            <Target size={16} color={colors.textMuted} />
            <Text style={[styles.configLabel, { color: colors.text }]}>Total Shots</Text>
          </View>
          <View style={styles.chipRow}>
            {SHOTS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.chip,
                  { 
                    backgroundColor: shots === s ? colors.primary : colors.card,
                    borderColor: shots === s ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => { setShots(s); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.chipText, { color: shots === s ? '#fff' : colors.text }]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Limit */}
        <View style={styles.configSection}>
          <View style={styles.configLabelRow}>
            <Clock size={16} color={colors.textMuted} />
            <Text style={[styles.configLabel, { color: colors.text }]}>Time Limit</Text>
          </View>
          <View style={styles.chipRow}>
            {TIME_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t ?? 'none'}
                style={[
                  styles.chip,
                  { 
                    backgroundColor: timeLimit === t ? colors.primary : colors.card,
                    borderColor: timeLimit === t ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => { setTimeLimit(t); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.chipText, { color: timeLimit === t ? '#fff' : colors.text }]}>
                  {t === null ? 'None' : t < 60 ? `${t}s` : `${t / 60}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Position */}
        <View style={styles.configSection}>
          <View style={styles.configLabelRow}>
            <User size={16} color={colors.textMuted} />
            <Text style={[styles.configLabel, { color: colors.text }]}>Position</Text>
          </View>
          <View style={styles.chipRow}>
            {POSITION_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.chip,
                  { 
                    backgroundColor: position === p.value ? colors.primary : colors.card,
                    borderColor: position === p.value ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => { setPosition(p.value); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.chipText, { color: position === p.value ? '#fff' : colors.text }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input Method */}
        <View style={styles.configSection}>
          <View style={styles.configLabelRow}>
            {inputMethod === 'scan' ? (
              <Camera size={16} color={colors.textMuted} />
            ) : (
              <Hand size={16} color={colors.textMuted} />
            )}
            <Text style={[styles.configLabel, { color: colors.text }]}>Input Method</Text>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                { 
                  backgroundColor: inputMethod === 'scan' ? colors.primary : colors.card,
                  borderColor: inputMethod === 'scan' ? colors.primary : colors.border,
                }
              ]}
              onPress={() => { setInputMethod('scan'); Haptics.selectionAsync(); }}
            >
              <Camera size={16} color={inputMethod === 'scan' ? '#fff' : colors.text} />
              <Text style={[styles.toggleText, { color: inputMethod === 'scan' ? '#fff' : colors.text }]}>
                Scan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                { 
                  backgroundColor: inputMethod === 'manual' ? colors.primary : colors.card,
                  borderColor: inputMethod === 'manual' ? colors.primary : colors.border,
                }
              ]}
              onPress={() => { setInputMethod('manual'); Haptics.selectionAsync(); }}
            >
              <Hand size={16} color={inputMethod === 'manual' ? '#fff' : colors.text} />
              <Text style={[styles.toggleText, { color: inputMethod === 'manual' ? '#fff' : colors.text }]}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryText, { color: colors.textMuted }]}>
            {isGrouping ? '🎯' : '🏆'} {distance}m · {shots} shots
            {timeLimit ? ` · ${timeLimit < 60 ? `${timeLimit}s` : `${timeLimit / 60}m`}` : ''}
            {position !== 'any' ? ` · ${position}` : ''}
            {inputMethod === 'scan' ? ' · 📷' : ' · ✋'}
          </Text>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
          onPress={handleStart}
          disabled={starting}
          activeOpacity={0.85}
        >
          {starting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Play size={20} color="#fff" fill="#fff" />
              <Text style={styles.startBtnText}>Start Session</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: SELECT DRILL TYPE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Target size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Solo Practice</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          What do you want to measure?
        </Text>
      </View>

      {/* Quick Start Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>QUICK START</Text>
        <View style={styles.quickDrills}>
          {/* Grouping */}
          <TouchableOpacity
            style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSelectDrill('grouping', 'scan')}
            activeOpacity={0.7}
          >
            <View style={[styles.drillIconBg, { backgroundColor: '#3B82F615' }]}>
              <Crosshair size={24} color="#3B82F6" />
            </View>
            <View style={styles.drillInfo}>
              <Text style={[styles.drillName, { color: colors.text }]}>Grouping</Text>
              <Text style={[styles.drillDesc, { color: colors.textMuted }]}>
                Measure shot dispersion
              </Text>
            </View>
            <View style={[styles.drillArrow, { backgroundColor: colors.secondary }]}>
              <Check size={16} color={colors.text} />
            </View>
          </TouchableOpacity>

          {/* Achievement */}
          <TouchableOpacity
            style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSelectDrill('achievement', 'manual')}
            activeOpacity={0.7}
          >
            <View style={[styles.drillIconBg, { backgroundColor: '#F59E0B15' }]}>
              <Trophy size={24} color="#F59E0B" />
            </View>
            <View style={styles.drillInfo}>
              <Text style={[styles.drillName, { color: colors.text }]}>Achievement</Text>
              <Text style={[styles.drillDesc, { color: colors.textMuted }]}>
                Hit/miss zone scoring
              </Text>
            </View>
            <View style={[styles.drillArrow, { backgroundColor: colors.secondary }]}>
              <Check size={16} color={colors.text} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Drills Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MY DRILLS</Text>
        <TouchableOpacity
          style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => Alert.alert('Coming Soon', 'Create and save your own custom drills')}
          activeOpacity={0.7}
        >
          <Plus size={24} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Create Drill</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Save your favorite configurations
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { 
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 14 },

  // Header (Step 1)
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Drill Cards
  quickDrills: {
    gap: 10,
  },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  drillIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillInfo: {
    flex: 1,
  },
  drillName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  drillDesc: {
    fontSize: 13,
  },
  drillArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty Card
  emptyCard: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: CONFIG STYLES
  // ─────────────────────────────────────────────────────────────────────────

  configHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  configTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  configTypeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  configSection: {
    marginBottom: 24,
  },
  configLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Summary
  summary: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  summaryText: {
    fontSize: 14,
    textAlign: 'center',
  },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 10,
    marginTop: 8,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
