/**
 * WORKSPACE/ORG SERVICE (Multi-Profile Architecture)
 * 
 * In the new architecture:
 * - Workspaces are now called "orgs"
 * - Users have profiles (one per org)
 * - Use useProfileStore for most operations
 */

import { supabase } from "@/lib/supabase";
import { AuthenticatedClient } from "./authenticatedClient";

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

export interface Profile {
  id: string;
  user_id: string;
  org_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'instructor' | 'member';
  status: string;
  created_at: string;
}

/**
 * Get all orgs user has access to (via their profiles)
 */
export async function getAccessibleOrgs(): Promise<Org[]> {
  const client = await AuthenticatedClient.getClient();
  const context = await AuthenticatedClient.getContext();
  
  const { data, error } = await client
    .from('profiles')
    .select('org:orgs(*)')
    .eq('user_id', context.userId)
    .eq('status', 'active');

  if (error) throw error;
  
  return (data || []).map((item: any) => item.org).filter(Boolean);
}

/**
 * Create a new organization
 */
export async function createOrgWorkspace(input: {
  name: string;
  description?: string;
}): Promise<Org> {
  const { data, error } = await supabase.rpc('create_org_workspace', {
    p_name: input.name,
    p_description: input.description || null,
  });

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Failed to create organization");

  return data[0];
}

/**
 * Get org members (profiles in an org)
 */
export async function getOrgMembers(orgId: string): Promise<Profile[]> {
  const { data, error } = await supabase.rpc('get_org_members', {
    p_org_id: orgId
  });

  if (error) throw error;
  
  return (data || []).map((row: any) => ({
    id: row.profile_id,
    user_id: row.user_id,
    org_id: orgId,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    role: row.role,
    status: row.status,
    created_at: row.joined_at,
  }));
}

/**
 * Update org details
 */
export async function updateOrg(
  orgId: string,
  updates: {
    name?: string;
    description?: string;
    avatar_url?: string;
  }
): Promise<Org> {
  const client = await AuthenticatedClient.getClient();
  
  const { data, error } = await client
    .from('orgs')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update profile in an org
 */
export async function updateProfile(
  profileId: string,
  updates: {
    display_name?: string;
    avatar_url?: string;
    preferences?: Record<string, any>;
  }
): Promise<Profile> {
  const client = await AuthenticatedClient.getClient();
  
  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if user is org admin
 */
export async function isOrgAdmin(orgId: string): Promise<boolean> {
  const client = await AuthenticatedClient.getClient();
  const context = await AuthenticatedClient.getContext();
  
  const { data } = await client
    .from('profiles')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', context.userId)
    .eq('status', 'active')
    .single();

  return data?.role === 'owner' || data?.role === 'admin';
}

// =====================================================
// LEGACY COMPATIBILITY (for old code still using these)
// =====================================================

// Alias for backwards compatibility
export const getMyWorkspace = async () => {
  const { data } = await supabase.rpc('get_my_profiles');
  const personalProfile = (data || []).find((p: any) => p.org_type === 'personal');
  return personalProfile ? {
    id: personalProfile.org_id,
    workspace_name: personalProfile.org_name,
    workspace_type: 'personal'
  } : null;
};

export const updateMyWorkspace = async (input: any) => {
  const context = await AuthenticatedClient.getContext();
  return updateProfile(context.profileId!, {
    display_name: input.full_name || input.workspace_name,
    avatar_url: input.avatar_url
  });
};

export const getAccessibleWorkspaces = async () => {
  return getAccessibleOrgs();
};

export const getWorkspaceMembers = async (orgId: string) => {
  return getOrgMembers(orgId);
};
