import { useAuth } from "@/contexts/AuthContext";
import { useModals } from "@/contexts/ModalContext";
import { useColors } from "@/hooks/ui/useColors";
import { useProfileStore, type ProfileWithOrg } from "@/store/useProfileStore";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";
import { supabase } from "@/lib/supabase";

export interface WorkspaceSwitcherRef {
  open: () => void;
  close: () => void;
}

interface WorkspaceSwitcherBottomSheetProps {
  onSettingsPress?: () => void;
}

// Profile Item Component
interface ProfileItemProps {
  profile: ProfileWithOrg;
  isActive: boolean;
  colors: any;
  onSelect: () => void;
}

function ProfileItem({ profile, isActive, colors, onSelect }: ProfileItemProps) {
  const isPersonal = profile.org?.org_type === 'personal';
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#FFD700';
      case 'admin': return '#FF6B6B';
      case 'instructor': return '#4ECDC4';
      default: return colors.textMuted;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.workspaceItem,
        isActive && styles.workspaceItemActive
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.workspaceItemContent}>
        {/* Icon */}
        <View style={[
          styles.workspaceIcon,
          { backgroundColor: isPersonal ? `${colors.primary}20` : `${getRoleColor(profile.role)}20` }
        ]}>
          <Ionicons
            name={isPersonal ? 'person' : 'business'}
            size={20}
            color={isPersonal ? colors.primary : getRoleColor(profile.role)}
          />
        </View>

        {/* Details */}
        <View style={styles.workspaceDetails}>
          <Text style={[
            styles.workspaceName,
            { color: colors.text },
            isActive && styles.workspaceNameActive
          ]}>
            {profile.org?.name || 'Unknown Org'}
          </Text>
          <View style={styles.workspaceMeta}>
            <View style={[
              styles.roleBadge,
              { backgroundColor: `${getRoleColor(profile.role)}20` }
            ]}>
              <Text style={[
                styles.roleBadgeText,
                { color: getRoleColor(profile.role) }
              ]}>
                {profile.role}
              </Text>
            </View>
          </View>
        </View>

        {/* Active Indicator */}
        {isActive && (
          <View style={[styles.checkmarkContainer, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * PROFILE-BASED WORKSPACE SWITCHER
 * 
 * Model: Multiple profiles per user, one per org
 * - Shows all user's profiles
 * - Each profile = identity in an organization
 * - Switch between profiles to change context
 */
export const WorkspaceSwitcherBottomSheet = forwardRef<WorkspaceSwitcherRef, WorkspaceSwitcherBottomSheetProps>(
  (props, ref) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BaseBottomSheetRef>(null);
    const createSheetRef = useRef<BaseBottomSheetRef>(null);
    const { acceptInviteSheetRef, setOnInviteAccepted } = useModals();
    
    const { activeProfileId, switchProfile } = useAuth();
    const { profiles, activeProfile, loadProfiles, loading } = useProfileStore();

    const [orgName, setOrgName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    
    // Load profiles on mount
    useEffect(() => {
      loadProfiles();
    }, [loadProfiles]);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.open(),
      close: () => bottomSheetRef.current?.close(),
    }));

    // Group profiles: Personal first, then organizations
    const groupedProfiles = useMemo(() => {
      const personalProfiles = profiles.filter(p => p.org?.org_type === 'personal');
      const orgProfiles = profiles.filter(p => p.org?.org_type === 'organization');

      return {
        personalProfiles,
        orgProfiles
      };
    }, [profiles]);

    const handleSelectProfile = useCallback(async (profile: ProfileWithOrg) => {
      try {
        await switchProfile(profile.id);
        bottomSheetRef.current?.close();
      } catch (error: any) {
        console.error("Failed to switch profile:", error);
        Alert.alert("Error", "Failed to switch profile");
      }
    }, [switchProfile]);

    const handleOpenCreateOrg = useCallback(() => {
      setOrgName("");
      createSheetRef.current?.open();
    }, []);

    const handleCreateOrg = useCallback(async () => {
      if (!orgName.trim()) {
        Alert.alert("Error", "Please enter an organization name");
        return;
      }

      setIsCreating(true);
      try {
        // Create new org using RPC
        const { data, error } = await supabase.rpc('create_org_workspace', {
          p_name: orgName.trim(),
          p_description: null
        });

        if (error) throw error;
        
        // Reload profiles to show the new one
        await loadProfiles();
        
        // Find the new profile and switch to it
        const newProfile = profiles.find(p => p.org_id === data[0].id);
        if (newProfile) {
          await switchProfile(newProfile.id);
        }
        
        setOrgName("");
        createSheetRef.current?.close();
        bottomSheetRef.current?.close();
        
        Alert.alert("Success", `Organization "${data[0].name}" created!`);
      } catch (error: any) {
        console.error("Failed to create organization:", error);
        Alert.alert("Error", "Failed to create organization");
      } finally {
        setIsCreating(false);
      }
    }, [orgName, switchProfile, loadProfiles, profiles]);

    const handleJoinOrg = useCallback(() => {
      // Close this sheet and open the accept invite sheet
      bottomSheetRef.current?.close();
      
      // Set callback to reload profiles when invite is accepted
      setOnInviteAccepted(() => async () => {
        await loadProfiles();
      });
      
      // Open the accept invite sheet
      setTimeout(() => {
        acceptInviteSheetRef.current?.open();
      }, 300);
    }, [acceptInviteSheetRef, setOnInviteAccepted, loadProfiles]);

    return (
      <>
        {/* Main Workspace Switcher */}
        <BaseBottomSheet
      
          ref={bottomSheetRef}

          snapPoints={['60%','92%']}
          enableDynamicSizing={false}
        >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.headerContent}>
                  <Text style={[styles.title, { color: colors.text }]}>Profiles</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#FF6B351A' }]}>
                    <Text style={[styles.countBadgeText, { color: '#FF6B35' }]}>
                      {profiles.length}
                    </Text>
                  </View>
                </View>
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={[styles.joinButtonSmall, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handleJoinOrg}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="enter" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={handleOpenCreateOrg}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={20} color={colors.background} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Switch between your organizations
              </Text>
            </View>

            {/* Personal Profile Section */}
            {groupedProfiles.personalProfiles.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Personal</Text>
                </View>
                {groupedProfiles.personalProfiles.map((profile) => (
                  <ProfileItem
                    key={profile.id}
                    profile={profile}
                    isActive={profile.id === activeProfileId}
                    colors={colors}
                    onSelect={() => handleSelectProfile(profile)}
                  />
                ))}
              </View>
            )}

            {/* Organization Profiles Section */}
            {groupedProfiles.orgProfiles.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    Organizations
                  </Text>
                </View>
                {groupedProfiles.orgProfiles.map((profile) => (
                  <ProfileItem
                    key={profile.id}
                    profile={profile}
                    isActive={profile.id === activeProfileId}
                    colors={colors}
                    onSelect={() => handleSelectProfile(profile)}
                  />
                ))}
              </View>
            )}

            {/* Empty state */}
            {profiles.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
                  <Ionicons name="person-outline" size={48} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {loading ? "Loading profiles..." : "No Profiles Yet"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Join an organization or create one to get started
                </Text>
              </View>
            )}

        </BaseBottomSheet>

        {/* Create Workspace Modal */}
        <BaseBottomSheet
          snapPoints={['90%']}
          ref={createSheetRef}

          enableDynamicSizing={false}
        >
            <View style={styles.createHeader}>
              <View style={[styles.createIcon, { backgroundColor: colors.primary + '1A' }]}>
                <Ionicons name="business" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.createTitle, { color: colors.text }]}>
                Create Organization
              </Text>
              <Text style={[styles.createSubtitle, { color: colors.textMuted }]}>
                Set up a new organization for your team
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Organization Name</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. Alpha Team Training Hub"
                  placeholderTextColor={colors.textMuted + 'CC'}
                  value={orgName}
                  onChangeText={setOrgName}
                  returnKeyType="done"
                  onSubmitEditing={handleCreateOrg}
                />
              </View>
              <Text style={[styles.inputHint, { color: colors.textMuted }]}>
                Choose a memorable name for your organization
              </Text>
            </View>

            <View style={styles.createActions}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: (!orgName.trim() || isCreating) ? colors.primary : colors.primaryForeground,
                    shadowColor: (!orgName.trim() || isCreating) ? 'transparent' : colors.primary
                  },
                  (!orgName.trim() || isCreating) && styles.primaryButtonDisabled
                ]}
                onPress={handleCreateOrg}
                disabled={!orgName.trim() || isCreating}
                activeOpacity={0.8}
              >
                <View style={styles.primaryButtonContent}>
                  <Ionicons name="add" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.primaryButtonText, { color: '#fff' }]}>
                    {isCreating ? "Creating..." : "Create Organization"}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  setOrgName("");
                  createSheetRef.current?.close();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
        </BaseBottomSheet>
      </>
    );
  }
);

WorkspaceSwitcherBottomSheet.displayName = 'WorkspaceSwitcherBottomSheet';

const styles = StyleSheet.create({

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  joinButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: -0.2,
  },

  // Sections
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.8,
  },

  // Workspace Items
  workspaceItem: {
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  workspaceItemActive: {
    backgroundColor: 'rgba(231, 105, 37, 0.08)',
  },
  workspaceItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  workspaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  workspaceDetails: {
    flex: 1,
    gap: 2,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  workspaceNameActive: {
    fontWeight: "600",
  },
  workspaceMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeOwner: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
    letterSpacing: -0.1,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
    letterSpacing: -0.1,
  },
  createHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: "center",
  },
  createIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  createTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  createSubtitle: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 20,
    letterSpacing: -0.1,
  },

  // Input
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: '#1c1c1e',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.2)',
    backgroundColor: '#f2f2f7',
    overflow: "hidden",
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },
  inputHint: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
    letterSpacing: -0.1,
  },

  // Create Actions
  createActions: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 20,
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
  secondaryButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
});
