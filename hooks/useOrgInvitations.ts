import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export interface OrganizationInvitation {
  id: string;
  emailAddress: string;
  role: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: number;
  updatedAt: number;
  organizationId: string;
  invitedBy: string;
  organizationName?: string;
}

export function useOrgInvitations(organizationId?: string) {
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
      const { user } = useAuth();

  const fetchInvitations = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organizations!inner(name, id)
        `)
        .eq('organization_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setError(fetchError.message);
        throw fetchError;
      }

      const transformedData: OrganizationInvitation[] = (data || []).map(inv => ({
        id: inv.id,
        emailAddress: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: new Date(inv.created_at).getTime(),
        updatedAt: new Date(inv.updated_at).getTime(),
        organizationId: inv.organization_id,
        invitedBy: inv.invited_by,
        organizationName: inv.organizations?.name,
      }));

      setInvitations(transformedData);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      setError(error.message || 'Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();

    const channel = supabase
      .channel(`invitations-${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_invitations',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          console.log('Invitation changed, refetching...');
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, user?.id]);

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  const refetch = async () => {
    await fetchInvitations();
  };

  const sendInvitation = async (email: string, role: string, specificOrgId?: string) => {
    const orgIdToUse = specificOrgId || user?.id;
    
    if (!orgIdToUse || !user?.id) {
      throw new Error('Missing required data: organization or user');
    }

    try {
      // Check if user has permission - USING CORRECT COLUMN NAMES
      const { data: membership, error: memberError } = await supabase
        .from('org_memberships')
        .select('role')
        .eq('user_id', user?.id)  // ✅ FIXED: user_id not clerk_user_id
        .eq('org_id', orgIdToUse)  // ✅ FIXED: org_id not organization_id
        .single();

      if (memberError || !membership) {
        throw new Error('You are not a member of this organization');
      }

      if (!['admin', 'owner'].includes(membership.role)) {
        throw new Error('You do not have permission to invite users');
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from('organization_invitations')
        .select('id')
        .eq('organization_id', orgIdToUse)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        throw new Error('An active invitation for this email already exists');
      }

      // Create invitation
      const { data: invitation, error: insertError } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: orgIdToUse,
          email: email,
          role: role,
          status: 'pending',
          invited_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
        body: { 
          to: email, 
          organizationId: orgIdToUse,
          invitationId: invitation.id 
        }
      });

      if (emailError) {
        console.error('Failed to send email:', emailError);
      } 

      await refetch();
      return invitation;
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!user?.id) throw new Error('Not authenticated');

    try {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ 
          status: 'revoked',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;
      await refetch();
    } catch (error: any) {
      console.error('Error revoking invitation:', error);
      throw error;
    }
  };

  return {
    invitations,
    pendingInvitations,
    loading,
    error,
    refetch,
    revokeInvitation,
    sendInvitation,
  };
}