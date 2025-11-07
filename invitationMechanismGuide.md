# Organization Invitation System - Complete Guide

**How invitation mechanism works from end-to-end**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Complete Invitation Flow](#complete-invitation-flow)
3. [Database Schema](#database-schema)
4. [Technical Implementation](#technical-implementation)
5. [User Experience Flows](#user-experience-flows)
6. [Edge Cases & Error Handling](#edge-cases--error-handling)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

### What Is the Invitation System?

The invitation system allows **commanders** to invite external users to join their organizations. It's a secure, email-based invitation flow that:

1. Commander creates invitation with email + role
2. System generates unique invitation code
3. Invitation email sent to invitee
4. Invitee clicks link → auto-joins organization
5. Invitee gains access based on assigned role

### Key Components

```
┌─────────────────────────────────────────┐
│  Invitation Flow Components            │
├─────────────────────────────────────────┤
│  1. Supabase Database                   │
│     └─ invitations table                │
│  2. Invitation Service (API)            │
│     └─ Create, Accept, Expire          │
│  3. Email Delivery (External)           │
│     └─ SendGrid/Resend/etc.            │
│  4. Deep Link Handler                   │
│     └─ Mobile app link handling         │
│  5. Organization Store                  │
│     └─ Auto-add membership              │
└─────────────────────────────────────────┘
```

---

## Complete Invitation Flow

### Step-by-Step Process

```
┌────────────────────────────────────────────────────────────┐
│  PHASE 1: INVITATION CREATION (Commander Side)            │
└────────────────────────────────────────────────────────────┘

👤 Commander                    📱 App                    🗄️ Database
    │                              │                          │
    ├─ Opens "Invite Members"      │                          │
    │                              │                          │
    ├─ Enters:                     │                          │
    │  • Email: john@example.com   │                          │
    │  • Role: "member"            │                          │
    │                              │                          │
    ├─ Taps "Send Invitation" ────▶│                          │
    │                              │                          │
    │                              ├─ Validates inputs        │
    │                              ├─ Checks permissions      │
    │                              │                          │
    │                              ├─ Generate unique code ──▶│
    │                              │  (UUID v4)               │
    │                              │                          │
    │                              ├─ Insert invitation ─────▶│
    │                              │  {                       │
    │                              │    code: "abc123...",    │
    │                              │    email: "john@...",    │
    │                              │    org_id: "org_123",    │
    │                              │    role: "member",       │
    │                              │    invited_by: "user_1", │
    │                              │    status: "pending",    │
    │                              │    expires_at: +7 days   │
    │                              │  }                       │
    │                              │                          │
    │                              ├──────────────────────────┤
    │                              │  Success! Record created │
    │                              │◀─────────────────────────┤
    │                              │                          │
    │                              ├─ Send invitation email   │
    │                              │  (via email service)     │
    │                              │                          │
    │◀─ Shows: "Invitation sent!" ─┤                          │
    │                              │                          │


┌────────────────────────────────────────────────────────────┐
│  PHASE 2: EMAIL DELIVERY                                   │
└────────────────────────────────────────────────────────────┘

📧 Email Service                 📮 Email                  👤 Invitee
    │                              │                          │
    ├─ Receives send request       │                          │
    │                              │                          │
    ├─ Renders email template      │                          │
    │  • Org name: "Alpha Company" │                          │
    │  • Invited by: "Jane Smith"  │                          │
    │  • Role: "Member"            │                          │
    │  • Magic link with code      │                          │
    │                              │                          │
    ├─ Sends email ───────────────▶│                          │
    │                              │                          │
    │                              ├─ Inbox receives ────────▶│
    │                              │                          │
    │                              │                          ├─ Sees email:
    │                              │                          │  "You've been invited
    │                              │                          │   to Alpha Company"
    │                              │                          │


┌────────────────────────────────────────────────────────────┐
│  PHASE 3: INVITATION ACCEPTANCE (Invitee Side)            │
└────────────────────────────────────────────────────────────┘

👤 Invitee                      📱 App/Web                 🗄️ Database
    │                              │                          │
    ├─ Opens email                 │                          │
    │                              │                          │
    ├─ Clicks "Accept Invitation"  │                          │
    │  (deep link URL)             │                          │
    │                              │                          │
    ├─ Link format:                │                          │
    │  reticle://invite?code=abc123│                          │
    │                              │                          │
    ├──────────────────────────────▶│                          │
    │                              │                          │
    │                              ├─ App opens via deep link │
    │                              │                          │
    │                              ├─ Check if user signed in │
    │                              │                          │
    │     ┌────────────────────────┤                          │
    │     │ NOT SIGNED IN          │                          │
    │     └────────────────────────┤                          │
    │                              ├─ Store invite code       │
    │                              │  (AsyncStorage)          │
    │                              │                          │
    │                              ├─ Redirect to sign-in     │
    │                              │                          │
    │◀─ Shows: Sign In screen ─────┤                          │
    │                              │                          │
    ├─ Signs in (Google/Email) ───▶│                          │
    │                              │                          │
    │                              ├─ Retrieve stored code    │
    │                              │                          │
    │     ┌────────────────────────┤                          │
    │     │ ALREADY SIGNED IN      │                          │
    │     └────────────────────────┤                          │
    │                              │                          │
    │                              ├─ Extract code from URL   │
    │                              │                          │
    │                              ├─ Validate invitation ───▶│
    │                              │  • Check code exists     │
    │                              │  • Check not expired     │
    │                              │  • Check status=pending  │
    │                              │                          │
    │                              │◀─ Invitation valid ──────┤
    │                              │                          │
    │                              ├─ Create membership ─────▶│
    │                              │  INSERT INTO             │
    │                              │  org_memberships {       │
    │                              │    user_id: "user_123",  │
    │                              │    org_id: "org_456",    │
    │                              │    role: "member"        │
    │                              │  }                       │
    │                              │                          │
    │                              ├─ Update invitation ─────▶│
    │                              │  UPDATE invitations      │
    │                              │  SET status='accepted',  │
    │                              │      accepted_at=NOW()   │
    │                              │  WHERE code='abc123'     │
    │                              │                          │
    │                              │◀─ Success ───────────────┤
    │                              │                          │
    │                              ├─ Switch to new org       │
    │                              │                          │
    │◀─ Shows: "Welcome to         │                          │
    │   Alpha Company!"            │                          │
    │                              │                          │
    ├─ Now has access to org ─────▶│                          │
    │                              │                          │
```

---

## Database Schema

### Invitations Table

```sql
CREATE TABLE invitations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,  -- Unique invitation code
  
  -- Target information
  email TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('commander', 'member', 'viewer')),
  
  -- Invitation metadata
  invited_by TEXT NOT NULL,  -- User ID who created invitation
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Constraints
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX idx_invitations_code ON invitations(code);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires ON invitations(expires_at);

-- RLS Policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Commanders can view their org's invitations
CREATE POLICY "commanders_view_invitations"
  ON invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT om.org_id
      FROM org_memberships om
      WHERE om.user_id = auth.jwt() ->> 'sub'
      AND om.role = 'commander'
    )
  );

-- Commanders can create invitations
CREATE POLICY "commanders_create_invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.org_id
      FROM org_memberships om
      WHERE om.user_id = auth.jwt() ->> 'sub'
      AND om.role = 'commander'
    )
  );

-- Commanders can cancel invitations
CREATE POLICY "commanders_cancel_invitations"
  ON invitations FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.org_id
      FROM org_memberships om
      WHERE om.user_id = auth.jwt() ->> 'sub'
      AND om.role = 'commander'
    )
  );
```

### Example Invitation Record

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "inv_2NvZj8FqK4xLmPn5",
  "email": "john.doe@example.com",
  "organization_id": "org_abc123",
  "role": "member",
  "invited_by": "user_xyz789",
  "status": "pending",
  "created_at": "2025-11-06T10:30:00Z",
  "accepted_at": null,
  "expires_at": "2025-11-13T10:30:00Z"
}
```

---

## Technical Implementation

### Service Layer

```typescript
// services/invitationService.ts

import { AuthenticatedClient } from "@/lib/authenticatedClient";
import type { Invitation, CreateInvitationInput } from "@/types/database";
import { nanoid } from 'nanoid'; // For generating codes

export class InvitationService {
  
  /**
   * Create new invitation
   * Only commanders can invite
   */
  static async createInvitation(
    input: CreateInvitationInput,
    userId: string
  ): Promise<Invitation> {
    const client = await AuthenticatedClient.getClient();
    
    // Generate unique invitation code
    const code = `inv_${nanoid(16)}`;
    
    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const { data, error } = await client
      .from('invitations')
      .insert({
        code,
        email: input.email.toLowerCase().trim(),
        organization_id: input.organizationId,
        role: input.role,
        invited_by: userId,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create invitation: ${error.message}`);
    
    // Send email (async - don't wait)
    this.sendInvitationEmail(data).catch(err => 
      console.error('Failed to send invitation email:', err)
    );
    
    return data;
  }
  
  /**
   * Validate invitation code
   */
  static async validateInvitation(code: string): Promise<{
    valid: boolean;
    invitation?: Invitation;
    error?: string;
  }> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client
      .from('invitations')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) {
      return { valid: false, error: 'Invitation not found' };
    }
    
    // Check if already accepted
    if (data.status === 'accepted') {
      return { valid: false, error: 'Invitation already accepted' };
    }
    
    // Check if cancelled
    if (data.status === 'cancelled') {
      return { valid: false, error: 'Invitation was cancelled' };
    }
    
    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      // Auto-update status to expired
      await client
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', data.id);
      
      return { valid: false, error: 'Invitation has expired' };
    }
    
    return { valid: true, invitation: data };
  }
  
  /**
   * Accept invitation
   * Creates org membership and updates invitation status
   */
  static async acceptInvitation(
    code: string,
    userId: string
  ): Promise<{ success: boolean; organizationId?: string; error?: string }> {
    const client = await AuthenticatedClient.getClient();
    
    // Validate invitation
    const validation = await this.validateInvitation(code);
    if (!validation.valid || !validation.invitation) {
      return { success: false, error: validation.error };
    }
    
    const invitation = validation.invitation;
    
    // Check if user already member
    const { data: existingMembership } = await client
      .from('org_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('org_id', invitation.organization_id)
      .single();
    
    if (existingMembership) {
      return { success: false, error: 'You are already a member of this organization' };
    }
    
    // Create membership
    const { error: membershipError } = await client
      .from('org_memberships')
      .insert({
        user_id: userId,
        org_id: invitation.organization_id,
        role: invitation.role,
      });
    
    if (membershipError) {
      return { success: false, error: 'Failed to join organization' };
    }
    
    // Update invitation status
    await client
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);
    
    return {
      success: true,
      organizationId: invitation.organization_id,
    };
  }
  
  /**
   * Get pending invitations for an organization
   */
  static async getOrgInvitations(orgId: string): Promise<Invitation[]> {
    const client = await AuthenticatedClient.getClient();
    
    const { data, error } = await client
      .from('invitations')
      .select('*')
      .eq('organization_id', orgId)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get invitations: ${error.message}`);
    return data || [];
  }
  
  /**
   * Cancel invitation
   */
  static async cancelInvitation(invitationId: string): Promise<void> {
    const client = await AuthenticatedClient.getClient();
    
    const { error } = await client
      .from('invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);
    
    if (error) throw new Error(`Failed to cancel invitation: ${error.message}`);
  }
  
  /**
   * Send invitation email
   */
  private static async sendInvitationEmail(invitation: Invitation): Promise<void> {
    // Get org details
    const client = await AuthenticatedClient.getClient();
    const { data: org } = await client
      .from('organizations')
      .select('name')
      .eq('id', invitation.organization_id)
      .single();
    
    // Get inviter details
    const { data: inviter } = await client
      .from('users')
      .select('full_name, email')
      .eq('id', invitation.invited_by)
      .single();
    
    // Construct deep link
    const inviteLink = `reticle://invite?code=${invitation.code}`;
    const webFallback = `https://reticle.app/invite/${invitation.code}`;
    
    // Email payload
    const emailData = {
      to: invitation.email,
      subject: `You've been invited to ${org?.name || 'an organization'} on Reticle`,
      template: 'invitation',
      data: {
        organizationName: org?.name,
        inviterName: inviter?.full_name || inviter?.email,
        role: invitation.role,
        inviteLink,
        webFallback,
        expiresAt: new Date(invitation.expires_at).toLocaleDateString(),
      },
    };
    
    // Send via your email service (SendGrid, Resend, etc.)
    await fetch('https://api.youremailservice.com/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });
  }
  
  /**
   * Resend invitation email
   */
  static async resendInvitation(invitationId: string): Promise<void> {
    const client = await AuthenticatedClient.getClient();
    
    const { data: invitation, error } = await client
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();
    
    if (error) throw new Error('Invitation not found');
    
    // Check if still valid
    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid');
    }
    
    // Resend email
    await this.sendInvitationEmail(invitation);
  }
}
```

### Store Layer

```typescript
// store/invitationStore.ts

import { create } from 'zustand';
import { InvitationService } from '@/services/invitationService';
import type { Invitation } from '@/types/database';

interface InvitationStore {
  invitations: Invitation[];
  loading: boolean;
  error: string | null;
  
  fetchInvitations: (orgId: string) => Promise<void>;
  createInvitation: (input: CreateInvitationInput, userId: string) => Promise<Invitation>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  resendInvitation: (invitationId: string) => Promise<void>;
  acceptInvitation: (code: string, userId: string) => Promise<{ success: boolean; organizationId?: string; error?: string }>;
}

export const useInvitationStore = create<InvitationStore>((set, get) => ({
  invitations: [],
  loading: false,
  error: null,
  
  fetchInvitations: async (orgId: string) => {
    try {
      set({ loading: true, error: null });
      const invitations = await InvitationService.getOrgInvitations(orgId);
      set({ invitations, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  
  createInvitation: async (input, userId) => {
    try {
      set({ loading: true, error: null });
      const invitation = await InvitationService.createInvitation(input, userId);
      
      // Add to list
      set((state) => ({
        invitations: [invitation, ...state.invitations],
        loading: false,
      }));
      
      return invitation;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
  
  cancelInvitation: async (invitationId: string) => {
    try {
      await InvitationService.cancelInvitation(invitationId);
      
      // Remove from list
      set((state) => ({
        invitations: state.invitations.filter(i => i.id !== invitationId),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
  
  resendInvitation: async (invitationId: string) => {
    try {
      await InvitationService.resendInvitation(invitationId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
  
  acceptInvitation: async (code: string, userId: string) => {
    try {
      return await InvitationService.acceptInvitation(code, userId);
    } catch (err: any) {
      throw err;
    }
  },
}));
```

### Deep Link Handler

```typescript
// app/invite.tsx (route for handling invite links)

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useInvitationStore } from '@/store/invitationStore';
import { useOrganizationsStore } from '@/store/organizationsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function InvitePage() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user } = useAuth();
  const { acceptInvitation } = useInvitationStore();
  const { setSelectedOrg, fetchUserOrgs } = useOrganizationsStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    handleInvitation();
  }, [code, user]);

  const handleInvitation = async () => {
    if (!code) {
      setStatus('error');
      setError('Invalid invitation link');
      return;
    }

    // If user not signed in, store code and redirect to sign-in
    if (!user) {
      await AsyncStorage.setItem('pending_invite_code', code);
      router.replace('/auth/sign-in');
      return;
    }

    // User is signed in, accept invitation
    try {
      setStatus('loading');
      const result = await acceptInvitation(code, user.id);
      
      if (!result.success) {
        setStatus('error');
        setError(result.error || 'Failed to accept invitation');
        return;
      }
      
      // Success! Refresh org list and switch to new org
      await fetchUserOrgs(user.id);
      if (result.organizationId) {
        setSelectedOrg(result.organizationId);
      }
      
      setStatus('success');
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.replace('/(protected)/(tabs)/');
      }, 2000);
      
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" />
          <Text style={styles.text}>Accepting invitation...</Text>
        </>
      )}
      
      {status === 'success' && (
        <>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.text}>
            You've successfully joined the organization.
          </Text>
          <Text style={styles.subtext}>Redirecting...</Text>
        </>
      )}
      
      {status === 'error' && (
        <>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.title}>Invitation Error</Text>
          <Text style={styles.text}>{error}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  successIcon: {
    fontSize: 64,
  },
  errorIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
});
```

---

## User Experience Flows

### Flow 1: Commander Invites Member

```
👤 Commander (Alice) in "Alpha Company"

1. Taps "Manage" tab
2. Sees "Members" section
3. Taps "+ Invite Members"
4. Modal appears:
   ┌─────────────────────────────┐
   │  Invite Member         [X]  │
   ├─────────────────────────────┤
   │  Email                      │
   │  [john.doe@example.com  ]   │
   │                             │
   │  Role                       │
   │  [Member            ▼]      │
   │                             │
   │  ℹ️ Members can:            │
   │  • View org data            │
   │  • Create sessions          │
   │                             │
   │  [Send Invitation]          │
   └─────────────────────────────┘
5. Enters email: john.doe@example.com
6. Selects role: Member
7. Taps "Send Invitation"
8. ✅ Success toast: "Invitation sent to john.doe@example.com"
9. Sees invitation in pending list
```

### Flow 2: Invitee Accepts (Not Signed In)

```
👤 Invitee (John) - No account yet

1. Receives email: "You've been invited to Alpha Company"
2. Email contains:
   ┌─────────────────────────────────────┐
   │  🎯 You're Invited!                 │
   │                                     │
   │  Alice Smith invited you to join:   │
   │  Alpha Company                      │
   │                                     │
   │  Role: Member                       │
   │                                     │
   │  As a Member, you can:              │
   │  • View organization data           │
   │  • Create and edit sessions         │
   │  • Participate in team activities   │
   │                                     │
   │  [Accept Invitation]                │
   │                                     │
   │  This invitation expires on Nov 13  │
   └─────────────────────────────────────┘
3. Taps "Accept Invitation"
4. App opens (or web page if app not installed)
5. Sees: "Sign in to join Alpha Company"
6. Signs in with Google
7. ⏳ "Accepting invitation..."
8. ✅ "Welcome to Alpha Company!"
9. Auto-switched to Alpha Company context
10. Can immediately start using app with org access
```

### Flow 3: Invitee Accepts (Already Signed In)

```
👤 Invitee (John) - Already has account

1. Receives invitation email
2. Taps "Accept Invitation"
3. App opens (already signed in)
4. ⏳ Brief loading: "Joining Alpha Company..."
5. ✅ "Welcome to Alpha Company!"
6. Sees badge: "NEW" next to Alpha Company in org switcher
7. Can immediately access org data
```

### Flow 4: Invitation Expires

```
👤 Invitee (John) - Waited too long

1. Receives invitation email (7 days ago)
2. Finally clicks link
3. ❌ "This invitation has expired"
4. Shows:
   ┌─────────────────────────────────────┐
   │  ⏰ Invitation Expired               │
   │                                     │
   │  This invitation was sent 7 days    │
   │  ago and is no longer valid.        │
   │                                     │
   │  Please ask the organization        │
   │  administrator to send a new        │
   │  invitation.                        │
   │                                     │
   │  [Contact Support]  [Go Home]       │
   └─────────────────────────────────────┘
```

---

## Edge Cases & Error Handling

### Case 1: User Already Member

**Scenario:** User receives invitation to org they're already in

**Handling:**
```typescript
// Check before accepting
const { data: existingMembership } = await client
  .from('org_memberships')
  .select('id')
  .eq('user_id', userId)
  .eq('org_id', invitation.organization_id)
  .single();

if (existingMembership) {
  return { 
    success: false, 
    error: 'You are already a member of this organization' 
  };
}
```

**UX:**
```
❌ "You're Already a Member"
   You already have access to Alpha Company.
   [Go to Organization]
```

### Case 2: Email Mismatch

**Scenario:** User signs in with different email than invited

**Current Behavior:** Still works (invitation tied to code, not email)

**Consideration:** Should we enforce email match?

**Option A (Strict):**
```typescript
if (user.email !== invitation.email) {
  return {
    success: false,
    error: 'This invitation was sent to a different email address'
  };
}
```

**Option B (Lenient - Current):**
```typescript
// Allow any authenticated user to accept
// Track who accepted (might be different email)
```

### Case 3: Invitation Cancelled

**Scenario:** Commander cancels invitation after sending

**Handling:**
```sql
UPDATE invitations 
SET status = 'cancelled' 
WHERE id = 'invitation_id';
```

**UX:**
```
❌ "Invitation Cancelled"
   This invitation was cancelled by the
   organization administrator.
   [Go Home]
```

### Case 4: Organization Deleted

**Scenario:** Org deleted before invitation accepted

**Handling:**
```sql
-- ON DELETE CASCADE ensures invitation deleted too
organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE
```

**UX:** Invitation link returns "not found"

### Case 5: Duplicate Invitations

**Scenario:** Commander sends multiple invites to same email

**Current:** Allows duplicates

**Better Approach:**
```typescript
// Check for existing pending invitation
const { data: existing } = await client
  .from('invitations')
  .select('id, created_at')
  .eq('email', email)
  .eq('organization_id', orgId)
  .eq('status', 'pending')
  .single();

if (existing) {
  // Option 1: Reject with error
  throw new Error('Invitation already sent to this email');
  
  // Option 2: Extend expiration and resend
  await client
    .from('invitations')
    .update({ 
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })
    .eq('id', existing.id);
  
  await InvitationService.resendInvitation(existing.id);
}
```

### Case 6: Invalid Email Format

**Handling:**
```typescript
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

if (!emailRegex.test(email)) {
  throw new ValidationError('Invalid email address');
}
```

### Case 7: Network Failure During Acceptance

**Handling:**
```typescript
try {
  await acceptInvitation(code, userId);
} catch (error) {
  if (error.name === 'NetworkError') {
    // Show retry button
    return {
      status: 'error',
      retryable: true,
      message: 'Network error. Please try again.'
    };
  }
  // Other errors...
}
```

---

## Security Considerations

### 1. Code Generation

**Requirements:**
- Unique (collision-free)
- Unpredictable (not guessable)
- Long enough to prevent brute force

**Implementation:**
```typescript
import { nanoid } from 'nanoid';

// 16 characters = 93.3 bits of entropy
// Brute force: ~3.3 × 10^25 attempts
const code = `inv_${nanoid(16)}`;
```

### 2. Expiration

**Default:** 7 days

**Rationale:**
- Long enough for legitimate use
- Short enough to limit exposure
- Can be extended if needed

### 3. Single Use

**Enforcement:** Status changes to "accepted" after use

```typescript
if (invitation.status === 'accepted') {
  return { valid: false, error: 'Invitation already used' };
}
```

### 4. Rate Limiting

**Recommended:** Limit invitations per commander

```typescript
// Check invitation count in last hour
const { count } = await client
  .from('invitations')
  .select('*', { count: 'exact', head: true })
  .eq('invited_by', userId)
  .gte('created_at', new Date(Date.now() - 3600000).toISOString());

if (count > 10) {
  throw new Error('Rate limit exceeded. Please try again later.');
}
```

### 5. Permission Verification

**Always verify:** User has permission to invite

```typescript
// Check if user is commander
const { data: membership } = await client
  .from('org_memberships')
  .select('role')
  .eq('user_id', userId)
  .eq('org_id', orgId)
  .single();

if (membership?.role !== 'commander') {
  throw new PermissionError('Only commanders can invite members');
}
```

---

## Troubleshooting Guide

### Problem 1: Email Not Received

**Possible Causes:**
1. Email in spam folder
2. Email service failed
3. Invalid email address
4. Email provider blocked sender

**Solutions:**
- Check spam/junk folder
- Resend invitation
- Try different email address
- Verify email service status

**Commander Actions:**
```typescript
// Resend invitation
await InvitationService.resendInvitation(invitationId);
```

### Problem 2: Link Doesn't Open App

**Possible Causes:**
1. App not installed
2. Deep link not configured
3. Wrong URL scheme

**Solutions:**
- Install app first
- Use web fallback link
- Check deep link configuration

**Technical Check:**
```typescript
// Verify deep link in app.json
{
  "expo": {
    "scheme": "reticle",
    "ios": {
      "associatedDomains": ["applinks:reticle.app"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            { "scheme": "reticle" }
          ]
        }
      ]
    }
  }
}
```

### Problem 3: "Invitation Not Found"

**Possible Causes:**
1. Invalid code in URL
2. Invitation deleted
3. Organization deleted
4. Database error

**Solutions:**
- Request new invitation
- Check URL for typos
- Contact administrator

### Problem 4: Can't Sign In After Click

**Possible Causes:**
1. Authentication service down
2. Account locked
3. Network issues

**Solutions:**
- Try again later
- Check network connection
- Contact support

### Problem 5: Already Member Error

**If legitimate:**
```typescript
// User can just switch to org
router.push('/(protected)/(tabs)/');
// Then use org switcher
```

**If unexpected:**
```typescript
// Check membership record
const { data } = await client
  .from('org_memberships')
  .select('*')
  .eq('user_id', userId)
  .eq('org_id', orgId);

console.log('Existing membership:', data);
```

---

## Email Template Example

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Organization Invitation</title>
</head>
<body style="font-family: -apple-system, sans-serif; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">
        🎯 You're Invited!
      </h1>
    </div>
    
    <!-- Body -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        <strong>{{inviterName}}</strong> has invited you to join <strong>{{organizationName}}</strong> on Reticle.
      </p>
      
      <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
          <strong>Your Role:</strong> {{role}}
        </p>
      </div>
      
      <div style="margin: 24px 0;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">As a {{role}}, you can:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #666;">
          {{#if (eq role 'commander')}}
            <li>View all organization data</li>
            <li>Create and edit training sessions</li>
            <li>Invite new members</li>
            <li>Manage organization settings</li>
          {{else if (eq role 'member')}}
            <li>View organization data</li>
            <li>Create and edit training sessions</li>
            <li>Participate in team activities</li>
          {{else}}
            <li>View organization data</li>
            <li>Monitor team activities</li>
          {{/if}}
        </ul>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{inviteLink}}" 
           style="display: inline-block; background: #667eea; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      
      <p style="font-size: 13px; color: #999; text-align: center;">
        This invitation expires on {{expiresAt}}
      </p>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
        <p style="font-size: 13px; color: #999; margin: 0;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="{{webFallback}}" style="color: #667eea; word-break: break-all;">{{webFallback}}</a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        © 2025 Reticle. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Summary

### Key Points

1. **Simple User Experience**
   - Click link → Sign in → Automatically join org
   - No manual steps required
   - Immediate access

2. **Secure by Default**
   - Unique, unpredictable codes
   - 7-day expiration
   - Single use only
   - Permission-based creation

3. **Robust Error Handling**
   - Expired invitations
   - Duplicate memberships
   - Network failures
   - Email delivery issues

4. **Commander Control**
   - View pending invitations
   - Cancel invitations
   - Resend emails
   - Track who joined

### Best Practices

**For Commanders:**
- ✅ Verify email address before sending
- ✅ Choose appropriate role
- ✅ Monitor pending invitations
- ✅ Cancel unused invitations

**For Development:**
- ✅ Always validate invitation before acceptance
- ✅ Handle all error cases
- ✅ Log invitation events for debugging
- ✅ Test email delivery regularly

---

**Document Version:** 1.0  
**Last Updated:** November 6, 2025  
**Author:** Reticle Development Team

