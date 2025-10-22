# Implementation Plan

- [x] 1. Create modules directory structure

  - Create `modules/` directory at project root
  - Create subdirectories for each feature module: `auth/`, `complete-account/`, `home/`, `members/`
  - Create `components/` subdirectory within each module
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Migrate Auth module

  - [x] 2.1 Move Auth components to module

    - Move `components/screens/Auth/SignIn.tsx` to `modules/auth/components/SignIn.tsx`
    - Move `components/screens/Auth/components/SignInHeader.tsx` to `modules/auth/components/SignInHeader.tsx`
    - Move `components/screens/Auth/components/SocialButtons.tsx` to `modules/auth/components/SocialButtons.tsx`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Update Auth component imports

    - Update internal imports within Auth components to use new paths
    - Update `app/auth/sign-in.tsx` to import from `@/modules/auth/components/SignIn`
    - _Requirements: 2.4, 7.1, 7.2_

  - [x] 2.3 Delete old Auth directory
    - Delete `components/screens/Auth/` directory and all its contents
    - _Requirements: 6.1, 6.2_

- [x] 3. Migrate CompleteAccount module

  - [x] 3.1 Move CompleteAccount components to module

    - Move `components/screens/CompleteAccount/index.tsx` to `modules/complete-account/components/CompleteAccount.tsx`
    - Move `components/screens/CompleteAccount/components/FormHeader.tsx` to `modules/complete-account/components/FormHeader.tsx`
    - Move `components/screens/CompleteAccount/components/AccountForm.tsx` to `modules/complete-account/components/AccountForm.tsx`
    - Move `components/screens/CompleteAccount/hooks/useAccountCompletion.ts` to `modules/complete-account/hooks/useAccountCompletion.ts`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Update CompleteAccount component imports

    - Update internal imports within CompleteAccount components to use new paths
    - Update `app/auth/complete-your-account.tsx` to import from `@/modules/complete-account/components/CompleteAccount`
    - _Requirements: 3.4, 7.1, 7.2_

  - [x] 3.3 Delete old CompleteAccount directory
    - Delete `components/screens/CompleteAccount/` directory and all its contents
    - _Requirements: 6.1, 6.2_

- [x] 4. Migrate Members module

  - [x] 4.1 Move Members components to module

    - Move `components/screens/Members/index.tsx` to `modules/members/components/Members.tsx`
    - Move `components/screens/Members/components/MembersList.tsx` to `modules/members/components/MembersList.tsx`
    - Move `components/screens/Members/components/MemberItem.tsx` to `modules/members/components/MemberItem.tsx`
    - Update internal imports within Members components to use relative paths
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.2 Update Members route import

    - Update `app/(home)/members.tsx` to import from `@/modules/members/components/Members`
    - _Requirements: 5.4, 7.1, 7.2_

  - [x] 4.3 Delete old Members directory
    - Delete `components/screens/Members/` directory and all its contents
    - _Requirements: 6.1, 6.2_

- [x] 5. Migrate Home module

  - [x] 5.1 Move Home components to module

    - Move `components/screens/Home/index.tsx` to `modules/home/components/Home.tsx`
    - Move `components/screens/Home/components/GreetingSection.tsx` to `modules/home/components/GreetingSection.tsx`
    - Move `components/screens/Home/components/LastRecap.tsx` to `modules/home/components/LastRecap.tsx`
    - Move `components/screens/Home/components/OrganizationSection.tsx` to `modules/home/components/OrganizationSection.tsx`
    - Move `components/screens/Home/components/QuickActionsSection.tsx` to `modules/home/components/QuickActionsSection.tsx`
    - Move `components/screens/Home/components/StatsSection.tsx` to `modules/home/components/StatsSection.tsx`
    - Create `modules/home/components/LastRecap/` directory
    - Move `components/screens/Home/components/LastRecap/ActivityChart.tsx` to `modules/home/components/LastRecap/ActivityChart.tsx`
    - Move `components/screens/Home/components/LastRecap/EmptyState.tsx` to `modules/home/components/LastRecap/EmptyState.tsx`
    - Move `components/screens/Home/components/LastRecap/WeeklyStats.tsx` to `modules/home/components/LastRecap/WeeklyStats.tsx`
    - Update internal imports within Home components to use relative paths
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Update Home route import

    - Update `app/(home)/index.tsx` to import from `@/modules/home/components/Home`
    - _Requirements: 4.4, 7.1, 7.2_

  - [x] 5.3 Delete old Home directory
    - Delete `components/screens/Home/` directory and all its contents
    - _Requirements: 6.1, 6.2_

- [x] 6. Final verification and cleanup

  - [x] 6.1 Delete empty screens directory

    - Delete `components/screens/` directory (should be empty after all migrations)
    - _Requirements: 6.1, 6.2_

  - [x] 6.2 Run full TypeScript compilation

    - Execute `npx tsc --noEmit` to verify no type errors
    - Fix any compilation errors that appear
    - _Requirements: 7.3, 8.4_

  - [x] 6.3 Verify global components remain unchanged
    - Confirm `components/modals/` directory is intact
    - Confirm `components/forms/` directory is intact
    - Confirm `components/Header/` directory is intact
    - Confirm `components/BottomNav/` directory is intact
    - Confirm `components/ui/` directory is intact
    - Confirm other global components (ThemedView, ThemedText, etc.) are intact
    - _Requirements: 6.3, 6.4_
