import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { getMyActivePersonalSession, getMyActiveSession } from "@/services/sessionService";
import { useSessionStore } from "@/store/sessionStore";
import { useTrainingStore } from "@/store/trainingStore";
import type { TrainingWithDetails } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ============================================================================
// TRAINING CARD (for linking to a training)
// ============================================================================
const TrainingCard = React.memo(function TrainingCard({
  training,
  isSelected,
  onSelect,
  colors,
}: {
  training: TrainingWithDetails;
  isSelected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const statusColor = training.status === 'ongoing' ? '#10B981' : colors.blue;
  
  return (
    <TouchableOpacity
      style={[
        styles.trainingCard,
        {
          backgroundColor: isSelected ? statusColor + '15' : colors.card,
          borderColor: isSelected ? statusColor : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.trainingCardHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.trainingCardContent}>
          <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
            {training.title}
      </Text>
          <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
            {training.team?.name || 'No team'} • {training.drill_count || 0} drills
      </Text>
        </View>
      {isSelected && (
          <View style={[styles.checkIcon, { backgroundColor: statusColor }]}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      )}
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CreateSessionSheet() {
  const colors = useColors();
  const { trainingId } = useLocalSearchParams<{ trainingId?: string }>();
  const { createSession, loadSessions, loading } = useSessionStore();
  const { activeWorkspaceId, userId } = useAppContext();
  const { myUpcomingTrainings, loadMyUpcomingTrainings, loadingMyTrainings } = useTrainingStore();

  // ========== STATE ==========
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingWithDetails | null>(null);
  const [mode, setMode] = useState<'training' | 'solo' | null>(trainingId ? 'training' : null);
  const [checkingActiveSession, setCheckingActiveSession] = useState(true);

  // Check if in personal mode (no org workspace)
  const isPersonalMode = !activeWorkspaceId;

  // ========== EFFECTS ==========
  // Check for existing active session on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        // Personal mode: only check for personal sessions (no org)
        // Org mode: check for any active session
        const activeSession = isPersonalMode 
          ? await getMyActivePersonalSession()
          : await getMyActiveSession();
          
        if (activeSession) {
          // User already has an active session
          if (isPersonalMode) {
            // PERSONAL MODE: Only allow one session at a time - no "Start New" option
            Alert.alert(
              "Active Session",
              `You already have an active ${activeSession.training_title ? `training session "${activeSession.training_title}"` : 'session'}. In personal mode, you can only have one session at a time.`,
              [
                {
                  text: "Continue Session",
                  onPress: () => {
                    router.replace({
                      pathname: "/(protected)/activeSession",
                      params: { sessionId: activeSession.id },
                    });
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => router.back(),
                },
              ]
            );
          } else {
            // ORG MODE: Allow multiple sessions (can join different trainings)
            Alert.alert(
              "Active Session Found",
              `You already have an active ${activeSession.training_title ? `training session "${activeSession.training_title}"` : 'session'}. Would you like to continue it?`,
              [
                {
                  text: "Continue Session",
                  onPress: () => {
                    router.replace({
                      pathname: "/(protected)/activeSession",
                      params: { sessionId: activeSession.id },
                    });
                  },
                },
                {
                  text: "Start New",
                  style: "destructive",
                  onPress: () => setCheckingActiveSession(false),
                },
              ]
            );
          }
        } else {
          setCheckingActiveSession(false);
        }
      } catch (error) {
        console.error("Failed to check active session:", error);
        setCheckingActiveSession(false);
      }
    };
    checkActiveSession();
  }, [isPersonalMode]);

  useEffect(() => {
    loadMyUpcomingTrainings();
  }, []);

  // Auto-select training if trainingId is provided in URL
  useEffect(() => {
    if (trainingId && myUpcomingTrainings.length > 0) {
      const training = myUpcomingTrainings.find(t => t.id === trainingId);
      if (training) {
        setSelectedTraining(training);
        setMode('training');
      }
    }
  }, [trainingId, myUpcomingTrainings]);

  // ========== COMPUTED ==========
  const availableTrainings = useMemo(
    () => myUpcomingTrainings.filter(t => t.status === 'ongoing' || t.status === 'planned'),
    [myUpcomingTrainings]
  );

  const canStart = mode === 'solo' || (mode === 'training' && selectedTraining);

  // ========== HANDLERS ==========
  const handleTrainingSelect = useCallback((training: TrainingWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedTraining?.id === training.id) {
      setSelectedTraining(null);
    } else {
      setSelectedTraining(training);
      setMode('training');
    }
  }, [selectedTraining]);

  const handleModeSelect = useCallback((newMode: 'training' | 'solo') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    if (newMode === 'solo') {
      setSelectedTraining(null);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!userId) {
      Alert.alert("Error", "User information is still loading. Please try again.");
      return;
    }

    if (!canStart) {
      Alert.alert("Select Mode", "Please choose to join a training or start solo.");
      return;
    }

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newSession = await createSession({
        org_workspace_id: selectedTraining?.org_workspace_id || activeWorkspaceId,
        team_id: selectedTraining?.team_id || undefined,
        training_id: selectedTraining?.id || undefined,
        session_mode: selectedTraining ? "group" : "solo",
      });

      if (activeWorkspaceId) {
        await loadSessions();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to active session screen
      router.replace({
        pathname: "/(protected)/activeSession",
        params: { sessionId: newSession.id },
      });
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to create session");
    } finally {
      setIsCreating(false);
    }
  }, [userId, canStart, createSession, selectedTraining, activeWorkspaceId, loadSessions]);

  // ========== RENDER ==========
  if (checkingActiveSession) {
    return (
      <View style={[styles.scrollView, styles.loadingContainer]}>
        <ActivityIndicator color={colors.text} size="small" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Checking for active sessions...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="play-circle" size={48} color="#10B981" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Start Session</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Join a training or start a solo practice session
        </Text>
      </View>

      {/* Mode Selection */}
      <View style={styles.modeSection}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SESSION TYPE</Text>
        <View style={styles.modeRow}>
          {/* Solo Option */}
              <TouchableOpacity
                style={[
              styles.modeCard,
              {
                backgroundColor: mode === 'solo' ? colors.orange + '15' : colors.card,
                borderColor: mode === 'solo' ? colors.orange : colors.border,
                borderWidth: mode === 'solo' ? 2 : 1,
              },
            ]}
            onPress={() => handleModeSelect('solo')}
                activeOpacity={0.7}
              >
                  <Ionicons
              name="person" 
              size={28} 
              color={mode === 'solo' ? colors.orange : colors.textMuted} 
            />
            <Text style={[styles.modeTitle, { color: mode === 'solo' ? colors.orange : colors.text }]}>
              Solo Practice
                  </Text>
            <Text style={[styles.modeDesc, { color: colors.textMuted }]}>
              Personal training
            </Text>
            {mode === 'solo' && (
              <View style={[styles.modeCheck, { backgroundColor: colors.orange }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
            )}
              </TouchableOpacity>

          {/* Training Option */}
                        <TouchableOpacity
                          style={[
              styles.modeCard,
              {
                backgroundColor: mode === 'training' ? '#10B98115' : colors.card,
                borderColor: mode === 'training' ? '#10B981' : colors.border,
                borderWidth: mode === 'training' ? 2 : 1,
                opacity: availableTrainings.length === 0 ? 0.5 : 1,
              },
            ]}
            onPress={() => availableTrainings.length > 0 && handleModeSelect('training')}
                          activeOpacity={0.7}
            disabled={availableTrainings.length === 0}
          >
            <Ionicons 
              name="people" 
              size={28} 
              color={mode === 'training' ? '#10B981' : colors.textMuted} 
            />
            <Text style={[styles.modeTitle, { color: mode === 'training' ? '#10B981' : colors.text }]}>
              Join Training
                            </Text>
            <Text style={[styles.modeDesc, { color: colors.textMuted }]}>
              {availableTrainings.length > 0 
                ? `${availableTrainings.length} available` 
                : 'None available'}
                          </Text>
            {mode === 'training' && (
              <View style={[styles.modeCheck, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark" size={14} color="#fff" />
                                </View>
                                )}
                              </TouchableOpacity>
                        </View>
                </View>

      {/* Training Selection (if training mode) */}
      {mode === 'training' && (
        <View style={styles.trainingsSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SELECT TRAINING</Text>
          {loadingMyTrainings ? (
            <ActivityIndicator color="#10B981" style={{ padding: 20 }} />
          ) : (
            <View style={styles.trainingsList}>
              {availableTrainings.map((training) => (
                <TrainingCard
                  key={training.id}
                  training={training}
                  isSelected={selectedTraining?.id === training.id}
                  onSelect={() => handleTrainingSelect(training)}
                  colors={colors}
                />
              ))}
            </View>
          )}
          </View>
      )}

      {/* Summary (if selection made) */}
      {canStart && (
        <View style={[styles.summaryCard, { backgroundColor: '#10B98108', borderColor: '#10B98120' }]}>
          <View style={styles.summaryRow}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <View style={styles.summaryContent}>
              <Text style={[styles.summaryTitle, { color: '#10B981' }]}>
                {mode === 'solo' ? 'Solo Session' : selectedTraining?.title}
                </Text>
              <Text style={[styles.summaryDesc, { color: colors.textMuted }]}>
                {mode === 'solo' 
                  ? 'Personal practice session'
                  : `${selectedTraining?.team?.name} • ${selectedTraining?.drill_count || 0} drills`}
                      </Text>
                  </View>
                </View>
              </View>
            )}

      {/* Start Button */}
            <TouchableOpacity
              style={[
          styles.startButton,
          { 
            backgroundColor: !canStart || isCreating || loading ? colors.muted : '#10B981',
          },
              ]}
              onPress={handleCreate}
        disabled={!canStart || isCreating || loading}
              activeOpacity={0.8}
            >
              {isCreating || loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
            <Ionicons name="play" size={22} color="#fff" />
            <Text style={styles.startButtonText}>
              {mode === 'solo' ? 'Start Solo Session' : 'Join Training'}
            </Text>
                </>
              )}
            </TouchableOpacity>

      {/* Info */}
      <Text style={[styles.infoText, { color: colors.textMuted }]}>
        Add targets during your session to track your performance
      </Text>

          <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  headerIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Mode Selection
  modeSection: {
    marginBottom: 24,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    position: 'relative',
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  modeDesc: {
    fontSize: 12,
  },
  modeCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Trainings
  trainingsSection: {
    marginBottom: 24,
  },
  trainingsList: {
    gap: 10,
  },
  trainingCard: {
    borderRadius: 14,
    padding: 16,
  },
  trainingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trainingCardContent: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  trainingMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDesc: {
    fontSize: 13,
    marginTop: 2,
  },

  // Start Button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
    marginBottom: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },

  // Info
  infoText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
