// components/auth/EmailPasswordSheet.tsx
// Full-screen modal for email + password authentication

import { useColors } from "@/hooks/ui/useColors";
import { signInWithPassword, signUpWithPassword } from "@/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, InputField } from "../shared/ui/input";

interface EmailPasswordSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function EmailPasswordSheet({ visible, onClose }: EmailPasswordSheetProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t("common.error"), t("auth.enterEmail"));
      return;
    }
    if (!password) {
      Alert.alert(t("common.error"), t("auth.enterPassword"));
      return;
    }
    if (mode === "signUp" && password !== confirmPassword) {
      Alert.alert(t("common.error"), t("auth.confirmPassword"));
      return;
    }

    setLoading(true);
    try {
      if (mode === "signIn") {
        await signInWithPassword(email, password);
        onClose();
      } else {
        await signUpWithPassword(email, password);
        Alert.alert(t("common.success"), t("auth.signUpSuccess"));
        setMode("signIn");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setMode("signIn");
    onClose();
  };

  const toggleMode = () => {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    setPassword("");
    setConfirmPassword("");
  };

  const isFormValid = mode === "signIn"
    ? email.trim() && password
    : email.trim() && password && confirmPassword;

  return (
    <Modal visible={visible} onRequestClose={handleClose}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.card }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: Math.max(20, insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {mode === "signIn" ? t("auth.signIn") : t("auth.signUp")}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconCenter}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="lock-closed" size={28} color={colors.primary} />
          </View>
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t("auth.signInWithPassword")}
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputSection}>
            <View style={styles.labelRow}>
              <Ionicons name="mail" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("auth.email")}
              </Text>
            </View>
            <Input>
              <InputField
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />
            </Input>
          </View>

          {/* Password */}
          <View style={styles.inputSection}>
            <View style={styles.labelRow}>
              <Ionicons name="key" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("auth.password")}
              </Text>
            </View>
            <Input>
              <InputField
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
            </Input>
          </View>

          {/* Confirm Password (sign-up only) */}
          {mode === "signUp" && (
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t("auth.confirmPassword")}
                </Text>
              </View>
              <Input>
                <InputField
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </Input>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: isFormValid ? colors.primary : colors.border,
              opacity: isFormValid ? 1 : 0.5,
            },
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons
                name={mode === "signIn" ? "log-in-outline" : "person-add-outline"}
                size={20}
                color="#fff"
              />
              <Text style={styles.primaryButtonText}>
                {mode === "signIn" ? t("auth.signIn") : t("auth.createAccount")}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Toggle sign in / sign up */}
        <TouchableOpacity style={styles.toggleButton} onPress={toggleMode} activeOpacity={0.7}>
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {mode === "signIn" ? t("auth.noAccount") : t("auth.hasAccount")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  iconCenter: {
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  toggleButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
