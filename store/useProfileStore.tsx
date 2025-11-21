// store/useProfileStore.ts
import { supabase } from "@/lib/supabase";
import { create } from "zustand";

export interface Profile {
  id: string;
  user_id: string;
  org_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'instructor' | 'member';
  preferences: Record<string, any>;
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string | null;
  org_type: 'personal' | 'organization';
  description: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithOrg extends Profile {
  org?: Org;
}

export interface OrgMember extends Profile {
  // Profile already contains all needed fields
}

interface ProfileStore {
  // Current active profile
  activeProfile: ProfileWithOrg | null;
  
  // All user's profiles
  profiles: ProfileWithOrg[];
  
  // Members of current org (if viewing org)
  orgMembers: OrgMember[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  loadProfiles: () => Promise<void>;
  setActiveProfile: (profileId: string) => Promise<void>;
  loadOrgMembers: (orgId: string) => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  reset: () => void;
}

/**
 * ✨ MULTI-PROFILE STORE ✨
 * 
 * Manages user profiles across multiple organizations
 * - Each user can have multiple profiles (one per org)
 * - Active profile determines current context
 * - Profiles are scoped to organizations
 */
export const useProfileStore = create<ProfileStore>((set, get) => ({
  activeProfile: null,
  profiles: [],
  orgMembers: [],
  loading: true,
  error: null,

  /**
   * Load all profiles for the current user
   * Uses RPC to bypass RLS and avoid recursion
   */
  loadProfiles: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ loading: false, profiles: [], activeProfile: null });
        return;
      }
      
      // Use RPC function to get profiles (bypasses RLS, no recursion!)
      const { data: profilesData, error: profilesError } = await supabase
        .rpc('get_my_profiles');
      
      if (profilesError) throw profilesError;
      
      // Transform RPC result to match ProfileWithOrg interface
      const profiles: ProfileWithOrg[] = (profilesData || []).map((p: any) => ({
        id: p.profile_id,
        user_id: user.id,
        org_id: p.org_id,
        display_name: p.display_name,
        avatar_url: null,
        role: p.role,
        preferences: {},
        status: p.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        org: {
          id: p.org_id,
          name: p.org_name,
          slug: p.org_slug,
          org_type: p.org_type,
          description: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }));
      
      // Get active profile from user metadata
      const activeProfileId = user.user_metadata?.active_profile_id;
      const activeProfile = profiles.find(p => p.id === activeProfileId) || null;
      
      set({
        profiles,
        activeProfile,
        loading: false,
      });
    } catch (error: any) {
      console.error("Failed to load profiles:", error);
      set({ 
        error: error.message, 
        loading: false,
        profiles: [],
        activeProfile: null
      });
    }
  },

  /**
   * Set the active profile
   */
  setActiveProfile: async (profileId: string) => {
    try {
      const { profiles } = get();
      const profile = profiles.find(p => p.id === profileId);
      
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { active_profile_id: profileId }
      });
      
      if (error) throw error;
      
      set({ activeProfile: profile });
    } catch (error: any) {
      console.error("Failed to set active profile:", error);
      throw error;
    }
  },

  /**
   * Load members of an organization
   * Uses RPC to bypass RLS
   */
  loadOrgMembers: async (orgId: string) => {
    try {
      const { data: membersData, error } = await supabase
        .rpc('get_org_members', { p_org_id: orgId });
      
      if (error) throw error;
      
      // Transform RPC result
      const members: OrgMember[] = (membersData || []).map((m: any) => ({
        id: m.profile_id,
        user_id: m.user_id,
        org_id: orgId,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
        role: m.role,
        preferences: {},
        status: m.status,
        created_at: m.joined_at,
        updated_at: m.joined_at,
      }));
      
      set({ orgMembers: members });
    } catch (error: any) {
      console.error('Failed to load org members:', error);
      set({ orgMembers: [] });
    }
  },

  /**
   * Update a profile
   */
  updateProfile: async (profileId: string, updates: Partial<Profile>) => {
    try {
      set({ loading: true, error: null });
      
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select(`
          *,
          org:orgs(*)
        `)
        .single();
      
      if (error) throw error;
      
      // Update in profiles list
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.id === profileId ? (updated as ProfileWithOrg) : p
        ),
        activeProfile: state.activeProfile?.id === profileId 
          ? (updated as ProfileWithOrg)
          : state.activeProfile,
        loading: false,
      }));
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Reset store (on logout)
   */
  reset: () => {
    set({
      activeProfile: null,
      profiles: [],
      orgMembers: [],
      loading: false,
      error: null,
    });
  },
}));

