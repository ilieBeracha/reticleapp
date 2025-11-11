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

export function SessionDetailsStep({
  formData,
  updateFormData,
  onNext,
  isFirstStep,
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
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.tint }]}>
          <Ionicons name="information-circle" size={32} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Session Details
        </Text>
        <Text style={[styles.subtitle, { color: colors.description }]}>
          Basic information about your session
        </Text>
      </View>

      {/* Form Content */}
      <View style={styles.content}>
        {/* Session Type */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            Session Type
          </Text>
          
          {/* Individual Option */}
          <TouchableOpacity
            style={[
              styles.typeOption,
              !formData.isSquad && styles.typeOptionSelected,
              {
                backgroundColor: !formData.isSquad ? colors.tint + "15" : colors.cardBackground,
                borderColor: !formData.isSquad ? colors.tint : colors.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => updateFormData({ isSquad: false })}
          >
            <View style={styles.typeLeft}>
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: !formData.isSquad ? colors.tint : colors.cardBackground },
                ]}
              >
                <Ionicons
                  name="person"
                  size={24}
                  color={!formData.isSquad ? "#FFF" : colors.description}
                />
              </View>
              <View style={styles.typeTextContainer}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>
                  Individual
                </Text>
                <Text style={[styles.typeSubtitle, { color: colors.description }]}>
                  Solo training session
                </Text>
              </View>
            </View>
            {!formData.isSquad && (
              <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
            )}
          </TouchableOpacity>

          {/* Squad Option */}
          <TouchableOpacity
            style={[
              styles.typeOption,
              formData.isSquad && styles.typeOptionSelected,
              {
                backgroundColor: formData.isSquad ? colors.blue + "15" : colors.cardBackground,
                borderColor: formData.isSquad ? colors.blue : colors.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => updateFormData({ isSquad: true })}
          >
            <View style={styles.typeLeft}>
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: formData.isSquad ? colors.blue : colors.cardBackground },
                ]}
              >
                <Ionicons
                  name="people"
                  size={24}
                  color={formData.isSquad ? "#FFF" : colors.description}
                />
              </View>
              <View style={styles.typeTextContainer}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>
                  Squad Training
                </Text>
                <Text style={[styles.typeSubtitle, { color: colors.description }]}>
                  Multiple participants
                </Text>
              </View>
            </View>
            {formData.isSquad && (
              <Ionicons name="checkmark-circle" size={24} color={colors.blue} />
            )}
          </TouchableOpacity>
        </View>

        {/* Session Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            Session Name <Text style={{ color: colors.description }}>(optional)</Text>
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
            value={formData.name}
            onChangeText={(text) => updateFormData({ name: text })}
            placeholder="e.g. Morning Practice"
            placeholderTextColor={colors.description}
          />
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
                    backgroundColor: colors.cardBackground,
                    borderColor:
                      formData.dayPeriod === period.value
                        ? colors.tint
                        : colors.border,
                    borderWidth: formData.dayPeriod === period.value ? 2 : 1,
                  },
                ]}
                onPress={() => updateFormData({ dayPeriod: period.value })}
              >
              <View
                style={[
                  styles.periodIconCircle,
                  {
                    backgroundColor: formData.dayPeriod === period.value
                      ? colors.tint
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
                          ? colors.tint
                          : colors.text,
                    },
                  ]}
                >
                  {period.label}
                </Text>
                {formData.dayPeriod === period.value && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonPrimary,
            { backgroundColor: colors.tint },
          ]}
          onPress={onNext}
        >
          <Text style={[styles.navButtonText, { color: "#FFF" }]}>
            Continue
          </Text>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </View>
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
    marginBottom: 24,
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
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  typeOptionSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  typeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  typeTextContainer: {
    flex: 1,
    gap: 2,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  typeSubtitle: {
    fontSize: 12,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
    marginTop: 16,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonPrimary: {

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

