import { BaseButton } from "@/components/ui/baseButton";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { StepProps } from "../types";
import { SessionInfo } from "./SessionInfo";

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
      <SessionInfo 
        title="Review & Start" 
        subtitle="Add optional notes and confirm your session"
      />

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
              backgroundColor: colors.blue + "10",
              borderColor: colors.blue + "30",
            },
          ]}
        >
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.blue }]}>
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
        <BaseButton onPress={onBack} style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.cardBackground, flex: 1, justifyContent: "center", alignItems: "center" }]}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />  
          <Text style={[styles.navButtonText, { color: colors.text }]}>
            Back
          </Text>
        </BaseButton>

        <BaseButton 
          onPress={isSubmitting ? () => {} : onSubmit}
          style={[
            styles.startButton, 
            { 
              backgroundColor: colors.blue, 
              flex: 1.5, 
              justifyContent: "center", 
              alignItems: "center" 
            },
            isSubmitting && { opacity: 0.7 },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="play-circle" size={22} color="#FFF" />
              <Text style={[styles.navButtonText, { color: "#FFF" }]}>
                Start Session
              </Text>
            </>
          )}
        </BaseButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    gap: 20,
    marginBottom: 16,
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
    marginTop: "auto",

  },
  backButton: {
    borderWidth: 2,
  },
  startButton: {},
  navButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

