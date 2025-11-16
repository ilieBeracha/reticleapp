# Reticle 2 - Clean Architecture

## ✨ THE GOLDEN RULE

**There is ONE place to get user and workspace data. Use it everywhere.**

```typescript
// In Components (THE ONLY WAY)
import { useAppContext } from '@/hooks/useAppContext'
const { userId, workspaceId, activeWorkspace, isPersonal } = useAppContext()

// In Services (THE ONLY WAY)
import { getContext } from '@/services/authenticatedClient'
const { userId, workspaceId } = getContext()
```

**That's it. No other way exists. Perfect sync guaranteed.**

---

## Quick Start for Developers

### Get User & Workspace Data (Components)

```typescript
import { useAppContext } from '@/hooks/useAppContext'

export function MyComponent() {
  const {
    // User
    userId, email, fullName, avatarUrl,
    
    // Workspace
    workspaceId, activeWorkspace,
    
    // Context
    isPersonal, isOrganization,
    
    // All workspaces
    workspaces,
    
    // Actions
    switchWorkspace,
  } = useAppContext()
  
  return <View>...</View>
}
```

### Create Context-Aware Service

```typescript
import { AuthenticatedClient, getContext } from './authenticatedClient'

export async function getMyDataService() {
  const { userId, workspaceId } = getContext()  // ✨ Automatic!
  const client = await AuthenticatedClient.getClient()
  
  let query = client.from("my_table").select("*")
  
  if (workspaceId) {
    query = query.eq("organization_id", workspaceId)  // Org
  } else {
    query = query.eq("created_by", userId).is("organization_id", null)  // Personal
  }
  
  const { data } = await query
  return data
}
```

### Use in Component

```typescript
// No parameters needed - context is automatic!
const data = await getMyDataService()
```

---

## Core Files

```
hooks/
  useAppContext.ts             ← ✨ THE SINGLE SOURCE OF TRUTH (use everywhere)

services/
  authenticatedClient.ts       ← Context injection (getContext for services)
  
contexts/
  AuthContext.tsx              ← Auth management (internal use only)

store/
  useWorkspaceStore.tsx        ← Workspace cache (internal use only)
```

---

## Rules for Developers

### ✅ DO

1. **Use `useAppContext()` in ALL components**
2. **Use `getContext()` in ALL services**
3. **Trust the data - always fresh and synced**

### ❌ DON'T

1. **NEVER use `useAuth()` or `useWorkspaceStore()` directly**
2. **NEVER pass `userId`/`workspaceId` as parameters**
3. **NEVER store active workspace in local state**

---

## Documentation

- **`SINGLE_SOURCE_OF_TRUTH.md`** ← Complete guide (READ THIS!)
- `HOW_IT_WORKS.md` - System architecture
- `DATA_ACCESS_GUIDE.md` - Examples
- `SIMPLE_GUIDE.md` - Quick reference

---

**Perfect sync guaranteed. Simple for devs. One source of truth.** 🚀

---

## Database Query Pattern

```typescript
// Personal context (workspaceId = null)
WHERE created_by = userId AND organization_id IS NULL

// Organization context (workspaceId = UUID)
WHERE organization_id = workspaceId
```

---

## Complete System

```
useAppContext() (Components)
      ↓
  getContext() (Services)
      ↓
AuthenticatedClient (Auto-injects token + context)
      ↓
   Supabase
      ↓
   Database
```

**ONE source → Perfect sync → Simple for devs** ✨
