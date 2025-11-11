import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { StepProps } from "../types";

export interface SessionNotesStepProps extends StepProps {
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export function SessionNotesStep({
  formData,
  updateFormData,
  onBack,
  onSubmit,
  isSubmitting,
}: SessionNotesStepProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.green || colors.tint }]}>
          <Ionicons name="checkmark-done-circle" size={36} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Review & Start
        </Text>
        <Text style={[styles.subtitle, { color: colors.description }]}>
          Add optional notes and confirm your session
        </Text>
      </View>

      {/* Form Content */}
      <View style={styles.content}>
        {/* Notes */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            Session Notes <Text style={{ color: colors.description }}>(optional)</Text>
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
            value={formData.comments}
            onChangeText={(text) => updateFormData({ comments: text })}
            placeholder="Add any notes about this session..."
            placeholderTextColor={colors.description}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Summary Card */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.tint + "10",
              borderColor: colors.tint + "30",
            },
          ]}
        >
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.tint }]}>
              <Ionicons name="list" size={18} color="#FFF" />
            </View>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Session Summary
            </Text>
          </View>

          <View style={styles.summaryContent}>
            {formData.name && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.description }]}>
                  Name:
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formData.name}
                </Text>
              </View>
            )}

            {formData.rangeLocation && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.description }]}>
                  Location:
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {formData.rangeLocation}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.description }]}>
                Time:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formData.dayPeriod.charAt(0).toUpperCase() + formData.dayPeriod.slice(1)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.description }]}>
                Type:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formData.isSquad ? "Squad Training" : "Individual"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.backButton,
            { 
              borderColor: colors.border,
              backgroundColor: colors.cardBackground,
            },
          ]}
          onPress={onBack}
          disabled={isSubmitting}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.border }]}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </View>
          <Text style={[styles.navButtonText, { color: colors.text }]}>
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.startButton,
            { backgroundColor: colors.green || colors.tint },
            isSubmitting && styles.buttonDisabled,
          ]}
          onPress={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Ionicons name="play-circle" size={20} color="#FFF" />
              </View>
              <Text style={[styles.navButtonText, { color: "#FFF" }]}>
                Start Session
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  content: {
    flex: 1,
    gap: 20,
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
    paddingBottom: 14,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    width: 80,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  navigation: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    borderWidth: 2,
    shadowOpacity: 0.06,
  },
  startButton: {
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

