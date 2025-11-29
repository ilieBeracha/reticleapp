import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createInvitation } from "@/services/invitationService";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function InviteAttachedSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeWorkspaceId, activeWorkspace } = useAppContext();

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateInvite = async () => {
    if (!activeWorkspaceId) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const invitation = await createInvitation(activeWorkspaceId, 'attached', null, null);
      await Clipboard.setStringAsync(invitation.invite_code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        '✓ Invite Created',
        `Code ${invitation.invite_code} copied to clipboard!\n\nShare this code with the person you want to invite as an attached member.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create invitation');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
      <View style={styles.grabberSpacer} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="link" size={24} color="#10B981" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Invite Attached Member</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {activeWorkspace?.workspace_name}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
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
      </ScrollView>

      {/* Action Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: isCreating ? colors.muted : '#10B981' }]}
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
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  sheet: { flex: 1 },
  grabberSpacer: { height: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 2 },

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

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
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
});

