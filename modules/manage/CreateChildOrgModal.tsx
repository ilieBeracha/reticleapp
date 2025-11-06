import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
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

interface CreateChildOrgModalProps {
  visible: boolean;
  onClose: () => void;
  parentId: string;
  parentName: string;
  onSuccess?: () => void;
}

export function CreateChildOrgModal({
  visible,
  onClose,
  parentId,
  parentName,
  onSuccess,
}: CreateChildOrgModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { createChildOrg } = useOrganizationsStore();

  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("Team");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orgTypes = [
    { value: "Team", icon: "people", color: colors.blue },
    { value: "Squad", icon: "shield", color: colors.purple },
    { value: "Unit", icon: "git-network", color: colors.teal },
    { value: "Division", icon: "layers", color: colors.indigo },
  ];

  const handleCreate = async () => {
    if (!user?.id || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const newOrg = await createChildOrg(
        {
          name: name.trim(),
          orgType,
          parentId,
          description: description.trim(),
        },
        user.id
      );

      if (newOrg) {
        Alert.alert("Child Organization Created!", `${name} added under ${parentName}`, [
          { text: "OK", onPress: () => handleClose() },
        ]);
        onSuccess?.();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create child organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setOrgType("Team");
    setDescription("");
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["70%"]}
      enablePanDownToClose={!isSubmitting}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconHeader, { backgroundColor: colors.purple + "15" }]}>
            <Ionicons name="git-branch" size={28} color={colors.purple} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Create Child Organization
          </Text>
          <View style={[styles.parentBadge, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="arrow-up" size={14} color={colors.textMuted} />
            <Text style={[styles.parentText, { color: colors.description }]}>
              Parent: {parentName}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Child Organization Name *
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
              placeholder="e.g., Bravo Team"
              placeholderTextColor={colors.description}
              autoFocus
            />
          </View>

          {/* Type Selection - Visual Pills */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Type</Text>
            <View style={styles.typeGrid}>
              {orgTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typePill,
                    {
                      backgroundColor:
                        orgType === type.value
                          ? type.color + "20"
                          : colors.cardBackground,
                      borderColor:
                        orgType === type.value ? type.color : colors.border,
                    },
                  ]}
                  onPress={() => setOrgType(type.value)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={orgType === type.value ? type.color : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typePillText,
                      {
                        color: orgType === type.value ? type.color : colors.text,
                      },
                    ]}
                  >
                    {type.value}
                  </Text>
                  {orgType === type.value && (
                    <Ionicons name="checkmark-circle" size={18} color={type.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
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
              placeholder="Optional description"
              placeholderTextColor={colors.description}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.purple + "08" }]}>
          <Ionicons name="information-circle" size={16} color={colors.purple} />
          <Text style={[styles.infoText, { color: colors.description }]}>
            This organization will inherit from {parentName}
          </Text>
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
                backgroundColor: name.trim() ? colors.purple : colors.border,
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
                <Ionicons name="git-branch" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Child</Text>
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
    alignItems: "center",
    marginBottom: 24,
    gap: 10,
  },
  iconHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  parentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  parentText: {
    fontSize: 13,
    fontWeight: "600",
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
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    flex: 1,
    minWidth: "45%",
  },
  typePillText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
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

