import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createInvitation } from "@/services/invitationService";
import type { WorkspaceRole } from "@/types/workspace";
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
// STAFF ROLES
// ============================================================================
interface RoleConfig {
  value: WorkspaceRole;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const STAFF_ROLES: RoleConfig[] = [
  { value: 'admin', label: 'Admin', description: 'Full management access to organization', icon: 'shield-half', color: '#3B82F6' },
  { value: 'instructor', label: 'Instructor', description: 'Can create trainings & view all sessions', icon: 'school', color: '#7C3AED' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function InviteStaffSheet() {
  const colors = useColors();
  const { activeWorkspaceId, activeWorkspace } = useAppContext();

  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('instructor');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const selectedRoleConfig = STAFF_ROLES.find(r => r.value === selectedRole);

  const handleCreateInvite = async () => {
    if (!activeWorkspaceId) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const invitation = await createInvitation(activeWorkspaceId, selectedRole, null, null);
      await Clipboard.setStringAsync(invitation.invite_code);
      setCreatedCode(invitation.invite_code);
      setIsCreating(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        '✓ Invite Created',
        `Code ${invitation.invite_code} copied to clipboard!\n\nShare this code with the person you want to invite as ${selectedRoleConfig?.label}.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create invitation');
      setIsCreating(false);
    }
  };

  // Success state
  if (createdCode) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.successIcon, { backgroundColor: selectedRoleConfig?.color + '20' }]}>
          <Ionicons name="checkmark-circle" size={64} color={selectedRoleConfig?.color || colors.primary} />
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
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={[styles.headerIcon, { backgroundColor: '#6366F115' }]}>
          <Ionicons name="shield" size={28} color="#6366F1" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Invite Staff</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {activeWorkspace?.workspace_name}
        </Text>
      </View>
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: '#6366F110', borderColor: '#6366F130' }]}>
          <Ionicons name="information-circle" size={18} color="#6366F1" />
          <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
            Staff members have organization-wide access and can view all teams and members.
          </Text>
        </View>

        {/* Role Selection */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Role</Text>

        {STAFF_ROLES.map(role => (
          <TouchableOpacity
            key={role.value}
            style={[
              styles.roleCard,
              {
                backgroundColor: selectedRole === role.value ? role.color + '10' : colors.background,
                borderColor: selectedRole === role.value ? role.color : colors.border,
              },
            ]}
            onPress={() => setSelectedRole(role.value)}
            activeOpacity={0.7}
          >
            <View style={[styles.roleIcon, { backgroundColor: role.color + '20' }]}>
              <Ionicons name={role.icon} size={22} color={role.color} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleLabel, { color: colors.text }]}>{role.label}</Text>
              <Text style={[styles.roleDesc, { color: colors.textMuted }]}>{role.description}</Text>
            </View>
            {selectedRole === role.value && (
              <Ionicons name="checkmark-circle" size={24} color={role.color} />
            )}
          </TouchableOpacity>
        ))}

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Role</Text>
            <View style={[styles.summaryBadge, { backgroundColor: selectedRoleConfig?.color + '20' }]}>
              <Ionicons name={selectedRoleConfig?.icon || 'person'} size={14} color={selectedRoleConfig?.color} />
              <Text style={[styles.summaryBadgeText, { color: selectedRoleConfig?.color }]}>
                {selectedRoleConfig?.label}
              </Text>
            </View>
          </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Expires</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>7 days</Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: isCreating ? colors.muted : '#6366F1', marginTop: 8 }]}
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
  scrollContent: { paddingHorizontal: 20 },

  headerSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 16,
    gap: 12,
  },
  infoBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },

  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 14, letterSpacing: -0.2 },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 14,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  roleDesc: { fontSize: 13 },

  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 20,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  summaryBadgeText: { fontSize: 13, fontWeight: '600' },

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

