// components/auth/EmailOTPSheet.tsx
// Bottom sheet for email OTP authentication

import { useColors } from "@/hooks/ui/useColors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
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
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
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
    >
      <View style={styles.container}>
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
            <View style={[styles.iconBox, { backgroundColor: colors.tint + "15" }]}>
              <Ionicons name="mail" size={32} color={colors.tint} />
            </View>

            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Enter your email to receive a one-time code
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Email Address
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

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: email.trim() ? colors.tint : colors.border,
                  opacity: email.trim() ? 1 : 0.5,
                },
              ]}
              onPress={handleSendOTP}
              disabled={!email.trim() || loading}
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
            <View style={[styles.iconBox, { backgroundColor: colors.green + "15" }]}>
              <Ionicons name="shield-checkmark" size={32} color={colors.green} />
            </View>

            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Enter the 6-digit code sent to
            </Text>
            <Text style={[styles.emailDisplay, { color: colors.text }]}>
              {email}
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Verification Code
                </Text>
                <BottomSheetTextInput
                  style={[
                    styles.input,
                    styles.otpInput,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: otp.length === 6 ? colors.green : colors.border,
                  opacity: otp.length === 6 ? 1 : 0.5,
                },
              ]}
              onPress={handleVerifyOTP}
              disabled={otp.length !== 6 || loading}
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
            >
              <Text style={[styles.resendText, { color: colors.tint }]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
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
    marginTop: 16,
    marginBottom: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 16,
  },
  otpInput: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
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

