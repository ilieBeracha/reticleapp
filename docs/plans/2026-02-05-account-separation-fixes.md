# Account Separation Security Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical security and data isolation issues in the account separation architecture to prevent data leakage between personal and team contexts.

**Architecture:** Four targeted fixes to the session history hook, session queries, session detail authorization, and team store removal handling. Each fix adds context-aware filtering without changing the overall data flow.

**Tech Stack:** React Native, TypeScript, Zustand, Supabase

---

## Task 1: Add Team Context to useSessionHistory

**Files:**
- Modify: `hooks/session/useSessionHistory.ts`

**Step 1: Import useTeamStore**

Add import at line 3:

```typescript
import { useTeamStore } from '@/stores/teamStore';
```

**Step 2: Get activeTeamId from store**

Add after line 41 (after `isFilterSheetOpen` state):

```typescript
// Team context for filtering
const activeTeamId = useTeamStore((state) => state.activeTeamId);
```

**Step 3: Pass teamId to query**

Update lines 55-58 in `fetchSessions`:

```typescript
// Fetch a large batch - we'll filter client-side for responsiveness
const data = await getRecentSessionsWithStats({
  days: 365 * 2, // 2 years
  limit: 500,
  teamId: activeTeamId, // Filter by current context
});
```

**Step 4: Add activeTeamId to useCallback dependency**

Update line 71:

```typescript
}, [activeTeamId]);
```

**Step 5: Clear sessions and refetch on context change**

Add new useEffect after line 76:

```typescript
// Refetch when team context changes
useEffect(() => {
  setSessions([]); // Clear stale data immediately
  fetchSessions(true);
}, [activeTeamId]);
```

**Step 6: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add hooks/session/useSessionHistory.ts
git commit -m "$(cat <<'EOF'
fix(session): filter session history by team context

- Add activeTeamId from teamStore to useSessionHistory
- Pass teamId to getRecentSessionsWithStats query
- Clear and refetch sessions when context changes
- Prevents data leakage between personal and team modes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add User Filter to Personal Session Queries

**Files:**
- Modify: `services/session/queries.ts`

**Step 1: Update getSessions to accept userId**

Find `getSessions` function (around line 330) and update signature:

```typescript
export async function getSessions(options: { teamId?: string | null; userId?: string } = {}): Promise<SessionWithDetails[]> {
  const { teamId, userId } = options;
  let query = supabase.from('sessions').select(SESSION_SELECT_WITH_WEAPON).order('started_at', { ascending: false });

  // Filter by team if provided
  if (teamId !== undefined) {
    if (teamId === null) {
      // Personal mode: filter by user AND no team
      query = query.is('team_id', null);
      if (userId) {
        query = query.eq('user_id', userId);
      }
    } else {
      // Team mode: filter by team only (all team members visible)
      query = query.eq('team_id', teamId);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map(mapSession);
}
```

**Step 2: Update getRecentSessionsWithStats to accept userId**

Find `getRecentSessionsWithStats` function (around line 536) and update to accept userId:

```typescript
export async function getRecentSessionsWithStats(
  options: {
    days?: number;
    limit?: number;
    teamId?: string | null;
    userId?: string; // Add userId parameter
  } = {}
): Promise<SessionWithDetails[]> {
  return withQueryTiming('sessions.getRecentSessionsWithStats', async () => {
    const { days = 7, limit = 20, teamId, userId } = options;
```

**Step 3: Add user filter to personal mode in getRecentSessionsWithStats**

Update the team filter section (around line 560-567):

```typescript
// Filter by team if provided
if (teamId !== undefined) {
  if (teamId === null) {
    // Personal mode: filter by user AND no team
    query = query.is('team_id', null);
    if (userId) {
      query = query.eq('user_id', userId);
    }
  } else {
    // Team mode: filter by team only
    query = query.eq('team_id', teamId);
  }
}
```

**Step 4: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add services/session/queries.ts
git commit -m "$(cat <<'EOF'
fix(queries): add user filter to personal session queries

- getSessions now accepts userId parameter
- getRecentSessionsWithStats now accepts userId parameter
- Personal mode (teamId=null) filters by user_id for isolation
- Team mode shows all team sessions (existing behavior)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add Authorization Check to Session Detail

**Files:**
- Modify: `app/(protected)/sessionDetail.tsx`

**Step 1: Import useTeamStore**

Add import after line 22:

```typescript
import { useTeamStore } from '@/stores/teamStore';
```

**Step 2: Get activeTeamId from store**

Add after line 64 (after `useAuth`):

```typescript
const activeTeamId = useTeamStore((state) => state.activeTeamId);
```

**Step 3: Add authorization state**

Add after line 71 (after `insightsLoading` state):

```typescript
const [unauthorized, setUnauthorized] = useState(false);
```

**Step 4: Add authorization check in loadData**

Update the loadData function (lines 86-105) to validate access:

```typescript
const loadData = async () => {
  setLoading(true);
  setUnauthorized(false);
  try {
    const [sessionData, sessionStats, sessionTargets] = await Promise.all([
      getSessionById(sessionId),
      calculateSessionStats(sessionId),
      getSessionTargetsWithResults(sessionId),
    ]);

    // Authorization check: verify user has access to this session
    if (sessionData) {
      const isPersonalMode = activeTeamId === null;
      const isPersonalSession = sessionData.team_id === null;

      if (isPersonalMode) {
        // In personal mode: only allow personal sessions owned by user
        if (!isPersonalSession || sessionData.user_id !== user?.id) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
      } else {
        // In team mode: only allow sessions from active team
        if (sessionData.team_id !== activeTeamId) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }
      }
    }

    setSession(sessionData);
    setStats(sessionStats);
    setTargets(sessionTargets);
  } catch (error) {
    console.error('Failed to load session details:', error);
  } finally {
    setLoading(false);
  }
};
```

**Step 5: Add unauthorized UI**

Find the loading state render (search for `if (loading)`) and add unauthorized check after it:

```typescript
if (unauthorized) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.loadingContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={[styles.errorText, { color: colors.textSecondary, marginTop: 16 }]}>
          {t('session.unauthorized', 'You do not have access to this session')}
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.cardBackground, marginTop: 24 }]}
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.text }}>{t('common.goBack', 'Go Back')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

**Step 6: Add styles for unauthorized UI**

Add to StyleSheet at end of file:

```typescript
backButton: {
  paddingHorizontal: 24,
  paddingVertical: 12,
  borderRadius: 8,
},
errorText: {
  fontSize: 16,
  textAlign: 'center',
},
```

**Step 7: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add app/\(protected\)/sessionDetail.tsx
git commit -m "$(cat <<'EOF'
fix(session): add authorization check to session detail

- Verify user has access before displaying session
- Personal mode: only show own personal sessions
- Team mode: only show sessions from active team
- Show unauthorized message with back button if access denied

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Handle User Removal from Team

**Files:**
- Modify: `stores/teamStore.tsx`

**Step 1: Add else clause to loadActiveTeam**

Find `loadActiveTeam` function (around line 254) and update:

```typescript
loadActiveTeam: async () => {
  const { activeTeamId } = get();
  if (!activeTeamId) return;

  set({ membersLoading: true });

  try {
    const team = await getTeamWithMembers(activeTeamId);

    // Verify we're still loading for the same team (prevent race condition)
    if (get().activeTeamId !== activeTeamId) return;

    if (team) {
      set({
        activeTeam: team,
        members: team.members || [],
        membersLoading: false,
      });
    } else {
      // Team not found or user removed - clear active team state
      console.warn('[TeamStore] Active team not found, user may have been removed');
      set({
        activeTeamId: null,
        activeTeam: null,
        members: [],
        membersLoading: false,
        personalModeExplicit: false, // Allow re-selection on next load
      });
    }
  } catch (error: any) {
    console.error('Failed to load active team:', error);

    // Check if it's an authorization error (user removed from team)
    if (error?.code === 'PGRST116' || error?.status === 403 || error?.status === 404) {
      console.warn('[TeamStore] Authorization error - clearing active team');
      set({
        activeTeamId: null,
        activeTeam: null,
        members: [],
        membersLoading: false,
        personalModeExplicit: false,
      });
    } else {
      // Network or other error - keep existing data
      set({ membersLoading: false });
    }
  }
},
```

**Step 2: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add stores/teamStore.tsx
git commit -m "$(cat <<'EOF'
fix(teams): handle user removal from active team

- Clear active team state when team not found
- Handle authorization errors (403/404) by clearing state
- Set personalModeExplicit=false to allow re-selection
- Prevents stale UI when user is removed from team

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update useSessionHistory to Pass userId

**Files:**
- Modify: `hooks/session/useSessionHistory.ts`

**Step 1: Import useAuth**

Add import (if not already present):

```typescript
import { useAuth } from '@/contexts/AuthContext';
```

**Step 2: Get user from auth context**

Add after the activeTeamId line:

```typescript
const { user } = useAuth();
```

**Step 3: Pass userId to query**

Update the getRecentSessionsWithStats call:

```typescript
const data = await getRecentSessionsWithStats({
  days: 365 * 2,
  limit: 500,
  teamId: activeTeamId,
  userId: user?.id, // Pass user ID for personal mode filtering
});
```

**Step 4: Add user to dependency array**

Update the useCallback dependency:

```typescript
}, [activeTeamId, user?.id]);
```

**Step 5: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add hooks/session/useSessionHistory.ts
git commit -m "$(cat <<'EOF'
fix(session): pass userId for personal session filtering

- Get user from AuthContext
- Pass userId to getRecentSessionsWithStats
- Ensures personal sessions filtered by current user

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Verification

After all tasks complete:

1. **Test Personal Mode:**
   - Switch to Personal mode
   - Verify session history only shows personal sessions
   - Verify session detail rejects team sessions

2. **Test Team Mode:**
   - Switch to a team
   - Verify session history shows only that team's sessions
   - Verify session detail rejects other team's sessions

3. **Test Team Removal:**
   - (If testable) Remove user from team
   - Verify UI clears and redirects to personal mode

---

## Summary

| Task | File | Issue Fixed |
|------|------|-------------|
| 1 | useSessionHistory.ts | Session history not filtered by context |
| 2 | queries.ts | Missing user filter in personal mode |
| 3 | sessionDetail.tsx | No authorization check |
| 4 | teamStore.tsx | User removal not handled |
| 5 | useSessionHistory.ts | Pass userId for personal filtering |
