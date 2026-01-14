# Architecture

**Analysis Date:** 2026-01-14

## Pattern Overview

**Overall:** Mobile-First Monolith with Service-Oriented Layer

**Key Characteristics:**
- Expo/React Native mobile application with file-based routing
- Layered architecture with clear separation of concerns
- Team-first data model (no organization layer)
- Zustand for client state + React Context for global app state
- Supabase for backend (PostgreSQL + Auth + Storage + Edge Functions)

## Layers

**Presentation Layer (UI/Screens):**
- Purpose: Render UI and handle user interactions
- Contains: Expo Router pages, React components, form sheets
- Location: `app/`, `components/`
- Depends on: Hooks, Stores, Contexts
- Used by: End users via the app

**State Management Layer:**
- Purpose: Manage application state and cache data
- Contains: Zustand stores (domain state), React Contexts (global state)
- Location: `store/`, `contexts/`
- Depends on: Services for data operations
- Used by: Components and hooks

**Service Layer (Business Logic):**
- Purpose: Encapsulate business logic and data operations
- Contains: Domain services (team, session, training, detection, garmin)
- Location: `services/`
- Depends on: Supabase client (`lib/supabase.ts`)
- Used by: Stores and components

**Data Access Layer:**
- Purpose: Interface with external data sources
- Contains: Supabase client configuration
- Location: `lib/supabase.ts`
- Depends on: @supabase/supabase-js
- Used by: Services exclusively

**Utility Layer:**
- Purpose: Shared helpers and pure functions
- Contains: Calculations, formatting, validation
- Location: `utils/`, `helpers/`
- Depends on: Nothing (pure functions)
- Used by: All layers

## Data Flow

**Authentication Flow:**

1. App startup → `app/_layout.tsx` initializes providers (Sentry, Auth, Theme, Modal)
2. Auth check → `app/index.tsx` uses `useAuth()` to check session
3. Supabase Auth → `contexts/AuthContext.tsx` manages session state
4. Auth events → INITIAL_SESSION, SIGNED_IN, SIGNED_OUT trigger navigation
5. Post-login → `useTeamStore.getState().loadTeams()` loads team data

**Session Data Flow:**

1. User action → Component calls store method
2. Store → Calls service function
3. Service → Makes Supabase API call via `lib/supabase.ts`
4. Response → Service normalizes data
5. Store → Updates state with normalized data
6. Component → Subscribes via hook, re-renders

**Training Session Lifecycle:**

1. User starts session → `services/session/mutations.ts` → `createAndStartSession()`
2. Session active → Component tracks state via `store/sessionStore.tsx`
3. Target scanned → `services/detectionService.ts` → ML API detection
4. Results saved → `services/session/targets.ts` → Supabase insert
5. Session ended → `services/session/mutations.ts` → `endSession()`
6. Insights generated → Edge Function `generate-insights` → Pinecone + Claude

**State Management:**
- In-memory: Zustand stores (cleared on sign out)
- Local: AsyncStorage (user preferences, auth tokens)
- Remote: Supabase PostgreSQL (all persistent data)

## Key Abstractions

**Service:**
- Purpose: Encapsulate domain operations
- Examples: `services/teamService.ts`, `services/sessionService.ts`, `services/trainingService.ts`
- Pattern: Singleton-like (imported as modules)
- Naming: Verb-based actions (`createTeam`, `getSessionById`)

**Store (Zustand):**
- Purpose: Manage domain state with async operations
- Examples: `store/teamStore.tsx`, `store/sessionStore.tsx`, `store/garminStore.tsx`
- Pattern: `{ loading, initialized, error, data, actions }` shape
- Shared: `store/_shared/asyncState.ts`

**Context (React):**
- Purpose: Global app state that rarely changes
- Examples: `contexts/AuthContext.tsx`, `contexts/ThemeContext.tsx`, `contexts/ModalContext.tsx`
- Pattern: Provider at root, hooks for consumption

**Form Sheet:**
- Purpose: Modal forms for data entry
- Examples: `app/(protected)/createTraining.tsx`, `app/(protected)/createSession.tsx`
- Pattern: Expo Router `formSheet` presentation with grab handle

**Custom Hook:**
- Purpose: Encapsulate reusable UI logic
- Examples: `hooks/useAppContext.ts`, `hooks/usePermissions.ts`, `hooks/useOpenWeather.ts`
- Location: `hooks/` with domain subfolders (`hooks/team/`, `hooks/ui/`)

## Entry Points

**App Entry:**
- Location: `expo-router/entry` (from `package.json` main field)
- Triggers: App launch
- Responsibilities: Bootstrap Expo Router

**Root Layout:**
- Location: `app/_layout.tsx`
- Triggers: App start
- Responsibilities: Initialize Sentry, providers, fonts, splash screen

**Auth Check:**
- Location: `app/index.tsx`
- Triggers: Root route access
- Responsibilities: Redirect to `/auth/sign-in` or `/(protected)/(tabs)`

**Protected Layout:**
- Location: `app/(protected)/_layout.tsx`
- Triggers: Authenticated navigation
- Responsibilities: Stack navigation with modal screens

**Tab Navigation:**
- Location: `app/(protected)/(tabs)/_layout.tsx`
- Triggers: Tab selection
- Responsibilities: 4-tab bottom navigation (Home, Insights, Loadout, Team)

## Error Handling

**Strategy:** Custom error classes, catch at service/store boundaries, log to Sentry

**Patterns:**
- Services throw custom errors (`lib/errors.ts`): `ServiceError`, `AuthenticationError`, `ValidationError`, `NetworkError`, `DatabaseError`, `NotFoundError`, `PermissionError`
- Stores catch errors and set `error` state
- Components display error UI from store state
- Sentry captures unhandled exceptions

**Error Types:**
- Validation errors → Thrown before API calls
- Network errors → Caught in service layer
- Database errors → Propagated with context

## Cross-Cutting Concerns

**Logging:**
- Development: `console.log` with service prefixes (e.g., `[DetectionService]`)
- Production: Sentry for errors, Edge Function logs for backend
- Pattern: Contextual logging with operation names

**Validation:**
- Service layer validates inputs before Supabase calls
- Type guards for constants (`isValidDrillGoal`)
- Zod not currently used (manual validation)

**Authentication:**
- Supabase Auth manages sessions
- `AuthContext` wraps entire app
- Protected routes via Expo Router groups

**State Persistence:**
- AsyncStorage for local preferences
- Supabase for all persistent data
- Zustand stores are in-memory only

**Theming:**
- `ThemeContext` manages light/dark mode
- `hooks/ui/useColors.ts` provides theme-aware colors
- NativeWind/Tailwind for styling

---

*Architecture analysis: 2026-01-14*
*Update when major patterns change*
