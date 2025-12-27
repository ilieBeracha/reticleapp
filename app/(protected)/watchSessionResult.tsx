/**
 * Watch Session Result Sheet
 * 
 * Native formSheet that shows when Garmin watch sends session data.
 * User can review and save the watch stats to their session.
 * 
 * Route: /(protected)/watchSessionResult?sessionId=xxx&shots=10&duration=45&distance=25&completed=1
 */

import { useColors } from '@/hooks/ui/useColors';
import { saveWatchSessionData } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, MapPin, Target, Watch } from 'lucide-react-native';
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

export default function WatchSessionResultSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadPersonalSessions, loadTeamSessions } = useSessionStore();
  
  const { sessionId, shots, duration, distance, completed, teamId, trainingId } = useLocalSearchParams<{
    sessionId: string;
    shots?: string;
    duration?: string;
    distance?: string;
    completed?: string;
    teamId?: string;
    trainingId?: string;
  }>();

  const [saving, setSaving] = useState(false);

  const shotsCount = parseInt(shots || '0');
  const durationSec = parseInt(duration || '0');
  const distanceM = parseInt(distance || '0');
  const isCompleted = completed === '1';

  // Format duration
  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  };

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  const handleSave = useCallback(async (endSession: boolean) => {
    if (!sessionId) return;
    
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await saveWatchSessionData({
        sessionId,
        shotsRecorded: shotsCount,
        durationMs: durationSec * 1000,
        distance: distanceM,
        completed: endSession,
      }, endSession);

      if (endSession) {
        if (teamId) {
          await loadTeamSessions();
        } else {
          await loadPersonalSessions();
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Redirect back to training if session was part of one
        if (trainingId) {
          router.replace({
            pathname: '/(protected)/trainingDetail',
            params: { id: trainingId },
          });
        } else {
          router.replace('/(protected)/(tabs)');
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (error: any) {
      console.error('[WatchResult] Failed to save:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to save watch data');
      setSaving(false);
    }
  }, [sessionId, shotsCount, durationSec, distanceM, teamId, trainingId, loadPersonalSessions, loadTeamSessions]);

  if (!sessionId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Missing session data
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.sourceTag, { backgroundColor: `${colors.green}22` }]}>
            <Watch size={12} color={colors.green} />
            <Text style={[styles.sourceText, { color: colors.green }]}>Garmin</Text>
          </View>
          {isCompleted && (
            <View style={[styles.statusBadge, { backgroundColor: `${colors.green}22` }]}>
              <Text style={[styles.statusText, { color: colors.green }]}>Completed</Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Watch Data Received</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Review and save to your session
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${colors.indigo}22` }]}>
              <Target size={18} color={colors.indigo} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{shotsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Shots</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${colors.orange}22` }]}>
              <Clock size={18} color={colors.orange} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(durationSec)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${colors.green}22` }]}>
              <MapPin size={18} color={colors.green} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{distanceM}m</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          onPress={() => handleSave(true)}
          disabled={saving}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save & End Session</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSave(false)}
          disabled={saving}
          style={[styles.secondaryButton, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            Save & Continue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDismiss}
          disabled={saving}
          style={styles.textButton}
        >
          <Text style={[styles.textButtonText, { color: colors.textMuted }]}>
            Dismiss
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Stats
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Actions
  actionsSection: {
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  textButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
});
