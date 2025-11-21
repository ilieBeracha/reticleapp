import { useAuth } from "@/contexts/AuthContext";
import { useProfileStore, type Org, type ProfileWithOrg } from "@/store/useProfileStore";
import { useRouter } from "expo-router";
import { useMemo } from "react";

export interface ProfileContext {
  // User (global auth identity)
  userId: string | null;
  email: string | null;
  
  // Active Profile (current org context)
  activeProfile: ProfileWithOrg | null;
  activeProfileId: string | null;
  
  // Current Org
  currentOrg: Org | null;
  currentOrgId: string | null;
  isPersonalOrg: boolean;
  isOrgWorkspace: boolean;
  
  // User's role in current org
  myRole: 'owner' | 'admin' | 'instructor' | 'member' | null;
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  
  // All user's profiles
  profiles: ProfileWithOrg[];
  
  // Actions
  switchProfile: (profileId: string) => Promise<void>;
  
  // Loading states
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * ✨ PROFILE-BASED CONTEXT ✨
 * 
 * Use this hook to get user and organization context
 * based on the multi-profile architecture.
 * 
 * Key Concepts:
 * - user: Global auth identity (can have multiple profiles)
 * - profile: User's identity within an organization
 * - org: The organization/workspace
 * 
 * Example:
 * ```
 * const { activeProfile, currentOrg, myRole, isOwner } = useProfileContext()
 * ```
 */
export function useProfileContext(): ProfileContext {
  const { user, activeProfileId, switchProfile: authSwitchProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { 
    activeProfile,
    profiles, 
    loading: profilesLoading 
  } = useProfileStore();

  // Calculate derived values with memoization
  const context = useMemo<ProfileContext>(() => {
    if (!user) {
      return {
        userId: null,
        email: null,
        activeProfile: null,
        activeProfileId: null,
        currentOrg: null,
        currentOrgId: null,
        isPersonalOrg: false,
        isOrgWorkspace: false,
        myRole: null,
        isOwner: false,
        isAdmin: false,
        canManageMembers: false,
        profiles: [],
        switchProfile: async () => {},
        loading: authLoading,
        isAuthenticated: false,
      };
    }

    const currentOrg = activeProfile?.org || null;
    const isPersonalOrg = currentOrg?.org_type === 'personal';
    const isOrgWorkspace = currentOrg?.org_type === 'organization';
    const myRole = activeProfile?.role || null;
    const isOwner = myRole === 'owner';
    const isAdmin = myRole === 'admin' || isOwner;
    const canManageMembers = isAdmin;

    return {
      // User
      userId: user.id,
      email: user.email ?? null,
      
      // Active Profile
      activeProfile,
      activeProfileId: activeProfile?.id || null,
      
      // Current Org
      currentOrg,
      currentOrgId: currentOrg?.id || null,
      isPersonalOrg,
      isOrgWorkspace,
      
      // Permissions
      myRole,
      isOwner,
      isAdmin,
      canManageMembers,
      
      // All profiles
      profiles,
      
      // Actions
      switchProfile: async (profileId: string) => {
        await authSwitchProfile(profileId);
        
        // Find the profile to determine navigation
        const targetProfile = profiles.find(p => p.id === profileId);
        if (!targetProfile) return;
        
        const targetRoute = targetProfile.org?.org_type === 'personal'
          ? '/(protected)/workspace/personal'
          : '/(protected)/workspace/organization';
        
        router.replace(targetRoute);
      },
      
      // Loading
      loading: authLoading || profilesLoading,
      isAuthenticated: true,
    };
  }, [
    user,
    activeProfile,
    activeProfileId,
    profiles,
    authLoading,
    profilesLoading,
    authSwitchProfile,
    router
  ]);

  return context;
}

