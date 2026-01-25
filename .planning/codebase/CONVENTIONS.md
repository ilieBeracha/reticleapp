# Coding Conventions

**Analysis Date:** 2026-01-14

## Naming Patterns

**Files:**
- PascalCase.tsx for React components (`Avatar.tsx`, `ThemedText.tsx`, `LoadingScreen.tsx`)
- camelCase.ts for services, hooks, utils (`teamService.ts`, `useAppContext.ts`, `detectionSensitivity.ts`)
- kebab-case.tsx for route files (`sign-in.tsx`, `activeSession.tsx`, `sessionDetail.tsx`)
- *.test.ts for test files (not currently used)
- index.ts for barrel exports

**Functions:**
- camelCase for all functions (`createTeam`, `getSessionById`, `normalizeTeamMember`)
- No special prefix for async functions
- `handle{Event}` for event handlers (`handleClick`, `handleSubmit`)
- `use{Name}` for React hooks (`useAppContext`, `useColors`)

**Variables:**
- camelCase for variables (`activeTeam`, `sessionData`, `isLoading`)
- UPPER_SNAKE_CASE for constants (`DRILL_GOAL`, `SESSION_MODE`, `API_URL`)
- No underscore prefix for private members (TypeScript handles visibility)

**Types:**
- PascalCase for interfaces, no I prefix (`User`, not `IUser`)
- PascalCase for type aliases (`UserConfig`, `ResponseData`)
- PascalCase for enum names, UPPER_SNAKE_CASE for values (`DrillGoal.ACCURACY`)
- `{Name}Props` for component props (`AvatarProps`, `HeaderProps`)
- `{Name}State` for state interfaces (`SessionState`, `TeamState`)

## Code Style

**Formatting (`.prettierrc`):**
- Tab width: 2 spaces
- Single quotes for strings
- Trailing commas: ES5 mode
- Print width: 120 characters
- No semicolon omission (semicolons required)

**Linting (`eslint.config.js`):**
- Extends: eslint-config-expo (flat config)
- ESLint 9+ flat config format
- Ignores: `dist/*`
- Run: `npm run lint`

## Import Organization

**Order:**
1. React and React Native imports (`react`, `react-native`, `expo-*`)
2. External packages (`@supabase/supabase-js`, `zustand`, `date-fns`)
3. Internal modules (`@/lib/*`, `@/services/*`, `@/store/*`)
4. Relative imports (`./components`, `../types`)
5. Type imports (usually inline with regular imports)

**Grouping:**
- Blank line between groups
- Sorted alphabetically within each group (not enforced)

**Path Aliases:**
- `@/` maps to project root (`tsconfig.json`)
- Use: `@/lib/supabase`, `@/services/teamService`, `@/hooks/useAppContext`
- Avoid relative imports for cross-directory access

## Error Handling

**Patterns:**
- Custom error classes in `lib/errors.ts`
- Throw errors in services, catch in stores or components
- Use try/catch for async operations
- Log errors with context before throwing

**Error Types (`lib/errors.ts`):**
- `ServiceError` - Base class for service errors
- `AuthenticationError` - Auth failures
- `ValidationError` - Input validation failures
- `NetworkError` - Network/connectivity issues
- `DatabaseError` - Supabase/DB errors
- `NotFoundError` - Resource not found
- `PermissionError` - Authorization failures

**Error Handling Pattern:**
```typescript
try {
  const result = await supabase.from('table').select();
  if (result.error) throw new DatabaseError(result.error.message);
  return result.data;
} catch (error) {
  console.error('[ServiceName] Operation failed:', error);
  throw error;
}
```

## Logging

**Framework:**
- Console.log for development
- Sentry for production error tracking
- Edge Function logs for backend

**Patterns:**
- Service prefix: `[ServiceName] Operation: details`
- Examples: `[DetectionService] Detection result:`, `[Storage] Uploaded:`
- Log state transitions and external API calls
- No sensitive data in logs (avoid user IDs in production)

## Comments

**When to Comment:**
- Explain why, not what (code should be self-documenting)
- Document business rules and edge cases
- Mark TODO items with description

**JSDoc/TSDoc:**
- Required for exported public functions
- Use `@param`, `@returns`, `@throws`, `@example` tags
- Example from `services/detectionService.ts`:
```typescript
/**
 * Analyze A4 document with automatic perspective correction.
 * @param imageUri - URI to the image file
 * @param options - Optional configuration
 * @returns Document analysis response with world coordinates (mm)
 */
```

**Section Headers:**
```typescript
// ═══════════════════════════════════════════════════════════════════
// SECTION NAME
// ═══════════════════════════════════════════════════════════════════
```

**TODO Comments:**
- Format: `// TODO: description`
- Link to issue if exists: `// TODO: Fix race condition (issue #123)`

## Function Design

**Size:**
- Keep under 50 lines where possible
- Extract helpers for complex logic
- One level of abstraction per function

**Parameters:**
- Max 3 parameters preferred
- Use options object for 4+ parameters
- Destructure in parameter list when useful

**Return Values:**
- Explicit return statements
- Return early for guard clauses
- Consistent return types (avoid mixed undefined/null)

## Module Design

**Exports:**
- Named exports preferred (`export function`, `export const`)
- Default exports for React components in some cases
- Export public API from index.ts barrel files

**Barrel Files:**
- index.ts re-exports public API
- Keep internal helpers private (don't export from index)
- Avoid circular dependencies

**Service Pattern:**
```typescript
// services/teamService.ts
import { supabase } from '@/lib/supabase';

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  // Implementation
}

export async function getTeamById(id: string): Promise<Team | null> {
  // Implementation
}
```

## Component Patterns

**Component Structure:**
```typescript
// components/shared/Avatar.tsx
import { View, Image } from 'react-native';

interface AvatarProps {
  source?: { uri: string };
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ source, size = 'md' }: AvatarProps) {
  // Implementation
}
```

**Large Component Organization:**
- Split into `.tsx`, `.styles.ts`, `.types.ts`, `.helpers.ts`
- Example: `components/home/UnifiedHomePage/`
  - `UnifiedHomePage.tsx`
  - `UnifiedHomePage.styles.ts`
  - `UnifiedHomePage.types.ts`
  - `UnifiedHomePage.helpers.ts`
  - `useUnifiedHomePage.ts`

## Store Patterns (Zustand)

**Store Shape:**
```typescript
interface TeamStore {
  // State
  loading: boolean;
  initialized: boolean;
  error: string | null;
  teams: Team[];
  activeTeamId: string | null;

  // Actions
  loadTeams: () => Promise<void>;
  createTeam: (input: CreateTeamInput) => Promise<Team>;
  setActiveTeam: (id: string | null) => void;
}
```

**Usage:**
```typescript
// With selector (prevents unnecessary re-renders)
const teams = useTeamStore((state) => state.teams);

// For actions
const createTeam = useTeamStore((state) => state.createTeam);
```

---

*Convention analysis: 2026-01-14*
*Update when patterns change*
