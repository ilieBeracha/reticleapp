# Multi-Profile Architecture Migration Plan

## 🎯 Core Concept

**Before:** One profile per auth.user (1:1)  
**After:** Multiple profiles per auth.user, one per organization (1:M)

## 📊 Schema Changes

### New `profiles` table structure:
```sql
profiles (
  id uuid PRIMARY KEY,
  user_id uuid -> auth.users(id),  -- Many profiles per user
  org_id uuid -> orgs(id),          -- One org per profile
  
  -- Per-org identity
  display_name text,
  avatar_url text,
  role text ('owner'|'admin'|'member'),
  
  -- Per-org settings
  preferences jsonb,
  
  -- Metadata
  created_at timestamptz,
  updated_at timestamptz,
  
  UNIQUE(user_id, org_id)  -- One profile per user per org
)
```

### New `orgs` table (replaces both personal and org workspaces):
```sql
orgs (
  id uuid PRIMARY KEY,
  name text,
  slug text UNIQUE,
  org_type text ('personal'|'organization'),
  
  created_at timestamptz,
  updated_at timestamptz
)
```

### Tables to DROP:
- `workspace_access` (M2M not needed anymore)
- `org_workspaces` (consolidated into `orgs`)

### Tables to UPDATE:
- `teams`: `workspace_owner_id` → `org_id`
- `sessions`: `workspace_owner_id`, `org_workspace_id` → `org_id`
- `workspace_invitations` → `org_invitations`: `org_workspace_id` → `org_id`

## 🔄 Data Migration Strategy

### Step 1: Create new tables
1. Create `orgs` table
2. Create new `profiles` table (rename old to `profiles_old`)

### Step 2: Migrate data

#### Migrate Personal Workspaces:
```sql
-- Each old profile becomes:
-- 1. A personal org
-- 2. A profile linking the user to that org

INSERT INTO orgs (id, name, slug, org_type)
SELECT id, workspace_name, workspace_slug, 'personal'
FROM profiles_old;

INSERT INTO profiles (user_id, org_id, display_name, role)
SELECT id, id, full_name, 'owner'
FROM profiles_old;
```

#### Migrate Organization Workspaces:
```sql
-- Each org_workspace becomes an org
INSERT INTO orgs (id, name, slug, org_type)
SELECT id, name, workspace_slug, 'organization'
FROM org_workspaces;

-- Each workspace_access entry becomes a profile
INSERT INTO profiles (user_id, org_id, display_name, role)
SELECT 
  wa.member_id,
  wa.org_workspace_id,
  p.full_name,
  wa.role
FROM workspace_access wa
JOIN profiles_old p ON p.id = wa.member_id
WHERE wa.workspace_type = 'org';
```

### Step 3: Update foreign keys
- Update all references from `workspace_owner_id` → `org_id`
- Update all references from `org_workspace_id` → `org_id`

### Step 4: Drop old tables
- DROP `profiles_old`
- DROP `workspace_access`
- DROP `org_workspaces`

## 🔐 RLS Policy Changes

### profiles table:
```sql
-- Users can see their own profiles
CREATE POLICY "view_own_profiles" ON profiles
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own profiles
CREATE POLICY "update_own_profiles" ON profiles
  FOR UPDATE USING (user_id = auth.uid());
```

### orgs table:
```sql
-- Users can see orgs they have profiles in
CREATE POLICY "view_accessible_orgs" ON orgs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.org_id = orgs.id
      AND profiles.user_id = auth.uid()
    )
  );
```

## 🎨 UI Changes

### 1. Profile Selection Screen (NEW)
After login, show list of user's profiles:
```
Welcome back, user@example.com!

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

### 2. Update AuthContext
- Store `activeProfileId` instead of `activeWorkspaceId`
- Load profiles on login
- Profile selection updates active profile

### 3. Update Navigation
- Header shows current profile context
- Easy switching between profiles

## 🔄 Invitation Flow

### Before:
1. Admin creates invite for `newuser@example.com`
2. User signs up → creates auth.users + profile
3. User accepts invite → adds entry to workspace_access

### After:
1. Admin creates invite for `newuser@example.com`
2. **NEW:** System creates pending profile immediately
   ```sql
   INSERT INTO profiles (user_id, org_id, role, status)
   VALUES (NULL, org_id, 'member', 'pending');
   -- Store email in invitation
   ```
3. User signs up → creates auth.users only
4. User accepts invite → links existing pending profile to their user_id
   ```sql
   UPDATE profiles
   SET user_id = auth.uid(), status = 'active'
   WHERE id = pending_profile_id;
   ```

## ✅ Benefits Achieved

1. ✅ No more M2M workspace_access table
2. ✅ Role stored directly on profile
3. ✅ Per-org settings on profile
4. ✅ Simpler queries: "What's my role?" → `profiles.role`
5. ✅ Clear multi-tenancy boundaries
6. ✅ Users can have different display names per org

## 🚧 Migration Commands

```bash
# 1. Create migration
supabase migration new multi_profile_architecture

# 2. Apply migration (after reviewing)
supabase db push

# 3. Update TypeScript types
supabase gen types typescript --local > types/database.ts
```

