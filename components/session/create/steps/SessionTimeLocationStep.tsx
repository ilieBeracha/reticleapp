import { BaseButton } from "@/components/ui/baseButton";
import { useColors } from "@/hooks/ui/useColors";
import { DayPeriod } from "@/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { StepProps } from "../types";
import { SessionInfo } from "./SessionInfo";

export function SessionTimeLocationStep({
  formData,
  updateFormData,
  onNext,
  onBack,
}: StepProps) {
  const colors = useColors();

  const dayPeriods: { value: DayPeriod; icon: string; label: string }[] = [
    { value: "morning", icon: "sunny", label: "Morning" },
    { value: "afternoon", icon: "partly-sunny", label: "Afternoon" },
    { value: "evening", icon: "cloudy", label: "Evening" },
    { value: "night", icon: "moon", label: "Night" },
  ];

  return (
    <View style={styles.container}>
      <SessionInfo 
        title="Time & Location" 
        subtitle="When and where is this session?"
      />

      {/* Form Content */}
      <View style={styles.content}>
        {/* Day Period */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            Time of Day
          </Text>
          <View style={styles.periodGrid}>
            {dayPeriods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodOption,
                  {
                    backgroundColor: formData.dayPeriod === period.value ? colors.blue + "12" : colors.cardBackground,
                    borderColor:
                      formData.dayPeriod === period.value
                        ? colors.blue
                        : colors.border,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => updateFormData({ dayPeriod: period.value })}
              >
                <View
                  style={[
                    styles.periodIconCircle,
                  {
                    backgroundColor: formData.dayPeriod === period.value
                      ? colors.blue
                      : colors.border + "40",
                  },
                ]}
              >
                <Ionicons
                  name={period.icon as any}
                  size={20}
                  color={
                    formData.dayPeriod === period.value
                      ? "#FFF"
                      : colors.description
                  }
                />
              </View>
                <Text
                  style={[
                    styles.periodText,
                    {
                      color:
                        formData.dayPeriod === period.value
                          ? colors.blue
                          : colors.text,
                    },
                  ]}
                >
                  {period.label}
                </Text>
                {formData.dayPeriod === period.value && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.blue} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Range Location */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            Range Location <Text style={{ color: colors.description }}>(optional)</Text>
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
            value={formData.rangeLocation}
            onChangeText={(text) => updateFormData({ rangeLocation: text })}
            placeholder="e.g. Range A"
            placeholderTextColor={colors.description}
          />
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
         <BaseButton onPress={onNext} style={[styles.navButtonPrimary, { backgroundColor: colors.blue, flex: 1, justifyContent: "center", alignItems: "center" }]}>
          <Text style={[styles.navButtonText, { color: "#FFF" }]}>
            Continue
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  periodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  periodOption: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  periodIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  periodText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  navigation: {
    flexDirection: "row",
    gap: 12,

  },

  backButton: {
    borderWidth: 2,
    shadowOpacity: 0.06,
  },
  navButtonPrimary: {
    shadowColor: "#007AFF",
    shadowOpacity: 0.3,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

