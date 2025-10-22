# Design Document

## Overview

This design document outlines the approach for refactoring the current folder structure to align with the documented modular architecture. The refactoring will move feature-specific components from `components/screens/` into self-contained `modules/` while preserving global reusable components in the `components/` directory.

The refactoring is purely structural and will not change any functionality. All imports will be updated automatically to maintain application behavior.

## Architecture

### Current Structure

```
components/
├── screens/
│   ├── Auth/
│   │   ├── SignIn.tsx
│   │   └── components/
│   │       ├── SignInHeader.tsx
│   │       └── SocialButtons.tsx
│   ├── CompleteAccount/
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── FormHeader.tsx
│   │       └── AccountForm.tsx
│   ├── Home/
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── GreetingSection.tsx
│   │       └── LastRecap/
│   └── Members/
│       ├── index.tsx
│       └── components/
│           ├── MembersList.tsx
│           └── MemberItem.tsx
├── modals/
├── forms/
├── Header/
├── BottomNav/
└── [other global components]
```

### Target Structure

```
modules/
├── auth/
│   └── components/
│       ├── SignIn.tsx
│       ├── SignInHeader.tsx
│       └── SocialButtons.tsx
├── complete-account/
│   └── components/
│       ├── CompleteAccount.tsx
│       ├── FormHeader.tsx
│       └── AccountForm.tsx
├── home/
│   └── components/
│       ├── Home.tsx
│       ├── GreetingSection.tsx
│       └── LastRecap/
│           ├── index.tsx
│           ├── ActivityChart.tsx
│           ├── WeeklyStats.tsx
│           └── EmptyState.tsx
└── members/
    └── components/
        ├── Members.tsx
        ├── MembersList.tsx
        └── MemberItem.tsx

components/
├── modals/          # Global modals (remain)
├── forms/           # Global form components (remain)
├── Header/          # Global header (remains)
├── BottomNav/       # Global navigation (remains)
└── [other global components]
```

## Components and Interfaces

### Module Structure Pattern

Each module follows this pattern:

```
modules/
└── [feature-name]/
    ├── components/     # Feature-specific UI components
    ├── hooks/          # Feature-specific React hooks (if needed)
    ├── services/       # Feature-specific API/business logic (if needed)
    ├── store/          # Feature-specific state management (if needed)
    └── utils/          # Feature-specific utilities (if needed)
```

For this refactoring, we'll primarily create the `components/` subdirectory since most features currently only have UI components.

### Import Path Updates

All imports will follow this pattern:

**Before:**

```typescript
import { SignIn } from "@/components/screens/Auth/SignIn";
import { SignInHeader } from "@/components/screens/Auth/components/SignInHeader";
```

**After:**

```typescript
import { SignIn } from "@/modules/auth/components/SignIn";
import { SignInHeader } from "@/modules/auth/components/SignInHeader";
```

### Files Requiring Import Updates

Based on the current structure, the following file types will need import updates:

1. **Route files in `app/`**

   - `app/auth/sign-in.tsx`
   - `app/auth/complete-your-account.tsx`
   - `app/(home)/index.tsx`
   - `app/(home)/members.tsx`

2. **Component files that import from screens**

   - Any components that import from `components/screens/`
   - Cross-module imports (e.g., if Home imports from Auth)

3. **Test files** (if they exist)
   - Any test files importing screen components

## Data Models

No data models are affected by this refactoring. The structure change is purely organizational and does not modify:

- Type definitions
- Database schemas
- API contracts
- State management structures

## Error Handling

### Potential Issues and Mitigation

1. **Circular Dependencies**

   - **Risk:** Moving files might expose circular import dependencies
   - **Mitigation:** Review import chains before moving files; break circular dependencies if found

2. **Missing Import Updates**

   - **Risk:** Some imports might be missed during the automated update
   - **Mitigation:** Run TypeScript compiler after refactoring to catch any missing imports

3. **Relative Path Issues**

   - **Risk:** Relative imports might break when files move
   - **Mitigation:** Use absolute imports with `@/` prefix consistently

4. **Build Errors**
   - **Risk:** Application might not compile after refactoring
   - **Mitigation:** Test compilation after each major module migration

## Testing Strategy

### Verification Steps

1. **Compilation Check**

   - Run `npx tsc --noEmit` to verify TypeScript compilation
   - Ensure no type errors are introduced

2. **Import Verification**

   - Search for any remaining references to `components/screens/`
   - Verify all imports use the new module paths

3. **Runtime Testing**

   - Start the development server
   - Navigate to each screen to verify rendering
   - Test navigation between screens
   - Verify state management still works

4. **File Structure Validation**
   - Verify `components/screens/` directory is empty or removed
   - Confirm all modules have the correct structure
   - Check that global components remain in `components/`

### Rollback Plan

If issues arise:

1. Git can be used to revert changes
2. Each module migration is independent, allowing partial rollback
3. Import paths can be reverted using find-and-replace

## Migration Sequence

The refactoring will be performed in this order to minimize risk:

1. **Create `modules/` directory structure**

   - Create empty module directories
   - Establish the folder pattern

2. **Migrate Auth module**

   - Smallest module, good starting point
   - Update imports in `app/auth/sign-in.tsx`

3. **Migrate CompleteAccount module**

   - Similar size to Auth
   - Update imports in `app/auth/complete-your-account.tsx`

4. **Migrate Members module**

   - Medium complexity
   - Update imports in `app/(home)/members.tsx`

5. **Migrate Home module**

   - Largest module with nested components
   - Update imports in `app/(home)/index.tsx`

6. **Cleanup**

   - Remove empty `components/screens/` directory
   - Verify no remaining references

7. **Final verification**
   - Run TypeScript compiler
   - Test all screens
   - Verify navigation

## Design Decisions

### Why This Structure?

1. **Modularity:** Each feature is self-contained, making it easier to understand and maintain
2. **Scalability:** New features can be added as new modules without cluttering the components directory
3. **Clarity:** Clear separation between global components and feature-specific components
4. **Portability:** Modules can be moved or reused in other projects more easily

### What Stays in `components/`?

Components remain in the global `components/` directory if they:

- Are used across multiple features (e.g., Header, BottomNav)
- Are UI primitives with no business logic (e.g., ThemedText, ThemedView)
- Are global utilities (e.g., modals, forms)

### Import Path Strategy

We'll use absolute imports with the `@/` prefix for all module imports:

- Consistent with existing codebase patterns
- Easier to refactor and move files
- More readable than relative paths

## Future Considerations

After this refactoring, future enhancements could include:

1. **Module-specific hooks:** Move feature-specific hooks from `hooks/` to module directories
2. **Module-specific services:** Create service layers within modules for API calls
3. **Module-specific state:** Move feature-specific Zustand stores into modules
4. **Module exports:** Create index files to simplify imports (e.g., `@/modules/auth`)
