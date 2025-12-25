# Reticle 2 - Clean Architecture

## ✨ THE GOLDEN RULE

**Keep a strict layer boundary: services talk to Supabase, stores manage state, screens/components stay thin.**

```typescript
// In Services (THE ONLY WAY)
import { supabase } from '@/lib/supabase'
// ... queries/mutations here ...

// In Screens/Components
import { useTeamStore } from '@/store/teamStore'
import { useSessionStore } from '@/store/sessionStore'
// ... call store actions, render UI ...
```

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

### Create a Service (Supabase access)

```typescript
import { supabase } from '@/lib/supabase'

export async function getMyDataService() {
  // Use auth-backed Supabase session (persisted in AsyncStorage)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase.from('my_table').select('*').eq('created_by', user.id)
  if (error) throw error
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
  ...                          ← Supabase queries/mutations (imports `@/lib/supabase`)
  
contexts/
  AuthContext.tsx              ← Auth management (internal use only)

store/
  teamStore.tsx                ← Team + activeTeam state
  sessionStore.tsx             ← Sessions state
```

---

## Rules for Developers

### ✅ DO

1. **Keep route files thin** (compose components + call store actions)
2. **Put DB logic only in `services/`** (import `@/lib/supabase`)
3. **Extract pure logic into `helpers/`** (no React, no Supabase)

### ❌ DON'T

1. **NEVER use `useAuth()` or `useWorkspaceStore()` directly**
2. **NEVER pass `userId`/`workspaceId` as parameters**
3. **NEVER store active workspace in local state**

---

## Documentation

### Architecture Guides
- **`SINGLE_SOURCE_OF_TRUTH.md`** ← Complete guide (READ THIS!)
- `HOW_IT_WORKS.md` - System architecture
- `DATA_ACCESS_GUIDE.md` - Examples
- `SIMPLE_GUIDE.md` - Quick reference

### Technical Docs (`docs/`)
- **`docs/garmin-integration.md`** ← Garmin Connect IQ integration (patch-based, critical!)
- **`docs/garmin-architecture.md`** ← System architecture for Garmin flow
- **`docs/garmin-drill-sync-spec.md`** ← Drill sync protocol (phone ↔ watch)
- **`docs/WATCH-APP-INSTRUCTIONS.md`** ← Instructions for watch app developer
- `docs/data-flow-map.md` - UI → Store → Service → DB flows
- `docs/query-map.md` - All Supabase queries documented
- `docs/drill-training-architecture-v2.md` - Training/drill system design

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
app routes (thin)
      ↓
components + hooks (UI + local behavior)
      ↓
zustand stores (state + orchestration)
      ↓
services (Supabase queries/mutations)
      ↓
Supabase
      ↓
Database
```
# reticIQ
