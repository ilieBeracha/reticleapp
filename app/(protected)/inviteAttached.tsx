import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createInvitation } from "@/services/invitationService";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function InviteAttachedSheet() {
  const colors = useColors();
  const { activeWorkspaceId } = useAppContext();

  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    if (!activeWorkspaceId) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const invitation = await createInvitation(activeWorkspaceId, 'attached', null, null);
      await Clipboard.setStringAsync(invitation.invite_code);
      setCreatedCode(invitation.invite_code);
      setIsCreating(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        '✓ Invite Created',
        `Code ${invitation.invite_code} copied to clipboard!\n\nShare this code with the person you want to invite as an attached member.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create invitation');
      setIsCreating(false);
    }
  };

  // Success state - show code while Alert is visible
  if (createdCode) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.successIcon, { backgroundColor: '#10B98120' }]}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
        </View>
        <Text style={[styles.successTitle, { color: colors.text }]}>Invite Created!</Text>
        <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.codeText, { color: colors.text }]}>{createdCode}</Text>
        </View>
        <Text style={[styles.successHint, { color: colors.textMuted }]}>Code copied to clipboard</Text>
      </View>
    );
  }

  return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Illustration */}
        <View style={styles.illustrationSection}>
          <View style={[styles.illustrationBox, { backgroundColor: '#10B98110' }]}>
            <Ionicons name="link" size={56} color="#10B981" />
          </View>
          <Text style={[styles.illustrationTitle, { color: colors.text }]}>External User Access</Text>
          <Text style={[styles.illustrationDesc, { color: colors.textMuted }]}>
            Attached members can log their own sessions linked to your organization without joining your team structure.
          </Text>
        </View>

        {/* What They Can Do */}
        <View style={[styles.accessCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.accessTitle, { color: colors.text }]}>What they can do</Text>
          
          <View style={styles.accessRow}>
            <View style={[styles.accessIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark" size={16} color="#10B981" />
            </View>
            <Text style={[styles.accessText, { color: colors.text }]}>Log personal sessions & trainings</Text>
          </View>
          
          <View style={styles.accessRow}>
            <View style={[styles.accessIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark" size={16} color="#10B981" />
            </View>
            <Text style={[styles.accessText, { color: colors.text }]}>Link sessions to your organization</Text>
          </View>
          
          <View style={styles.accessRow}>
            <View style={[styles.accessIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark" size={16} color="#10B981" />
            </View>
            <Text style={[styles.accessText, { color: colors.text }]}>Contact organization staff</Text>
          </View>
        </View>

        {/* What They Cannot Do */}
        <View style={[styles.accessCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.accessTitle, { color: colors.text }]}>What they cannot do</Text>
          
          <View style={styles.accessRow}>
            <View style={[styles.accessIcon, { backgroundColor: colors.destructive + '15' }]}>
              <Ionicons name="close" size={16} color={colors.destructive} />
            </View>
            <Text style={[styles.accessText, { color: colors.textMuted }]}>See teams or team members</Text>
          </View>
          
          <View style={styles.accessRow}>
            <View style={[styles.accessIcon, { backgroundColor: colors.destructive + '15' }]}>
              <Ionicons name="close" size={16} color={colors.destructive} />
            </View>
            <Text style={[styles.accessText, { color: colors.textMuted }]}>See other attached members</Text>
          </View>
          
          <View style={styles.accessRow}>
            <View style={[styles.accessIcon, { backgroundColor: colors.destructive + '15' }]}>
              <Ionicons name="close" size={16} color={colors.destructive} />
            </View>
            <Text style={[styles.accessText, { color: colors.textMuted }]}>View organization trainings</Text>
          </View>
        </View>

        {/* Use Case Example */}
        <View style={[styles.useCaseCard, { backgroundColor: '#10B98108', borderColor: '#10B98120' }]}>
          <View style={styles.useCaseHeader}>
            <Ionicons name="bulb-outline" size={18} color="#10B981" />
            <Text style={[styles.useCaseTitle, { color: '#10B981' }]}>Perfect for</Text>
          </View>
          <Text style={[styles.useCaseText, { color: colors.textMuted }]}>
            Range customers, external trainees, or anyone who needs to log sessions associated with your organization but doesn't need access to your internal team structure.
          </Text>
        </View>

        {/* Invite Button inside scroll */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: isCreating ? colors.muted : '#10B981', marginTop: 8, marginBottom: 40 }]}
          onPress={handleCreateInvite}
          disabled={isCreating}
          activeOpacity={0.8}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="ticket" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Generate Invite Code</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20},

  // Illustration
  illustrationSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  illustrationBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  illustrationTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  illustrationDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Access Cards
  accessCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  accessTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  accessIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessText: {
    fontSize: 14,
    flex: 1,
  },

  // Use Case
  useCaseCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  useCaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  useCaseTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  useCaseText: {
    fontSize: 13,
    lineHeight: 19,
  },

  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 10,
  },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  codeBox: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 4,
  },
  successHint: {
    fontSize: 14,
  },
});

