/**
 * Example Bottom Sheet Components
 *
 * These are templates showing how to create different bottom sheets
 * using the BaseBottomSheet component.
 */

import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ==================== Example 1: Simple Content Bottom Sheet ====================

interface SimpleContentSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SimpleContentSheet({
  visible,
  onClose,
}: SimpleContentSheetProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} snapPoints={["40%"]}>
      <Text style={[styles.title, { color: textColor }]}>
        Simple Content Sheet
      </Text>
      <Text style={[styles.description, { color: mutedColor }]}>
        This is a simple bottom sheet with just text content. You can put any
        React Native components here.
      </Text>
    </BaseBottomSheet>
  );
}

// ==================== Example 2: Form Bottom Sheet ====================

interface FormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
}

export function FormSheet({ visible, onClose, onSubmit }: FormSheetProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  const handleSubmit = () => {
    onSubmit({ name, description });
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} snapPoints={["60%"]}>
      <Text style={[styles.title, { color: textColor }]}>Create New Item</Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: textColor }]}>Name</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: cardBackground, borderColor, color: textColor },
          ]}
          placeholder="Enter name"
          placeholderTextColor={mutedColor}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: textColor }]}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: cardBackground, borderColor, color: textColor },
          ]}
          placeholder="Enter description"
          placeholderTextColor={mutedColor}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: tintColor }]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Create</Text>
      </TouchableOpacity>
    </BaseBottomSheet>
  );
}

// ==================== Example 3: Selection List Bottom Sheet ====================

interface SelectionItem {
  id: string;
  label: string;
  icon?: string;
}

interface SelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: SelectionItem[];
  onSelect: (item: SelectionItem) => void;
}

export function SelectionSheet({
  visible,
  onClose,
  title,
  items,
  onSelect,
}: SelectionSheetProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const cardBackground = useThemeColor({}, "cardBackground");
  const tintColor = useThemeColor({}, "tint");

  const handleSelect = (item: SelectionItem) => {
    onSelect(item);
    onClose();
  };

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} snapPoints={["50%"]}>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>

      <View style={styles.listContainer}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.listItem, { backgroundColor: cardBackground }]}
            onPress={() => handleSelect(item)}
          >
            {item.icon && (
              <Ionicons name={item.icon as any} size={24} color={tintColor} />
            )}
            <Text style={[styles.listItemText, { color: textColor }]}>
              {item.label}
            </Text>
            <Ionicons name="checkmark" size={20} color={mutedColor} />
          </TouchableOpacity>
        ))}
      </View>
    </BaseBottomSheet>
  );
}

// ==================== Example 4: Confirmation Bottom Sheet ====================

interface ConfirmationSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export function ConfirmationSheet({
  visible,
  onClose,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  destructive = false,
}: ConfirmationSheetProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} snapPoints={["35%"]}>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.description, { color: mutedColor }]}>{message}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { borderColor }]}
          onPress={onClose}
        >
          <Text style={[styles.buttonText, { color: textColor }]}>
            {cancelText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: destructive ? "#ef4444" : tintColor,
            },
          ]}
          onPress={handleConfirm}
        >
          <Text style={[styles.buttonText, { color: "#fff" }]}>
            {confirmText}
          </Text>
        </TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

// Add React import for useState
import React from "react";
