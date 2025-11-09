import BaseBottomSheet from "@/components/BaseBottomSheet";
import { OrgTypePicker } from "@/components/OrgTypePicker";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CreateRootOrgModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateRootOrgModal({
  visible,
  onClose,
  onSuccess,
}: CreateRootOrgModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { createRootOrg, setSelectedOrg } = useOrganizationsStore();

  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("Unit");  // Better default
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!user?.id || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const newOrg = await createRootOrg(
        { name: name.trim(), orgType, description: description.trim() },
        user.id
      );

      if (newOrg) {
        // Auto-switch to new organization
        setSelectedOrg(newOrg.id);
        
        Alert.alert("Success!", `${name} created successfully`, [
          { text: "OK", onPress: () => handleClose() },
        ]);
        onSuccess?.();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setOrgType("Unit");
    setDescription("");
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["65%", "85%"]}
      enableDynamicSizing={false}
      scrollable={true}
      enablePanDownToClose={!isSubmitting}
      keyboardBehavior="interactive"
      enableKeyboardAutoSnap={true}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Create Root Organization
        </Text>
        <Text style={[styles.subtitle, { color: colors.description }]}>
          This will be a top-level organization in your hierarchy
        </Text>
      </View>

      {/* Recommended Structure Hint */}
      <View style={[styles.hintBox, { backgroundColor: colors.green + '08', borderColor: colors.green + '30' }]}>
        <Ionicons name="bulb" size={18} color={colors.green} />
        <View style={styles.hintContent}>
          <Text style={[styles.hintTitle, { color: colors.green }]}>
            Recommended Structure
          </Text>
          <Text style={[styles.hintText, { color: colors.textMuted }]}>
            Unit → Team → Squad (3 levels max)
          </Text>
        </View>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            Organization Name *
          </Text>
          <BottomSheetTextInput
            style={[
              styles.input,
              { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Alpha Unit"
            placeholderTextColor={colors.description}
            autoFocus
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <OrgTypePicker
            selectedType={orgType}
            onTypeSelect={setOrgType}
            disabled={isSubmitting}
          />
        </View>


      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
          onPress={handleClose}
          disabled={isSubmitting}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.createButton,
            {
                backgroundColor: name.trim() ? colors.buttonPrimary : colors.border,
              opacity: name.trim() ? 1 : 0.5,
            },
          ]}
          onPress={handleCreate}
          disabled={!name.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Root</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  iconHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
  },
  hintContent: {
    flex: 1,
    gap: 2,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  hintText: {
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  createButton: {},
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

