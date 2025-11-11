import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { DayPeriod } from "@/services/sessionService";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { sessionStatsStore } from "@/store/sessionsStore";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "zustand";

interface CreateSessionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateSessionBottomSheet({
  visible,
  onClose,
}: CreateSessionBottomSheetProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();

  const { createSession, fetchSessions } = useStore(sessionStatsStore);

  // Form state
  const [name, setName] = useState("");
  const [rangeLocation, setRangeLocation] = useState("");
  const [dayPeriod, setDayPeriod] = useState<DayPeriod>("morning");
  const [isSquad, setIsSquad] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simplified: session created in current org or personal
  const { userOrgContext } = useOrganizationsStore();
  const destinationOrgId = selectedOrgId; // Use selected org

  const resetForm = () => {
    setName("");
    setRangeLocation("");
    setDayPeriod("morning");
    setIsSquad(false);
    setComments("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert("Error", "Authentication error");
      return;
    }

    try {
      setIsSubmitting(true);

      await createSession(
        {
          name: name.trim() || undefined,
          started_at: new Date().toISOString(),
          range_location: rangeLocation.trim() || undefined,
          day_period: dayPeriod,
          is_squad: isSquad,
          comments: comments.trim() || undefined,
          organization_id: destinationOrgId || null,
        },
        user.id
      );

      // Refetch sessions for current view
      await fetchSessions(user.id, selectedOrgId);

      Alert.alert("Success", "Session started successfully!");
      handleClose();
    } catch (error) {
      console.error("Error creating session:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create session";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["90%"]}
      enableDynamicSizing={false}
      enablePanDownToClose={!isSubmitting}
      backdropOpacity={0.45}
      scrollable={true}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: colors.tint + "15" }]}>
              <Ionicons name="play-circle" size={24} color={colors.tint} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>
                Start New Session
              </Text>
              <Text style={[styles.subtitle, { color: colors.description }]}>
                Track your shooting practice
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: colors.border + "40" }]}
            disabled={isSubmitting}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Session Name */}
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
              placeholder="e.g. Morning Practice (optional)"
              placeholderTextColor={colors.description}
              editable={!isSubmitting}
            />
          </View>

          {/* Save To Info (Simplified - no picker needed) */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Save To</Text>
            <View
              style={[
                styles.orgDisplay,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name={destinationOrgId ? "business" : "person"}
                size={18}
                color={destinationOrgId ? colors.tint : colors.blue}
              />
              <Text style={[styles.orgDisplayText, { color: colors.text }]}>
                {userOrgContext?.orgName}
              </Text> 
            </View>

            {/* Info Message */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color={colors.blue} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                {destinationOrgId
                  ? `Visible to members in your scope`
                  : "Only visible to you"}
              </Text>
            </View>
          </View>

          {/* Range Location */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Range Location
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
              value={rangeLocation}
              onChangeText={setRangeLocation}
              placeholder="e.g. Range A (optional)"
              placeholderTextColor={colors.description}
              editable={!isSubmitting}
            />
          </View>

          {/* Day Period */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Time of Day
            </Text>
            <View style={styles.periodGrid}>
              {(["morning", "afternoon", "evening", "night"] as DayPeriod[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodOption,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: dayPeriod === period ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => setDayPeriod(period)}
                  disabled={isSubmitting}
                >
                  <Ionicons
                    name={
                      period === "morning" ? "sunny" :
                      period === "afternoon" ? "partly-sunny" :
                      period === "evening" ? "cloudy" : "moon"
                    }
                    size={20}
                    color={dayPeriod === period ? colors.tint : colors.description}
                  />
                  <Text
                    style={[
                      styles.periodText,
                      {
                        color: dayPeriod === period ? colors.tint : colors.text,
                      },
                    ]}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                  {dayPeriod === period && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.tint} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Squad Training Toggle */}
          <View style={styles.field}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: isSquad ? colors.blue : colors.border,
                },
              ]}
              onPress={() => setIsSquad(!isSquad)}
              disabled={isSubmitting}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name="people"
                  size={22}
                  color={isSquad ? colors.blue : colors.description}
                />
                <View style={styles.toggleTextContainer}>
                  <Text style={[styles.toggleTitle, { color: colors.text }]}>
                    Squad Training
                  </Text>
                  <Text style={[styles.toggleSubtitle, { color: colors.description }]}>
                    Multiple participants
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.switch,
                  { backgroundColor: isSquad ? colors.blue : colors.border },
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    { transform: [{ translateX: isSquad ? 18 : 2 }] },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Comments */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Notes
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={comments}
              onChangeText={setComments}
              placeholder="Add any notes about this session..."
              placeholderTextColor={colors.description}
              editable={!isSubmitting}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

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
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="play-circle" size={18} color="#FFF" />
                <Text style={[styles.buttonText, { color: "#FFF" }]}>
                  Start Session
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
          </View>
        </ScrollView>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.1)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    flex: 1,
    marginBottom: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  orgDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  orgDisplayText: {
    fontSize: 15,
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },
  periodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  periodOption: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  toggleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleSubtitle: {
    fontSize: 12,
  },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
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