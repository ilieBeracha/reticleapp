import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
  const { createChildOrg, accessibleOrgs } = useOrganizationsStore();

  // Get parent org to determine depth
  const parentOrg = accessibleOrgs.find(o => o.id === parentId);
  const parentDepth = parentOrg?.depth ?? 0;

  // Hierarchy order (top to bottom)
  const typeHierarchy = ['Unit', 'Team', 'Squad'];
  
  // Get parent's type to determine what children can be created
  const parentType = parentOrg?.org_type || 'Unit';
  const parentHierarchyIndex = typeHierarchy.indexOf(parentType);

  // Smart type suggestion based on parent type
  const getSmartType = (parentType: string) => {
    const parentIndex = typeHierarchy.indexOf(parentType);
    // Suggest next level down in hierarchy
    if (parentIndex >= 0 && parentIndex < typeHierarchy.length - 1) {
      return typeHierarchy[parentIndex + 1];
    }
    return 'Squad';  // Fallback to bottom of hierarchy
  };

  const smartType = getSmartType(parentType);

  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState(smartType);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type options - only show types at or below parent in hierarchy
  const orgTypes = [
    { 
      value: "Unit", 
      icon: "business", 
      color: colors.teal,
      hierarchyIndex: 0,
      recommended: smartType === 'Unit',
      disabled: parentHierarchyIndex >= 0,  // Can't create Unit if parent is Unit/Team/Squad
    },
    { 
      value: "Team", 
      icon: "people", 
      color: colors.blue,
      hierarchyIndex: 1,
      recommended: smartType === 'Team',
      disabled: parentHierarchyIndex >= 1,  // Can't create Team if parent is Team/Squad
    },
    { 
      value: "Squad", 
      icon: "shield", 
      color: colors.purple,
      hierarchyIndex: 2,
      recommended: smartType === 'Squad',
      disabled: parentHierarchyIndex >= 2,  // Can't create Squad if parent is Squad
    },
    { 
      value: "Group", 
      icon: "git-network", 
      color: colors.indigo,
      hierarchyIndex: 99,  // Not in hierarchy, always available
      recommended: false,
      disabled: false,
    },
  ].filter(type => !type.disabled);  // Remove disabled types entirely

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
    setOrgType(smartType);  // Reset to smart default
    setDescription("");
    onClose();
  };

  // Reset to smart default when modal opens
  useEffect(() => {
    if (visible) {
      setOrgType(smartType);
    }
  }, [visible, smartType]);

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
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Type</Text>
              <View style={[styles.recommendedBadge, { backgroundColor: colors.green + '15' }]}>
                <Ionicons name="star" size={12} color={colors.green} />
                <Text style={[styles.recommendedText, { color: colors.green }]}>
                  {smartType} recommended
                </Text>
              </View>
            </View>
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
                      borderWidth: type.recommended ? 2 : 1.5,
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
                  {type.recommended && orgType !== type.value && (
                    <Ionicons name="star-outline" size={16} color={type.color} />
                  )}
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
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

