# Account Separation Architecture Change - Audit Request

## Overview of the Change

The app has undergone a significant architectural shift from a **unified data display** to **separated account contexts**.

### BEFORE (Old Architecture)
- **Single unified view**: All user data (personal + team) was displayed together
- **Team tab**: A dedicated tab existed to view team-specific content
- **Loadout tab**: Showed ALL weapons (personal + team assigned + team pool) in one list with filters
- **Insights**: Single insights dashboard showing all user sessions regardless of context
- **Home page**: Unified home showing all user activity
- **Data mixing**: Sessions, weapons, stats from all sources were aggregated together
- **Tab visibility**: All 4 tabs always visible (Home, Insights, Loadout, Team)

### AFTER (New Architecture)
- **Account switcher**: Users can switch between "Personal" mode and specific team accounts
- **Context separation**: When in Personal mode, only personal data is shown. When in Team mode, only that team's data is shown
- **Dynamic tab visibility**: 
  - Personal mode: 2 tabs (Home, Insights)
  - Team mode: 4 tabs (Home, Insights, Loadout, Team)
- **Separated components**:
  - `InsightsDashboard` → routes to `PersonalInsights` or `TeamInsights`
  - `loadout.tsx` → routes to `PersonalLoadout` or `TeamLoadout`
  - `UnifiedHomePage` → displays differently based on `isTeamMode`

### Key State Management
- `useTeamStore` has:
  - `activeTeamId`: `null` = Personal mode, `string` = Team mode
  - `personalModeExplicit`: Flag to prevent auto-selection glitches
- Components check `activeTeamId` to determine which view to render

### Role-Based Views (Team Mode)
- **Commander** (owner/commander role): Sees rankings, comparisons, full analytics, can add weapons
- **Member** (squad_commander/soldier role): Sees personal stats vs team average, no rankings, collaborative view

---

## Audit Request

**Please run through the entire app and identify ALL places that might need adjustment for the new account separation logic.**

Look for:

### 1. Data Fetching Issues
- [ ] API calls that don't filter by `teamId` when they should
- [ ] Queries that mix personal and team data
- [ ] Places where `userId` is used but `teamId` context is missing

### 2. UI/UX Inconsistencies
- [ ] Components still showing "all data" instead of context-filtered data
- [ ] Headers/titles that don't reflect the current context (Personal vs Team)
- [ ] Missing context indicators (which account is active)
- [ ] Confusing navigation or dead-ends when switching modes

### 3. Tab & Navigation Problems
- [ ] Tabs that should be hidden in Personal mode but aren't
- [ ] Routes that break when accessed in wrong mode
- [ ] Back navigation that lands on wrong context

### 4. Session-Related Issues
- [ ] Session creation not respecting team context
- [ ] Session history mixing contexts
- [ ] Session details showing wrong team association
- [ ] Active session banner appearing in wrong context

### 5. Weapon/Loadout Issues
- [ ] Weapon selection not filtered by context
- [ ] Default weapon logic conflicting between modes
- [ ] Team weapons appearing in personal mode or vice versa

### 6. Statistics & Analytics
- [ ] Stats aggregations including wrong data
- [ ] Charts showing mixed context data
- [ ] Leaderboards appearing where they shouldn't (member view)

### 7. Team-Specific Features
- [ ] Team management features accessible in personal mode
- [ ] Member lists loading when not needed
- [ ] Role checks missing where needed

### 8. Edge Cases
- [ ] What happens when user has no teams?
- [ ] What happens when user is removed from active team?
- [ ] What happens during team switch mid-session?
- [ ] What happens when deep-linking to team-only routes in personal mode?

---

## Files to Check

### Core Routing/State
- `app/(protected)/(tabs)/_layout.tsx` - Tab visibility logic
- `stores/teamStore.tsx` - Account state management
- `components/home/UnifiedHomePage/` - Home page context handling

### Data Fetching Hooks
- `hooks/session/useActiveSession.ts` - Session context
- `hooks/home/useTeamHomePage.ts` - Team home data
- `hooks/insights/usePersonalInsights.ts` - Personal insights
- `hooks/insights/useTeamInsights.ts` - Team insights
- `services/session/queries.ts` - Session queries

### UI Components
- `components/insights/` - All insight components
- `components/loadout/` - Loadout components
- `components/home/TeamHomePage/` - Team home components
- `components/weapons/` - Weapon selection/display

### Session Flow
- `app/(protected)/sessionDetail.tsx` - Session detail page
- `app/(protected)/sessionResults.tsx` - Session results
- `app/(protected)/sessionHistory.tsx` - Session history
- `components/session-creation/` - Session creation flow

---

## Expected Output

For each issue found, please provide:
1. **File path** and line number(s)
2. **Current behavior** (what it does now)
3. **Expected behavior** (what it should do)
4. **Severity**: Critical / Medium / Low
5. **Suggested fix** (brief description)

Format:
```
### [Component/File Name]
- **File**: path/to/file.tsx:123
- **Issue**: Description of the problem
- **Current**: What happens now
- **Expected**: What should happen
- **Severity**: Critical/Medium/Low
- **Fix**: Brief suggestion
```

---

## Notes

- The account switcher is in the Header component
- Personal mode should feel like a "solo training" experience
- Team mode should feel like you're "logged into" that specific team
- Data should NEVER leak between contexts
- The app defaults to Personal mode on fresh load (`personalModeExplicit: true`)
