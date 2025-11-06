import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { trainingsStore } from "@/store/trainingsStore";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useStore } from "zustand";

interface CreateTrainingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateTrainingModal({
  visible,
  onClose,
}: CreateTrainingModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();

  // Use Zustand store directly
  const { createTraining, fetchTrainings } = useStore(trainingsStore);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setLocation("");
    setScheduledDate(undefined);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setScheduledDate(selectedDate);
      // On iOS, show time picker after date is selected
      if (Platform.OS === "ios") {
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && scheduledDate) {
      // Combine date and time
      const combined = new Date(scheduledDate);
      combined.setHours(selectedTime.getHours());
      combined.setMinutes(selectedTime.getMinutes());
      setScheduledDate(combined);
    }
  };

  const formatDateTime = (date: Date | undefined) => {
    if (!date) return "Not set";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a training name");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "Authentication error");
      return;
    }

    if (!selectedOrgId) {
      Alert.alert("Error", "Please select an organization first");
      return;
    }

    try {
      setIsSubmitting(true);

      const training = await createTraining(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          scheduled_date: scheduledDate?.toISOString(),
        },
        user?.id,
        selectedOrgId
      );

      if (training) {
        // Refetch trainings based on current context
        await fetchTrainings(user?.id, selectedOrgId);

        Alert.alert("Success", "Training created successfully!");
        handleClose();
      }
    } catch (error: any) {
      console.error("Error creating training:", error);
      Alert.alert("Error", error.message || "Failed to create training");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["70%", "85%"]}
      enablePanDownToClose={!isSubmitting}
      backdropOpacity={0.45}
    >
      <View style={styles.container}>
        <View style={styles.form}>
          {/* Training Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Training Name *
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
              placeholder="e.g. CQB Team Training"
              placeholderTextColor={colors.description}
              editable={!isSubmitting}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Description
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
              value={description}
              onChangeText={setDescription}
              placeholder="Enter training details..."
              placeholderTextColor={colors.description}
              editable={!isSubmitting}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Scheduled Date & Time */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Scheduled Date & Time
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowDatePicker(true)}
              disabled={isSubmitting}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={scheduledDate ? colors.tint : colors.description}
              />
              <Text
                style={[
                  styles.dateText,
                  {
                    color: scheduledDate ? colors.text : colors.description,
                  },
                ]}
              >
                {formatDateTime(scheduledDate)}
              </Text>
              {scheduledDate && (
                <TouchableOpacity
                  onPress={() => setScheduledDate(undefined)}
                  disabled={isSubmitting}
                  style={styles.clearButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.description}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={scheduledDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={scheduledDate || new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Location
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
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Range A, Building 3"
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
                  Create Training
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
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    padding: 4,
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

