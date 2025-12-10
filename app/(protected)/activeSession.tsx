/**
 * Active Session Screen
 * 
 * Shows the current active shooting session with targets, stats, and actions.
 * Clear separation between Paper (scan) and Tactical (manual) target flows.
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  calculateSessionStats,
  endSession,
  getSessionById,
  getSessionTargetsWithResults,
  SessionStats,
  SessionTargetWithResults,
  SessionWithDetails,
} from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Crosshair, Target, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ActiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { loadSessions } = useSessionStore();

  // State
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);

  // Live timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      const [sessionData, targetsData, statsData] = await Promise.all([
        getSessionById(sessionId),
        getSessionTargetsWithResults(sessionId),
        calculateSessionStats(sessionId),
      ]);

      setSession(sessionData);
      setTargets(targetsData);
      setStats(statsData);
    } catch (error) {
      console.error('[Session] Failed to load:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Live timer
  useEffect(() => {
    if (session?.started_at) {
      const startTime = new Date(session.started_at).getTime();
      const updateElapsed = () => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      };
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [session?.started_at]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const totalShots = stats?.totalShotsFired ?? 0;
  const totalHits = stats?.totalHits ?? 0;
  const accuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;

  const avgDistance = useMemo(() => {
    if (targets.length === 0) return 0;
    return Math.round(
      targets.reduce((sum, t) => sum + (t.distance_m || 0), 0) / targets.length
    );
  }, [targets]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  // Paper scan - goes directly to camera
  const handleScanPaper = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(protected)/scanTarget',
      params: {
        sessionId,
        distance: avgDistance > 0 ? avgDistance.toString() : '100',
      },
    });
  }, [sessionId, avgDistance]);

  // Tactical entry - goes to form
  const handleLogTactical = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(protected)/tacticalTarget',
      params: {
        sessionId,
        distance: avgDistance > 0 ? avgDistance.toString() : '25',
      },
    });
  }, [sessionId, avgDistance]);

  const handleTargetPress = useCallback((target: SessionTargetWithResults) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Open target detail modal
  }, []);

  const handleEndSession = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'End Session?',
      `${targets.length} target${targets.length !== 1 ? 's' : ''} logged • ${formatTime(elapsedTime)} elapsed`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setEnding(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await endSession(sessionId!);
              await loadSessions();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace('/(protected)/personal');
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.message || 'Failed to end session');
              setEnding(false);
            }
          },
        },
      ]
    );
  }, [sessionId, targets.length, elapsedTime, loadSessions]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Leave Session?',
      'Your session stays active. You can return later.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: () => router.back() },
      ]
    );
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderTarget = useCallback(
    ({ item, index }: { item: SessionTargetWithResults; index: number }) => {
      const isPaper = item.target_type === 'paper';
      const hits = isPaper 
        ? item.paper_result?.hits_total 
        : item.tactical_result?.hits;
      const shots = isPaper 
        ? item.paper_result?.bullets_fired 
        : item.tactical_result?.bullets_fired;
      
      return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
          <TouchableOpacity
            style={[styles.targetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleTargetPress(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.targetIcon, { backgroundColor: isPaper ? '#6366F120' : '#F59E0B20' }]}>
              {isPaper ? (
                <Target size={20} color="#6366F1" />
              ) : (
                <Crosshair size={20} color="#F59E0B" />
              )}
            </View>
            
            <View style={styles.targetInfo}>
              <View style={styles.targetHeader}>
                <Text style={[styles.targetTitle, { color: colors.text }]}>
                  {isPaper ? 'Paper Target' : 'Tactical Target'}
                </Text>
                <Text style={[styles.targetIndex, { color: colors.textMuted }]}>
                  #{targets.length - index}
                </Text>
              </View>
              
              <View style={styles.targetMeta}>
                {item.distance_m && (
                  <Text style={[styles.targetMetaText, { color: colors.textMuted }]}>
                    {item.distance_m}m
                  </Text>
                )}
                {shots && (
                  <>
                    <Text style={[styles.targetMetaDot, { color: colors.border }]}>•</Text>
                    <Text style={[styles.targetMetaText, { color: colors.textMuted }]}>
                      {hits ?? 0}/{shots} hits
                    </Text>
                  </>
                )}
              </View>
            </View>
            
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [colors, targets.length, handleTargetPress]
  );

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Target size={40} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No targets yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
        Scan a paper target or log a tactical target
      </Text>
    </View>
  ), [colors]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ============================================================================
  // ERROR / COMPLETED STATE
  // ============================================================================
  if (!session || session.status !== 'active') {
    const isCompleted = session?.status === 'completed';
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.statusIcon, { backgroundColor: isCompleted ? '#10B98120' : '#EF444420' }]}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'alert-circle'}
            size={48}
            color={isCompleted ? '#10B981' : '#EF4444'}
          />
        </View>
        <Text style={[styles.statusTitle, { color: colors.text }]}>
          {isCompleted ? 'Session Completed' : 'Session not found'}
        </Text>
        <TouchableOpacity 
          style={[styles.statusButton, { backgroundColor: colors.secondary }]} 
          onPress={() => router.back()}
        >
          <Text style={[styles.statusButtonText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View 
        entering={FadeIn.duration(300)}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary }]}
          onPress={handleClose}
        >
          <X size={20} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.training_title || session.drill_name || 'Training Session'}
          </Text>
        </View>
        
        <View style={[styles.timerBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
        </View>
      </Animated.View>

      {/* Stats Cards */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsSection}>
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{targets.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Targets</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalShots}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Shots</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{totalHits}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hits</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: accuracy >= 70 ? '#10B981' : accuracy >= 50 ? '#F59E0B' : colors.text }]}>
                {accuracy}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Target Type Breakdown (if targets exist) */}
      {targets.length > 0 && (
        <View style={styles.breakdownSection}>
          <View style={styles.breakdownRow}>
            <View style={[styles.breakdownItem, { backgroundColor: '#6366F115' }]}>
              <Target size={14} color="#6366F1" />
              <Text style={[styles.breakdownText, { color: colors.text }]}>
                {stats?.paperTargets ?? 0} Paper
              </Text>
            </View>
            <View style={[styles.breakdownItem, { backgroundColor: '#F59E0B15' }]}>
              <Crosshair size={14} color="#F59E0B" />
              <Text style={[styles.breakdownText, { color: colors.text }]}>
                {stats?.tacticalTargets ?? 0} Tactical
              </Text>
            </View>
            {avgDistance > 0 && (
              <View style={[styles.breakdownItem, { backgroundColor: colors.secondary }]}>
                <Zap size={14} color={colors.textMuted} />
                <Text style={[styles.breakdownText, { color: colors.text }]}>
                  ~{avgDistance}m avg
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Targets List */}
      <View style={styles.listContainer}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TARGETS</Text>
        <FlatList
          data={targets}
          renderItem={renderTarget}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 180 },
            targets.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {/* End Session Button */}
        <TouchableOpacity
          style={[styles.endButton, { backgroundColor: '#EF444420' }]}
          onPress={handleEndSession}
          disabled={ending}
          activeOpacity={0.7}
        >
          {ending ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons name="stop" size={20} color="#EF4444" />
          )}
        </TouchableOpacity>

        {/* Tactical Target Button */}
        <TouchableOpacity
          style={[styles.tacticalButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleLogTactical}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconSmall, { backgroundColor: '#F59E0B20' }]}>
            <Crosshair size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.tacticalButtonText, { color: colors.text }]}>Tactical</Text>
        </TouchableOpacity>

        {/* Scan Paper Button (Primary) */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanPaper}
          activeOpacity={0.8}
        >
          <View style={styles.scanButtonInner}>
            <Camera size={20} color="#fff" />
            <Text style={styles.scanButtonText}>Scan Paper</Text>
          </View>
        </TouchableOpacity>
      </View>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  timerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Stats
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
  },

  // Breakdown
  breakdownSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  breakdownText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  listContent: {
    gap: 10,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Target Card
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  targetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetInfo: {
    flex: 1,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  targetIndex: {
    fontSize: 13,
    fontWeight: '500',
  },
  targetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  targetMetaText: {
    fontSize: 13,
  },
  targetMetaDot: {
    fontSize: 8,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Status States
  statusIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  statusButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  statusButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Bottom Actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  endButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tacticalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tacticalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scanButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#10B981',
  },
  scanButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
