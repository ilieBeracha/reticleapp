# Reticle - GitHub Copilot Instructions

## Tech Stack

- **Framework**: React Native (Expo) with expo-router
- **Authentication**: Supabase Auth (email/password + OAuth: Google, Apple)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **State**: Zustand stores
- **Styling**: NativeWind + StyleSheet (colocated)

## Architecture Pattern

```
Component → Store/Hook → Service → AuthenticatedClient → Supabase (RLS) → Database
```

**Key Principle**: Services handle ALL database operations. Components never touch DB directly.

## Authentication

```typescript
// Use Supabase Auth context
import { useAuth } from '@/contexts/AuthContext'

const { user, session, loading, signIn, signOut } = useAuth()
const userId = user?.id  // UUID from auth.users
```

**RLS Pattern**: Policies use `auth.uid()` to identify current user (returns UUID)

## Data Access Pattern

**Service Layer** (`/services/`):
```typescript
// services/entityService.ts
import { AuthenticatedClient } from '@/lib/authenticatedClient'
import { DatabaseError } from '@/lib/errors'

export async function getEntitiesService(
  userId: string,  // UUID from user.id
  orgId?: string   // UUID from organizations.id
): Promise<Entity[]> {
  const client = await AuthenticatedClient.getClient() // Auto token injection
  
  let query = client.from("entities").select("*")
  
  if (orgId) {
    // Organization context
    query = query.eq("organization_id", orgId)
  } else {
    // Personal context
    query = query.eq("created_by", userId).is("organization_id", null)
  }
  
  const { data, error } = await query
  if (error) throw new DatabaseError(error.message)
  return data || []
}
```

**Store Layer** (`/store/`):
```typescript
// store/entitiesStore.ts
import { create } from 'zustand'
import { getEntitiesService } from '@/services/entityService'

export const entitiesStore = create<EntitiesStore>((set) => ({
  entities: [],
  loading: false,
  error: null,
  
  fetchEntities: async (userId: string, orgId?: string) => {
    set({ loading: true, error: null })
    try {
      const entities = await getEntitiesService(userId, orgId)
      set({ entities, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },
  
  resetEntities: () => set({ entities: [], loading: false, error: null })
}))
```

**Component Usage**:
```typescript
import { useStore } from 'zustand'
import { entitiesStore } from '@/store/entitiesStore'
import { useAuth } from '@/contexts/AuthContext'

export function EntitiesList() {
  const { entities, loading, fetchEntities } = useStore(entitiesStore)
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      fetchEntities(user.id, orgId)
    }
  }, [user?.id, orgId])

  if (loading) return <LoadingSpinner />
  return <ListView data={entities} />
}
```

## File Organization

```
/services/          → Database operations only
/store/            → Zustand state management
/hooks/            → React hooks
/contexts/         → React contexts (Auth, Theme)
/components/       → Reusable UI components
/modules/          → Feature modules (screens + components)
/app/              → Routes only (expo-router)
/lib/              → Core utilities
/types/            → TypeScript types (generated from DB)
```

## Component Pattern

```typescript
import { useColors } from '@/hooks/ui/useColors'
import { StyleSheet, View, Text } from 'react-native'

interface CardProps {
  title: string
  count: number
}

export function Card({ title, count }: CardProps) {
  const colors = useColors()
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.count, { color: colors.textMuted }]}>{count}</Text>
    </View>
  )
}

// Colocate styles at bottom (NO separate .styles.ts files)
const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  count: {
    fontSize: 14,
  },
})
```

## Database Schema

**Multi-tenancy**:
- `created_by uuid` - References `auth.users(id)` (always required)
- `organization_id uuid` - References `organizations(id)` (nullable for personal items)

**Audit columns** (always include):
- `created_at timestamptz DEFAULT now()`
- `updated_at timestamptz DEFAULT now()`

## Context-Based Filtering

**Personal Context**: `orgId = null | undefined`
- Query: `.eq("created_by", userId).is("organization_id", null)`

**Organization Context**: `orgId = UUID`
- Query: `.eq("organization_id", orgId)`

## Key Rules

**DO**:
- ✅ Use `AuthenticatedClient.getClient()` in services (auto token injection)
- ✅ Use TypeScript strict mode everywhere
- ✅ Generate types from DB: `npx supabase gen types`
- ✅ Throw custom errors (`DatabaseError`, `NotFoundError`, etc.)
- ✅ Named exports for components: `export function Component() {}`
- ✅ Colocate styles at bottom of component file

**DON'T**:
- ❌ Pass tokens as parameters (automatic injection)
- ❌ Create Supabase clients in components
- ❌ Use `any` types
- ❌ Create separate `.styles.ts` files
- ❌ Put business logic in components (use services)
- ❌ Use default exports for components

## RLS Policy Pattern

```sql
-- Enable RLS
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- SELECT: Own items OR org items
CREATE POLICY "entities_select" ON entities FOR SELECT
USING (
  created_by = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE user_id = auth.uid()
      AND org_id = entities.organization_id
    )
  )
);

-- INSERT: Own items only
CREATE POLICY "entities_insert" ON entities FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND (organization_id IS NULL OR EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = auth.uid()
    AND org_id = entities.organization_id
  ))
);
```

## Migration Checklist

1. Create migration: `supabase/migrations/[timestamp]_[name].sql`
2. Add table with `created_by`, `organization_id`, `created_at`, `updated_at`
3. Create indexes for foreign keys
4. Enable RLS + add policies (SELECT, INSERT, UPDATE, DELETE)
5. Generate types: `npx supabase gen types typescript > types/database.ts`
6. Create service layer: `services/[entity]Service.ts`
7. Create store: `store/[entity]Store.ts`
8. Create components: `modules/[feature]/components/`
9. Test personal + org contexts

## Error Handling

```typescript
// In services - throw custom errors
if (error) throw new DatabaseError(error.message)

// In stores - catch and set error state
try {
  const data = await getService()
  set({ data, loading: false })
} catch (err: any) {
  set({ error: err.message, loading: false })
}

// In components - display user-friendly messages
try {
  await action()
  Alert.alert('Success', 'Action completed')
} catch (error: any) {
  Alert.alert('Error', error.message || 'Something went wrong')
}
```

## Common Patterns

**Fetch data on mount**:
```typescript
const { user } = useAuth()
const { data, loading, fetch } = useStore(store)

useEffect(() => {
  if (user?.id) fetch(user.id, orgId)
}, [user?.id, orgId])
```

**Create with optimistic update**:
```typescript
create: async (input, userId, orgId) => {
  set({ loading: true })
  try {
    const item = await createService(input, userId, orgId)
    set(state => ({ items: [item, ...state.items], loading: false }))
  } catch (err: any) {
    set({ error: err.message, loading: false })
    throw err
  }
}
```

## Authentication Setup

```typescript
// lib/authenticatedClient.ts initializes token provider
AuthenticatedClient.initialize(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
})
```

---

**For detailed architecture rules, see `.cursorrules`**
**For product specifications, see `CLAUDE.md`**

