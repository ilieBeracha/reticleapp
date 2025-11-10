# 🚀 Apply Migrations Guide

## Quick Steps

### 1. Open Supabase Dashboard

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

### 2. Copy & Run Migration 1

**File:** `supabase/migrations/20251110_simplify_org_permissions.sql`

1. Open the file in your editor
2. Copy **ALL** contents (581 lines)
3. Paste into Supabase SQL Editor
4. Click "Run" ✅

**What this does:**
- ✅ Creates one commander per org constraint
- ✅ Updates org creation functions (root = commander, child = no membership)
- ✅ Creates RPC functions for permissions
- ✅ **Fixes invitation RLS policy** (allows inviting to child orgs)
- ✅ Fixes member visibility (commanders see scope)

### 3. Copy & Run Migration 2

**File:** `supabase/migrations/20251115_add_multi_use_invites.sql`

1. Open the file in your editor
2. Copy ALL contents (138 lines)
3. Paste into Supabase SQL Editor
4. Click "Run" ✅

**What this does:**
- ✅ Adds `max_uses` and `current_uses` to invitations
- ✅ Updates `accept_org_invite()` to track usage
- ✅ Enforces commander invites = single-use

### 4. Restart App

```bash
cd /Users/ilie/Desktop/Dev/native/scopes-project/reticle
npx expo start -c
```

---

## ✅ After Running, You'll Have:

**Fixed:**
- ✅ Commanders NOT added to child orgs as members
- ✅ Invitations work for child orgs (tree-based permissions)
- ✅ Members visible across entire scope
- ✅ Multi-use invites for members
- ✅ Single-use invites for commanders

**Result:**
- Alice creates Alpha Unit → Commander of Unit (1 membership)
- Alice creates Team 1 → NOT added to Team 1 (manages via scope)
- Alice invites Bob to Team 1 → Works! ✅
- Alice views members → Sees all in scope ✅
- Bob views members → Sees only Team 1 ✅

---

## 🐛 If You Get Errors

### Error: "Policy already exists"

**Solution:** Migrations already ran! Just restart app.

### Error: "Infinite recursion"

**Solution:** Old schema still active. Run:
```sql
DROP POLICY IF EXISTS "org_memberships_select" ON org_memberships;
DROP POLICY IF EXISTS "memberships_select" ON org_memberships;
```

Then run migration 1 again.

### Error: "Column does not exist"

**Solution:** Run migration 2 (adds columns).

---

## 🎯 Quick Test

After applying:

1. **Create root org** → You should be commander ✅
2. **Create child org** → You should stay in root (not added to child) ✅
3. **Invite to child** → Should work ✅
4. **View members** → Should see everyone in scope ✅

**All good!** 🎉

