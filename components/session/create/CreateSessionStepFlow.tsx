import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { sessionStatsStore } from "@/store/sessionsStore";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useStore } from "zustand";
import { SessionDetailsStep } from "./steps/SessionDetailsStep";
import { SessionNotesStep } from "./steps/SessionNotesStep";
import { SessionFormData } from "./types";

interface CreateSessionStepFlowProps {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  { id: 1, title: "Details", component: SessionDetailsStep },
  { id: 2, title: "Notes", component: SessionNotesStep },
];

export function CreateSessionStepFlow({
  visible,
  onClose,
}: CreateSessionStepFlowProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();
  const { createSession, fetchSessions } = useStore(sessionStatsStore);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SessionFormData>({
    name: "",
    rangeLocation: "",
    dayPeriod: "morning",
    isSquad: false,
    comments: "",
    organizationId: selectedOrgId || null,
  });

  const updateFormData = (data: Partial<SessionFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({
      name: "",
      rangeLocation: "",
      dayPeriod: "morning",
      isSquad: false,
      comments: "",
      organizationId: selectedOrgId || null,
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
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
          name: formData.name.trim() || undefined,
          started_at: new Date().toISOString(),
          range_location: formData.rangeLocation.trim() || undefined,
          day_period: formData.dayPeriod,
          is_squad: formData.isSquad,
          comments: formData.comments.trim() || undefined,
          organization_id: formData.organizationId,
        },
        user.id
      );

      // Refetch sessions for current view
      await fetchSessions(user.id, selectedOrgId);

      Alert.alert("Success", "Session started successfully!");
      handleClose();
    } catch (error) {
      console.error("Error creating session:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create session";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;
  const isLastStep = currentStep === STEPS.length - 1;

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
        {/* Header with Progress */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: colors.tint },
                ]}
              >
                <Ionicons name="play-circle" size={28} color="#FFF" />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.text }]}>
                  New Session
                </Text>
                <Text style={[styles.subtitle, { color: colors.description }]}>
                  Step {currentStep + 1} of {STEPS.length}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeButton,
                { 
                  backgroundColor: colors.cardBackground,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              disabled={isSubmitting}
            >
              <Ionicons name="close" size={18} color={colors.description} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            {STEPS.map((step, index) => (
              <View
                key={step.id}
                style={[
                  styles.progressStep,
                  {
                    backgroundColor:
                      index <= currentStep
                        ? colors.tint
                        : colors.border + "40",
                  },
                ]}
              >
                {index < currentStep ? (
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                ) : (
                  <Text
                    style={[
                      styles.progressText,
                      {
                        color: index === currentStep ? "#FFF" : colors.description,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Step Content */}
        <View style={styles.stepContainer}>
          {isLastStep ? (
            <SessionNotesStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
              isFirstStep={false}
              isLastStep={true}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          ) : (
            <SessionDetailsStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
              isFirstStep={true}
              isLastStep={false}
            />
          )}
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
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.1)",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
  },
  stepContainer: {
    flex: 1,
  },
});

