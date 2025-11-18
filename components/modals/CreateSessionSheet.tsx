import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createSession } from "@/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { forwardRef, useState } from "react";
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface CreateSessionSheetProps {
  onSessionCreated?: () => void;
}

type SessionMode = 'solo' | 'group';

interface SessionFormData {
  session_mode: SessionMode;
  training_id?: string;
  drill_id?: string;
  team_id?: string;
  environment: {
    weather?: string;
    temperature?: number;
    wind?: number;
    visibility?: string;
    notes?: string;
  };
}

export const CreateSessionSheet = forwardRef<BaseBottomSheetRef, CreateSessionSheetProps>(
  ({ onSessionCreated }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId, isMyWorkspace, userId } = useAppContext();
    
    const [step, setStep] = useState(1);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<SessionFormData>({
      session_mode: 'solo',
      environment: {},
    });

    // Environment state
    const [weather, setWeather] = useState('');
    const [temperature, setTemperature] = useState('');
    const [wind, setWind] = useState('');
    const [visibility, setVisibility] = useState('');
    const [notes, setNotes] = useState('');

    const handleNext = () => {
      if (step < 3) {
        // Skip step 2 for personal workspace
        if (isMyWorkspace && step === 1) {
          setStep(3);
        } else {
          setStep(step + 1);
        }
      }
    };

    const handleBack = () => {
      if (step > 1) {
        // Skip step 2 for personal workspace
        if (isMyWorkspace && step === 3) {
          setStep(1);
        } else {
          setStep(step - 1);
        }
      }
    };

    const handleCreateSession = async () => {
      setIsCreating(true);
      try {
        if (isMyWorkspace && !userId) {
          Alert.alert("Error", "User information is still loading. Please try again in a moment.");
          setIsCreating(false);
          return;
        }

        if (!isMyWorkspace && !activeWorkspaceId) {
          Alert.alert("Error", "Workspace not found. Please select a workspace and try again.");
          setIsCreating(false);
          return;
        }

        const environment: Record<string, any> = {};
        if (weather) environment.weather = weather;
        if (temperature) environment.temperature = parseFloat(temperature);
        if (wind) environment.wind = parseFloat(wind);
        if (visibility) environment.visibility = visibility;
        if (notes) environment.notes = notes;

        const sessionData: Record<string, any> = {};
        if (Object.keys(environment).length > 0) {
          sessionData.environment = environment;
        }
        if (formData.training_id) {
          sessionData.training_id = formData.training_id;
        }
        if (formData.drill_id) {
          sessionData.drill_id = formData.drill_id;
        }

        await createSession({
          workspace_type: isMyWorkspace ? 'personal' : 'org',
          workspace_owner_id: isMyWorkspace ? userId || undefined : undefined,
          org_workspace_id: !isMyWorkspace ? activeWorkspaceId || undefined : undefined,
          team_id: !isMyWorkspace ? formData.team_id || undefined : undefined,
          session_mode: formData.session_mode,
          session_data: Object.keys(sessionData).length > 0 ? sessionData : undefined,
        });
        
        Alert.alert("Success", "Session started successfully!");
        
        // Reset form
        setStep(1);
        setFormData({
          session_mode: 'solo',
          environment: {},
        });
        setWeather('');
        setTemperature('');
        setWind('');
        setVisibility('');
        setNotes('');
        
        onSessionCreated?.();
      } catch (error: any) {
        console.error("Failed to create session:", error);
        Alert.alert("Error", error.message || "Failed to create session");
      } finally {
        setIsCreating(false);
      }
    };

    // Personal workspace has 2 steps (skip step 2), org workspace has 3 steps
    const totalSteps = isMyWorkspace ? 2 : 3;
    const currentStep = isMyWorkspace && step === 3 ? 2 : step;
    const progressWidth = (currentStep / totalSteps) * 100;

    return (
      <BaseBottomSheet ref={ref} snapPoints={['92%']} backdropOpacity={0.8}>
        <BottomSheetScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="fitness" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Start New Session
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isMyWorkspace ? 'Personal Training' : 'Team Training'}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${progressWidth}%` }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>

          {/* Step 1: Session Type */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Session Type</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
                Choose how you'll be training
              </Text>

              <View style={styles.optionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { 
                      backgroundColor: colors.card,
                      borderColor: formData.session_mode === 'solo' ? colors.primary : colors.border,
                      borderWidth: 2,
                    }
                  ]}
                  onPress={() => setFormData({ ...formData, session_mode: 'solo' })}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.optionIcon,
                    { backgroundColor: formData.session_mode === 'solo' ? colors.primary + '20' : colors.secondary }
                  ]}>
                    <Ionicons 
                      name="person" 
                      size={28} 
                      color={formData.session_mode === 'solo' ? colors.primary : colors.textMuted} 
                    />
                  </View>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Solo</Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    Individual practice
                  </Text>
                  {formData.session_mode === 'solo' && (
                    <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    { 
                      backgroundColor: colors.card,
                      borderColor: formData.session_mode === 'group' ? colors.primary : colors.border,
                      borderWidth: 2,
                      opacity: isMyWorkspace ? 0.5 : 1,
                    }
                  ]}
                  onPress={() => !isMyWorkspace && setFormData({ ...formData, session_mode: 'group' })}
                  activeOpacity={isMyWorkspace ? 1 : 0.7}
                  disabled={isMyWorkspace}
                >
                  <View style={[
                    styles.optionIcon,
                    { backgroundColor: formData.session_mode === 'group' ? colors.primary + '20' : colors.secondary }
                  ]}>
                    <Ionicons 
                      name="people" 
                      size={28} 
                      color={formData.session_mode === 'group' ? colors.primary : colors.textMuted} 
                    />
                  </View>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>Group</Text>
                  <Text style={[styles.optionDescription, { color: colors.textMuted }]}>
                    {isMyWorkspace ? 'Organization only' : 'Team training'}
                  </Text>
                  {isMyWorkspace && (
                    <View style={[styles.lockBadge, { backgroundColor: colors.textMuted + '30' }]}>
                      <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
                    </View>
                  )}
                  {formData.session_mode === 'group' && !isMyWorkspace && (
                    <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 2: Training Details */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Training Details</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
                Optional - Link to a training plan or drill
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  <Ionicons name="document-text-outline" size={14} color={colors.text} /> Training ID (Optional)
                </Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <BottomSheetTextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter training UUID..."
                    placeholderTextColor={colors.textMuted + 'CC'}
                    value={formData.training_id}
                    onChangeText={(text) => setFormData({ ...formData, training_id: text })}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  <Ionicons name="barbell-outline" size={14} color={colors.text} /> Drill ID (Optional)
                </Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <BottomSheetTextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter drill UUID..."
                    placeholderTextColor={colors.textMuted + 'CC'}
                    value={formData.drill_id}
                    onChangeText={(text) => setFormData({ ...formData, drill_id: text })}
                  />
                </View>
              </View>

              {!isMyWorkspace && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    <Ionicons name="people-outline" size={14} color={colors.text} /> Team ID (Optional)
                  </Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <BottomSheetTextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter team UUID..."
                      placeholderTextColor={colors.textMuted + 'CC'}
                      value={formData.team_id}
                      onChangeText={(text) => setFormData({ ...formData, team_id: text })}
                    />
                  </View>
                </View>
              )}

              <View style={[styles.infoCard, { backgroundColor: colors.secondary }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                  You can skip these fields and start a free session
                </Text>
              </View>
            </View>
          )}

          {/* Step 3: Environment */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Environment</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>
                Optional - Record conditions for this session
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  <Ionicons name="cloud-outline" size={14} color={colors.text} /> Weather
                </Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <BottomSheetTextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="e.g. Clear, Cloudy, Rainy"
                    placeholderTextColor={colors.textMuted + 'CC'}
                    value={weather}
                    onChangeText={setWeather}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    <Ionicons name="thermometer-outline" size={14} color={colors.text} /> Temp (°C)
                  </Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <BottomSheetTextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="22"
                      placeholderTextColor={colors.textMuted + 'CC'}
                      value={temperature}
                      onChangeText={setTemperature}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    <Ionicons name="flag-outline" size={14} color={colors.text} /> Wind (m/s)
                  </Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <BottomSheetTextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="5"
                      placeholderTextColor={colors.textMuted + 'CC'}
                      value={wind}
                      onChangeText={setWind}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  <Ionicons name="eye-outline" size={14} color={colors.text} /> Visibility
                </Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <BottomSheetTextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="e.g. Good, Poor, Excellent"
                    placeholderTextColor={colors.textMuted + 'CC'}
                    value={visibility}
                    onChangeText={setVisibility}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  <Ionicons name="document-text-outline" size={14} color={colors.text} /> Notes
                </Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <BottomSheetTextInput
                    style={[styles.textArea, { color: colors.text }]}
                    placeholder="Any additional notes about conditions..."
                    placeholderTextColor={colors.textMuted + 'CC'}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Back</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: isCreating ? colors.secondary : colors.primary }
                ]}
                onPress={handleCreateSession}
                disabled={isCreating}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {isCreating ? "Starting..." : "Start Session"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

CreateSessionSheet.displayName = 'CreateSessionSheet';

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.1,
  },

  // Steps
  stepContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 20,
    letterSpacing: -0.2,
  },

  // Options Grid
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  optionDescription: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Input
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  inputWrapper: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  input: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
