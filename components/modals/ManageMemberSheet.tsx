/**
 * ManageMemberSheet - Simplified for Multi-Profile Architecture
 * Manages profile roles within an organization
 */

import { BaseBottomSheet, type BaseBottomSheetRef } from '@/components/modals/BaseBottomSheet';
import { useColors } from '@/hooks/ui/useColors';
import { useProfileContext } from '@/hooks/useProfileContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Profile {
  id: string;
  display_name: string | null;
  role: string;
  avatar_url: string | null;
}

export interface ManageMemberSheetRef {
  open: (profile: Profile) => void;
  close: () => void;
}

interface ManageMemberSheetProps {
  onMemberUpdated?: () => void;
}

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member', icon: 'person' as const, color: '#6B8FA3' },
  { value: 'instructor', label: 'Instructor', icon: 'school' as const, color: '#E76925' },
  { value: 'admin', label: 'Admin', icon: 'shield-half' as const, color: '#5B7A8C' },
];

export const ManageMemberSheet = forwardRef<ManageMemberSheetRef, ManageMemberSheetProps>(
  ({ onMemberUpdated }, ref) => {
    const colors = useColors();
    const { currentOrgId, isOwner } = useProfileContext();
    const sheetRef = useRef<BaseBottomSheetRef>(null);
    
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('member');
    const [isUpdating, setIsUpdating] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (memberProfile: Profile) => {
        setProfile(memberProfile);
        setSelectedRole(memberProfile.role);
        sheetRef.current?.open();
      },
      close: () => {
        sheetRef.current?.close();
      },
    }));

    const handleUpdateRole = async () => {
      if (!profile || !currentOrgId) return;

      setIsUpdating(true);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const { error } = await supabase
          .from('profiles')
          .update({ role: selectedRole })
          .eq('id', profile.id);

        if (error) throw error;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        sheetRef.current?.close();
        onMemberUpdated?.();
        
        setTimeout(() => {
          Alert.alert("Success", "Member role updated");
        }, 300);
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error("Failed to update member:", error);
        Alert.alert("Error", error.message || "Failed to update member");
      } finally {
        setIsUpdating(false);
      }
    };

    const handleRemoveMember = async () => {
      if (!profile || !currentOrgId) return;

      Alert.alert(
        "Remove Member",
        `Are you sure you want to remove ${profile.display_name || 'this member'} from the organization?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from('profiles')
                  .delete()
                  .eq('id', profile.id);

                if (error) throw error;

                sheetRef.current?.close();
                onMemberUpdated?.();
                
                Alert.alert("Success", "Member removed");
              } catch (error: any) {
                console.error("Failed to remove member:", error);
                Alert.alert("Error", "Failed to remove member");
              }
            },
          },
        ]
      );
    };

    if (!profile) return null;

    return (
      <BaseBottomSheet ref={sheetRef} snapPoints={['70%']}>
        <BottomSheetScrollView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.avatarContainer, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {profile.display_name || 'Member'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Current Role: {profile.role}
            </Text>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Role</Text>
            <View style={styles.roleList}>
              {ROLE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: selectedRole === option.value ? option.color : colors.border,
                      borderWidth: selectedRole === option.value ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedRole(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.roleIcon, { backgroundColor: `${option.color}20` }]}>
                    <Ionicons name={option.icon} size={20} color={option.color} />
                  </View>
                  <Text style={[styles.roleLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                  {selectedRole === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color={option.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdateRole}
              disabled={isUpdating || selectedRole === profile.role}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>
                {isUpdating ? "Updating..." : "Update Role"}
              </Text>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: `${colors.destructive}20` }]}
                onPress={handleRemoveMember}
                activeOpacity={0.8}
              >
                <Ionicons name="trash" size={18} color={colors.destructive} />
                <Text style={[styles.removeButtonText, { color: colors.destructive }]}>
                  Remove from Organization
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </BottomSheetScrollView>
      </BaseBottomSheet>
    );
  }
);

ManageMemberSheet.displayName = 'ManageMemberSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: "center",
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  roleList: {
    gap: 12,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  roleLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  updateButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
