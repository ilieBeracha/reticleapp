// components/auth/EmailOTPSheet.tsx
// Bottom sheet for email OTP authentication

import { useColors } from "@/hooks/ui/useColors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface EmailOTPSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function EmailOTPSheet({ visible, onClose }: EmailOTPSheetProps) {
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      Alert.alert(
        "Check Your Email",
        `We sent a 6-digit code to ${email}`,
        [{ text: "OK" }]
      );
      setStep("otp");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 8) {
      Alert.alert("Error", "Please enter the 8-digit code");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });

      if (error) throw error;

      // Success - auth context will handle navigation
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("email");
    setEmail("");
    setOtp("");
    onClose();
  };

  const handleBack = () => {
    if (step === "otp") {
      setStep("email");
      setOtp("");
    } else {
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {step === "email" ? "Sign In" : "Enter Code"}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {step === "email" ? (
          /* Email Entry Step */
          <>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="mail" size={32} color={colors.primary} />
            </View>

            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Enter your email to receive a one-time code
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Email Address
                </Text> 
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoFocus
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: email.trim() ? colors.primary : colors.border,
                  opacity: email.trim() ? 1 : 0.6,
                },
              ]}
              onPress={handleSendOTP}
              disabled={!email.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Send Code</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          /* OTP Entry Step */
          <>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
            </View>

            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Enter the 8-digit code sent to
            </Text>
            <Text style={[styles.emailDisplay, { color: colors.text }]}>
              {email}
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Verification Code
                </Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="key-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.otpInput, { color: colors.text }]}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="e.g. 12345678"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={8}
                    autoFocus
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: otp.length === 8 ? colors.primary : colors.border,
                  opacity: otp.length === 8 ? 1 : 0.6,
                },
              ]}
              onPress={handleVerifyOTP}
              disabled={otp.length !== 8 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Verify & Sign In</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.resendText, { color: colors.primary }]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          </>
        )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  emailDisplay: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  form: {
    marginTop: 24,
    marginBottom: 32,
  },
  field: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  otpInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 6,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  resendButton: {
    alignItems: "center",
    marginTop: 16,
    padding: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

