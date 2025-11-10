# ⚠️ Correct Migration Order (After Database Reset)

## The Problem

You ran `db reset` which deleted all tables. Now migrations fail because tables don't exist.

## ✅ Correct Order

### **1. FIRST: Base Schema** (Creates all tables)

**File:** `20251105_remote_schema.sql`

This creates:
- `organizations` table
- `org_memberships` table
- `invitations` table
- `users` table
- All base functions and triggers

**Run this FIRST!**

---

### **2. SECOND: Simplify Permissions**

**File:** `20251110_simplify_org_permissions.sql`

This updates:
- Adds one commander per org constraint
- Creates RPC functions
- Updates org creation functions
- Fixes RLS policies

**Run this SECOND!**

---

### **3. THIRD: Multi-Use Invites**

**File:** `20251115_add_multi_use_invites.sql`

This adds:
- `max_uses` and `current_uses` columns
- Updates `accept_org_invite()` function

**Run this THIRD!**

---

### **4. FOURTH: Fix Invitation RPC**

**File:** `20251115_fix_invitations_with_rpc.sql`

This fixes:
- Invitation creation with RPC
- Removes RLS policies
- Creates `create_invitation_rpc()` function

**Run this FOURTH!**

---

## Steps to Apply

```bash
cd /Users/ilie/Desktop/Dev/native/scopes-project/reticle

# Apply all migrations in order
npx supabase db push

# This will run all 4 automatically in the correct order!
```

OR manually in Supabase SQL Editor:

1. Copy `20251105_remote_schema.sql` → Run
2. Copy `20251110_simplify_org_permissions.sql` → Run
3. Copy `20251115_add_multi_use_invites.sql` → Run
4. Copy `20251115_fix_invitations_with_rpc.sql` → Run

---

## Then Restart App

```bash
npx expo start -c
```

---

## ✅ After All 4 Migrations:

- ✅ All tables exist
- ✅ Scope-based permissions work
- ✅ Multi-use invites work
- ✅ Invitation creation works
- ✅ Member visibility works
- ✅ No RLS recursion

**Just run `npx supabase db push` and it handles the order automatically!** 🚀

