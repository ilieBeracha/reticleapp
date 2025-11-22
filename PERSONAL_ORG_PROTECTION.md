# 🛡️ Personal Org Protection - Critical Fix

## The Problem You Identified

Great catch! In the current architecture:

```sql
profiles (
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE
)
```

**Risk:** If someone deletes a personal org, the profile gets CASCADE deleted!

```
User deletes personal org
    ↓
ON DELETE CASCADE
    ↓
Profile deleted
    ↓
User loses everything! ❌
```

## The Solution: Make Personal Orgs Undeletable

### Protection at Multiple Levels:

#### 1. Database Trigger (Strongest Protection) 🔒

```sql
CREATE TRIGGER prevent_personal_org_deletion_trigger
  BEFORE DELETE ON orgs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_personal_org_deletion();
```

**Result:**
```sql
DELETE FROM orgs WHERE org_type = 'personal';
-- ❌ ERROR: Cannot delete personal organizations
```

#### 2. RLS Policy (Permission Level) 🔐

```sql
CREATE POLICY "orgs_delete" ON orgs
  FOR DELETE USING (
    org_type = 'organization'  -- Only organizations, not personal
    AND ... owner check ...
  );
```

**Result:** Users can't even try to delete personal orgs through the app.

#### 3. Application Level (UI) 🎨

```typescript
// In your UI code
if (org.org_type === 'personal') {
  // Don't show delete button
  return null;
}

return <DeleteOrgButton />;
```

## Why Keep Personal as an Org?

### ✅ Pros (Current Architecture):

1. **Consistent Data Model**
   ```sql
   -- Everything is an org
   SELECT * FROM orgs WHERE user owns them
   -- Works for both personal and shared
   ```

2. **Reusable Code**
   ```typescript
   // Same code for both
   function loadOrgData(orgId) {
     // Works for personal and organization orgs
   }
   ```

3. **Future Flexibility**
   ```
   Personal org can:
   - Have teams (if you want)
   - Have settings
   - Use all org features
   ```

4. **Simpler Queries**
   ```sql
   -- Get all user's orgs (including personal)
   SELECT * FROM profiles WHERE user_id = ?
   ```

### ❌ Alternative (Make Personal Special):

```sql
profiles (
  user_id uuid,
  org_id uuid,  -- NULL for personal, FK for orgs
  is_personal boolean
)
```

**Problems:**
- Need special handling everywhere
- if/else in every function
- Two code paths
- More bugs

## Implementation

### Run the Migration:

```bash
npx supabase db push
```

This adds:
1. ✅ Trigger to prevent deletion
2. ✅ RLS policy update
3. ✅ Comments explaining why

### Test Protection:

```sql
-- Try to delete personal org
DELETE FROM orgs WHERE org_type = 'personal' AND id = 'user-id';

-- Should fail with:
-- ERROR: Cannot delete personal organizations. They are tied to user accounts.
```

## Best Practices

### 1. Never Expose Delete for Personal Orgs

```typescript
// In your UI
function OrgSettings({ org }) {
  const canDelete = org.org_type === 'organization' && org.canDelete;
  
  return (
    <>
      <EditSettings />
      {canDelete && <DeleteOrgButton />}
    </>
  );
}
```

### 2. Clear Messaging

```typescript
if (org.org_type === 'personal') {
  return (
    <Text>
      Your personal workspace cannot be deleted.
      It's tied to your account.
    </Text>
  );
}
```

### 3. Account Deletion Flow

If user wants to delete their ENTIRE account:

```typescript
// Delete account = delete user
// This triggers: auth.users deletion
// Which cascades to: personal org deletion (because user_id FK)
// Which cascades to: profile deletion

// But this is OK because:
// 1. User explicitly deleting account
// 2. Everything should be removed
// 3. Proper cascade chain
```

## Data Flow

### User Signup:
```
1. Create auth.users record
2. Trigger: create_personal_org_for_new_user()
3. Create personal org (org_type = 'personal')
4. Create profile (role = 'owner')
```

### User Joins Organization:
```
1. Accept invitation
2. Create profile in that org
3. Now has TWO profiles:
   - Personal org profile
   - Organization profile
```

### User Leaves Organization:
```
1. Delete profile in organization
2. Personal profile untouched ✅
```

### User Deletes Organization (as owner):
```
1. DELETE FROM orgs WHERE id = org_id
2. Only works if org_type = 'organization' ✅
3. Cascades to delete org profiles
4. Personal profile untouched ✅
```

### User Tries to Delete Personal Org:
```
1. DELETE FROM orgs WHERE org_type = 'personal'
2. Trigger blocks it ❌
3. Error: Cannot delete personal organizations
```

### User Deletes Account:
```
1. DELETE FROM auth.users WHERE id = user_id
2. Cascades to personal org (correct)
3. Cascades to all profiles (correct)
4. User completely removed ✅
```

## Summary

### Your Question: "Does personal need to be an organization?"

**Answer:** Yes, and it's actually a GOOD design, but it needs protection!

### The Fix:

✅ Keep personal as an org (clean architecture)
✅ Add trigger to prevent deletion
✅ Update RLS policies  
✅ Hide delete button in UI

### Result:

- 🛡️ Personal orgs can never be deleted accidentally
- 🔧 Account deletion still works properly
- 🎯 Clean, consistent architecture
- ✅ All the benefits, none of the risks

---

**Status:** Migration ready
**Breaking Changes:** No
**Risk:** None (only adds protection)
**Recommendation:** Run immediately for safety!


