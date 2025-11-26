import { useColors } from "@/hooks/ui/useColors";
import { getTrainingSessions, SessionWithDetails } from "@/services/sessionService";
import {
    cancelTraining,
    finishTraining,
    getTrainingById,
    startTraining
} from "@/services/trainingService";
import type { TrainingDrill, TrainingStatus, TrainingWithDetails } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Haptics from 'expo-haptics';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

export interface TrainingDetailSheetRef {
  open: (trainingId: string) => void;
  close: () => void;
}

interface TrainingDetailSheetProps {
  onTrainingUpdated?: () => void;
}

// Status colors
function getStatusConfig(status: TrainingStatus) {
  const configs = {
    planned: { color: '#3B82F6', bg: '#3B82F615', icon: 'calendar' as const, label: 'Planned' },
    ongoing: { color: '#22C55E', bg: '#22C55E15', icon: 'play-circle' as const, label: 'In Progress' },
    finished: { color: '#6B7280', bg: '#6B728015', icon: 'checkmark-circle' as const, label: 'Finished' },
    cancelled: { color: '#EF4444', bg: '#EF444415', icon: 'close-circle' as const, label: 'Cancelled' },
  };
  return configs[status] || configs.planned;
}

// Format helpers
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Drill Card Component
// Session Mini Card Component
const SessionMiniCard = ({ session, colors }: { 
  session: SessionWithDetails; 
  colors: ReturnType<typeof useColors>;
}) => {
  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#3B82F620', text: '#3B82F6' },
    completed: { bg: '#22C55E20', text: '#22C55E' },
    cancelled: { bg: '#EF444420', text: '#EF4444' },
  };
  const status = statusColors[session.status] || statusColors.completed;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.sessionStatusDot, { backgroundColor: status.text }]} />
      <View style={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionUserName, { color: colors.text }]}>
            {session.user_full_name || 'Unknown User'}
          </Text>
          <View style={[styles.sessionStatusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.sessionStatusText, { color: status.text }]}>
              {session.status}
            </Text>
          </View>
        </View>
        <View style={styles.sessionMeta}>
          <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
            {formatTime(session.started_at)}
          </Text>
          {session.drill_name && (
            <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
              • {session.drill_name}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

// Drill Card Component
const DrillCard = ({ drill, index, colors }: { 
  drill: TrainingDrill; 
  index: number;
  colors: ReturnType<typeof useColors>;
}) => (
  <View style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={[styles.drillIndex, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.drillIndexText, { color: colors.textMuted }]}>#{index + 1}</Text>
    </View>
    <View style={styles.drillContent}>
      <Text style={[styles.drillName, { color: colors.text }]}>{drill.name}</Text>
      <View style={styles.drillDetails}>
        <View style={[styles.drillBadge, { backgroundColor: colors.secondary }]}>
          <Ionicons 
            name={drill.target_type === 'paper' ? 'document-outline' : 'shield-outline'} 
            size={12} 
            color={colors.textMuted} 
          />
          <Text style={[styles.drillBadgeText, { color: colors.textMuted }]}>
            {drill.target_type}
          </Text>
        </View>
        <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
          {drill.distance_m}m
        </Text>
        <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
          {drill.rounds_per_shooter} rounds
        </Text>
        {drill.time_limit_seconds && (
          <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
            {Math.floor(drill.time_limit_seconds / 60)}:{(drill.time_limit_seconds % 60).toString().padStart(2, '0')}
          </Text>
        )}
      </View>
      {drill.position && (
        <Text style={[styles.drillPosition, { color: colors.textMuted }]}>
          Position: {drill.position}
        </Text>
      )}
      {drill.notes && (
        <Text style={[styles.drillNotes, { color: colors.textMuted }]} numberOfLines={2}>
          {drill.notes}
        </Text>
      )}
    </View>
  </View>
);

export const TrainingDetailSheet = forwardRef<TrainingDetailSheetRef, TrainingDetailSheetProps>(
  ({ onTrainingUpdated }, ref) => {
    const colors = useColors();
    const sheetRef = useRef<BaseBottomSheetRef>(null);
    
    const [training, setTraining] = useState<TrainingWithDetails | null>(null);
    const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchTraining = useCallback(async (trainingId: string) => {
      setLoading(true);
      try {
        const data = await getTrainingById(trainingId);
        setTraining(data);
        
        // Also fetch sessions for this training
        fetchSessions(trainingId);
      } catch (error) {
        console.error('Failed to fetch training:', error);
        Alert.alert('Error', 'Failed to load training details');
        sheetRef.current?.close();
      } finally {
        setLoading(false);
      }
    }, []);

    const fetchSessions = useCallback(async (trainingId: string) => {
      setLoadingSessions(true);
      try {
        const data = await getTrainingSessions(trainingId);
        setSessions(data);
      } catch (error) {
        console.error('Failed to fetch training sessions:', error);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      open: (trainingId: string) => {
        fetchTraining(trainingId);
        sheetRef.current?.open();
      },
      close: () => {
        sheetRef.current?.close();
        setTraining(null);
        setSessions([]);
      },
    }));

    const handleStartTraining = useCallback(async () => {
      if (!training) return;
      
      Alert.alert(
        'Start Training',
        'Are you sure you want to start this training?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start',
            onPress: async () => {
              setActionLoading(true);
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await startTraining(training.id);
                setTraining(prev => prev ? { ...prev, status: 'ongoing' } : null);
                onTrainingUpdated?.();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error: any) {
                console.error('Failed to start training:', error);
                Alert.alert('Error', error.message || 'Failed to start training');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    }, [training, onTrainingUpdated]);

    const handleFinishTraining = useCallback(async () => {
      if (!training) return;
      
      Alert.alert(
        'Finish Training',
        'Mark this training as completed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Finish',
            onPress: async () => {
              setActionLoading(true);
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await finishTraining(training.id);
                setTraining(prev => prev ? { ...prev, status: 'finished' } : null);
                onTrainingUpdated?.();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error: any) {
                console.error('Failed to finish training:', error);
                Alert.alert('Error', error.message || 'Failed to finish training');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    }, [training, onTrainingUpdated]);

    const handleCancelTraining = useCallback(async () => {
      if (!training) return;
      
      Alert.alert(
        'Cancel Training',
        'Are you sure you want to cancel this training? This action cannot be undone.',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Training',
            style: 'destructive',
            onPress: async () => {
              setActionLoading(true);
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                await cancelTraining(training.id);
                setTraining(prev => prev ? { ...prev, status: 'cancelled' } : null);
                onTrainingUpdated?.();
                sheetRef.current?.close();
              } catch (error: any) {
                console.error('Failed to cancel training:', error);
                Alert.alert('Error', error.message || 'Failed to cancel training');
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    }, [training, onTrainingUpdated]);

    if (loading || !training) {
      return (
        <BaseBottomSheet ref={sheetRef} snapPoints={['70%']} backdropOpacity={0.6}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </BaseBottomSheet>
      );
    }

    const statusConfig = getStatusConfig(training.status);
    const drills = training.drills || [];

    return (
      <BaseBottomSheet ref={sheetRef} snapPoints={['85%']} backdropOpacity={0.6}>
        <BottomSheetScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{training.title}</Text>
            {training.description && (
              <Text style={[styles.description, { color: colors.textMuted }]}>
                {training.description}
              </Text>
            )}
          </View>

          {/* Info Cards */}
          <View style={styles.infoSection}>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatDate(training.scheduled_at)}
                </Text>
              </View>
            </View>
            
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Time</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatTime(training.scheduled_at)}
                </Text>
              </View>
            </View>
            
            {training.team && (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Team</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {training.team.name}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Drills Section */}
          <View style={styles.drillsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Drills ({drills.length})
              </Text>
            </View>
            
            {drills.length === 0 ? (
              <View style={[styles.emptyDrills, { backgroundColor: colors.secondary }]}>
                <Ionicons name="list-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.emptyDrillsText, { color: colors.textMuted }]}>
                  No drills scheduled for this training
                </Text>
              </View>
            ) : (
              <View style={styles.drillsList}>
                {drills.map((drill, index) => (
                  <DrillCard 
                    key={drill.id} 
                    drill={drill} 
                    index={index} 
                    colors={colors} 
                  />
                ))}
              </View>
            )}
          </View>

          {/* Sessions Section */}
          <View style={styles.sessionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Sessions ({sessions.length})
              </Text>
            </View>
            
            {loadingSessions ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ padding: 20 }} />
            ) : sessions.length === 0 ? (
              <View style={[styles.emptyDrills, { backgroundColor: colors.secondary }]}>
                <Ionicons name="fitness-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.emptyDrillsText, { color: colors.textMuted }]}>
                  No sessions logged for this training yet
                </Text>
              </View>
            ) : (
              <View style={styles.sessionsList}>
                {sessions.slice(0, 5).map((session) => (
                  <SessionMiniCard 
                    key={session.id} 
                    session={session} 
                    colors={colors} 
                  />
                ))}
                {sessions.length > 5 && (
                  <Text style={[styles.moreSessionsText, { color: colors.textMuted }]}>
                    +{sessions.length - 5} more sessions
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Actions */}
          {(training.status === 'planned' || training.status === 'ongoing') && (
            <View style={styles.actions}>
              {training.status === 'planned' && (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                    onPress={handleStartTraining}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                      {actionLoading ? 'Starting...' : 'Start Training'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.red || '#EF4444' }]}
                    onPress={handleCancelTraining}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={18} color={colors.red || '#EF4444'} />
                    <Text style={[styles.cancelButtonText, { color: colors.red || '#EF4444' }]}>
                      Cancel Training
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {training.status === 'ongoing' && (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#22C55E' }]}
                  onPress={handleFinishTraining}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {actionLoading ? 'Finishing...' : 'Mark as Completed'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Creator Info */}
          {training.creator && (
            <View style={[styles.creatorSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.creatorLabel, { color: colors.textMuted }]}>
                Created by {training.creator.full_name || 'Unknown'}
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

TrainingDetailSheet.displayName = 'TrainingDetailSheet';

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Info Section
  infoSection: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Drills Section
  drillsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  drillsList: {
    gap: 10,
  },
  drillCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: 12,
  },
  drillIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillIndexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  drillContent: {
    flex: 1,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  drillDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  drillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  drillBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  drillMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  drillPosition: {
    fontSize: 12,
    marginTop: 4,
  },
  drillNotes: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyDrills: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyDrillsText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Sessions Section
  sessionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sessionsList: {
    gap: 8,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    gap: 10,
  },
  sessionStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionUserName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sessionStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  sessionMetaText: {
    fontSize: 12,
  },
  moreSessionsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '500',
  },

  // Actions
  actions: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Creator Section
  creatorSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  creatorLabel: {
    fontSize: 12,
  },
});

