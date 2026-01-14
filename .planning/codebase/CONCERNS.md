# Codebase Concerns

**Analysis Date:** 2026-01-14

## Tech Debt

**Large Files (>1200 lines) - Refactoring Needed:**
- Issue: Multiple files exceed 1200 lines, making them hard to maintain
- Files:
  - `app/(protected)/sessionDetail.tsx` (2241 lines) - Session detail manages too many concerns
  - `constants/categoryDrills.ts` (1963 lines) - Massive constant file
  - `components/shared/ui/icon/index.tsx` (1585 lines) - Should be generated
  - `app/(protected)/(tabs)/team.tsx` (1560 lines) - Team tab too complex
  - `services/session/mutations.ts` (1465 lines) - Complex lifecycle logic
  - `app/(protected)/activeSession.tsx` (1443 lines) - Monolithic screen
  - `supabase/functions/generate-insights/index.ts` (1245 lines) - Multi-mode function
- Impact: Difficult to modify, high cognitive load, hard to test
- Fix approach: Split into smaller, single-responsibility modules

**Missing Notification Implementations:**
- Issue: TODO comments indicate incomplete notification features
- Files:
  - `services/session/mutations.ts` (lines 316-320) - Training session notifications stub
  - `services/invitationService.ts` (line 259) - Team invitation notifications stub
  - `hooks/usePushNotifications.ts` (line 230) - Navigation from notifications not implemented
- Impact: Users don't receive expected notifications
- Fix approach: Complete Edge Function implementations for notifications

**Type Safety Weaknesses:**
- Issue: Widespread use of `any` type in error handling
- Files:
  - `store/teamStore.tsx` - catch blocks use `error: any`
  - `store/sessionStore.tsx` - multiple any casts
  - `store/garminStore.tsx` - type assertions
  - `services/session/targets.ts` - unsafe type casting
- Impact: Type checker can't catch errors at compile time
- Fix approach: Create proper error type unions, improve error typing

## Known Bugs

**Race condition in subscription updates (reported in docs):**
- Symptoms: User shows incorrect state briefly after payment
- Trigger: Fast navigation after state change, before webhook processes
- Workaround: State eventually corrects via webhook
- Root cause: Client state update race with server-side webhook processing
- Files: Documented in `.context/MASTER.md`

## Security Considerations

**Environment Variables Exposure:**
- Risk: API keys stored in `.env.local` should be verified as gitignored
- Files: `.env.local` contains `RESEND_API_KEY`, `SENTRY_AUTH_TOKEN`, `OPEN_AI_KEY`, `PINECONE_API_KEY`
- Current mitigation: File appears to be gitignored
- Recommendations: Create `.env.example` template, verify `.gitignore` includes `.env.local`

**API Keys in Edge Functions:**
- Risk: API keys used in fetch calls could be logged
- Files: `supabase/functions/generate-insights/index.ts` (lines 618, 817, 1075)
- Current mitigation: Keys from environment variables
- Recommendations: Verify API keys are never logged; use Supabase's built-in secret management

**Web Platform XSS Potential:**
- Risk: Uses `dangerouslySetInnerHTML` for CSS injection
- Files: `components/shared/ui/gluestack-ui-provider/index.web.tsx`
- Current mitigation: CSS variables should be static
- Recommendations: Verify CSS variables are sanitized and never include user input

## Performance Bottlenecks

**Potential N+1 Query Patterns:**
- Problem: Verdict queries loop over sessions instead of batch fetch
- Files:
  - `app/(protected)/trainingReport.tsx` (line 244)
  - `app/(protected)/sessionResults.tsx` (line 113)
- Measurement: Not profiled
- Cause: Individual queries in map operations
- Improvement path: Use batch queries or join operations

**Large Constant Loading:**
- Problem: All drills loaded into memory at startup
- Files: `constants/categoryDrills.ts` (1963 lines, ~61KB)
- Measurement: Not profiled
- Cause: Eager loading of entire drill library
- Improvement path: Lazy-load or paginate drill library

**Timeline Data Processing:**
- Problem: Processing full timeline arrays without limits
- Files: `services/session/timelineService.ts` (line 276)
- Cause: slice() operations on potentially large arrays
- Improvement path: Add pagination or streaming for large datasets

## Fragile Areas

**Garmin Watch Integration:**
- Files: `store/garminStore.tsx`, `services/garminService.ts`
- Why fragile: Three-phase sync protocol (SESSION_SUMMARY → SESSION_DETAILS → TIMELINE_COMPLETE) with timeout handling
- Common failures: Connection drops mid-sync, message ordering issues
- Safe modification: Add comprehensive tests, document flow in detail
- Test coverage: No tests

**Session Lifecycle Logic:**
- Files: `services/session/mutations.ts`
- Why fragile: 27+ error throws, complex completion criteria, multiple async operations
- Common failures: Partial updates on error, race conditions with watch data
- Safe modification: Add transaction guarantees, comprehensive tests
- Test coverage: No tests

**Authentication Middleware:**
- Files: `contexts/AuthContext.tsx`
- Why fragile: Auth state changes trigger cascading UI updates
- Common failures: Session race conditions, token refresh timing
- Safe modification: Test auth flows thoroughly before changes

## Scaling Limits

**Supabase Tier Limits:**
- Current capacity: Depends on Supabase plan
- Limit: Database connections, storage, bandwidth
- Symptoms at limit: 429 rate limit errors, slow queries
- Scaling path: Upgrade Supabase plan as needed

## Dependencies at Risk

**react-native-garmin-connect:**
- Risk: Niche package, limited community support
- Impact: Watch integration depends entirely on this package
- Migration plan: May need to fork or create native module if abandoned

**Patch-Package Usage:**
- Risk: `postinstall: patch-package` applies patches silently
- Files: `package.json`
- Impact: Could hide upstream dependency issues
- Recommendations: Document what patches are applied and why

## Missing Critical Features

**No Test Suite:**
- Problem: Zero test files in codebase
- Current workaround: Manual testing
- Blocks: Automated regression testing, CI/CD confidence
- Implementation complexity: Medium (requires framework setup + writing tests)

**Missing Push Notification Navigation:**
- Problem: Push notifications don't deep-link to relevant screens
- Files: `hooks/usePushNotifications.ts` (line 230)
- Current workaround: User manually navigates after notification
- Blocks: Good notification UX

## Test Coverage Gaps

**All Critical Paths Untested:**
- What's not tested: Session lifecycle, drill completion, team operations, watch sync
- Risk: Regressions go unnoticed
- Priority: HIGH
- Difficulty to test: Medium (requires Supabase mocking setup)

**Priority Test Files Needed:**
1. `services/session/mutations.test.ts` - Session lifecycle
2. `services/teamService.test.ts` - Team CRUD
3. `store/teamStore.test.tsx` - State management
4. `services/detectionService.test.ts` - ML detection handling
5. `store/garminStore.test.tsx` - Watch sync protocol

## Logging & Monitoring

**Excessive Console Logging:**
- Risk: Sensitive data logged in production
- Files: `store/garminStore.tsx`, `services/detectionService.ts`, `services/session/targets.ts`
- Current mitigation: None
- Recommendations: Gate verbose logs behind debug flag, use structured logging

**Missing Error Context:**
- Issue: Generic `console.error()` without operation context
- Files: Multiple store files
- Impact: Hard to debug production issues
- Fix: Add contextual logging with operation names and parameters

## Race Conditions

**Watch Session Start:**
- Files: `store/garminStore.tsx` (lines 59-65)
- Issue: Callback refs could be overwritten by rapid calls
- Impact: Lost watch data if multiple sessions started quickly
- Fix: Use callback queue instead of single callback

**Concurrent Store Updates:**
- Files: `store/garminStore.tsx` (lines 457-472)
- Issue: setState() called from async callbacks without locking
- Impact: Out-of-order updates if watch messages arrive quickly
- Fix: Use Zustand middleware to queue updates

---

*Concerns audit: 2026-01-14*
*Update as issues are fixed or new ones discovered*
