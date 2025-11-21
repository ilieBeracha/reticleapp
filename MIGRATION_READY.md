# ✅ Multi-Profile Migration - READY TO APPLY

## 🎯 What's Been Prepared

All code and migrations are ready. Here's what will happen:

### Database Changes
1. ✅ Multi-profile schema migration (`20251122000000_multi_profile_architecture.sql`)
2. ✅ Cleanup old schema (`20251122000001_cleanup_old_schema.sql`)

### UI Updates
1. ✅ ProfileSelector component (for login/profile selection)
2. ✅ WorkspaceSwitcher now shows profiles instead of workspaces
3. ✅ AuthContext updated for multi-profile support
4. ✅ ProfileStore for managing profiles
5. ✅ ProfileContext hook for accessing current profile/org

## 🚀 Apply Migrations

Run this command to apply all migrations:

```bash
cd /Users/ilie/Desktop/Dev/native/reticle2
supabase db push
```

This will:
1. ✅ Create new `orgs` and `profiles` tables
2. ✅ Migrate existing data from old schema
3. ✅ Drop old workspace_access and org_workspaces tables
4. ✅ Create profile-based RLS policies
5. ✅ Add auto-create personal org trigger for new users
6. ✅ Add helper functions (get_my_profiles, get_org_members, etc.)

## 📱 How It Works After Migration

### 1. User Login
```
User logs in with email
    ↓
Loads their profiles via get_my_profiles()
    ↓
Shows profile selector if multiple profiles
    ↓
User selects profile
    ↓
Navigate to org context
```

### 2. Profile Switcher
- Open via header avatar/menu
- Shows all user's profiles grouped by:
  - **Personal** (personal org)
  - **Organizations** (org workspaces)
- Switch between profiles
- Create new organization
- Join organization via invite code

### 3. Data Structure
```
auth.users (email/password)
    ↓
  profiles (multiple per user)
    ↓
  orgs (one per profile)
```

Each profile includes:
- `display_name` - Name in that org
- `role` - owner/admin/instructor/member
- `org` - The organization details

## 🔍 Verify After Migration

1. **Check profiles created:**
```sql
SELECT * FROM profiles;
```

2. **Check orgs created:**
```sql
SELECT * FROM orgs;
```

3. **Test profile loading:**
```sql
SELECT * FROM get_my_profiles();
```

4. **Test UI:**
- Login → Should show profile selector (if multiple profiles)
- Open workspace switcher → Should show profiles
- Switch between profiles → Should navigate correctly

## 🐛 If Something Goes Wrong

### Reset Migration
```bash
# This will roll back to before the migration
supabase db reset
```

### Check Logs
```bash
supabase logs db
```

## ✨ Key Benefits

1. **No M2M Tables** - Eliminated workspace_access complexity
2. **Direct Role Access** - `profile.role` instead of joins
3. **Per-Org Identity** - Different names/avatars per org
4. **Cleaner Queries** - Simple profile-based lookups
5. **Auto Personal Org** - New users get personal org automatically

## 📝 Summary

**Before:**
```
auth.users → profile (1:1) → workspace_access (M:M) → org_workspaces
```

**After:**
```
auth.users → profiles (1:M) → orgs (1:1)
```

**Result:** Simpler, cleaner, more intuitive! 🎉

