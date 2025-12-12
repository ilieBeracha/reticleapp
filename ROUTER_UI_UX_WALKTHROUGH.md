## Router UI/UX Walkthrough (Expo Router)

This document is a **static walkthrough of the current UI/UX** by reading the Expo Router route tree under `app/` and the key components/stores each screen uses.

It covers:
- **Every route/page** (including modal sheets and full-screen flows)
- **What the user can do** on each screen
- **The big flows** a user is likely to complete end-to-end
- **Notable UX inconsistencies / broken links** discovered from the code

---

## 1) High-level UX model

The app is built around **two primary “modes”**:

- **Personal mode**: the user trains alone (no active team context).
  - Implemented as the `/ (protected) /personal/*` tab group.
- **Team mode**: the user is acting inside a selected team.
  - Implemented as the `/ (protected) /team/*` tab group.
  - Entering team mode requires `activeTeamId` to be set in `useTeamStore()`.

The user can switch modes any time via the **Team Switcher** sheet opened from the global header.

---

## 2) Global shell and navigation composition

### Root providers (`app/_layout.tsx`)
The app root wraps the entire router with:
- **UI & theme**: `GluestackUIProvider` + `ThemeContext` (later in protected layout)
- **Auth**: `AuthProvider` (`contexts/AuthContext.tsx`)
- **Modal coordination**: `ModalProvider` (`contexts/ModalContext.tsx`)
- **BottomSheetModalProvider** (gorhom)
- **GestureHandlerRootView**
- **SafeAreaProvider**
- **Sentry** (with replay/feedback integration)

It also shows a **global loading overlay** when `useAuth().transitioning` is true.

### Entry redirect (`app/index.tsx`)
- If auth is loading or transitioning: shows `LoadingScreen`
- If not authenticated: redirects to `/auth/sign-in`
- If authenticated: redirects to `/(protected)/personal`

### Auth stack (`app/auth/_layout.tsx`, `/auth/sign-in`)
- If already authenticated: redirects to `/(protected)/personal`
- Otherwise renders a stack with:
  - `/auth/sign-in` (no header)

### Protected stack (`app/(protected)/_layout.tsx`)
All authenticated UI lives here.

**Global header**
- The stack uses a custom header component: `components/Header.tsx`
- Header provides:
  - **Notifications** button → `/(protected)/notifications`
  - **User avatar** → `/(protected)/userMenu`
  - **Team/Personal label** → `/(protected)/teamSwitcher`

**Presentation styles**
Routes are a mix of:
- **Tabs** (personal/team)
- **iOS form sheets** (`presentation: "formSheet"`, detents configured)
- **Full-screen cards** (`presentation: "card"`)

This mixture is central to the current UX: many tasks open as sheets layered above the current tab.

---

## 3) Route inventory (everything under `app/`)

### Root-level routes
- **`/`** → redirect to `/auth/sign-in` or `/(protected)/personal`
- **`/+not-found`** → "Page not found" fallback

### Auth routes
- **`/auth/sign-in`** → `modules/auth/SignIn` (social sign-in + email OTP)

### Protected tab groups
- **`/(protected)/personal/*`** (tabs)
  - `/(protected)/personal` (Home)
  - `/(protected)/personal/insights`
  - `/(protected)/personal/settings`
- **`/(protected)/team/*`** (tabs)
  - `/(protected)/team` (Home)
  - `/(protected)/team/trainings`
  - `/(protected)/team/manage`

### Protected sheets and full-screen flows
- **Sheets (formSheet)**
  - `/(protected)/teamSwitcher`
  - `/(protected)/acceptInvite`
  - `/(protected)/userMenu`
  - `/(protected)/notifications`
  - `/(protected)/createTeam`
  - `/(protected)/createTraining`
  - `/(protected)/createSession`
  - `/(protected)/inviteTeamMember`
  - `/(protected)/teamPreview`
  - `/(protected)/memberPreview`
  - `/(protected)/trainingDetail`
  - `/(protected)/addTarget`
  - `/(protected)/scanTarget`
  - `/(protected)/tacticalTarget`

- **Full-screen (card)**
  - `/(protected)/memberActivity`
  - `/(protected)/activeSession`
  - `/(protected)/trainingLive`
  - `/(protected)/scans`

---

## 4) Page-by-page walkthrough

### 4.1 `/auth/sign-in` (Sign-in page)
**What it is**
- A single sign-in surface that offers:
  - Social sign-in buttons (`modules/auth/SocialButtons`)
  - "Continue with Email" → opens `EmailOTPSheet`

**Primary actions**
- **Social login**: triggers Supabase OAuth flow via `useAuth().signInWithOAuth()`
- **Email OTP**: opens a bottom sheet to handle OTP-based login

**What happens after sign-in**
- `AuthContext` navigates the user to `/(protected)/personal` after a short transition and loads teams in the background.

---

### 4.2 `/(protected)` global header (shown on most protected screens)
**Component**: `components/Header.tsx`

**What it displays**
- **Left**: user avatar (tap opens User Menu sheet)
- **Center/left**: a label showing:
  - "Personal" when the current pathname starts with `/personal`
  - Otherwise the active team name if `useTeamStore().activeTeamId` is set
- **Right**: bell icon with badge = number of scheduled notifications

**Notable UX behavior**
- Notification count is polled with `setInterval(..., 10000)`.
  - This can make the badge feel slightly delayed and can waste background work.

---

### 4.3 Personal mode tabs

#### 4.3.1 `/(protected)/personal` (Personal Home)
**Component**: `components/home/PersonalHomePage.tsx`

**What it’s for**
A dashboard for personal training that focuses on:
- Current/active personal session
- Starting a new solo session
- Surfacing a relevant team training (if you have teams/trainings)
- Quick links + weekly chart

**What loads here**
- Personal sessions from `useSessionStore().loadPersonalSessions()`
- Upcoming trainings from `useTrainingStore().loadMyUpcomingTrainings()`
- Stats from `useTrainingStore().loadMyStats()`

**Main UI sections**
- **GreetingHeader**: “Hi {firstName}” style greeting
- **ActivityHub** (`components/home/personal-home/ActivityHub.tsx`)
  - Shows (priority order):
    - **Live team training** (if there is one in upcoming trainings)
    - **Active personal session** (if any)
    - **Start Session** button (if no active session)
    - **Last completed session** summary
    - Empty state
  - Start Session uses a dropdown:
    - **Solo Session** → calls “start solo”
    - **Team training option** (if upcoming training exists) → opens training
      - If training is ongoing and user is not a commander: goes directly to `trainingLive`
      - Otherwise opens `trainingDetail`
- **SecondaryActionsRow**: quick buttons
- **WeeklyActivityChart**: a weekly chart of sessions

**Primary actions / flows**
- **Resume active session** → `/(protected)/activeSession?sessionId=...`
- **Start solo session**
  - Checks for existing active personal session
  - If exists, opens it
  - Else creates a new solo session then opens it
- **Open a training surfaced in ActivityHub**
  - Planned training → `trainingDetail`
  - Ongoing training (soldier) → `trainingLive`

**Important UX notes**
- The quick actions include links that **do not exist as routes** today (see “Broken routes” section).

#### 4.3.2 `/(protected)/personal/insights` (Insights)
**Component**: `components/insights/InsightsDashboard.tsx`

**What it’s for**
A personal analytics dashboard that works in **both** personal and team mode:
- If a team is active: loads team sessions
- Otherwise: loads personal sessions

**Main UI sections**
- Header + hero stats
- Completion rate card
- Mini stats row
- Streak card
- Recent sessions section

**Primary actions**
- Pull-to-refresh reloads sessions + “my stats”

#### 4.3.3 `/(protected)/personal/settings` (Settings)
**What it’s for**
User settings focused on:
- Profile display (name/email)
- Push notifications permission + test notification
- Placeholder menu items (Appearance, Privacy & Security, Help, Terms)
- Sign out

**Primary actions**
- **Enable notifications**: triggers permission prompt
- **Test notification**: schedules a test notification
- **Sign out**: calls `useAuth().signOut()`

---

### 4.4 Team mode tabs

#### 4.4.1 `/(protected)/team` (Team Home)
**Component**: `components/home/TeamHomePage.tsx`

**What it’s for**
A dashboard for the currently active team:
- Team summary stats (members/squads/trainings)
- Live training entrypoint
- Next training entrypoint
- Quick actions
- A simple “team momentum / anomaly” insight card (for managers)

**Data sources**
- `useTeamStore()` for team list, active team, members
- `useTrainingStore()` for `teamTrainings`

**Primary actions**
- If the user has **no teams**: shows an empty state with:
  - Create team → `/(protected)/createTeam`
  - Join team → `/(protected)/acceptInvite`

- If user has teams:
  - **All Trainings** → `/(protected)/team/trainings`
  - **Schedule** (managers only) → `/(protected)/createTraining`
  - **Members** (non-managers) → `/(protected)/team/manage`
  - **Live training banner** → `/(protected)/trainingLive?trainingId=...`
  - **Next training** → `/(protected)/trainingDetail?id=...`

**Role gating**
- “Manage”/settings affordances are shown only if the role allows management.

**Important UX notes**
- There are hard-coded navigation targets here that **do not exist** as routes (see “Broken routes”).

#### 4.4.2 `/(protected)/team/trainings` (Trainings hub + drill library)
**What it’s for**
A combined screen with two tabs inside it:
- **Trainings**: lists team trainings grouped by status
- **Drills**: a drill template library (only for managers)

**Primary actions (Trainings tab)**
- **New Training** (manager) → opens `/(protected)/createTraining`
- Tapping a training → opens `/(protected)/trainingDetail?id=...`

**Primary actions (Drills tab)**
- **New Drill** → opens `EnhancedDrillModal` (local modal)
- Delete drill template (manager only)

#### 4.4.3 `/(protected)/team/manage` (Team members list)
**What it’s for**
Team member directory with:
- Search
- Role badges
- Invite members (Owner only)
- Member preview sheet

**Primary actions**
- Invite new member (Owner only) → `/(protected)/inviteTeamMember`
- Tap a member → `/(protected)/memberPreview?id=...`

**Important UX notes**
- There is a “Team settings” button wired to a route that does not exist today.

---

### 4.5 Team & account sheets

#### 4.5.1 `/(protected)/teamSwitcher` (Team switcher sheet)
**What it’s for**
Central place to:
- See all teams
- Switch active team (enter team mode)
- Switch to personal mode (clear active team)
- Create team / join team

**Key UX behavior**
- When selecting a team:
  - it dismisses the sheet, then `router.replace('/(protected)/team')`
- When switching to personal:
  - it clears active team, dismisses, then `router.replace('/(protected)/personal')`

This “dismiss then replace” pattern is used to avoid transient blank screens.

#### 4.5.2 `/(protected)/createTeam` (Create team sheet)
**What it’s for**
Create a new team with optional squads.

**Flow**
- Form step:
  - Team name (required)
  - Description (optional)
  - Optional squads section (manual + templates)
- Success step:
  - Shows “Team Created!”
  - “Open Team” sets active team and dismisses the sheet

#### 4.5.3 `/(protected)/acceptInvite` (Join team sheet)
**What it’s for**
Join a team with an 8-character invite code.

**Flow**
- Enter code → Validate
- If valid → Review invitation → Join
- Success screen → “Open Team”
  - Sets active team
  - Refreshes team + trainings
  - Dismisses sheet then routes to team tabs

#### 4.5.4 `/(protected)/inviteTeamMember` (Invite member sheet)
**What it’s for**
Generate an invite code for a team.

**Flow**
- If team is preselected (active team or URL param) → skip selection
- Optional: assign to squad + optionally make them squad commander
- Generate code → copies to clipboard

**Important notes**
- The UI promises “expires in 7 days” (based on copy), and uses `createInvitation(...)` service.

#### 4.5.5 `/(protected)/teamPreview` (Team preview sheet)
**What it’s for**
Displays details for a `selectedTeam` stored in `ModalContext`:
- Team name
- Member count
- Optional description
- Squad list

If no team is selected in context, shows “No team selected”.

#### 4.5.6 `/(protected)/userMenu` (User menu sheet)
**What it’s for**
Account menu with:
- Profile summary
- Settings (currently “Coming soon” placeholder)
- Switch Team → opens teamSwitcher
- Log out

---

### 4.6 Notifications

#### 4.6.1 `/(protected)/notifications` (Notifications center sheet)
**What it’s for**
Lists **pending/scheduled** notifications and offers:
- Send test notification
- Clear delivered notifications badge
- Clear all scheduled notifications

**Navigation behavior**
When tapping a notification, it can dismiss the sheet and navigate based on `notification.data`:
- `trainingDetail` with id
- `activeSession` with sessionId
- `team` / `personal` / `insights`

**UX behavior**
- Long-press a notification to cancel it

---

### 4.7 Trainings & sessions (core training lifecycle)

#### 4.7.1 `/(protected)/createTraining` (Create training sheet)
**What it’s for**
Create a team training (drill-first):
- Training name (required)
- Schedule date/time OR “manual start”
- Add drills (required)
  - Add drills via `EnhancedDrillModal`
  - Quick-add from drill templates

**Primary actions**
- Create training
  - Saves via `createTraining(...)`
  - Refreshes team trainings and “my upcoming trainings”
  - Closes sheet

**Guard**
- If not in team mode (`activeTeamId` missing) it shows “Team Required”.

#### 4.7.2 `/(protected)/trainingDetail` (Training detail sheet)
**What it’s for**
A structured training detail view built from `components/training-detail/*`.

**What it shows**
- Header with title/description/status
- Info cards
- Drill list + per-drill start
- Sessions list
- Training actions (start/finish/cancel) depending on role

**Role gating**
- If user cannot manage training AND training is ongoing:
  - auto-redirects to `/(protected)/trainingLive`

#### 4.7.3 `/(protected)/trainingLive` (Live training dashboard, full screen)
**What it’s for**
A “live training” dashboard (especially for soldiers) that:
- Shows drills and completion status
- Lets the user start the next drill (creates a drill session)
- Shows a “leaderboard” based on number of targets recorded

**Primary actions**
- Start next drill (creates a session and routes to `activeSession`)
- Continue existing session
- Commanders can mark training complete

**Notable UX property**
- This screen uses a hard-coded dark UI background `#0A0A0A`.

#### 4.7.4 `/(protected)/createSession` (Start session sheet)
**What it’s for**
A “chooser” sheet for starting practice:
- Join an available team training (ongoing/planned)
- Or start solo practice

**Key guard**
On mount it checks for an existing active session:
- In personal mode: you can only have one active session; user is prompted to continue or cancel.
- In team mode: prompted to continue or start new.

**Important drill behavior**
If the selected training has drills (`drill_count > 0`):
- Instead of creating a generic training session, it routes to `trainingLive` to pick/start drills.

#### 4.7.5 `/(protected)/activeSession` (Active session, full screen)
**What it’s for**
The central “do the work” screen while a session is active.

**What it displays**
- Header with close (leave session) + timer
- Drill requirements banner (if session is drill-driven)
- Stats card:
  - Accuracy
  - Targets/rounds count
  - Shots
  - Hits
- A list of targets logged in the session
- Floating bottom action bar

**Primary actions**
- **Scan paper target** → `/(protected)/scanTarget` (camera-first)
- **Log tactical target** → `/(protected)/tacticalTarget` (manual entry)
- **End session**
  - If a drill exists and requirements aren’t met: warns “End drill early” and clarifies it won’t count as completion
  - After ending:
    - If team session → routes to team tabs
    - If personal session → routes to personal tabs

**Drill constraints enforced in UI**
When a drill is present:
- Locks the allowed target type (paper vs tactical)
- Enforces “rounds/targets remaining” and can disable capture once you’ve reached required counts
- Passes `locked=1` plus suggested bullets to the target entry routes

---

### 4.8 Targets pipeline (paper scans + tactical)

#### 4.8.1 `/(protected)/scanTarget` (PaperTargetFlow)
**What it is**
A paper-only entrypoint that goes directly into a dedicated flow:
- `PaperTargetFlow` from `components/addTarget`

**Params**
- `sessionId` (required)
- `distance` (default)
- `bullets` (default)
- `locked=1` to lock distance (drill mode)

#### 4.8.2 `/(protected)/tacticalTarget` (TacticalTargetFlow)
**What it is**
A tactical-only entrypoint:
- `TacticalTargetFlow` from `components/addTarget`

**Params**
- `sessionId` (required)
- `distance` (default)
- `bullets` (default)
- `locked=1` to lock distance and bullets (drill mode)

#### 4.8.3 `/(protected)/addTarget` (legacy / expanded add-target sheet)
**What it is**
A full orchestrator that can do both paper and tactical:
- target form (type, distance, bullets, lane)
- camera capture or image picker
- AI detection analysis
- manual correction of detections
- save results to session

**Paper save behavior**
- Calculates hits and dispersion from detections
- Stores the scanned image as a base64 data URL
- If there were edits, submits training data to `detectionService` (model improvement)

**Tactical save behavior**
- Saves bullets fired, hits, time, stage cleared, notes

**UX observation**
- The app currently has *two* paper/tactical entry approaches:
  - direct flows (`scanTarget`, `tacticalTarget`)
  - this all-in-one sheet (`addTarget`)

---

### 4.9 Scans gallery

#### 4.9.1 `/(protected)/scans` (Paper Targets gallery, full screen)
**What it’s for**
A photo-grid of the user’s scanned paper targets.

**Data loading**
- Fetches the current user’s sessions
- Fetches paper targets in those sessions (limit 100)

**Main UI**
- Header: “Paper Targets”
- Stats row: scans count, average distance, average group size, best group size
- Filter bar:
  - Distance filters: All / CQB / Short / Mid / Long / Sniper
- Grid:
  - Each tile shows image (if available)
  - Badges:
    - distance
    - group size (dispersion)

**Detail view**
- Tapping a scan opens a page-sheet modal with:
  - image
  - hero “group size” card with quality label
  - stats cards (distance, shots, hits, lane)

---

### 4.10 Team members: preview + activity

#### 4.10.1 `/(protected)/memberPreview` (Member preview sheet)
**What it’s for**
A member profile card and management actions.

**What it shows**
- Avatar + name + email
- Role badge
- Joined date
- Team name
- Actions:
  - View Activity
  - Change Role (managers only, cannot edit owner or self)
  - Remove from Team (managers only, cannot remove owner or self)

#### 4.10.2 `/(protected)/memberActivity` (Member activity, full screen)
**What it’s for**
A per-member activity log within the active team.

**What it shows**
- Summary stats (sessions, completed, total time, active)
- Last active timestamp
- Recent sessions list (up to 50)
  - status, duration, training title, drill name, solo/group tags

---

## 5) Big user flows (end-to-end)

### 5.1 First-time user: sign-in → personal home
- User opens app → `/` redirect
- If logged out → `/auth/sign-in`
- User signs in (social or email OTP)
- Auth loads profile + teams in background
- App lands on `/(protected)/personal`

### 5.2 Switch between Personal and Team mode
- From the global header, tap the team/personal label → `/(protected)/teamSwitcher`
- Choose:
  - Personal Mode → clears active team and routes to personal tabs
  - A team → sets active team and routes to team tabs

### 5.3 Create a team
- Open Team Switcher → Create → `/(protected)/createTeam`
- Fill team name (required), optional description, optional squads
- Submit → success screen → “Open Team” sets active team and dismisses

### 5.4 Join a team via invite code
- Open Team Switcher → Join → `/(protected)/acceptInvite`
- Enter 8-char code → validate → review → join
- Success → Open Team → sets active team and routes to team tabs

### 5.5 Invite a new member
- In team manage tab → “Invite New Member” (Owner only) → `/(protected)/inviteTeamMember`
- Configure optional squad assignment
- Generate invite code → copied to clipboard → share externally

### 5.6 Schedule a training (manager flow)
- Team Trainings tab → “New Training” → `/(protected)/createTraining`
- Provide title + schedule/manual start + drills
- Create training → returns to previous screen and refreshes lists

### 5.7 Start a team training (manager flow)
- Open training detail (`/(protected)/trainingDetail?id=...`)
- If planned:
  - Manager can start training
- Once started:
  - soldiers are redirected to `trainingLive`

### 5.8 Participate in a drill (soldier flow)
- When training is ongoing:
  - soldier lands on `/(protected)/trainingLive?trainingId=...`
- Start next drill:
  - creates a drill session → routes to `/(protected)/activeSession?sessionId=...`

### 5.9 Record targets in an active session
- In `activeSession`:
  - If drill target type is paper → use “Scan” button → `scanTarget` → `PaperTargetFlow`
  - If drill target type is tactical → use “Log” button → `tacticalTarget` → `TacticalTargetFlow`
- Save target results
- Repeat until drill/session complete

### 5.10 End session
- In `activeSession` tap stop
- If drill requirements not met → warning explains it won’t count as completion
- End session:
  - team session → routes to team tabs
  - personal session → routes to personal tabs

### 5.11 Review scans
- Open `/(protected)/scans`
- Filter by distance bucket
- Tap scan → detail sheet

### 5.12 Review performance insights
- Open `/(protected)/personal/insights`
- Works in personal or team mode depending on whether an active team is selected

---

## 6) UX inconsistencies, broken routes, and “coming soon” gaps (from code)

### 6.1 Broken / missing routes referenced by UI
These routes are **referenced in code but do not exist in `app/`** (so they will hit `+not-found`):

- **`/(protected)/teamSettings`**
  - Linked from `/(protected)/team/manage` and from Team Manage header “settings” button.

- **`/(protected)/teamManage`**
  - Linked from `TeamHomePage` (should likely be `/(protected)/team/manage`).

- **`/(protected)/personal/history`**
  - Linked from `SecondaryActionsRow` on Personal Home.

- **`/(protected)/personal/trainings`**
  - Linked from `SecondaryActionsRow` on Personal Home.

- Documentation comment references additional sheet routes that are not present:
  - `/(protected)/createWorkspace`
  - `/(protected)/inviteMembers`
  - `/(protected)/workspaceSwitcher`

### 6.2 Mixed presentation patterns for similar tasks
- Many actions open as **form sheets** with detents.
- Some “detail” experiences are full-screen, some are sheets.
- `trainingDetail` is a sheet, but `trainingLive` is a full-screen dark experience.

This can feel inconsistent because the same entity (a training) can open as:
- a sheet (detail), or
- a full-screen “dashboard” (live), depending on status/role.

### 6.3 Visual style inconsistencies
- Most screens use `useColors()` and themed backgrounds.
- `trainingLive` uses a hard-coded background `#0A0A0A` and custom styling.
- `scans` uses `ThemeContext` + `Colors` directly and hides the standard header.

### 6.4 “Coming soon” placeholders
- User menu “Settings” shows an alert: “Coming Soon”.
- Personal settings has buttons like Appearance / Privacy / Help / Terms that don’t navigate.

---

## 7) Quick router mental map (what the user thinks they’re doing)

- **“I’m training alone”** → personal tabs → start solo session → scan/log targets → end session → see insights
- **“I’m training with my team”** → switch to team mode → trainings hub → join live training → start drill → scan/log targets → leaderboard updates
- **“I’m managing my team”** → team manage tab → invite members → assign roles → schedule trainings

---

## 8) Appendix: Key state sources that drive UX

### Auth state
- `useAuth()` from `contexts/AuthContext.tsx`
  - Handles initial session, sign-in/out, profile hydration
  - Controls the “transitioning” overlay

### Team context
- `useTeamStore()` from `store/teamStore.tsx`
  - `activeTeamId` controls team vs personal UX
  - Team mode tabs are guarded: if `activeTeamId` is missing → redirect to personal

### Permissions
- `usePermissions()` from `hooks/usePermissions.ts`
  - “manager” concept is essentially owner/commander
  - Used to gate training management actions and redirect logic

### Modal coordination
- `useModals()` from `contexts/ModalContext.tsx`
  - Stores selected objects for preview sheets
  - Stores callback refs to refresh lists after actions

