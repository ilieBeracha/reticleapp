import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { sessionsStore } from "@/store/sessionsStore";
import { DayPeriod, SessionType } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "zustand";

interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateSessionModal({
  visible,
  onClose,
}: CreateSessionModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId, allOrgs } = useOrganizationsStore();  
  const selectedOrg = allOrgs.find((o) => o.id === selectedOrgId);
  // Use Zustand store directly
  const { createSession, fetchSessions } = useStore(sessionsStore);
  

  // Form state
  const [name, setName] = useState("");
  const [sessionType, setSessionType] = useState<SessionType>("steel");
  const [dayPeriod, setDayPeriod] = useState<DayPeriod>("day");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const resetForm = () => {
    setName("");
    setSessionType("steel");
    setDayPeriod("day");
    setDescription("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a session name");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "Authentication error");
      return;
    }

    try {
      setIsSubmitting(true);

      const session = await createSession(
        {
          name: name.trim(),
          session_type: sessionType,
          day_period: dayPeriod,
        },
        user?.id,
        selectedOrgId
      );
      console.log("session", session);
      // Refetch sessions based on current context
      // - If in org: fetches all team sessions
      // - If personal: fetches all user's sessions
      await fetchSessions(user?.id, selectedOrgId);

      Alert.alert("Success", "Session created successfully!");
      handleClose();
    } catch (error: any) {
      console.log("error", error);
      console.error("Error creating session:", error);
      Alert.alert("Error", error.message || "Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["60%", "75%"]}
      enablePanDownToClose={!isSubmitting}
      backdropOpacity={0.45}
    >
      <View style={styles.container}>
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Session Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Morning Practice"
              placeholderTextColor={colors.description}
              editable={!isSubmitting}
            />
          </View>

          {/* Training Selection */}
          {/* <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Training</Text>
            {loadingTrainings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : trainings.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.description }]}>
                No trainings available. Create one first.
              </Text>
            ) : (
              <View style={styles.options}>
                {trainings.map((training) => (
                  <TouchableOpacity
                    key={training.id}
                    style={[
                      styles.option,
                      {
                        backgroundColor:
                          selectedTraining === training.id
                            ? colors.tint + "20"
                            : colors.cardBackground,
                        borderColor:
                          selectedTraining === training.id
                            ? colors.tint
                            : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedTraining(training.id)}
                    disabled={isSubmitting}
                  >
                    <Ionicons
                      name={
                        selectedTraining === training.id
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={20}
                      color={
                        selectedTraining === training.id
                          ? colors.tint
                          : colors.description
                      }
                    />
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color:
                            selectedTraining === training.id
                              ? colors.tint
                              : colors.text,
                        },
                      ]}
                    >
                      {training.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View> */}

          {/* Session Type */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Type</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor:
                      sessionType === "steel" ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => setSessionType("steel")}
                disabled={isSubmitting}
              >
                <Ionicons
                  name={
                    sessionType === "steel"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color={
                    sessionType === "steel" ? colors.tint : colors.description
                  }
                />
                <Text
                  style={[
                    styles.radioText,
                    {
                      color:
                        sessionType === "steel" ? colors.tint : colors.text,
                    },
                  ]}
                >
                  Steel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor:
                      sessionType === "paper" ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => setSessionType("paper")}
                disabled={isSubmitting}
              >
                <Ionicons
                  name={
                    sessionType === "paper"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color={
                    sessionType === "paper" ? colors.tint : colors.description
                  }
                />
                <Text
                  style={[
                    styles.radioText,
                    {
                      color:
                        sessionType === "paper" ? colors.tint : colors.text,
                    },
                  ]}
                >
                  Paper
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Day Period */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Time of Day
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor:
                      dayPeriod === "day" ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => setDayPeriod("day")}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="sunny"
                  size={18}
                  color={dayPeriod === "day" ? colors.tint : colors.description}
                />
                <Text
                  style={[
                    styles.radioText,
                    {
                      color: dayPeriod === "day" ? colors.tint : colors.text,
                    },
                  ]}
                >
                  Day
                </Text>
                {dayPeriod === "day" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.tint}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor:
                      dayPeriod === "night" ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => setDayPeriod("night")}
                disabled={isSubmitting}
              >
                <Ionicons
                  name="moon"
                  size={18}
                  color={
                    dayPeriod === "night" ? colors.tint : colors.description
                  }
                />
                <Text
                  style={[
                    styles.radioText,
                    {
                      color: dayPeriod === "night" ? colors.tint : colors.text,
                    },
                  ]}
                >
                  Night
                </Text>
                {dayPeriod === "night" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.tint}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Range (Optional) */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. 100m"
              placeholderTextColor={colors.description}
              editable={!isSubmitting}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.cancelButton,
              { borderColor: colors.border },
            ]}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.createButton,
              { backgroundColor: colors.tint },
              (isSubmitting || !name.trim()) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="add-circle" size={18} color="#FFF" />
                <Text style={[styles.buttonText, { color: "#FFF" }]}>
                  Create Session
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
  form: {
    gap: 20,
    marginBottom: 24,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    padding: 16,
    textAlign: "center",
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  radioOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  radioText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  createButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
