import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { EnterInviteCodeForm } from "./EnterInviteCodeForm";

interface EnterInviteCodeModalProps {
  visible: boolean;
  onClose: () => void;
  initialInviteCode?: string;
  onSuccess?: () => void;
}

export function EnterInviteCodeModal({
  visible,
  onClose,
  initialInviteCode,
  onSuccess,
}: EnterInviteCodeModalProps) {
  const colors = useColors();

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={onClose}
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      backdropOpacity={0.45}
      scrollable={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: colors.blue },
              ]}
            >
              <Ionicons name="ticket" size={28} color="#FFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>
                Join Organization
              </Text>
              <Text style={[styles.subtitle, { color: colors.description }]}>
                Enter your invite code
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.closeButton,
              {
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="close" size={18} color={colors.description} />
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        <View style={styles.content}>
          <EnterInviteCodeForm
            initialInviteCode={initialInviteCode}
            onCancel={onClose}
            onSuccess={handleSuccess}
          />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.1)",
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
  content: {
    flex: 1,
  },
});

