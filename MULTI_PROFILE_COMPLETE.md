# ✅ Multi-Profile Architecture - Implementation Complete

## 🎯 What We Built

You successfully transformed your app from **"one profile per user"** to **"multiple profiles per user, one per organization"** - eliminating the need for complex many-to-many tables.

## 📊 Architecture Changes

### Before (Old Model)
```
auth.users (1) ←→ (1) profiles ←→ (M) workspace_access (M) ←→ (1) org_workspaces
                                       ↓
                                  role, settings (stored in M2M table)
```

### After (New Model)
```
auth.users (1) ←→ (M) profiles (M) ←→ (1) orgs
                      ↓
                 role, settings (stored directly on profile!)
```

## 🗄️ Database Schema

### New Tables

**`orgs`** - Unified organizations (replaces personal workspaces + org_workspaces)
```sql
- id: uuid
- name: text
- slug: text (unique)
- org_type: 'personal' | 'organization'
- description, avatar_url, timestamps
```

**`profiles`** - User profiles per organization (many-to-many simplified!)
```sql
- id: uuid
- user_id: uuid -> auth.users (many profiles per user)
- org_id: uuid -> orgs (one org per profile)
- display_name, avatar_url: text (per-org identity)
- role: 'owner' | 'admin' | 'instructor' | 'member' (stored directly!)
- preferences: jsonb (per-org settings)
- status: 'active' | 'pending' | 'suspended'
- UNIQUE(user_id, org_id) -- one profile per user per org
```

### Tables Removed/Renamed
- ❌ `workspace_access` - No longer needed! (M2M eliminated)
- ❌ `org_workspaces` - Merged into `orgs`
- ✅ `workspace_invitations` → `org_invitations`

### Tables Updated
- `teams`: Now references `org_id`
- `sessions`: Now references `org_id` and `profile_id`
- `team_members`: Now references `profile_id` (not user_id)

## 🚀 Key Features Implemented

### 1. Profile Selection Screen (`/auth/select-profile`)
When users log in, they see all their profiles:
```
┌─────────────────────────────┐
│ 🏠 My Personal Workspace    │
│ Owner                       │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🏢 Acme Corp                │
│ Admin                       │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🎖️ Special Forces Unit      │
│ Member                      │
└─────────────────────────────┘
```

### 2. Updated Authentication Flow
- **Login** → Profile selection → Protected area
- **Active profile** stored in `user.user_metadata.active_profile_id`
- Easy profile switching via `switchProfile(profileId)`

### 3. New Invitation System
**Before:** Invitation → User accepts → Entry added to workspace_access table

**After:** Invitation → User accepts → **Profile created automatically** in the org
```typescript
acceptOrgInvitation(code) 
  → Creates new profile for user in that org
  → Assigns role from invitation
  → Adds to team if specified
```

### 4. Updated Context Hooks

**`useProfileContext()`** - New hook for multi-profile context
```typescript
const {
  userId,           // Global auth user ID
  activeProfile,    // Current profile object
  currentOrg,       // Current organization
  myRole,          // Role in current org
  isOwner,         // Permission checks
  isAdmin,
  canManageMembers,
  profiles,        // All user's profiles
  switchProfile    // Switch between profiles
} = useProfileContext();
```

**`AuthenticatedClient`** - Updated to use `profileId` instead of `workspaceId`
```typescript
const context = AuthenticatedClient.getContext()
// { userId, profileId } - context for current profile
```

## 📁 Files Created/Modified

### ✨ New Files
- `supabase/migrations/20251122000000_multi_profile_architecture.sql` - Full migration
- `components/auth/ProfileSelector.tsx` - Profile selection UI
- `app/auth/select-profile.tsx` - Profile selection page
- `store/useProfileStore.tsx` - Profile state management
- `hooks/useProfileContext.ts` - Profile context hook
- `services/orgInvitationService.ts` - Updated invitation service
- `MIGRATION_PLAN.md` - Detailed migration strategy

### ✏️ Modified Files
- `contexts/AuthContext.tsx` - Multi-profile auth flow
- `services/authenticatedClient.ts` - Profile-based context
- `app/auth/_layout.tsx` - Added profile selection route

## 🔄 Migration Process

### To Apply Migration:
```bash
cd supabase
supabase db push
```

### What the Migration Does:
1. ✅ Creates `orgs` and new `profiles` tables
2. ✅ Migrates existing data:
   - Personal workspaces → personal orgs + profiles
   - Org workspaces → organization orgs
   - Workspace memberships → profiles
3. ✅ Updates foreign keys in dependent tables
4. ✅ Creates new RLS policies
5. ✅ Adds helper functions:
   - `get_my_profiles()` - Get all user's profiles
   - `get_org_members(org_id)` - Get org members
   - `accept_org_invite(code)` - Accept invite & create profile

### Safety Features:
- Old tables renamed to `*_old` (not dropped immediately)
- All data migrated before dropping tables
- Verification checks at end of migration

## 💡 Benefits Achieved

### 1. ✅ Eliminated M2M Complexity
**Before:** Complex joins across `profiles` ↔ `workspace_access` ↔ `orgs`
```sql
SELECT role FROM workspace_access 
WHERE member_id = $1 AND org_workspace_id = $2
```

**After:** Simple direct query
```sql
SELECT role FROM profiles 
WHERE user_id = $1 AND org_id = $2
```

### 2. ✅ Simpler Permissions
Role is directly on the profile - no joins needed!
```typescript
// Before
const role = await getRoleFromWorkspaceAccess(userId, orgId)

// After
const role = activeProfile.role  // Direct access!
```

### 3. ✅ Per-Org Identity
Users can have different display names, avatars, and settings per org:
```typescript
profile {
  display_name: "John (Admin)",  // In work org
  avatar_url: "formal-pic.jpg"
}

profile {
  display_name: "Johnny",        // In personal org
  avatar_url: "casual-pic.jpg"
}
```

### 4. ✅ Cleaner Data Model
- One profile = one identity in one org
- Natural multi-tenancy boundaries
- Easier to understand and maintain

## 🧪 Testing Checklist

After applying migration:

- [ ] Users can log in
- [ ] Profile selection screen appears
- [ ] Can switch between profiles
- [ ] Can create invitations
- [ ] Can accept invitations (creates new profile)
- [ ] Teams work with new profile references
- [ ] Sessions work with new org/profile references
- [ ] All existing data migrated correctly

## 📚 Usage Examples

### Create Organization Invitation
```typescript
import { createOrgInvitation } from '@/services/orgInvitationService'

const invitation = await createOrgInvitation(
  orgId,
  'member',  // role
  teamId,    // optional
  'soldier'  // optional team role
)

console.log(`Share code: ${invitation.invite_code}`)
```

### Accept Invitation
```typescript
import { acceptOrgInvitation } from '@/services/orgInvitationService'

const { profile_id, org_id } = await acceptOrgInvitation('ABC12345')
// New profile created automatically!
```

### Get User's Profiles
```typescript
const { data } = await supabase.rpc('get_my_profiles')
// Returns all profiles with org details
```

### Get Org Members
```typescript
const { data } = await supabase.rpc('get_org_members', { 
  p_org_id: orgId 
})
// Returns all active profiles in the org
```

## 🎨 UI Flow

```
Login/Signup
    ↓
Profile Selection (if multiple profiles)
    ↓
[Personal Workspace] or [Organization Workspace]
    ↓
Can switch profiles anytime via Profile Switcher
```

## 🔐 Security (RLS Policies)

### Orgs
- Users can view orgs they have profiles in
- Owners/admins can update their org

### Profiles
- Users can view their own profiles
- Users can view profiles in orgs they're members of
- Users can update their own profiles
- Org admins can manage all profiles in their org

## 🎯 Summary

You now have a **clean, scalable multi-profile architecture** where:
- ✅ Each user can have multiple profiles (one per org)
- ✅ No complex M2M tables needed
- ✅ Role/permissions stored directly on profile
- ✅ Simple, intuitive data model
- ✅ Easy profile switching
- ✅ Automatic profile creation on invitation acceptance

**This is a significant architectural improvement that will make your codebase much easier to maintain and extend!** 🚀

