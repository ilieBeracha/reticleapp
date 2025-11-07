# RETICLE - AI Collaboration Rules

**Personal Blueprint for AI-Assisted Development**  
*Last Updated: November 6, 2025*

---

## 🎯 Mission Statement

This document defines how AI collaborators (Claude, Cursor, or any other) should understand and work inside the **Reticle** codebase. These rules reflect **actual implementation patterns**, not generic advice. Every pattern here is derived from real code in this repository.

**Core Philosophy:**
- Clean architecture with clear separation of concerns
- Services handle data, stores manage state, components render UI
- Strong TypeScript everywhere, zero tolerance for `any`
- Context-aware data filtering (personal vs organization)
- Automatic authentication token injection
- Colocated styles, zero separate `.styles.ts` files in components

---

## 📁 Project Structure

```
reticle/
├── app/                          # 🚨 ROUTES ONLY - Expo Router file-based routing
│   ├── (protected)/              # Protected routes (require auth)
│   │   ├── (tabs)/               # Tab navigation
│   │   │   ├── index.tsx         # Home tab
│   │   │   ├── programs.tsx      # Programs tab
│   │   │   ├── calendar.tsx      # Calendar tab
│   │   │   ├── stats.tsx         # Stats tab
│   │   │   ├── camera.tsx        # Camera (hidden)
│   │   │   ├── loadout.tsx       # Loadout (hidden)
│   │   │   ├── weapons.tsx       # Weapons (hidden)
│   │   │   ├── manage.tsx        # Manage (hidden)
│   │   │   ├── settings.tsx      # Settings (hidden)
│   │   │   └── _layout.tsx       # Tabs layout
│   │   ├── invite.tsx            # Org invite
│   │   └── _layout.tsx           # Protected layout
│   ├── auth/                     # Auth routes
│   │   ├── sign-in.tsx
│   │   ├── callback.tsx
│   │   ├── complete-your-account.tsx
│   │   └── _layout.tsx
│   ├── index.tsx                 # Landing/redirect
│   └── _layout.tsx               # Root layout
│
├── modules/                      # 🎨 FEATURE MODULES - Complete features
│   ├── home/                     # Home screen feature
│   │   ├── Home.tsx              # Main screen component
│   │   ├── GreetingSection.tsx
│   │   ├── RecentSessions.tsx
│   │   ├── Stats.tsx
│   │   └── ...
│   ├── camera/                   # Camera detection feature
│   ├── auth/                     # Auth UI feature
│   ├── stats/                    # Stats feature
│   ├── manage/                   # Org management feature
│   └── ...
│
├── components/                   # 🧩 SHARED COMPONENTS
│   ├── ui/                       # Gluestack UI design system
│   │   ├── button/
│   │   ├── card/
│   │   ├── input/
│   │   ├── modal/
│   │   └── ...
│   ├── BaseBottomSheet.tsx       # Reusable bottom sheet
│   ├── CreateSessionBottomSheet.tsx
│   ├── Header.tsx
│   ├── ThemedView.tsx
│   ├── ThemedText.tsx
│   └── ...
│
├── services/                     # 💾 DATA ACCESS LAYER
│   ├── sessionService.ts
│   ├── organizationsService.ts
│   ├── weaponsService.ts
│   ├── loadoutsService.ts
│   └── ...
│
├── store/                        # 📦 STATE MANAGEMENT (Zustand)
│   ├── sessionsStore.ts
│   ├── organizationsStore.ts
│   ├── weaponsStore.ts
│   └── ...
│
├── hooks/                        # 🪝 CUSTOM HOOKS
│   ├── ui/                       # UI-specific hooks
│   │   ├── useColors.ts
│   │   ├── useThemeColor.ts
│   │   └── useColorScheme.ts
│   ├── useEnsureActiveOrg.ts
│   ├── useIsOrgAdmin.ts
│   └── ...
│
├── lib/                          # ⚙️ CORE UTILITIES
│   ├── authenticatedClient.ts    # Auto token injection
│   ├── supabase.ts              # Supabase client config
│   └── errors.ts                # Custom error classes
│
├── contexts/                     # 🔄 REACT CONTEXTS
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
│
├── theme/                        # 🎨 THEME CONFIGURATION
│   ├── colors.ts                # Light/dark color schemes
│   ├── globals.ts
│   └── themeProvider.tsx
│
├── types/                        # 📝 TYPE DEFINITIONS
│   ├── database.ts              # Generated Supabase types
│   ├── api.ts
│   └── organizations.ts
│
├── constants/                    # 📐 CONSTANTS
│   └── Colors.ts
│
├── assets/                       # 🖼️ STATIC ASSETS
│   ├── fonts/
│   ├── images/
│   └── brand/
│
└── supabase/                     # 🗄️ DATABASE
    └── migrations/
```

---

## 🏗️ Architecture Principles

### 1. Data Flow Pattern (MANDATORY)

**ALWAYS follow this exact flow:**

```
Component
  ↓ calls
Hook / Store
  ↓ calls
Service Layer
  ↓ calls
AuthenticatedClient.getClient()
  ↓ automatic token injection
Supabase Client + RLS
  ↓
Database
```

**NEVER:**
- ❌ Pass tokens as parameters to service functions
- ❌ Create Supabase clients directly in components or hooks
- ❌ Access `AuthenticatedClient` outside of service layer
- ❌ Mix direct DB queries with service layer calls

**ALWAYS:**
- ✅ Use `AuthenticatedClient.getClient()` in service functions
- ✅ Let services handle ALL database operations
- ✅ Token injection is automatic and invisible to services
- ✅ RLS policies enforce permissions at database level

### 2. Context-Based Data Filtering

Every user operates in one of two contexts:

1. **Personal Context** (`orgId = null | undefined`): User's personal data only
2. **Organization Context** (`orgId = "org_xxx"`): Organization shared data

**Service Implementation Pattern:**

```typescript
export async function getEntitiesService(
  userId: string,
  orgId?: string | null
): Promise<Entity[]> {
  const client = await AuthenticatedClient.getClient();

  let query = client.from("entities").select("*");

  if (orgId) {
    // ORGANIZATION CONTEXT: Get all entities in this org
    query = query.eq("organization_id", orgId);
  } else {
    // PERSONAL CONTEXT: Get only entities created by this user
    query = query.eq("created_by", userId).is("organization_id", null);
  }

  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message);
  return data || [];
}
```

**Component Usage:**

```typescript
const { user } = useAuth();
const { selectedOrgId } = useOrganizationsStore();

// selectedOrgId is null for personal context
// selectedOrgId is "org_xxx" for org context
await getEntitiesService(user.id, selectedOrgId);
```

---

## 📋 File Naming Conventions

### Routes (in `app/` only)
- `index.tsx` - Default route for directory
- `[id].tsx` - Dynamic route segment
- `(group)/` - Route group (doesn't affect URL)
- `_layout.tsx` - Layout file (not a route)

### Components (modules & components folders)
- `Home.tsx` - Screen component (PascalCase)
- `RecentSessions.tsx` - Feature component (PascalCase)
- `BaseBottomSheet.tsx` - Reusable component (PascalCase)
- Named exports preferred: `export function Home() {}`

### Services
- `sessionService.ts` - camelCase with Service suffix
- Functions: `getSessionsService`, `createSessionService`, etc.
- ALWAYS return typed data
- ALWAYS throw custom errors (DatabaseError, NotFoundError, etc.)

### Stores
- `sessionsStore.ts` - camelCase with Store suffix
- Export as: `export const sessionStatsStore = create<SessionStatsStore>(...)`
- Use with: `const { sessions } = useStore(sessionStatsStore)`

### Hooks
- `useColors.ts` - camelCase with `use` prefix
- `useEnsureActiveOrg.ts` - Domain-specific hooks
- `/hooks/ui/` - UI-related hooks only

### Types
- `database.ts` - Generated Supabase types
- `api.ts` - API request/response types
- `organizations.ts` - Domain-specific types

---

## 🎨 Component Structure Rules

### Standard Component Pattern

```typescript
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface FeatureCardProps {
  title: string;
  count: number;
  onPress: () => void;
}

export function FeatureCard({ title, count, onPress }: FeatureCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Ionicons name="star" size={24} color={colors.blue} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.count, { color: colors.textMuted }]}>{count}</Text>
    </View>
  );
}

// ✅ Styles colocated at bottom of file
const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  count: {
    fontSize: 14,
    fontWeight: "500",
  },
});
```

### Component Rules

**DO:**
- ✅ Named exports: `export function ComponentName() {}`
- ✅ Props interface above component
- ✅ Use `useColors()` hook for theme colors
- ✅ Colocate styles at bottom with `StyleSheet.create()`
- ✅ Dynamic colors: `{ color: colors.text }`
- ✅ Use Ionicons for icons
- ✅ Import paths: `@/components/...`, `@/hooks/...`, etc.

**DON'T:**
- ❌ Default exports: `export default function Component()`
- ❌ Separate `.styles.ts` files
- ❌ Inline styles for complex components
- ❌ Hardcoded colors (use theme colors)
- ❌ Using `any` types

---

## 💾 Service Layer Pattern

### Service File Structure

```typescript
// services/entitiesService.ts

import { AuthenticatedClient, DatabaseError, NotFoundError } from "@/lib/authenticatedClient";
import type { Entity, CreateEntityInput, UpdateEntityInput } from "@/types/database";

/**
 * Get all entities for user (personal or org context)
 * @param userId - Current user ID (from Supabase auth)
 * @param orgId - Optional organization ID for org context
 */
export async function getEntitiesService(
  userId: string,
  orgId?: string | null
): Promise<Entity[]> {
  const client = await AuthenticatedClient.getClient();

  let query = client.from("entities").select("*").order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  } else {
    query = query.eq("created_by", userId).is("organization_id", null);
  }

  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message);
  return data || [];
}

/**
 * Get single entity by ID
 */
export async function getEntityService(entityId: string): Promise<Entity> {
  const client = await AuthenticatedClient.getClient();

  const { data, error } = await client
    .from("entities")
    .select("*")
    .eq("id", entityId)
    .single();

  if (error) throw new NotFoundError(`Entity ${entityId} not found`);
  return data;
}

/**
 * Create a new entity
 */
export async function createEntityService(
  input: CreateEntityInput,
  userId: string,
  orgId?: string | null
): Promise<Entity> {
  const client = await AuthenticatedClient.getClient();

  const { data, error } = await client
    .from("entities")
    .insert({
      ...input,
      created_by: userId,
      organization_id: orgId || null,
    })
    .select()
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}

/**
 * Update an entity (partial update)
 */
export async function updateEntityService(
  entityId: string,
  input: UpdateEntityInput
): Promise<Entity> {
  const client = await AuthenticatedClient.getClient();

  const { data, error } = await client
    .from("entities")
    .update(input)
    .eq("id", entityId)
    .select()
    .single();

  if (error) throw new DatabaseError(error.message);
  return data;
}

/**
 * Delete an entity
 */
export async function deleteEntityService(entityId: string): Promise<void> {
  const client = await AuthenticatedClient.getClient();

  const { error } = await client
    .from("entities")
    .delete()
    .eq("id", entityId);

  if (error) throw new DatabaseError(error.message);
}
```

### Service Rules

**Structure:**
- One file per entity/domain: `sessionService.ts`, `weaponsService.ts`
- Functions named: `[action][Entity]Service`
  - `getSessionsService()`, `createSessionService()`, etc.
- ALWAYS use `AuthenticatedClient.getClient()` at the start
- NEVER accept token parameters

**Error Handling:**
- Import custom errors: `DatabaseError`, `NotFoundError`, `ValidationError`
- Throw specific error types based on failure mode
- Let errors bubble up (don't catch silently)

**JSDoc Comments:**
- Document all parameters
- Explain context behavior (personal vs org)
- Include return type in description

**TypeScript:**
- Strong types for all parameters and returns
- Use generated types from `types/database.ts`
- Never use `any`

---

## 📦 Store Pattern (Zustand)

### Store File Structure

```typescript
// store/entitiesStore.ts

import {
  createEntityService,
  CreateEntityInput,
  deleteEntityService,
  getEntitiesService,
  Entity,
  updateEntityService,
  UpdateEntityInput,
} from "@/services/entityService";
import { create } from "zustand";

interface EntitiesStore {
  // State
  entities: Entity[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchEntities: (userId: string, orgId?: string | null) => Promise<void>;
  createEntity: (input: CreateEntityInput, userId: string, orgId?: string | null) => Promise<Entity>;
  updateEntity: (entityId: string, input: UpdateEntityInput) => Promise<Entity>;
  deleteEntity: (entityId: string) => Promise<void>;
  resetEntities: () => void;
}

export const entitiesStore = create<EntitiesStore>((set, get) => ({
  // Initial state
  entities: [],
  loading: false,
  error: null,

  // Fetch all entities
  fetchEntities: async (userId: string, orgId?: string | null) => {
    try {
      set({ loading: true, error: null });
      const entities = await getEntitiesService(userId, orgId);
      set({ entities, loading: false });
    } catch (err: any) {
      console.error("Error fetching entities:", err);
      set({ error: err.message, entities: [], loading: false });
    }
  },

  // Create entity with optimistic update
  createEntity: async (input: CreateEntityInput, userId: string, orgId?: string | null) => {
    try {
      set({ loading: true, error: null });
      const newEntity = await createEntityService(input, userId, orgId);
      
      // Add to beginning of list
      set((state) => ({
        entities: [newEntity, ...state.entities],
        loading: false,
      }));
      
      return newEntity;
    } catch (err: any) {
      console.error("Error creating entity:", err);
      set({ error: err.message, loading: false });
      throw err; // Re-throw for component error handling
    }
  },

  // Update entity in place
  updateEntity: async (entityId: string, input: UpdateEntityInput) => {
    try {
      set({ loading: true, error: null });
      const updated = await updateEntityService(entityId, input);
      
      set((state) => ({
        entities: state.entities.map((e) => (e.id === entityId ? updated : e)),
        loading: false,
      }));
      
      return updated;
    } catch (err: any) {
      console.error("Error updating entity:", err);
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Delete entity
  deleteEntity: async (entityId: string) => {
    try {
      set({ loading: true, error: null });
      await deleteEntityService(entityId);
      
      set((state) => ({
        entities: state.entities.filter((e) => e.id !== entityId),
        loading: false,
      }));
    } catch (err: any) {
      console.error("Error deleting entity:", err);
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Reset state (on logout, context switch)
  resetEntities: () => set({ entities: [], loading: false, error: null }),
}));
```

### Store Usage in Components

```typescript
import { useStore } from "zustand";
import { entitiesStore } from "@/store/entitiesStore";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationsStore } from "@/store/organizationsStore";

export function EntitiesList() {
  const { user } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();
  const { entities, loading, error, fetchEntities } = useStore(entitiesStore);

  useEffect(() => {
    if (user?.id) {
      fetchEntities(user.id, selectedOrgId);
    }
  }, [user?.id, selectedOrgId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorView message={error} />;

  return (
    <View>
      {entities.map((entity) => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </View>
  );
}
```

### Store Rules

**When to Create a Store:**
- Multiple components need the same data
- Need CRUD operations with optimistic updates
- Want centralized loading/error state
- Data needs to persist across screen navigations

**Structure:**
- One store per domain/entity
- Interface defines state + actions
- Export as: `export const entityStore = create<EntityStore>(...)`
- Use in components: `const { data } = useStore(entityStore)`

**Actions:**
- Call service layer functions (NEVER direct DB access)
- Update state optimistically for better UX
- Handle loading/error states consistently
- Provide `reset` function for cleanup

**State Management:**
- Keep stores focused on single responsibility
- Avoid "god stores" with everything
- Use `set()` for immutable updates
- Use `get()` to access current state inside actions

---

## 🎨 Styling & Theming

### Theme Colors

**ALWAYS use the `useColors()` hook:**

```typescript
import { useColors } from "@/hooks/ui/useColors";

export function ThemedComponent() {
  const colors = useColors();

  return (
    <View style={{ backgroundColor: colors.card }}>
      <Text style={{ color: colors.text }}>Title</Text>
      <Text style={{ color: colors.textMuted }}>Subtitle</Text>
    </View>
  );
}
```

**Available Colors:**

```typescript
colors.text           // Primary text
colors.textMuted      // Secondary/muted text
colors.background     // Screen background
colors.card           // Card background
colors.cardBackground // Alternate card bg
colors.border         // Border color
colors.tint           // Primary tint/brand color
colors.icon           // Icon color

// Semantic colors
colors.blue           // Primary actions, links
colors.green          // Success states
colors.red            // Error states, delete
colors.orange         // Warnings
colors.yellow         // Highlights
colors.purple         // Creative accents
colors.pink           // Pink accents
colors.teal           // Communication
colors.indigo         // System features
```

### Styling Pattern

**Colocated StyleSheet at Bottom:**

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
});
```

**Rules:**
- ✅ Use `StyleSheet.create()` at bottom of file
- ✅ Static styles in StyleSheet, dynamic colors inline
- ✅ Colocate styles with component (no separate files)
- ❌ NEVER create separate `.styles.ts` files
- ❌ NEVER use inline objects for complex styles

---

## 🪝 Hooks Pattern

### Custom Hook Types

**1. UI Hooks** (`hooks/ui/`)
```typescript
// hooks/ui/useColors.ts
export function useColors() {
  const text = useThemeColor({}, "text");
  const background = useThemeColor({}, "background");
  // ... all theme colors
  return { text, background, ... };
}
```

**2. Data Hooks** (optional, for simple queries)
```typescript
// hooks/useEntities.ts
export function useEntities(orgId?: string | null) {
  const { user } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      const data = await getEntitiesService(user.id, orgId);
      setEntities(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [user?.id, orgId]);

  return { entities, loading, error, refetch };
}
```

**3. Domain Hooks** (auth, org, permissions)
```typescript
// hooks/useIsOrgAdmin.ts
export function useIsOrgAdmin(orgId: string): boolean {
  // Domain-specific logic
}
```

### Hook Rules

- Prefer stores for shared state, hooks for component-specific data
- Always return loading/error states for async operations
- Use TypeScript return types
- Follow `use` prefix convention

---

## 🔐 Authentication Pattern

### Auth Context Usage

```typescript
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedComponent() {
  const { user, session, loading, signOut } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <SignInPrompt />;

  return <Content user={user} />;
}
```

**Available:**
- `user` - Supabase User object
- `session` - Supabase Session object
- `loading` - Initial auth check loading state
- `signIn(email, password)` - Email/password sign in
- `signInWithOAuth(provider)` - OAuth sign in (Google, Apple)
- `signOut()` - Sign out current user

### Organization Context

```typescript
import { useOrganizationsStore } from "@/store/organizationsStore";

export function ContextAwareComponent() {
  const { selectedOrgId, allOrgs } = useOrganizationsStore();
  const { user } = useAuth();

  const isPersonalContext = !selectedOrgId;
  const currentOrg = allOrgs.find(o => o.id === selectedOrgId);

  // Fetch data based on context
  useEffect(() => {
    fetchData(user.id, selectedOrgId);
  }, [user?.id, selectedOrgId]);
}
```

---

## ❌ Error Handling

### Custom Error Types

```typescript
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  PermissionError,
  NetworkError,
} from "@/lib/errors";
```

### Error Handling Pattern

**In Services:**
```typescript
export async function getEntityService(id: string): Promise<Entity> {
  const client = await AuthenticatedClient.getClient();

  const { data, error } = await client
    .from("entities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new DatabaseError(error.message);
  if (!data) throw new NotFoundError(`Entity ${id} not found`);
  return data;
}
```

**In Stores:**
```typescript
fetchEntities: async (userId: string, orgId?: string | null) => {
  try {
    set({ loading: true, error: null });
    const entities = await getEntitiesService(userId, orgId);
    set({ entities, loading: false });
  } catch (err: any) {
    console.error("Error fetching entities:", err);
    set({ error: err.message, entities: [], loading: false });
  }
}
```

**In Components:**
```typescript
const handleCreate = async () => {
  try {
    await createEntity(input, user.id, orgId);
    Alert.alert("Success", "Entity created");
  } catch (error: any) {
    if (error instanceof ValidationError) {
      Alert.alert("Validation Error", error.message);
    } else if (error instanceof PermissionError) {
      Alert.alert("Permission Denied", "You don't have access");
    } else {
      Alert.alert("Error", "Something went wrong");
    }
  }
};
```

---

## 🚫 Forbidden Patterns

### NEVER Do These Things

❌ **Pass tokens to services:**
```typescript
// ❌ WRONG
getSessionsService(token, userId, orgId);
```

❌ **Direct Supabase client in components:**
```typescript
// ❌ WRONG
const client = await getAuthenticatedClient();
const { data } = await client.from("sessions").select();
```

❌ **Business logic in components:**
```typescript
// ❌ WRONG - Move to service layer
const handleCreate = async () => {
  const client = await getAuthenticatedClient();
  const { data } = await client.from("sessions").insert({ ... });
  // ... lots of logic
};
```

❌ **Mixed patterns (direct DB + service layer):**
```typescript
// ❌ WRONG - Pick one pattern
const sessions = await getSessionsService(userId); // Service
const trainings = await client.from("trainings").select(); // Direct
```

❌ **Using `any` types:**
```typescript
// ❌ WRONG
function processData(data: any) { ... }

// ✅ CORRECT
function processData(data: Entity[]) { ... }
```

❌ **Separate styles files:**
```typescript
// ❌ WRONG
import { styles } from "./Component.styles";

// ✅ CORRECT - Colocate at bottom
const styles = StyleSheet.create({ ... });
```

❌ **Ignoring errors silently:**
```typescript
// ❌ WRONG
try {
  await createEntity();
} catch (error) {
  // Silent failure
}

// ✅ CORRECT
try {
  await createEntity();
} catch (error) {
  console.error("Error creating entity:", error);
  set({ error: error.message });
  throw error;
}
```

---

## ✅ Correct Patterns (Quick Reference)

### Component
```typescript
import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  title: string;
}

export function Component({ title }: Props) {
  const colors = useColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 18, fontWeight: "700" },
});
```

### Service
```typescript
import { AuthenticatedClient, DatabaseError } from "@/lib/authenticatedClient";
import type { Entity } from "@/types/database";

export async function getEntitiesService(
  userId: string,
  orgId?: string | null
): Promise<Entity[]> {
  const client = await AuthenticatedClient.getClient();
  
  let query = client.from("entities").select("*");
  
  if (orgId) {
    query = query.eq("organization_id", orgId);
  } else {
    query = query.eq("created_by", userId).is("organization_id", null);
  }
  
  const { data, error } = await query;
  if (error) throw new DatabaseError(error.message);
  return data || [];
}
```

### Store
```typescript
import { create } from "zustand";
import { getEntitiesService, Entity } from "@/services/entityService";

interface EntitiesStore {
  entities: Entity[];
  loading: boolean;
  error: string | null;
  fetchEntities: (userId: string, orgId?: string | null) => Promise<void>;
  resetEntities: () => void;
}

export const entitiesStore = create<EntitiesStore>((set) => ({
  entities: [],
  loading: false,
  error: null,

  fetchEntities: async (userId: string, orgId?: string | null) => {
    try {
      set({ loading: true, error: null });
      const entities = await getEntitiesService(userId, orgId);
      set({ entities, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  resetEntities: () => set({ entities: [], loading: false, error: null }),
}));
```

### Component Using Store
```typescript
import { useStore } from "zustand";
import { entitiesStore } from "@/store/entitiesStore";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationsStore } from "@/store/organizationsStore";

export function EntitiesList() {
  const { user } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();
  const { entities, loading, fetchEntities } = useStore(entitiesStore);

  useEffect(() => {
    if (user?.id) {
      fetchEntities(user.id, selectedOrgId);
    }
  }, [user?.id, selectedOrgId]);

  if (loading) return <LoadingSpinner />;

  return (
    <View>
      {entities.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </View>
  );
}
```

---

## 🗄️ Database Schema Conventions

### Table Structure
```sql
CREATE TABLE entities (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenancy (Supabase auth)
  organization_id text,  -- Nullable for personal items
  created_by text NOT NULL,  -- User ID (always required)

  -- Foreign keys
  parent_id uuid REFERENCES parents(id) ON DELETE CASCADE,

  -- Data columns
  name text NOT NULL,
  description text,
  metadata jsonb,

  -- Audit columns (ALWAYS include)
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for foreign keys
CREATE INDEX idx_entities_organization_id ON entities(organization_id);
CREATE INDEX idx_entities_created_by ON entities(created_by);
CREATE INDEX idx_entities_parent_id ON entities(parent_id);

-- Updated_at trigger
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policy Pattern
```sql
-- Enable RLS
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- SELECT: Can see own items OR items in same org
CREATE POLICY "Users can view entities"
  ON entities FOR SELECT
  USING (
    created_by = auth.jwt() ->> 'sub'
    OR organization_id = auth.jwt() ->> 'org_id'
  );

-- INSERT: Can only create for self
CREATE POLICY "Users can create entities"
  ON entities FOR INSERT
  WITH CHECK (
    created_by = auth.jwt() ->> 'sub'
    AND (organization_id = auth.jwt() ->> 'org_id' OR organization_id IS NULL)
  );

-- UPDATE: Can only modify own items
CREATE POLICY "Users can update own entities"
  ON entities FOR UPDATE
  USING (created_by = auth.jwt() ->> 'sub');

-- DELETE: Can only delete own items
CREATE POLICY "Users can delete own entities"
  ON entities FOR DELETE
  USING (created_by = auth.jwt() ->> 'sub');
```

---

## 🚀 Adding a New Feature (Migration Checklist)

### 1. Database Schema
- [ ] Create migration file: `supabase/migrations/[timestamp]_[name].sql`
- [ ] Add table with `organization_id`, `created_by`, `created_at`, `updated_at`
- [ ] Add foreign key constraints with `ON DELETE CASCADE`
- [ ] Create indexes for foreign keys
- [ ] Add `updated_at` trigger
- [ ] Enable RLS
- [ ] Add RLS policies (SELECT, INSERT, UPDATE, DELETE)

### 2. Generate Types
- [ ] Run: `npx supabase gen types typescript --project-id <id> > types/database.ts`
- [ ] Export types for the new entity

### 3. Service Layer
- [ ] Create `services/[entity]Service.ts`
- [ ] Add `get[Entity]Service(userId, orgId)`
- [ ] Add `create[Entity]Service(input, userId, orgId)`
- [ ] Add `update[Entity]Service(id, input)`
- [ ] Add `delete[Entity]Service(id)`
- [ ] Add JSDoc comments
- [ ] Add proper error handling

### 4. State Management
- [ ] Create `store/[entity]Store.ts`
- [ ] Define state interface
- [ ] Add `fetch`, `create`, `update`, `delete` actions
- [ ] Add `reset` action
- [ ] Call service functions
- [ ] Handle loading/error states

### 5. Components
- [ ] Create feature module in `modules/[feature]/`
- [ ] Create main screen component
- [ ] Create sub-components as needed
- [ ] Use `useColors()` for theme
- [ ] Colocate styles at bottom

### 6. Routes (if needed)
- [ ] Add route in `app/(protected)/(tabs)/[feature].tsx`
- [ ] Add tab configuration in `app/(protected)/(tabs)/_layout.tsx`
- [ ] Import and use module component

### 7. Test
- [ ] Test personal context (no orgId)
- [ ] Test organization context (with orgId)
- [ ] Test RLS policies work correctly
- [ ] Test error handling

---

## 📝 TypeScript Rules

### Strict Mode ALWAYS
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Type Everything
```typescript
// ✅ CORRECT - Explicit types
interface Props {
  title: string;
  count: number;
  onPress: () => void;
}

export function Component({ title, count, onPress }: Props): JSX.Element {
  const [data, setData] = useState<Entity[]>([]);
  return <View />;
}

// ❌ WRONG - No types
export function Component({ title, count, onPress }) {
  const [data, setData] = useState([]);
  return <View />;
}
```

### Generated Types from Database
```typescript
// Import from generated types
import type { Entity, CreateEntityInput, UpdateEntityInput } from "@/types/database";

// Use in service functions
export async function createEntityService(
  input: CreateEntityInput,
  userId: string
): Promise<Entity> {
  // ...
}
```

---

## 🎯 Import Path Aliases

**Configured in `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./components/*"],
      "@/modules/*": ["./modules/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/services/*": ["./services/*"],
      "@/store/*": ["./store/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/theme/*": ["./theme/*"]
    }
  }
}
```

**Usage:**
```typescript
import { useColors } from "@/hooks/ui/useColors";
import { getSessionsService } from "@/services/sessionService";
import { sessionStatsStore } from "@/store/sessionsStore";
import { Entity } from "@/types/database";
import { ThemedView } from "@/components/ThemedView";
import { Home } from "@/modules/home/Home";
```

---

## 🎨 UI Component Library

### Gluestack UI (`components/ui/`)

**Pre-built Components:**
- `Button`, `Input`, `Text`, `Card`, `Modal`, `Badge`
- `HStack`, `VStack`, `Box`, `Grid`, `Center`
- `Avatar`, `Icon`, `Spinner`, `Toast`
- `Accordion`, `Menu`, `Popover`, `Tooltip`
- And many more...

**Usage:**
```typescript
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";

export function Form() {
  return (
    <VStack space="md" className="p-4">
      <Input>
        <InputField placeholder="Enter name" />
      </Input>
      <Button>
        <ButtonText>Submit</ButtonText>
      </Button>
    </VStack>
  );
}
```

### Custom Shared Components

**Reusable across app:**
- `BaseBottomSheet` - Bottom sheet modal wrapper
- `Header` - App header with org switcher
- `ThemedView` - Theme-aware View
- `ThemedText` - Theme-aware Text
- `CreateSessionBottomSheet` - Create session modal
- And more...

---

## 🏃 Quick Start for AI Collaborators

### When Adding a New Feature

1. **Read the current patterns** - Don't assume, check existing code
2. **Follow the architecture** - Services → Stores → Components
3. **Use the checklist** - Follow the migration checklist above
4. **Match the style** - Naming, structure, patterns must match existing code
5. **Test both contexts** - Personal and organization modes

### When Modifying Existing Code

1. **Understand the data flow** - Trace from component to service to database
2. **Maintain consistency** - If one service does X, all services do X
3. **Don't break patterns** - If it works differently, it's probably wrong
4. **Update related files** - Service change? Update store. Store change? Update component.

### When Debugging

1. **Check the service layer first** - Is data being fetched correctly?
2. **Check the store** - Is state being updated?
3. **Check the component** - Is it using the store correctly?
4. **Check RLS policies** - Are permissions blocking data access?
5. **Check context** - Is `selectedOrgId` being passed correctly?

---

## 🧪 Testing Guidelines

### Test Coverage Areas

1. **Service Layer**
   - Personal context filtering works
   - Organization context filtering works
   - Error handling throws correct error types
   - Token injection is automatic

2. **Stores**
   - State updates correctly after actions
   - Loading/error states work
   - Optimistic updates work
   - Reset functions clear state

3. **Components**
   - Renders correctly with data
   - Handles loading state
   - Handles error state
   - Handles empty state

4. **RLS Policies**
   - Users can see own data
   - Users can see org data if member
   - Users cannot see other users' personal data
   - Users cannot modify others' data

---

## 🎓 Learning Resources

### Key Files to Study

**Architecture:**
- `lib/authenticatedClient.ts` - Token injection pattern
- `lib/errors.ts` - Error handling
- `contexts/AuthContext.tsx` - Auth flow

**Data Layer:**
- `services/sessionService.ts` - Service pattern
- `store/sessionsStore.ts` - Store pattern
- `store/organizationsStore.ts` - Complex store

**UI Layer:**
- `modules/home/Home.tsx` - Screen structure
- `modules/home/RecentSessions.tsx` - Feature component
- `components/BaseBottomSheet.tsx` - Reusable component
- `components/CreateSessionBottomSheet.tsx` - Form modal

**Theme:**
- `theme/colors.ts` - Color definitions
- `hooks/ui/useColors.ts` - Color hook

### External Documentation

- [Expo Router](https://docs.expo.dev/router/introduction/) - File-based routing
- [Supabase](https://supabase.com/docs) - Database and auth
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction) - State management
- [Gluestack UI](https://ui.gluestack.io/) - Component library
- [NativeWind](https://www.nativewind.dev/) - Tailwind for React Native

---

## 💡 Philosophy & Principles

### Code Quality Standards

1. **Clarity over cleverness** - Code should be obvious, not clever
2. **Consistency is king** - Follow existing patterns exactly
3. **Types catch bugs** - Strong TypeScript prevents runtime errors
4. **Colocate related code** - Keep things together that change together
5. **Services own data access** - Components never touch DB directly
6. **Context-aware by default** - Always handle personal vs org context

### Development Workflow

1. **Read before writing** - Understand existing patterns first
2. **Small, focused changes** - One feature at a time
3. **Test both contexts** - Personal and organization modes
4. **Update related files** - Keep everything in sync
5. **Clean up after yourself** - Remove unused imports, console.logs

### When to Ask for Help

- If the pattern isn't clear from existing code
- If multiple approaches exist and you're unsure which to follow
- If you need to modify core architecture (AuthenticatedClient, error handling, etc.)
- If RLS policies need to change

---

## 📊 Performance Best Practices

1. **Use `React.memo`** for expensive list items
2. **Optimize images** with `expo-image`
3. **Use `FlatList`** for long lists (never ScrollView with map)
4. **Minimize re-renders** with proper dependency arrays
5. **Lazy load routes** where appropriate
6. **Cache expensive calculations** with `useMemo`
7. **Debounce search inputs** to reduce API calls

---

## 🔒 Security Checklist

- [ ] NEVER commit `.env` files
- [ ] Use `EXPO_PUBLIC_*` for client-side env vars only
- [ ] Sensitive data stays in RLS-protected tables
- [ ] Token handling is automatic (never manual)
- [ ] Validate user input before sending to services
- [ ] RLS policies enforce all permissions
- [ ] Use parameterized queries (Supabase does this)
- [ ] Log security events (auth failures, permission denials)

---

## 🎉 Final Notes

This document reflects **real, working patterns** from the Reticle codebase. It's not theoretical - every example here is based on actual implementation. When in doubt, **check existing code** for the pattern, then follow it exactly.

**Golden Rules:**
1. Services handle ALL database operations
2. AuthenticatedClient automatically injects tokens
3. Stores manage shared state
4. Components render UI and call stores
5. Context-based filtering (personal vs org)
6. Strong TypeScript everywhere
7. Colocate styles at bottom of components

**Remember:** Consistency > Cleverness. If your code looks different from existing code, you're probably doing it wrong.

---

*Built with ❤️ for sniper training excellence.*
*Last Updated: November 6, 2025*

