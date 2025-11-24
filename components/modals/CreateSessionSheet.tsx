import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { useSessionStore } from "@/store/sessionStore";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { forwardRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

const WEATHER_OPTIONS = ["Clear", "Cloudy", "Rainy", "Windy", "Stormy"];
const TEMPERATURE_OPTIONS = ["<0°C", "0-10°C", "10-20°C", "20-30°C", ">30°C"];
const WIND_OPTIONS = ["Calm", "Light", "Moderate", "Strong", "Very Strong"];
const VISIBILITY_OPTIONS = ["Excellent", "Good", "Fair", "Poor", "Very Poor"];

interface CreateSessionSheetProps {
  onSessionCreated?: () => void;
}

export const CreateSessionSheet = forwardRef<BaseBottomSheetRef, CreateSessionSheetProps>(
  ({ onSessionCreated }, ref) => {
    const colors = useColors();
    const { createSession, loading } = useSessionStore();
    const { activeWorkspaceId, userId } = useAppContext();
    const isPersonalMode = !activeWorkspaceId;

    const [isCreating, setIsCreating] = useState(false);
    const [showEnvironment, setShowEnvironment] = useState(false);

    // Core fields
    const [teamId, setTeamId] = useState("");

    // Environment fields (collapsible)
    const [weather, setWeather] = useState("");
    const [temperature, setTemperature] = useState("");
    const [wind, setWind] = useState("");
    const [visibility, setVisibility] = useState("");
    const [notes, setNotes] = useState("");

    const handleCreateSession = async () => {
      setIsCreating(true);
      try {
        if (!userId) {
          Alert.alert("Error", "User information is still loading. Please try again in a moment.");
          setIsCreating(false);
          return;
        }

        // Build environment data
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

        // Use store's createSession
        await createSession({
          org_workspace_id: activeWorkspaceId,
          team_id: teamId || undefined,
          session_mode: teamId ? "group" : "solo",
          session_data: Object.keys(sessionData).length > 0 ? sessionData : undefined,
        });

        Alert.alert("Success", "Session started successfully!");

        // Reset form
        setTeamId("");
        setWeather("");
        setTemperature("");
        setWind("");
        setVisibility("");
        setNotes("");
        setShowEnvironment(false);

        onSessionCreated?.();
      } catch (error: any) {
        console.error("Failed to create session:", error);
        Alert.alert("Error", error.message || "Failed to create session");
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <BaseBottomSheet ref={ref} snapPoints={["92%"]} backdropOpacity={0.4}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Start Session</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isPersonalMode ? "Personal training" : "Team training"}
            </Text>
          </View>

          {/* Main Content */}
          <View style={styles.form}>
            {/* Team ID - Only in org mode */}
            {!isPersonalMode && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Team (optional)</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <BottomSheetTextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Leave empty for solo session"
                    placeholderTextColor={colors.textMuted}
                    value={teamId}
                    onChangeText={setTeamId}
                  />
                </View>
              </View>
            )}

            {/* Environment Section - Collapsible */}
            <TouchableOpacity
              style={[styles.collapsibleHeader, { backgroundColor: colors.card }]}
              onPress={() => setShowEnvironment(!showEnvironment)}
              activeOpacity={0.7}
            >
              <View style={styles.collapsibleTitle}>
                <Ionicons name="cloud-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.collapsibleText, { color: colors.text }]}>
                  Environment details
                </Text>
                <Text style={[styles.optional, { color: colors.textMuted }]}>optional</Text>
              </View>
              <Ionicons
                name={showEnvironment ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {showEnvironment && (
              <View style={[styles.collapsibleContent, { backgroundColor: colors.card }]}>
                {/* Weather */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Weather</Text>
                  <View style={styles.optionsGrid}>
                    {WEATHER_OPTIONS.map((option) => {
                      const isActive = weather === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionButton,
                            {
                              backgroundColor: isActive ? colors.accent : colors.background,
                              borderColor: isActive ? colors.accent : colors.border,
                            },
                          ]}
                          onPress={() => setWeather(option)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              { color: isActive ? colors.accentForeground : colors.text },
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Temperature */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Temperature</Text>
                  <View style={styles.optionsGrid}>
                    {TEMPERATURE_OPTIONS.map((option) => {
                      const isActive = temperature === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionButton,
                            {
                              backgroundColor: isActive ? colors.accent : colors.background,
                              borderColor: isActive ? colors.accent : colors.border,
                            },
                          ]}
                          onPress={() => setTemperature(option)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              { color: isActive ? colors.accentForeground : colors.text },
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Wind */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Wind</Text>
                  <View style={styles.optionsGrid}>
                    {WIND_OPTIONS.map((option) => {
                      const isActive = wind === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionButton,
                            {
                              backgroundColor: isActive ? colors.accent : colors.background,
                              borderColor: isActive ? colors.accent : colors.border,
                            },
                          ]}
                          onPress={() => setWind(option)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              { color: isActive ? colors.accentForeground : colors.text },
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Visibility */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Visibility</Text>
                  <View style={styles.optionsGrid}>
                    {VISIBILITY_OPTIONS.map((option) => {
                      const isActive = visibility === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionButton,
                            {
                              backgroundColor: isActive ? colors.accent : colors.background,
                              borderColor: isActive ? colors.accent : colors.border,
                            },
                          ]}
                          onPress={() => setVisibility(option)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              { color: isActive ? colors.accentForeground : colors.text },
                            ]}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Notes - Always visible, below collapse */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <BottomSheetTextInput
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
          </View>
        </BottomSheetScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.accent },
              (isCreating || loading) && styles.buttonDisabled,
            ]}
            onPress={handleCreateSession}
            disabled={isCreating || loading}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle" size={22} color="#FFF" />
            <Text style={styles.buttonText}>
              {isCreating || loading ? "Starting..." : "Start Session"}
            </Text>
          </TouchableOpacity>
        </View>
      </BaseBottomSheet>
    );
  }
);

CreateSessionSheet.displayName = "CreateSessionSheet";

const styles = StyleSheet.create({
  content: {
    paddingBottom: 160,
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    paddingHorizontal: 20,
    gap: 12,
  },
  field: {
    gap: 10,
  },
  half: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: "500",
  },
  textArea: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  collapsibleTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  collapsibleText: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  optional: {
    fontSize: 12,
    fontWeight: "500",
  },
  collapsibleContent: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    marginTop: -2,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 14,
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
