# Scopes App - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Data Flow Diagram](#data-flow-diagram)
4. [Authentication Architecture](#authentication-architecture)
5. [Service Layer Pattern](#service-layer-pattern)
6. [State Management Strategy](#state-management-strategy)
7. [Multi-Tenancy Model](#multi-tenancy-model)
8. [Database Schema](#database-schema)
9. [Decision Tree: When to Use What](#decision-tree)
10. [Common Patterns & Examples](#common-patterns)
11. [Troubleshooting Guide](#troubleshooting)

---

## Overview

Scopes is a React Native (Expo) sniper training application that helps shooters track sessions, analyze bullet detection, and manage equipment loadouts.

**Tech Stack:**
- **Frontend**: React Native (Expo) + TypeScript
- **Navigation**: expo-router (file-based routing)
- **Authentication**: Clerk (OAuth provider)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **State**: Zustand (lightweight stores)
- **External API**: FastAPI detection service

**Key Features:**
- Multi-tenant architecture (personal + organizations)
- JWT-based authentication with automatic token injection
- Real-time bullet hole detection with CV
- Equipment management (weapons, sights, loadouts)
- Training session tracking and analytics

---

## Core Concepts

### 1. Authentication Flow

```
User Signs In with Clerk (OAuth)
  ↓
Clerk Issues JWT Token (with "supabase" template)
  ↓
Token contains claims: { sub: user_id, org_id, org_role }
  ↓
AuthenticatedClient stores token provider function
  ↓
Services call AuthenticatedClient.getClient()
  ↓
Fresh JWT token injected into every Supabase request
  ↓
Supabase RLS policies validate token claims
  ↓
Database returns filtered data based on permissions
```

**Key Insight:** Services NEVER handle tokens directly. Authentication is transparent.

### 2. Layered Architecture

```
┌─────────────────────────────────────────────────┐
│  PRESENTATION LAYER                             │
│  - Components (React Native UI)                 │
│  - Screens (expo-router pages)                  │
│  - Hooks (data fetching & effects)              │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  STATE MANAGEMENT LAYER                         │
│  - Zustand Stores (shared state)                │
│  - Service Hooks (component-specific state)     │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  SERVICE LAYER (Business Logic)                 │
│  - sessionService.ts                            │
│  - weaponsModels.ts                             │
│  - detectionService.ts (external API)           │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  DATA ACCESS LAYER                              │
│  - AuthenticatedClient (singleton)              │
│  - Supabase Client (with JWT injection)         │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  DATABASE LAYER                                 │
│  - Supabase PostgreSQL                          │
│  - Row Level Security (RLS) Policies            │
│  - Triggers & Functions                         │
└─────────────────────────────────────────────────┘
```

### 3. Context-Based Data Access

Every user operates in one of two contexts:

**Personal Context** (orgId = undefined):
- User's own data only
- Sessions created by user
- Personal loadouts
- Queries filter by `created_by = userId`

**Organization Context** (orgId = "org_xxx"):
- All organization members' data
- Shared sessions, weapons, loadouts
- Queries filter by `organization_id = orgId`

**Implementation:**
```typescript
// Service automatically adapts based on context
const sessions = await getSessionsService(userId, orgId);

// If orgId exists → Get ALL sessions in this org
// If orgId is null → Get only sessions created by userId
```

---

## Data Flow Diagram

### Example: Creating a Training Session

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INTERACTION                                         │
│    User clicks "Create Session" button in UI                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. COMPONENT LAYER                                          │
│    CreateSessionModal.tsx                                   │
│    - Gets userId, orgId from useAuth()                      │
│    - Calls store action: createSession(input, userId, orgId)│
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. STATE MANAGEMENT                                         │
│    sessionsStore.ts                                         │
│    - Calls service: createSessionService(input, userId, orgId)│
│    - Optimistic update: adds to sessions array              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVICE LAYER                                            │
│    sessionService.ts                                        │
│    - Calls: const client = await AuthenticatedClient.getClient()│
│    - Builds query: client.from("sessions").insert(...)      │
│    - Returns typed data or throws error                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. AUTHENTICATION                                           │
│    AuthenticatedClient.getClient()                          │
│    - Calls tokenProvider() to get fresh JWT                 │
│    - Creates Supabase client with Authorization header      │
│    - Returns authenticated client                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. DATABASE LAYER                                           │
│    Supabase + RLS                                           │
│    - Validates JWT token claims                             │
│    - Checks RLS policy: created_by = jwt.sub ✓              │
│    - Inserts row into sessions table                        │
│    - Triggers updated_at timestamp                          │
│    - Returns inserted row                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. RESPONSE PROPAGATION                                     │
│    Data flows back up the chain:                            │
│    DB → Service → Store → Component → UI                    │
│    - Store updates sessions array                           │
│    - Component re-renders with new session                  │
│    - User sees success message                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Architecture

### Clerk → Supabase JWT Flow

**Setup Requirements:**
1. Create "supabase" JWT template in Clerk dashboard
2. Configure template to include:
   ```json
   {
     "sub": "{{user.id}}",
     "org_id": "{{org.id}}",
     "org_role": "{{org_membership.role}}",
     "email": "{{user.primary_email_address}}"
   }
   ```
3. Configure Supabase to accept Clerk JWT in dashboard

**Runtime Flow:**

```typescript
// 1. App initialization (app/_layout.tsx)
<ClerkProvider>
  <EnhancedAuthProvider>  {/* Initializes AuthenticatedClient */}
    <App />
  </EnhancedAuthProvider>
</ClerkProvider>

// 2. EnhancedAuthProvider initialization
const tokenProvider = async () => {
  const token = await getToken({ template: "supabase" });
  if (!token) throw new AuthenticationError("No token");
  return token;
};
AuthenticatedClient.initialize(tokenProvider);

// 3. Service layer usage (automatic)
const client = await AuthenticatedClient.getClient();
// Behind the scenes:
// - Gets fresh token from Clerk
// - Creates Supabase client with Authorization: Bearer <token>
// - Returns ready-to-use authenticated client

// 4. Database access
const { data, error } = await client.from("sessions").select("*");
// Supabase extracts JWT claims and enforces RLS policies
```

**Key Benefits:**
- No token management in business logic
- Always fresh tokens (no expiry issues)
- Centralized error handling
- Type-safe error classes

---

## Service Layer Pattern

### Purpose
- **Single Source of Truth** for database operations
- **Encapsulation** of authentication logic
- **Consistent** error handling
- **Type Safety** with generated types
- **Testability** (mock service layer easily)

### Anatomy of a Service

```typescript
// services/sessionService.ts

/**
 * Get training sessions with context-based filtering
 *
 * @param userId - Current user's Clerk ID
 * @param orgId - Optional organization ID for org context
 * @param trainingId - Optional filter by training
 * @returns Array of sessions visible to user
 *
 * Behavior:
 * - If orgId provided: Returns ALL sessions in that organization
 * - If orgId null: Returns only sessions created by userId
 */
export async function getSessionsService(
  userId: string,
  orgId?: string,
  trainingId?: string
): Promise<Session[]> {
  // 1. Get authenticated client (automatic token injection)
  const client = await AuthenticatedClient.getClient();

  // 2. Build query with context-based filtering
  let query = client
    .from("sessions")
    .select(`
      *,
      training:trainings(id, name)
    `)
    .order("created_at", { ascending: false });

  // 3. Apply context filter
  if (orgId) {
    query = query.eq("organization_id", orgId);
  } else {
    query = query.eq("created_by", userId);
  }

  // 4. Apply additional filters
  if (trainingId) {
    query = query.eq("training_id", trainingId);
  }

  // 5. Execute query and handle errors
  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(`Failed to fetch sessions: ${error.message}`);
  }

  // 6. Return typed data
  return data;
}
```

### Service Conventions

**✅ DO:**
- Accept business parameters (userId, orgId, filters)
- Use AuthenticatedClient.getClient() for database access
- Throw custom error types (DatabaseError, NotFoundError)
- Return properly typed data
- Document context-based behavior
- Keep functions pure (no side effects)

**❌ DON'T:**
- Accept token parameters (authentication is automatic)
- Catch and swallow errors (let them bubble up)
- Mix business logic with queries
- Return raw Supabase responses
- Use `any` types

---

## State Management Strategy

### When to Use Zustand Stores

**Use stores when:**
- ✅ Multiple components need the same data
- ✅ Need optimistic UI updates
- ✅ Complex state (sorting, filtering, pagination)
- ✅ CRUD operations (create, update, delete)
- ✅ Want centralized loading/error state

**Example: sessionsStore.ts**
```typescript
export const sessionsStore = create<SessionsStore>((set) => ({
  sessions: [],
  loading: false,
  error: null,

  fetchSessions: async (userId: string, orgId?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await getSessionsService(userId, orgId);
      set({ sessions: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createSession: async (input, userId, orgId) => {
    try {
      const newSession = await createSessionService(input, userId, orgId);
      // Optimistic update: immediately show in UI
      set((state) => ({ sessions: [newSession, ...state.sessions] }));
    } catch (error) {
      set({ error: error.message });
      throw error; // Re-throw for component error handling
    }
  },
}));
```

### When to Use Service Hooks

**Use hooks when:**
- ✅ Simple data fetching for single component
- ✅ Read-only operations
- ✅ Want automatic refetch on dependency change
- ✅ Don't need shared state

**Example: useSessionsQuery.ts**
```typescript
export function useSessionsQuery(trainingId?: string) {
  const { userId, orgId } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSessionsService(userId, orgId, trainingId);
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, orgId, trainingId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sessions, loading, error, refetch };
}
```

**Usage in component:**
```typescript
function SessionsList({ trainingId }) {
  const { sessions, loading, error, refetch } = useSessionsQuery(trainingId);

  if (loading) return <Spinner />;
  if (error) return <ErrorView message={error} />;

  return <SessionList data={sessions} onRefresh={refetch} />;
}
```

---

## Multi-Tenancy Model

### Data Isolation Strategy

Every table that contains user/org data has:
1. `created_by: text` - Clerk user ID (always required)
2. `organization_id: text` - Clerk org ID (nullable)

**Access Rules:**
- **Personal items**: `organization_id IS NULL` + `created_by = userId`
- **Organization items**: `organization_id = orgId`

### RLS Policy Pattern

```sql
-- SELECT: Can see own items OR items in your org
CREATE POLICY "Users can view sessions"
  ON sessions FOR SELECT
  USING (
    created_by = (auth.jwt() ->> 'sub')
    OR organization_id = (auth.jwt() ->> 'org_id')
  );

-- INSERT: Can create items for self in current org
CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (
    created_by = (auth.jwt() ->> 'sub')
    AND (
      organization_id = (auth.jwt() ->> 'org_id')
      OR organization_id IS NULL
    )
  );

-- UPDATE/DELETE: Can only modify own items
CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (created_by = (auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (created_by = (auth.jwt() ->> 'sub'));
```

### Organization Context Switching

**User Flow:**
```
1. User opens app → Loads in last active org context
2. User taps org switcher → Shows list of orgs + personal workspace
3. User selects "Personal Workspace" → orgId becomes null
4. User selects "Team Alpha" → orgId becomes "org_abc123"
5. All subsequent queries filter by new orgId
```

**Implementation:**
```typescript
// useAuth hook provides current context
const { userId, orgId } = useAuth();

// All service calls use current context
await getSessionsService(userId, orgId);
await getWeaponsService(orgId);
await getLoadoutsService(userId, orgId);
```

---

## Database Schema

### Core Tables

#### sessions
Training session records.

```sql
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid REFERENCES trainings(id) ON DELETE SET NULL,
  organization_id text,
  created_by text NOT NULL,
  name text NOT NULL,
  session_type text CHECK (session_type IN ('steel', 'paper')),
  day_period text CHECK (day_period IN ('day', 'night')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

**Relationships:**
- Belongs to `trainings` (optional)
- Belongs to organization (Clerk org_id)
- Created by user (Clerk user_id)

#### trainings
Training program records.

```sql
CREATE TABLE trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text,
  created_by text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

#### weapon_models
Reference data for weapon specifications.

```sql
CREATE TABLE weapon_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  weapon_name text,
  manufacturer text,
  weapon_type text,
  caliber text,
  effective_range_m numeric,
  barrel_length_cm numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(name, caliber)
);
```

**Access:** Public read (all users can see)

#### weapons
Organization's weapon inventory.

```sql
CREATE TABLE weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weapon_model_id uuid REFERENCES weapon_models(id) ON DELETE RESTRICT,
  organization_id text NOT NULL,
  serial_number text UNIQUE,
  last_maintenance_date date,
  round_count int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

**Access:** Organization members only

#### user_loadouts
User's equipment configuration.

```sql
CREATE TABLE user_loadouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  organization_id text,
  name text NOT NULL,
  weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL,
  sight_id uuid REFERENCES sights(id) ON DELETE SET NULL,
  zero_distance_m int,
  zero_conditions jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, name)
);
```

**Access:** Hybrid (user can see own + org loadouts)

### Entity Relationships

```
trainings (1) ───┐
                 │
                 ├──< sessions (N)
                 │
                 └──< [future] detections (N)

weapon_models (1) ──< weapons (N) ──< user_loadouts (N)
sight_models (1) ──< sights (N) ──< user_loadouts (N)

organizations (Clerk)
  ├──< trainings
  ├──< sessions
  ├──< weapons
  ├──< sights
  └──< user_loadouts (shared)

users (Clerk)
  ├──< trainings (created_by)
  ├──< sessions (created_by)
  └──< user_loadouts (user_id)
```

---

## Decision Tree: When to Use What

### I need to fetch data from the database

```
START: Need to fetch data
  │
  ├─ Is this for a single component?
  │  └─ YES → Create service hook (useEntities.ts)
  │      - Wraps service function
  │      - Returns { data, loading, error, refetch }
  │      - Auto-refetches on dependency change
  │
  └─ Is this shared across multiple components?
     └─ YES → Create Zustand store (entitiesStore.ts)
         - Calls service functions
         - Manages global state
         - Provides actions (fetch, create, update, delete)
```

### I need to create a new database table

```
START: Adding new feature with database table
  │
  ├─ 1. Create migration (supabase/migrations/)
  │    - Define table schema
  │    - Add organization_id and created_by columns
  │    - Create indexes
  │    - Enable RLS
  │    - Add RLS policies
  │
  ├─ 2. Run migration and generate types
  │    - npx supabase db push (local)
  │    - npx supabase gen types (generate types)
  │
  ├─ 3. Create service layer (services/entityService.ts)
  │    - getEntitiesService(userId, orgId)
  │    - createEntityService(input, userId, orgId)
  │    - updateEntityService(id, input)
  │    - deleteEntityService(id)
  │
  ├─ 4. Decide on state management
  │    ├─ Simple queries → Create service hook (hooks/services/)
  │    └─ Complex state → Create Zustand store (store/)
  │
  └─ 5. Create UI components (modules/[feature]/)
       - Use store or hooks for data
       - Handle loading/error states
```

### I'm getting permission errors

```
START: Getting permission denied or empty results
  │
  ├─ Check RLS policies
  │    - Does policy exist for operation (SELECT/INSERT/UPDATE/DELETE)?
  │    - Does policy correctly reference auth.jwt() claims?
  │
  ├─ Check JWT token
  │    - Is "supabase" template configured in Clerk?
  │    - Does token include sub, org_id, org_role claims?
  │    - Verify in Clerk dashboard → JWT Templates
  │
  ├─ Check service layer
  │    - Is AuthenticatedClient.getClient() being used?
  │    - Are userId and orgId being passed correctly?
  │
  └─ Check context filtering
       - Personal context: Should filter by created_by
       - Org context: Should filter by organization_id
       - Is the correct context being used?
```

---

## Common Patterns & Examples

### Pattern 1: Fetching Data with Context

```typescript
// Component
function SessionsList() {
  const { sessions, loading, error, fetchSessions } = useStore(sessionsStore);
  const { userId, orgId } = useAuth();

  useEffect(() => {
    // Automatically fetches based on current context
    fetchSessions(userId, orgId);
  }, [userId, orgId]);

  // Rest of component...
}
```

### Pattern 2: Creating Records

```typescript
// Component
function CreateSessionModal() {
  const { createSession } = useStore(sessionsStore);
  const { userId, orgId } = useAuth();

  const handleSubmit = async (input: CreateSessionInput) => {
    try {
      await createSession(input, userId, orgId!);
      Alert.alert("Success", "Session created");
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) {
        Alert.alert("Validation Error", error.message);
      } else {
        Alert.alert("Error", "Failed to create session");
      }
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

### Pattern 3: Updating Records

```typescript
// Component
function EditSessionModal({ sessionId }: { sessionId: string }) {
  const { updateSession } = useStore(sessionsStore);

  const handleSubmit = async (input: UpdateSessionInput) => {
    try {
      await updateSession(sessionId, input);
      Alert.alert("Success", "Session updated");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update session");
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

### Pattern 4: Context Switching

```typescript
// Organization switcher
function OrganizationSwitcher() {
  const { organization, setActive } = useOrganization();
  const { fetchSessions } = useStore(sessionsStore);
  const { userId } = useAuth();

  const handleSwitch = async (orgId: string | null) => {
    // Switch context
    if (orgId) {
      await setActive({ organization: orgId });
    } else {
      await setActive({ organization: null });
    }

    // Refetch data in new context
    await fetchSessions(userId, orgId);
  };

  return (
    <OrganizationList
      organizations={organizations}
      onSelect={handleSwitch}
    />
  );
}
```

### Pattern 5: Read-Only Service Hook

```typescript
// Hook
export function useWeaponModels() {
  const [models, setModels] = useState<WeaponModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeaponsModelsService()
      .then(setModels)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { models, loading };
}

// Component
function WeaponSelector() {
  const { models, loading } = useWeaponModels();

  if (loading) return <Spinner />;

  return (
    <Picker>
      {models.map((model) => (
        <Picker.Item key={model.id} label={model.name} value={model.id} />
      ))}
    </Picker>
  );
}
```

---

## Troubleshooting Guide

### Issue: "AuthenticatedClient not initialized"

**Cause:** App loaded before EnhancedAuthProvider initialized the client.

**Solution:**
```typescript
// app/_layout.tsx
<ClerkProvider>
  <EnhancedAuthProvider>
    <App />
  </EnhancedAuthProvider>
</ClerkProvider>
```

Ensure EnhancedAuthProvider wraps your app and calls `AuthenticatedClient.initialize()`.

---

### Issue: Empty results or "Permission denied"

**Cause:** RLS policies blocking access.

**Debug Steps:**
1. Check if RLS is enabled: `ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;`
2. Verify policies exist for operation (SELECT/INSERT/UPDATE/DELETE)
3. Check JWT token claims in Clerk dashboard
4. Test policy with SQL:
   ```sql
   SELECT auth.jwt() ->> 'sub'; -- Should return user_id
   SELECT auth.jwt() ->> 'org_id'; -- Should return org_id
   ```

---

### Issue: Stale data in UI

**Cause:** Store not refetching after mutation.

**Solution:**
```typescript
// After create/update/delete, refetch
const createSession = async (input, userId, orgId) => {
  await createSessionService(input, userId, orgId);
  await fetchSessions(userId, orgId); // Refetch to ensure consistency
};
```

Or use optimistic updates:
```typescript
const createSession = async (input, userId, orgId) => {
  const newSession = await createSessionService(input, userId, orgId);
  set((state) => ({ sessions: [newSession, ...state.sessions] }));
};
```

---

### Issue: "Token expired" errors

**Cause:** Clerk token expired and not refreshing.

**Solution:** AuthenticatedClient.getClient() always fetches fresh token. If still seeing errors:
1. Check Clerk JWT template expiration settings
2. Verify token provider is calling `getToken({ template: "supabase" })`
3. Ensure not caching tokens in service layer

---

### Issue: Mixed results from personal and org context

**Cause:** Queries not filtering by context properly.

**Solution:**
```typescript
// Service should have clear branching
if (orgId) {
  query = query.eq("organization_id", orgId);
} else {
  query = query.eq("created_by", userId);
}
```

Never mix filters:
```typescript
// ❌ WRONG - Will return nothing if user not in org
query = query.eq("created_by", userId).eq("organization_id", orgId);
```

---

## Best Practices Summary

**Authentication:**
- ✅ Always use AuthenticatedClient in services
- ✅ Never pass tokens as parameters
- ✅ Initialize in EnhancedAuthProvider

**Services:**
- ✅ One service file per database table
- ✅ Functions named [action][Entity]Service
- ✅ Always use TypeScript types
- ✅ Throw custom error types
- ✅ Document context-based behavior

**State Management:**
- ✅ Zustand for shared state
- ✅ Service hooks for component-specific queries
- ✅ Optimistic updates for better UX
- ✅ Reset stores on context switch

**Database:**
- ✅ Always include organization_id and created_by
- ✅ Enable RLS on all tables
- ✅ Create policies for all operations
- ✅ Add indexes on foreign keys
- ✅ Use triggers for updated_at

**Components:**
- ✅ Get userId and orgId from useAuth()
- ✅ Handle loading/error states
- ✅ Show user-friendly error messages
- ✅ Refetch after mutations

**Multi-Tenancy:**
- ✅ Support both personal and org contexts
- ✅ Filter queries based on orgId presence
- ✅ Document which context is used
- ✅ Test both contexts thoroughly

---

## Additional Resources

- **Clerk Docs**: https://clerk.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Expo Router**: https://docs.expo.dev/router/introduction/
- **Zustand**: https://github.com/pmndrs/zustand

---

**Last Updated:** 2025-10-28
