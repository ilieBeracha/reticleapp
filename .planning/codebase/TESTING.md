# Testing Patterns

**Analysis Date:** 2026-01-14

## Test Framework

**Runner:**
- None currently configured
- No vitest.config.ts, jest.config.js, or similar test configuration found

**Assertion Library:**
- Not applicable (no test framework)

**Run Commands:**
```bash
# No test commands available
# Recommended setup would be:
npm test                              # Run all tests
npm test -- --watch                   # Watch mode
npm test -- path/to/file.test.ts     # Single file
npm run test:coverage                 # Coverage report
```

## Test File Organization

**Location:**
- No test files found in codebase
- Recommended: Co-located with source (`*.test.ts` alongside `*.ts`)

**Naming:**
- No test files exist
- Recommended pattern: `{module-name}.test.ts`

**Recommended Structure:**
```
services/
  teamService.ts
  teamService.test.ts
components/
  Avatar.tsx
  Avatar.test.tsx
hooks/
  useAppContext.ts
  useAppContext.test.ts
```

## Test Structure

**Suite Organization (Recommended):**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ServiceName', () => {
  describe('functionName', () => {
    beforeEach(() => {
      // reset state
    });

    it('should handle valid input', () => {
      // arrange
      const input = createTestInput();

      // act
      const result = functionName(input);

      // assert
      expect(result).toEqual(expectedOutput);
    });

    it('should throw on invalid input', () => {
      expect(() => functionName(null)).toThrow('Invalid input');
    });
  });
});
```

**Patterns (Recommended):**
- Use beforeEach for per-test setup
- Use afterEach to restore mocks
- Explicit arrange/act/assert comments in complex tests
- One assertion focus per test

## Mocking

**Framework (Recommended):**
- Vitest built-in mocking (vi)
- Module mocking via vi.mock()

**Patterns (Recommended):**
```typescript
import { vi } from 'vitest';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));
```

**What to Mock:**
- Supabase client (`@/lib/supabase`)
- External API calls (detection service, weather)
- AsyncStorage operations
- Native modules (Garmin, camera)
- Time/dates for consistent tests

**What NOT to Mock:**
- Pure utility functions (`utils/`, `helpers/`)
- Type definitions
- Constants

## Fixtures and Factories

**Test Data (Recommended Pattern):**
```typescript
// tests/factories/session.ts
export function createTestSession(overrides?: Partial<Session>): Session {
  return {
    id: 'test-session-id',
    user_id: 'test-user-id',
    status: 'active',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestTeam(overrides?: Partial<Team>): Team {
  return {
    id: 'test-team-id',
    name: 'Test Team',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
```

**Location (Recommended):**
- Factory functions: `tests/factories/`
- Shared fixtures: `tests/fixtures/`

## Coverage

**Requirements:**
- Not currently tracked
- No coverage thresholds configured

**Recommended Configuration:**
```javascript
// vitest.config.ts
export default {
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['*.test.ts', '*.config.js', 'node_modules/'],
    },
  },
};
```

**View Coverage (after setup):**
```bash
npm run test:coverage
open coverage/index.html
```

## Test Types

**Unit Tests (Priority: HIGH):**
- Test single function in isolation
- Mock all external dependencies (Supabase, APIs)
- Target: Service layer functions (`services/*.ts`)
- Examples needed:
  - Session lifecycle (`services/session/mutations.ts`)
  - Team operations (`services/teamService.ts`)
  - Detection processing (`services/detectionService.ts`)

**Integration Tests (Priority: MEDIUM):**
- Test multiple modules together
- Mock only external boundaries
- Target: Store actions with service calls
- Examples needed:
  - Team store with teamService
  - Session store with sessionService
  - Garmin store with garminService

**E2E Tests (Priority: LOW):**
- Framework: Detox or Maestro (not configured)
- Target: Critical user flows
- Examples needed:
  - Sign in flow
  - Session creation and completion
  - Target scanning

## Common Patterns

**Async Testing (Recommended):**
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

**Error Testing (Recommended):**
```typescript
it('should throw on invalid input', () => {
  expect(() => validateInput(null)).toThrow('Input required');
});

// Async error
it('should reject on failure', async () => {
  await expect(asyncCall()).rejects.toThrow('Network error');
});
```

**Supabase Mocking (Recommended):**
```typescript
import { vi } from 'vitest';

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: '1', name: 'Test' },
          error: null,
        }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({
      data: { id: '1' },
      error: null,
    }),
  }),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));
```

**Snapshot Testing:**
- Not currently used
- Recommended: Avoid for this codebase (prefer explicit assertions)

## Recommended Test Setup

**1. Install Dependencies:**
```bash
npm install -D vitest @testing-library/react-native @testing-library/jest-native
```

**2. Add vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'android', 'ios'],
    setupFiles: ['./tests/setup.ts'],
  },
});
```

**3. Add Test Script:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

**4. Priority Test Files to Create:**
1. `services/session/mutations.test.ts` - Session lifecycle
2. `services/teamService.test.ts` - Team operations
3. `store/teamStore.test.tsx` - State management
4. `helpers/validation.test.ts` - Input validation
5. `services/detectionService.test.ts` - Detection processing

---

*Testing analysis: 2026-01-14*
*Update when test patterns change*
