# Squad Engagement Feature - Complete Documentation

> Last Updated: January 26, 2026

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [User Flow](#user-flow)
5. [Components](#components)
6. [Services](#services)
7. [Types](#types)
8. [Realtime Features](#realtime-features)
9. [Known Issues & Fixes](#known-issues--fixes)

---

## Overview

Squad Engagement is a team-based shooting drill mode where:

- A **Commander** creates and manages the engagement
- **Participants** (team members) are invited to join
- All participants share **one session** but each records their own shots/hits
- Results are **aggregated for the group**, NOT counted in individual insights/averages

### Key Principles (Canonical Rules)

1. **Grouping drills are ALWAYS solo** - Enforced at the code level
2. **Squad mode is only available for Engagement drills**
3. **One shared session** - All participants contribute to the same session
4. **Async participation** - Participants acknowledge/consent, but results are entered individually
5. **Group totals** - `shots_fired` and `hits` are tracked per-participant and aggregated

---

## Architecture

### Conceptual Model

```
Training (container)
    └── Drills (configured by commander, includes engagement_mode)
            └── Session (invisible setup: weapon, environment)
                    └── Engagement (atomic execution unit)
                            └── EngagementParticipants (each participant's contribution)
```

### Mental Model

| Entity                    | Responsibility                                                         |
| ------------------------- | ---------------------------------------------------------------------- |
| **Training**              | "Who is around" - team context only                                    |
| **Session**               | "What setup applies" - weapon, weather, drill config                   |
| **Engagement**            | "What actually happened" - execution unit, drill_goal, engagement_mode |
| **EngagementParticipant** | Individual participant's contribution (shots_fired, hits)              |

---

## Database Schema

### `engagements` Table

```sql
CREATE TABLE engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  training_id UUID REFERENCES trainings(id),
  shooter_id UUID REFERENCES auth.users(id),  -- The commander
  drill_goal TEXT NOT NULL,                    -- 'grouping' or 'engagement'
  engagement_mode TEXT NOT NULL DEFAULT 'solo', -- 'solo' or 'squad'
  status TEXT NOT NULL DEFAULT 'completed',    -- 'completed' or 'aborted'
  started_at TIMESTAMPTZ,                      -- When commander started (closes invites)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `engagement_participants` Table

```sql
CREATE TABLE engagement_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES engagements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  state TEXT NOT NULL DEFAULT 'joined',        -- 'pending', 'joined', 'left'
  joined_at TIMESTAMPTZ,
  shots_fired INTEGER,                          -- Participant's total shots
  hits INTEGER,                                 -- Participant's hits (optional)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `training_drills` Table (relevant columns)

```sql
-- Includes:
engagement_mode TEXT DEFAULT 'solo',  -- 'solo' or 'squad'
execution_policy TEXT DEFAULT 'locked'  -- 'locked', 'guided', 'free'
```

---

## User Flow

### Complete Squad Engagement Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. DRILL CREATION (Commander)                                           │
│    - createTraining.tsx → AddDrillStep.tsx                              │
│    - Select "Squad" engagement mode                                     │
│    - Drill saved with engagement_mode: 'squad'                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. START DRILL (Commander)                                              │
│    - trainingDetail.tsx → handleStartDrill()                            │
│    - Passes engagementMode: 'squad' to startEngagement.tsx              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. CREATE ENGAGEMENT (startEngagement.tsx)                              │
│    - Creates Session (invisible)                                        │
│    - Creates Engagement with engagement_mode: 'squad'                   │
│    - Navigates to squadLobby.tsx                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. SQUAD LOBBY (Commander - squadLobby.tsx)                             │
│    - Commander sees lobby with drill info                               │
│    - Can invite team members (InviteParticipantsPanel)                  │
│    - Can leave/return to lobby anytime                                  │
│    - Participants appear in list with status                            │
│    - "Start" button to begin engagement                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     │                     ▼
┌──────────────────────┐           │         ┌──────────────────────┐
│ INVITATION BANNER    │           │         │ LOBBY BANNER         │
│ (SquadInvitationBanner)          │         │ (SquadLobbyBanner)   │
│ - Shows in trainingDetail        │         │ - Shows for commander│
│ - For invited members            │         │ - Return to lobby    │
│ - Join/Decline buttons           │         └──────────────────────┘
│ - Navigates to squadLobby        │
└──────────────────────┘           │
              │                     │
              └─────────────────────┼─────────────────────┐
                                    │                     │
                                    ▼                     │
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. PARTICIPANTS JOIN (squadLobby.tsx)                                   │
│    - Participants see "Waiting Room" view                               │
│    - Wait for commander to start                                        │
│    - Realtime subscription for start event                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. COMMANDER STARTS (squadLobby.tsx → handleStartEngagement)            │
│    - startEngagement(engagementId) sets started_at timestamp            │
│    - Broadcast 'session_started' to all participants via Supabase       │
│    - Push notifications sent to joined participants                     │
│    - All navigate to activeSession.tsx                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. ACTIVE SESSION (activeSession.tsx → SquadSessionView.tsx)            │
│    - Shows collapsible participants card                                │
│    - Each participant can add their own results                         │
│    - Commander can add results for anyone                               │
│    - Results: shots_fired (required), hits (optional)                   │
│    - Commander can end session                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 8. SESSION COMPLETE                                                     │
│    - Results aggregated for group                                       │
│    - NOT counted in individual user insights/averages                   │
│    - Shows in training history                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. `app/(protected)/squadLobby.tsx`

**Purpose**: Commander's waiting room for managing squad engagements

**Key Features**:

- Displays drill info (name, distance, rounds)
- Lists participants with status (joined/left)
- Invite modal for adding team members
- "Start" button to begin engagement
- "Cancel" button to abort
- Realtime subscription for participant changes
- Broadcasts `session_started` event when starting

**Props**: None (uses route params)

**Route Params**:

- `engagementId` (required) - The engagement UUID
- `sessionId` (optional, deprecated) - Legacy support
- `trainingId` (optional) - For navigation back

**Key Functions**:

- `loadData()` - Fetches engagement, session, and participants
- `handleStartEngagement()` - Marks engagement as started, broadcasts to participants
- `handleSendInvites()` - Adds participants and sends push notifications
- `handleCancelEngagement()` - Cancels the engagement

---

### 2. `app/(protected)/startEngagement.tsx`

**Purpose**: Entry point for starting any engagement (solo or squad)

**Key Features**:

- Detects `engagementMode` from route params
- Creates Session (invisible to user)
- Creates Engagement with proper mode
- Routes to `squadLobby` for squad mode, `activeSession` for solo

**Navigation Decision Logic**:

```typescript
if (effectiveEngagementMode === 'squad' && teamId) {
  router.replace({ pathname: '/(protected)/squadLobby', params: {...} });
} else {
  router.replace({ pathname: '/(protected)/activeSession', params: {...} });
}
```

**Route Params**:

- `teamId` - Team context
- `trainingId` - Training context
- `purpose` - 'grouping' or 'engagement'
- `engagementMode` - 'solo' or 'squad'
- `executionPolicy` - 'locked', 'guided', or 'free'
- Various drill config params (distance, shots, position, etc.)

---

### 3. `app/(protected)/trainingDetail.tsx`

**Purpose**: Training detail view with drill management

**Key Features**:

- Displays training info and drills
- Shows `SquadLobbyBanner` for commanders with active lobbies
- Shows `SquadInvitationBanner` for invited participants
- "Start" button on drills when training is ongoing
- Passes `engagementMode` to startEngagement

**Key Function**:

```typescript
const handleStartDrill = (drill: TrainingDrill) => {
  const engagementMode = drill.engagement_mode || 'solo';
  router.push({
    pathname: '/(protected)/startEngagement',
    params: { ..., engagementMode, ... },
  });
};
```

---

### 4. `components/training/SquadInvitationBanner.tsx`

**Purpose**: Shows pending squad engagement invitations to soldiers

**Key Features**:

- Queries `engagement_participants` for current user's invitations
- Shows drill info and commander name
- "Join Lobby" / "Decline" buttons
- **Always navigates to squadLobby** (even if session started)
- Realtime subscription for invitation changes

**Props**:

- `trainingId: string`
- `userId: string`
- `onInvitationChanged?: () => void`

---

### 5. `components/training/SquadLobbyBanner.tsx`

**Purpose**: Shows active squad lobby status for commanders

**Key Features**:

- Queries for squad engagements created by current user
- Shows participant count
- Navigates to squadLobby or activeSession based on `hasStarted`
- Realtime subscription for changes

**Props**:

- `trainingId: string`
- `userId: string`
- `onLobbyChanged?: () => void`

---

### 6. `components/session/activeSession/SquadSessionView.tsx`

**Purpose**: Active session view for squad engagements

**Key Features**:

- Shows collapsible `SquadParticipantsCard` with all participants
- "Add Your Result" section
- Shows individual results summary
- Commander can end session
- Each participant can add their own results

**Props**:

- `sessionId: string`
- `session: { id, user_id, drill_name, drill_config, training_id }`
- `participants: EngagementParticipant[]`
- `targets: any[]`
- `isCommander: boolean`
- `onRefresh: () => void`
- `onEndSession: () => void`

---

### 7. `components/session/activeSession/SquadParticipantsCard.tsx`

**Purpose**: Collapsible card showing participant stats

**Key Features**:

- Expandable/collapsible with animated chevron
- Shows summary when collapsed (total participants, shots, hits)
- Shows individual participant stats when expanded
- Crown icon for session owner (commander)

---

### 8. `components/session/creation/InviteParticipantsPanel.tsx`

**Purpose**: Panel for selecting team members to invite

**Props**:

- `teamId: string`
- `invitedUserIds: string[]`
- `onInvitedChange: (ids: string[]) => void`
- `excludeUserIds?: string[]`

---

## Services

### `services/session/participants.ts`

**Purpose**: CRUD operations for engagements and participants

**Key Functions**:

#### Engagement Queries

- `getEngagement(engagementId)` - Get engagement by ID
- `getEngagementBySessionId(sessionId)` - Get engagement by session

#### Engagement Mutations

- `createEngagement(params)` - Creates engagement with enforced mode
- `updateEngagementStatus(engagementId, status)` - Update status
- `abortEngagement(engagementId)` - Mark as aborted
- `startEngagement(engagementId)` - Sets `started_at`, closes invites

#### Participant Queries

- `getEngagementParticipants(engagementId)` - Get all participants with profiles
- `getEligibleParticipants(teamId, engagementId)` - Get team members not yet invited

#### Participant Mutations

- `addParticipant(engagementId, userId)` - Add participant
- `updateParticipantState(engagementId, userId, state)` - Update state
- `updateParticipantResults(engagementId, userId, shotsFired, hits)` - Update results
- `removeParticipant(engagementId, userId)` - Remove participant

#### Helpers

- `hasJoinedParticipants(participants)` - Check if any joined
- `getParticipantCounts(participants)` - Get counts by state

---

## Types

### `services/session/types.ts`

```typescript
// Engagement mode
type EngagementMode = 'solo' | 'squad';

// Engagement status
type EngagementStatus = 'completed' | 'aborted';

// Participant state
type ParticipantState = 'pending' | 'joined' | 'left';

// Engagement interface
interface Engagement {
  id: string;
  training_id: string | null;
  session_id: string;
  shooter_id: string; // The commander
  drill_goal: DrillGoal;
  engagement_mode: EngagementMode;
  status: EngagementStatus;
  created_at: string;
}

// Participant interface
interface EngagementParticipant {
  id: string;
  engagement_id: string;
  user_id: string;
  state: ParticipantState;
  joined_at: string | null;
  created_at: string;
  shots_fired?: number | null; // Participant's contribution
  hits?: number | null; // Optional hits count
  user_full_name?: string | null;
  user_avatar_url?: string | null;
}

// Mode enforcement function
function enforceEngagementMode(drillGoal: DrillGoal, requested?: EngagementMode): EngagementMode {
  // Grouping is ALWAYS solo - non-negotiable
  if (drillGoal === 'grouping') return 'solo';
  return requested ?? 'solo';
}
```

---

## Realtime Features

### Supabase Channels Used

1. **`squad-start-{engagementId}`** - Broadcast channel for session start
   - Event: `session_started`
   - Used by: squadLobby.tsx (commander sends, participants listen)

2. **`squad-invites-{trainingId}-{userId}`** - Postgres changes
   - Table: `engagement_participants`
   - Filter: `user_id=eq.{userId}`
   - Used by: SquadInvitationBanner.tsx

3. **`squad-lobby-{trainingId}-{userId}`** - Postgres changes
   - Tables: `engagements`, `engagement_participants`
   - Used by: SquadLobbyBanner.tsx

### Realtime Hook

`hooks/realtime/useParticipantsRealtime.ts` - Listens for participant changes

---

## Known Issues & Fixes

### Issue 1: `record "new" has no field "updated_at"`

**Cause**: Trigger on `engagement_participants` expected `updated_at` column

**Fix**: Added `updated_at TIMESTAMPTZ DEFAULT now()` column to table

---

### Issue 2: `engagements_status_check` constraint violation

**Cause**: Invalid status value being set

**Fix**: Ensure status is always 'completed' or 'aborted'

---

### Issue 3: PATCH 400 on engagements - `error=42703`

**Cause**: `startEngagement()` tried to update `started_at` column that didn't exist

**Fix**: Added `started_at TIMESTAMPTZ` and `updated_at TIMESTAMPTZ` columns to `engagements` table

---

### Issue 4: Participants skipping lobby

**Cause**: `handleJoin` in SquadInvitationBanner navigated directly to activeSession

**Fix**: Always navigate to squadLobby:

```typescript
router.push({
  pathname: '/(protected)/squadLobby',
  params: { engagementId, sessionId, trainingId },
});
```

---

### Issue 5: Commander skipping lobby

**Cause**: `engagementMode` param was 'solo' when starting drill

**Root Cause**: Drill wasn't saved with `engagement_mode: 'squad'`

**Fix**:

1. Added debug logging in startEngagement.tsx
2. Verified drill creation logs `engagement_mode` correctly
3. Ensured AddDrillStep.tsx passes `engagementMode` to useCreateTrainingV2

---

### Issue 6: RLS policy violations for participants

**Cause**: Participants couldn't insert into `session_targets` or `tactical_target_results`

**Fix**: Updated RLS policies to allow engagement participants to insert their own results

---

## SQL Migrations Applied

```sql
-- Add updated_at to engagement_participants
ALTER TABLE engagement_participants
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add started_at and updated_at to engagements
ALTER TABLE engagements
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add shots_fired and hits to engagement_participants
ALTER TABLE engagement_participants
ADD COLUMN IF NOT EXISTS shots_fired INTEGER,
ADD COLUMN IF NOT EXISTS hits INTEGER;

-- Trigger for updated_at on engagement_participants
CREATE OR REPLACE FUNCTION update_engagement_participants_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.state = 'joined' AND (OLD.state IS NULL OR OLD.state != 'joined') THEN
    NEW.joined_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_participants_updated_at
  BEFORE UPDATE ON engagement_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_participants_updated_at();

-- Trigger for updated_at on engagements
CREATE OR REPLACE FUNCTION update_engagements_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagements_updated_at
  BEFORE UPDATE ON engagements
  FOR EACH ROW
  EXECUTE FUNCTION update_engagements_updated_at();
```

---

## File Summary

| File                                                         | Purpose                            |
| ------------------------------------------------------------ | ---------------------------------- |
| `app/(protected)/squadLobby.tsx`                             | Commander's lobby screen           |
| `app/(protected)/startEngagement.tsx`                        | Entry point for all engagements    |
| `app/(protected)/trainingDetail.tsx`                         | Training detail with drill start   |
| `components/training/SquadInvitationBanner.tsx`              | Invitation banner for soldiers     |
| `components/training/SquadLobbyBanner.tsx`                   | Lobby status banner for commanders |
| `components/session/activeSession/SquadSessionView.tsx`      | Active squad session UI            |
| `components/session/activeSession/SquadParticipantsCard.tsx` | Collapsible participants list      |
| `components/session/creation/InviteParticipantsPanel.tsx`    | Team member selection              |
| `services/session/participants.ts`                           | Engagement & participant CRUD      |
| `services/session/types.ts`                                  | TypeScript types                   |
| `services/pushService.ts`                                    | Push notifications                 |
| `hooks/realtime/useParticipantsRealtime.ts`                  | Realtime participant updates       |
| `components/training/create/useCreateTrainingV2.ts`          | Training creation hook             |
| `components/training/create/steps/AddDrillStep.tsx`          | Drill creation form                |

---

_Context improved by Giga AI using main overview, sessions rules, and component organization guidelines._
