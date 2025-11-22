// contexts/ProfileContext.tsx
import { supabase } from '@/lib/supabase';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

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
  // Team membership (simplified - profile can only be in ONE team)
  team_id: string | null;
  team_role: 'commander' | 'squad_commander' | 'soldier' | null;
  squad_id: string | null;
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
  org: Org;
}

export interface OrgSession {
  id: string;
  org_id: string;
  profile_id: string;
  team_id: string | null;
  session_mode: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  org_name?: string;
  team_name?: string;
  profile_role?: string; // For aggregated view
}

export interface OrgTeam {
  id: string;
  org_id: string;
  name: string;
  team_type?: string;
  member_count: number;
  squads?: string[];
}

export interface OrgMember {
  id: string;
  display_name: string | null;
  role: string;
  status: string;
  created_at: string;
}

interface ProfileContextType {
  // All user's profiles
  allProfiles: ProfileWithOrg[];
  
  // Active Profile (for org workspaces)
  activeProfile: ProfileWithOrg | null;
  
  // Derived from active profile
  currentOrg: Org | null;
  myRole: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  isPersonalOrg: boolean;
  
  // Active profile's org data
  orgSessions: OrgSession[];
  orgTeams: OrgTeam[];
  orgMembers: OrgMember[];
  
  // Aggregated data (for personal command center)
  allSessionsAcrossOrgs: OrgSession[];
  allTeamsAcrossOrgs: OrgTeam[];
  allMembersAcrossOrgs: OrgMember[];
  
  // Loading states
  loading: boolean;
  loadingAggregated: boolean;
  
  // Actions
  loadOrgData: (profile?: ProfileWithOrg) => Promise<void>;
  loadAllData: () => Promise<void>; // For personal command center
  createOrgSession: (params: any) => Promise<void>;
  
  // Profile management
  switchToProfile: (profileId: string, skipNavigation?: boolean) => Promise<void>;
  reloadProfiles: () => Promise<void>;
  refreshOrgMembers: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * ✨ PROFILE CONTEXT ✨
 * 
 * This is the MAIN context of the app!
 * - Profile = The active user identity
 * - All org data flows through the active profile
 * - Profile switching = complete app transformation
 * 
 * AuthContext = Just login/logout
 * ProfileContext = Everything else!
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, activeProfileId, switchProfile: authSwitchProfile } = useAuth()
  
  // Profiles
  const [allProfiles, setAllProfiles] = useState<ProfileWithOrg[]>([])
  const [activeProfile, setActiveProfile] = useState<ProfileWithOrg | null>(null)
  
  // Active org data (for specific org workspaces)
  const [orgSessions, setOrgSessions] = useState<OrgSession[]>([])
  const [orgTeams, setOrgTeams] = useState<OrgTeam[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  
  // Aggregated data (for personal command center)
  const [allSessionsAcrossOrgs, setAllSessionsAcrossOrgs] = useState<OrgSession[]>([])
  const [allTeamsAcrossOrgs, setAllTeamsAcrossOrgs] = useState<OrgTeam[]>([])
  const [allMembersAcrossOrgs, setAllMembersAcrossOrgs] = useState<OrgMember[]>([])
  
  const [loading, setLoading] = useState(true)
  const [loadingAggregated, setLoadingAggregated] = useState(false)
  const [switchingProfile, setSwitchingProfile] = useState(false)

  // Direct org data loading function (no dependencies to avoid circular loops)
  const loadOrgDataDirect = async (targetProfile: ProfileWithOrg) => {
    if (!targetProfile) return
    
    try {
      console.log('📊 Loading org data for:', targetProfile.org.name)
      
      // Clear old data
      setOrgSessions([])
      setOrgTeams([])
      setOrgMembers([])
      
      // Load sessions for this org/profile
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('profile_id', targetProfile.id)
        .order('started_at', { ascending: false })
      
      if (!sessionsError && sessionsData) {
        setOrgSessions(sessionsData.map((s: any) => ({
          id: s.id,
          org_id: s.org_id,
          profile_id: s.profile_id,
          team_id: s.team_id,
          session_mode: s.session_mode,
          status: s.status,
          started_at: s.started_at,
          ended_at: s.ended_at,
        })))
      }
      
      // Load teams for this org
      const { data: teamsData, error: teamsError } = await supabase
        .rpc('get_org_teams', { p_org_id: targetProfile.org_id })
      
      if (!teamsError && teamsData) {
        setOrgTeams(teamsData.map((t: any) => ({
          id: t.team_id,
          org_id: targetProfile.org_id,
          name: t.team_name,
          team_type: t.team_type,
          member_count: parseInt(t.member_count) || 0,
          squads: t.squads || [],
        })))
      }
      
      // Load org members
      if (targetProfile.org.org_type === 'organization') {
        console.log('👥 Loading members for org:', targetProfile.org.name);
        const { data: membersData, error: membersError } = await supabase
          .rpc('get_org_members', { p_org_id: targetProfile.org_id })
        
        if (membersError) {
          console.error('❌ Failed to load org members:', membersError);
        } else if (membersData) {
          console.log('✅ Loaded org members:', membersData.length, 'members');
          setOrgMembers(membersData.map((m: any) => ({
            id: m.profile_id,
            display_name: m.display_name || 'Unnamed User',
            role: m.role,
            status: m.status,
            created_at: m.joined_at,
          })))
        } else {
          console.log('⚠️ No members data returned');
          setOrgMembers([]);
        }
      } else {
        // Clear members for personal orgs
        setOrgMembers([]);
      }
      
      console.log('✅ Org data loaded:', {
        sessions: sessionsData?.length || 0,
        teams: teamsData?.length || 0,
        members: targetProfile.org.org_type === 'organization' ? 'loaded' : 'N/A (personal)'
      })
      
    } catch (error: any) {
      console.error('Failed to load org data:', error)
    }
  }

  const loadOrgData = useCallback(async (profile?: ProfileWithOrg) => {
    // Always require profile parameter to avoid circular dependencies
    if (!profile) {
      console.warn('loadOrgData called without profile parameter')
      return
    }
    
    // Use direct method to avoid circular dependencies
    await loadOrgDataDirect(profile)
  }, []) // No dependencies to break circular loops

  const loadProfiles = useCallback(async () => {
    if (!user) return
    
    try {
      console.log('📋 Loading profiles for user:', user.id)
      
      // Get all profiles via RPC
      const { data: profilesData, error } = await supabase.rpc('get_my_profiles')
      console.log('📋 Profiles data:', { profilesData })
      console.log('📋 Error:', error)
      if (error) throw error
      
      // Transform to ProfileWithOrg
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
      }))
      
      setAllProfiles(profiles)
      console.log('📋 All profiles loaded:', { profiles })
      
      // Only set active profile if we're not in the middle of a manual switch
      if (!switchingProfile) {
        const active = profiles.find(p => p.id === activeProfileId)
        if (active) {
          setActiveProfile(active)
          console.log('👤 Active profile set from auth:', active.org.name, '- Role:', active.role)
          
          // Load org data for this profile directly (not via callback to break circular dependency)
          loadOrgDataDirect(active)
        }
      }
      
      setLoading(false)
    } catch (error: any) {
      console.error('Failed to load profiles:', error)
      setLoading(false)
    }
  }, [user, activeProfileId, switchingProfile]) // Remove loadOrgData dependency

  // Load profiles when user or activeProfileId changes
  // But skip if we're in the middle of a manual profile switch
  useEffect(() => {
    if (user && activeProfileId && !switchingProfile) {
      console.log('🔄 AUTH: Auth state changed, loading profiles for:', activeProfileId)
      loadProfiles()
    }
  }, [user?.id, activeProfileId, switchingProfile, loadProfiles])

  const createOrgSession = async (params: any) => {
    if (!activeProfile) return
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        org_id: activeProfile.org_id,
        profile_id: activeProfile.id,
        user_id: user!.id,
        team_id: params.team_id || null,
        session_mode: params.session_mode || 'solo',
        session_data: params.session_data || {},
        status: 'active'
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Add to local state
    const newSession: OrgSession = {
      id: data.id,
      org_id: data.org_id,
      profile_id: data.profile_id,
      team_id: data.team_id,
      session_mode: data.session_mode,
      status: data.status,
      started_at: data.started_at,
      ended_at: data.ended_at,
    }
    
    setOrgSessions(prev => [newSession, ...prev])
  }

  const loadAllData = useCallback(async () => {
    if (!allProfiles.length) return
    
    setLoadingAggregated(true)
    try {
      console.log('📊 Loading aggregated data from ALL profiles')
      
      // Load sessions from all profiles
      const sessionsPromises = allProfiles.map(async (profile) => {
        const { data } = await supabase
          .from('sessions')
          .select('*')
          .eq('profile_id', profile.id)
          .order('started_at', { ascending: false })
        
        return (data || []).map(s => ({
          id: s.id,
          org_id: s.org_id,
          profile_id: s.profile_id,
          team_id: s.team_id,
          session_mode: s.session_mode,
          status: s.status,
          started_at: s.started_at,
          ended_at: s.ended_at,
          org_name: profile.org.name,
          profile_role: profile.role,
        }))
      })
      
      const allSessionResults = await Promise.all(sessionsPromises)
      const combinedSessions = allSessionResults.flat()
      
      setAllSessionsAcrossOrgs(combinedSessions)
      
      console.log('✅ Aggregated data loaded:', {
        totalSessions: combinedSessions.length,
        fromProfiles: allProfiles.length
      })
      
    } catch (error: any) {
      console.error('Failed to load aggregated data:', error)
    } finally {
      setLoadingAggregated(false)
    }
  }, [allProfiles]) // Stable dependency

  const switchToProfile = useCallback(async (profileId: string, skipNavigation: boolean = false) => {
    console.log('🔄 PROFILE: Manual switch to:', profileId)
    
    // Prevent switching to same profile
    if (activeProfile?.id === profileId) {
      console.log('⏭️ Already on this profile, skipping')
      return
    }
    
    // Set flag to prevent useEffect from loading profiles during manual switch
    setSwitchingProfile(true)
    
    try {
      // Find the profile
      const profile = allProfiles.find(p => p.id === profileId)
      if (profile) {
        console.log('✅ PROFILE: Setting active profile:', profile.org.name)
        setActiveProfile(profile)
        
        // Load data for this specific profile using direct method
        console.log('📊 PROFILE: Loading data for switched profile')
        await loadOrgDataDirect(profile)
        
        // Update auth context with skipNavigation flag to prevent unwanted redirects
        await authSwitchProfile(profileId, skipNavigation)
        
        console.log('✅ PROFILE: Switch complete!')
      }
    } catch (error) {
      console.error('❌ PROFILE: Switch failed:', error)
    } finally {
      // Reset flag after switch is complete
      setSwitchingProfile(false)
    }
  }, [allProfiles, activeProfile?.id, authSwitchProfile]) // Remove loadOrgData dependency

  const reloadProfiles = useCallback(async () => {
    await loadProfiles()
  }, [loadProfiles]) // Expose loadProfiles as reloadProfiles for external use

  const refreshOrgMembers = useCallback(async () => {
    if (!activeProfile || activeProfile.org.org_type !== 'organization') {
      console.log('⚠️ Cannot refresh members - no active org profile');
      return;
    }
    
    try {
      console.log('🔄 Manually refreshing org members for:', activeProfile.org.name);
      
      const { data: membersData, error: membersError } = await supabase
        .rpc('get_org_members', { p_org_id: activeProfile.org_id })
      
      if (membersError) {
        console.error('❌ Failed to refresh org members:', membersError);
      } else if (membersData) {
        console.log('✅ Refreshed org members:', membersData.length, 'members');
        setOrgMembers(membersData.map((m: any) => ({
          id: m.profile_id,
          display_name: m.display_name || 'Unnamed User',
          role: m.role,
          status: m.status,
          created_at: m.joined_at,
        })))
      } else {
        console.log('⚠️ No members data returned from refresh');
        setOrgMembers([]);
      }
    } catch (error: any) {
      console.error('❌ Error refreshing org members:', error);
    }
  }, [activeProfile])

  // Derived values
  const currentOrg = activeProfile?.org || null
  const myRole = activeProfile?.role || null
  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin' || isOwner
  const isInstructor = myRole === 'instructor'
  // Owner, admin, and instructor can manage members and create teams
  const canManageMembers = isOwner || isAdmin || isInstructor
  const isPersonalOrg = currentOrg?.org_type === 'personal'

  return (
    <ProfileContext.Provider value={{
      // Profiles
      allProfiles,
      activeProfile,
      
      // Derived from active profile
      currentOrg,
      myRole,
      isOwner,
      isAdmin,
      canManageMembers,
      isPersonalOrg,
      
      // Active profile's org data (for org workspaces)
      orgSessions,
      orgTeams,
      orgMembers,
      
      // Aggregated data (for personal command center)
      allSessionsAcrossOrgs,
      allTeamsAcrossOrgs,
      allMembersAcrossOrgs,
      
      // Loading
      loading,
      loadingAggregated,
      
      // Actions
      loadOrgData,
      loadAllData,
      createOrgSession,
      switchToProfile,
      reloadProfiles,
      refreshOrgMembers,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider")
  return ctx
}
