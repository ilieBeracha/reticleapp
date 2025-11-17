import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface CreateSessionSheetProps {
  onSessionCreated?: () => void;
}

export const CreateSessionSheet = forwardRef<BaseBottomSheetRef, CreateSessionSheetProps>(
  ({ onSessionCreated }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId, isMyWorkspace } = useAppContext();
    
    const [sessionTitle, setSessionTitle] = useState("");
    const [sessionNotes, setSessionNotes] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateSession = async () => {
      if (!sessionTitle.trim()) {
        Alert.alert("Error", "Please enter a session title");
        return;
      }

      setIsCreating(true);
      try {
        // TODO: Implement session creation API call
        // For now, just simulate success
        await new Promise(resolve => setTimeout(resolve, 500));
        
        Alert.alert("Success", "Session created successfully!");
        setSessionTitle("");
        setSessionNotes("");
        onSessionCreated?.();
      } catch (error: any) {
        console.error("Failed to create session:", error);
        Alert.alert("Error", "Failed to create session");
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <BaseBottomSheet ref={ref} snapPoints={['100%']} backdropOpacity={0.8}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="fitness" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            New Training Session
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isMyWorkspace ? 'Start your personal training' : 'Create a team session'}
          </Text>
        </View>

        {/* Session Title */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Session Title</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Morning Range Practice"
              placeholderTextColor={colors.textMuted + 'CC'}
              value={sessionTitle}
              onChangeText={setSessionTitle}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Session Notes (Optional) */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Notes (Optional)</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.textArea, { color: colors.text }]}
              placeholder="Add any notes about this session..."
              placeholderTextColor={colors.textMuted + 'CC'}
              value={sessionNotes}
              onChangeText={setSessionNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Session Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.secondary }]}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Session will start immediately
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Solo training session
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: (!sessionTitle.trim() || isCreating) ? colors.secondary : colors.primary,
                shadowColor: (!sessionTitle.trim() || isCreating) ? 'transparent' : colors.primary
              },
              (!sessionTitle.trim() || isCreating) && styles.primaryButtonDisabled
            ]}
            onPress={handleCreateSession}
            disabled={!sessionTitle.trim() || isCreating}
            activeOpacity={0.8}
          >
            <View style={styles.primaryButtonContent}>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={[styles.primaryButtonText, { color: '#fff' }]}>
                {isCreating ? "Starting..." : "Start Session"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </BaseBottomSheet>
    );
  }
);

CreateSessionSheet.displayName = 'CreateSessionSheet';

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Input
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },

  // Info Card
  infoCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Actions
  actions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});

