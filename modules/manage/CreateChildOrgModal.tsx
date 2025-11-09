import BaseBottomSheet from "@/components/BaseBottomSheet";
import { OrgTypePicker } from "@/components/OrgTypePicker";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
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
  const { createChildOrg, accessibleOrgs } = useOrganizationsStore();

  // Get parent org to determine type
  const parentOrg = accessibleOrgs.find(o => o.id === parentId);
  const parentType = parentOrg?.org_type || 'Unit';

  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("Team"); // Will be set by useEffect
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Set smart default type when modal opens
  useEffect(() => {
    if (visible && parentType) {
      // Set smart default based on parent type
      const typeHierarchy = ["Unit", "Team", "Squad"];
      const parentIndex = typeHierarchy.indexOf(parentType);
      if (parentIndex >= 0 && parentIndex < typeHierarchy.length - 1) {
        setOrgType(typeHierarchy[parentIndex + 1]);
      } else {
        setOrgType("Squad");
      }
    }
  }, [visible, parentType]);

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["56%", "85%"]}
      enableDynamicSizing={false}
      keyboardSnapPoint={1}
      scrollable={true}
      enablePanDownToClose={!isSubmitting}
      keyboardBehavior="interactive"
      enableKeyboardAutoSnap={true}
    >
      {/* Header */}
      <View style={styles.header}>
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
          <BottomSheetTextInput
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
            returnKeyType="next"
          />
        </View>

          {/* Type Selection */}
          <View style={styles.field}>
            <OrgTypePicker
              selectedType={orgType}
              onTypeSelect={setOrgType}
              parentType={parentType}
              disabled={isSubmitting}
            />
          </View>

       
      </View>

      {/* Info - Smart Hierarchy Guide */}
      <View style={[styles.infoBox, { backgroundColor: colors.green + "08", borderColor: colors.green + '30' }]}>
        <Ionicons name="information-circle" size={16} color={colors.green} />
        <View style={styles.infoContent}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {parentType === 'Unit' && 'Unit → Team → Squad (recommended)'}
            {parentType === 'Team' && 'Team → Squad (recommended)'}
            {parentType === 'Squad' && 'Maximum depth reached'}
          </Text>
          <Text style={[styles.infoSubtext, { color: colors.textMuted }]}>
            Under {parentName} ({parentType})
          </Text>
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
              <Ionicons name="git-branch" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Child</Text>
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  infoSubtext: {
    fontSize: 12,
    lineHeight: 16,
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

