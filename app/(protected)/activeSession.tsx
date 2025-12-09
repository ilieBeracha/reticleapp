/**
 * Active Session Screen
 * 
 * Shows the current active shooting session with targets, stats, and actions.
 * Users can add targets, view details, and end the session.
 */

import {
  EmptyTargets,
  SessionHeader,
  StatCard,
  TargetCard,
  TargetDetailModal,
} from '@/components/session';
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
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ActiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { loadSessions } = useSessionStore();

  // State
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);

  // Target detail modal
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Get selected target from current targets array (always synced)
  const selectedTarget = useMemo(() => {
    if (!selectedTargetId) return null;
    return targets.find((t) => t.id === selectedTargetId) || null;
  }, [targets, selectedTargetId]);

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

  const avgDistance = useMemo(() => {
    if (targets.length === 0) return 0;
    return Math.round(
      targets.reduce((sum, t) => sum + (t.distance_m || 0), 0) / targets.length
    );
  }, [targets]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  // Quick Scan - goes directly to camera with paper defaults
  const handleScanTarget = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(protected)/addTarget',
      params: {
        sessionId,
        defaultTargetType: 'paper',
        defaultDistance: avgDistance > 0 ? avgDistance.toString() : '100',
      },
    });
  }, [sessionId, avgDistance]);

  // Manual entry for tactical targets
  const handleLogTarget = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(protected)/addTarget',
      params: {
        sessionId,
        defaultTargetType: 'tactical',
        defaultDistance: avgDistance > 0 ? avgDistance.toString() : '25',
      },
    });
  }, [sessionId, avgDistance]);

  const handleTargetPress = useCallback(
    (target: SessionTargetWithResults, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedTargetId(target.id);
      setSelectedIndex(index);
      setDetailModalVisible(true);
    },
    []
  );

  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedTargetId(null);
  }, []);

  const handleEndSession = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'End Session?',
      `${targets.length} target${targets.length !== 1 ? 's' : ''} logged`,
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
              router.replace('/(protected)/team');
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.message || 'Failed to end session');
              setEnding(false);
            }
          },
        },
      ]
    );
  }, [sessionId, targets.length, loadSessions]);

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
    ({ item, index }: { item: SessionTargetWithResults; index: number }) => (
      <TargetCard
        target={item}
        index={targets.length - index}
        onPress={() => handleTargetPress(item, targets.length - index)}
      />
    ),
    [targets.length, handleTargetPress]
  );

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // ============================================================================
  // ERROR / COMPLETED STATE
  // ============================================================================
  if (!session || session.status !== 'active') {
    const isCompleted = session?.status === 'completed';
    return (
      <View style={styles.centerContainer}>
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'alert-circle'}
          size={56}
          color={isCompleted ? '#10B981' : '#EF4444'}
        />
        <Text style={styles.errorTitle}>
          {isCompleted ? 'Session Completed' : 'Session not found'}
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <SessionHeader
        title={session.training_title || undefined}
        startedAt={session.started_at}
        onClose={handleClose}
        paddingTop={insets.top}
      />

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <StatCard value={targets.length} label="targets" />
        <View style={styles.statDivider} />
        <StatCard value={totalShots} label="shots" />
        <View style={styles.statDivider} />
        <StatCard value={totalHits} label="hits" accent />
        <View style={styles.statDivider} />
        <StatCard value={avgDistance || '—'} label="avg m" />
      </View>

      {/* Targets List */}
      <View style={styles.listContainer}>
        <FlatList
          data={targets}
          renderItem={renderTarget}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
            targets.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={EmptyTargets}
        refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#10B981"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        {/* End Session Button */}
        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndSession}
          disabled={ending}
          activeOpacity={0.7}
        >
          {ending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="stop" size={18} color="#EF4444" />
          )}
        </TouchableOpacity>

        {/* Log Target Button (Tactical - manual entry) */}
        <TouchableOpacity
          style={styles.logButton}
          onPress={handleLogTarget}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.logButtonText}>Log</Text>
        </TouchableOpacity>

        {/* Scan Target Button (Paper - camera) */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanTarget}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.scanButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="scan" size={22} color="#fff" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Target Detail Modal */}
      <TargetDetailModal
        target={selectedTarget}
        index={selectedIndex}
        visible={detailModalVisible}
        onClose={handleCloseDetail}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
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
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  endButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  scanButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanButtonGradient: {
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

  // Error State
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
