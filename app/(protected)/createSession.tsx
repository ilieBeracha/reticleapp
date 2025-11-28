import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { getTrainingDrills } from "@/services/trainingService";
import { useSessionStore } from "@/store/sessionStore";
import { useTrainingStore } from "@/store/trainingStore";
import type { TrainingDrill, TrainingWithDetails } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const ENVIRONMENT_CONFIG = {
  weather: { label: "Weather", options: ["Clear", "Cloudy", "Rainy", "Windy", "Stormy"] },
  temperature: { label: "Temperature", options: ["<0°C", "0-10°C", "10-20°C", "20-30°C", ">30°C"] },
  wind: { label: "Wind", options: ["Calm", "Light", "Moderate", "Strong", "Very Strong"] },
  visibility: { label: "Visibility", options: ["Excellent", "Good", "Fair", "Poor", "Very Poor"] },
} as const;

interface EnvironmentState {
  weather: string;
  temperature: string;
  wind: string;
  visibility: string;
}

const INITIAL_ENVIRONMENT_STATE: EnvironmentState = {
  weather: "",
  temperature: "",
  wind: "",
  visibility: "",
};

/**
 * CREATE SESSION - Native Form Sheet
 */
export default function CreateSessionSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createSession, loadSessions, loading } = useSessionStore();
  const { activeWorkspaceId, userId } = useAppContext();
  const { myUpcomingTrainings, loadMyUpcomingTrainings, loadingMyTrainings } = useTrainingStore();
  const isPersonalMode = !activeWorkspaceId;

  const [isCreating, setIsCreating] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(false);
  const [showTrainingLink, setShowTrainingLink] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentState>(INITIAL_ENVIRONMENT_STATE);
  const [notes, setNotes] = useState("");
  
  const [selectedTraining, setSelectedTraining] = useState<TrainingWithDetails | null>(null);
  const [selectedDrill, setSelectedDrill] = useState<TrainingDrill | null>(null);
  const [drills, setDrills] = useState<TrainingDrill[]>([]);
  const [loadingDrills, setLoadingDrills] = useState(false);

  useEffect(() => {
    loadMyUpcomingTrainings();
  }, []);

  useEffect(() => {
    if (selectedTraining) {
      loadDrills(selectedTraining.id);
    } else {
      setDrills([]);
      setSelectedDrill(null);
    }
  }, [selectedTraining]);

  const loadDrills = async (trainingId: string) => {
    setLoadingDrills(true);
    try {
      const data = await getTrainingDrills(trainingId);
      setDrills(data);
    } catch (error) {
      setDrills([]);
    } finally {
      setLoadingDrills(false);
    }
  };

  const handleEnvironmentChange = useCallback((field: keyof EnvironmentState, value: string) => {
    setEnvironment(prev => ({ ...prev, [field]: value }));
  }, []);

  const buildEnvironmentData = useCallback(() => {
    const data: Record<string, any> = {};
    Object.entries(environment).forEach(([key, value]) => {
      if (value) data[key] = value;
    });
    if (notes) data.notes = notes;
    return data;
  }, [environment, notes]);

  const handleTrainingSelect = useCallback((training: TrainingWithDetails) => {
    if (selectedTraining?.id === training.id) {
      setSelectedTraining(null);
      setSelectedDrill(null);
    } else {
      setSelectedTraining(training);
      setSelectedDrill(null);
    }
  }, [selectedTraining]);

  const handleDrillSelect = useCallback((drill: TrainingDrill) => {
    if (selectedDrill?.id === drill.id) {
      setSelectedDrill(null);
    } else {
      setSelectedDrill(drill);
    }
  }, [selectedDrill]);

  const handleCreate = useCallback(async () => {
    if (!userId) {
      Alert.alert("Error", "User information is still loading. Please try again.");
      return;
    }

    Keyboard.dismiss();
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const environmentData = buildEnvironmentData();
      const sessionData: Record<string, any> = {};
      if (Object.keys(environmentData).length > 0) {
        sessionData.environment = environmentData;
      }

      await createSession({
        org_workspace_id: selectedTraining?.org_workspace_id || activeWorkspaceId,
        team_id: selectedTraining?.team_id || undefined,
        training_id: selectedTraining?.id || undefined,
        drill_id: selectedDrill?.id || undefined,
        session_mode: selectedTraining ? "group" : "solo",
        session_data: Object.keys(sessionData).length > 0 ? sessionData : undefined,
      });

      // Refresh sessions list
      if (activeWorkspaceId) {
        await loadSessions();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("Session Started", "Your training session has begun!", [
        { text: "OK", onPress: () => router.canGoBack() && router.back() },
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to create session");
    } finally {
      setIsCreating(false);
    }
  }, [userId, buildEnvironmentData, createSession, selectedTraining, selectedDrill, activeWorkspaceId, loadSessions]);

  const availableTrainings = myUpcomingTrainings.filter(t => t.status === 'ongoing' || t.status === 'planned');

  return (
    <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
      <View style={styles.grabberSpacer} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Start Session</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {selectedTraining ? `Training: ${selectedTraining.title}` : (isPersonalMode ? "Personal training" : "Team training")}
          </Text>
        </View>

        {/* Training Link */}
        {availableTrainings.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.collapsibleHeader, { 
                backgroundColor: selectedTraining ? colors.primary + '15' : colors.card,
                borderColor: selectedTraining ? colors.primary : 'transparent',
                borderWidth: selectedTraining ? 1 : 0,
              }]}
              onPress={() => setShowTrainingLink(!showTrainingLink)}
              activeOpacity={0.7}
            >
              <View style={styles.collapsibleTitle}>
                <Ionicons name="fitness-outline" size={20} color={selectedTraining ? colors.primary : colors.textMuted} />
                <Text style={[styles.collapsibleText, { color: colors.text }]}>
                  {selectedTraining ? selectedTraining.title : "Link to Training"}
                </Text>
                {!selectedTraining && <Text style={[styles.optional, { color: colors.textMuted }]}>optional</Text>}
              </View>
              <Ionicons name={showTrainingLink ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {showTrainingLink && (
              <View style={[styles.trainingSection, { backgroundColor: colors.card }]}>
                {loadingMyTrainings ? (
                  <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
                ) : (
                  <>
                    <Text style={[styles.trainingSectionLabel, { color: colors.textMuted }]}>
                      Select a training to log your session
                    </Text>
                    
                    {availableTrainings.map((training) => (
                      <TouchableOpacity
                        key={training.id}
                        style={[styles.trainingCard, {
                          backgroundColor: selectedTraining?.id === training.id ? colors.primary + '15' : colors.background,
                          borderColor: selectedTraining?.id === training.id ? colors.primary : colors.border,
                        }]}
                        onPress={() => handleTrainingSelect(training)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.trainingCardHeader}>
                          <View style={[styles.statusDot, { backgroundColor: training.status === 'ongoing' ? '#7AA493' : colors.primary }]} />
                          <Text style={[styles.trainingCardTitle, { color: colors.text }]} numberOfLines={1}>
                            {training.title}
                          </Text>
                          {selectedTraining?.id === training.id && (
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                          )}
                        </View>
                        <Text style={[styles.trainingCardMeta, { color: colors.textMuted }]}>
                          {training.team?.name || 'Unknown Team'} • {training.drill_count || 0} drills
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Drill Selection */}
                    {selectedTraining && drills.length > 0 && (
                      <View style={styles.drillsSection}>
                        <Text style={[styles.trainingSectionLabel, { color: colors.textMuted }]}>
                          Select a specific drill (optional)
                        </Text>
                        {loadingDrills ? (
                          <ActivityIndicator color={colors.primary} />
                        ) : (
                          drills.map((drill) => (
                            <TouchableOpacity
                              key={drill.id}
                              style={[styles.drillCard, {
                                backgroundColor: selectedDrill?.id === drill.id ? colors.primary + '15' : colors.background,
                                borderColor: selectedDrill?.id === drill.id ? colors.primary : colors.border,
                              }]}
                              onPress={() => handleDrillSelect(drill)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.drillCardContent}>
                                <Text style={[styles.drillCardTitle, { color: colors.text }]} numberOfLines={1}>
                                  {drill.name}
                                </Text>
                                <Text style={[styles.drillCardMeta, { color: colors.textMuted }]}>
                                  {drill.distance_m}m • {drill.rounds_per_shooter} rounds
                                </Text>
                              </View>
                              {selectedDrill?.id === drill.id && (
                                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}

                    {selectedTraining && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => {
                          setSelectedTraining(null);
                          setSelectedDrill(null);
                        }}
                      >
                        <Text style={[styles.clearButtonText, { color: colors.destructive }]}>Clear Selection</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}
          </>
        )}

        {/* Environment */}
        <TouchableOpacity
          style={[styles.collapsibleHeader, { backgroundColor: colors.card }]}
          onPress={() => setShowEnvironment(!showEnvironment)}
          activeOpacity={0.7}
        >
          <View style={styles.collapsibleTitle}>
            <Ionicons name="cloud-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.collapsibleText, { color: colors.text }]}>Environment details</Text>
            <Text style={[styles.optional, { color: colors.textMuted }]}>optional</Text>
          </View>
          <Ionicons name={showEnvironment ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {showEnvironment && (
          <View style={[styles.collapsibleContent, { backgroundColor: colors.card }]}>
            {(Object.keys(ENVIRONMENT_CONFIG) as Array<keyof typeof ENVIRONMENT_CONFIG>).map((fieldKey) => (
              <View key={fieldKey} style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{ENVIRONMENT_CONFIG[fieldKey].label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsGrid}>
                  {ENVIRONMENT_CONFIG[fieldKey].options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.optionButton, {
                        backgroundColor: environment[fieldKey] === option ? colors.primary : colors.background,
                        borderColor: environment[fieldKey] === option ? colors.primary : colors.border,
                      }]}
                      onPress={() => handleEnvironmentChange(fieldKey, option)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, { color: environment[fieldKey] === option ? '#fff' : colors.text }]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textArea, { color: colors.text }]}
              placeholder="Session notes..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, (isCreating || loading) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isCreating || loading}
          activeOpacity={0.8}
        >
          <Ionicons name="play-circle" size={22} color="#FFF" />
          <Text style={styles.buttonText}>{isCreating || loading ? "Starting..." : "Start Session"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  grabberSpacer: { height: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 12 },

  header: { paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  subtitle: { fontSize: 14, fontWeight: "500" },

  field: { gap: 10 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  inputWrapper: { borderRadius: 14, borderWidth: 1 },
  textArea: { minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontWeight: "500" },

  collapsibleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14 },
  collapsibleTitle: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  collapsibleText: { fontSize: 15, fontWeight: "700", flex: 1 },
  optional: { fontSize: 12, fontWeight: "500" },
  collapsibleContent: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, gap: 14, marginTop: -2 },

  optionsGrid: { gap: 8, paddingHorizontal: 4, paddingRight: 16 },
  optionButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", minWidth: 80 },
  optionText: { fontSize: 13, fontWeight: "600", textAlign: "center" },

  trainingSection: { borderRadius: 14, padding: 16, gap: 12, marginTop: -2 },
  trainingSectionLabel: { fontSize: 13, marginBottom: 4 },
  trainingCard: { borderRadius: 12, borderWidth: 1.5, padding: 14 },
  trainingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  trainingCardTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  trainingCardMeta: { fontSize: 12, marginTop: 6, marginLeft: 16 },

  drillsSection: { marginTop: 8, gap: 8 },
  drillCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12 },
  drillCardContent: { flex: 1 },
  drillCardTitle: { fontSize: 14, fontWeight: '600' },
  drillCardMeta: { fontSize: 12, marginTop: 2 },

  clearButton: { alignItems: 'center', paddingVertical: 8 },
  clearButtonText: { fontSize: 14, fontWeight: '600' },

  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 56, borderRadius: 14, gap: 10 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontSize: 17, fontWeight: "800" },
});

