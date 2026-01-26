# Squad Engagement Mode Documentation

This document explains all changes made to implement **Squad Engagement Mode** (P0 feature).

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [New Files Created](#new-files-created)
4. [Modified Files](#modified-files)
5. [User Flows](#user-flows)
6. [API Reference](#api-reference)
7. [Push Notifications](#push-notifications)
8. [Realtime Subscriptions](#realtime-subscriptions)

---

## Overview

### Squad Engagement Mode

Squad Engagement Mode allows **commanders** to start team-based engagement drills where multiple participants from the same team shoot together. The flow is:

1. Commander creates/starts a squad engagement session (from a drill with `engagement_mode: 'squad'`)
2. Team members are invited and receive push notifications
3. Commander waits in a "Squad Lobby" for participants to join
4. Once at least one participant has joined, commander can start
5. All participants navigate to the active session

### Session Engagement Mode

Sessions now have an `engagement_mode` field:
- `solo` (default): Individual session
- `squad`: Team members participating together

---

## Database Schema

### Migration File

`supabase/migrations/20260125_add_squad_engagement_mode.sql`

### New Table: `engagement_participants`

Tracks participants invited to squad engagement sessions.

```sql
CREATE TABLE engagement_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'joined' | 'left'
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(session_id, user_id)
);
```

**Participant States:**
| State | Description |
|-------|-------------|
| `pending` | Invited but hasn't responded |
| `joined` | Actively participating |
| `left` | Declined or left the session |

### Modified Table: `sessions`

Added column:
```sql
ALTER TABLE sessions
ADD COLUMN engagement_mode TEXT NOT NULL DEFAULT 'solo';
-- CHECK constraint: ('solo', 'squad')
```

### Modified Table: `training_drills`

Added column:
```sql
ALTER TABLE training_drills
ADD COLUMN engagement_mode TEXT DEFAULT NULL;
-- Values: NULL | 'solo' | 'squad'
```

### Row Level Security (RLS)

| Policy | Description |
|--------|-------------|
| SELECT | Users can view their own records, session owner can see all, team members can see team sessions |
| INSERT | Only session owner can add participants (for squad mode sessions) |
| UPDATE | Users can update their own record (join/leave) |
| DELETE | Only session owner can remove participants |

### Trigger: Auto-set `joined_at`

```sql
-- When state changes to 'joined', auto-set joined_at timestamp
CREATE TRIGGER engagement_participants_updated_at
BEFORE UPDATE ON engagement_participants
FOR EACH ROW
EXECUTE FUNCTION update_engagement_participants_updated_at();
```

### Realtime

The table is added to the `supabase_realtime` publication for live updates.

---

## New Files Created

### Screens

#### `app/(protected)/squadLobby.tsx`

**Purpose:** Commander waiting room before starting squad engagement

**Features:**
- Displays drill info (name, distance, rounds)
- Shows participant list with realtime status updates
- Status indicators: Pending (orange), Ready/Joined (green), Declined (gray)
- "Start Engagement" button enabled when at least one participant joined
- Cancel option with confirmation dialog

**Key Imports:**
```typescript
import { useParticipantsRealtime } from '@/hooks/realtime';
import { getSessionParticipants, getParticipantCounts, canStartEngagement } from '@/services/session/participants';
import { notifySquadEngagementStarting } from '@/services/pushService';
```

**UI Structure:**
```
┌─────────────────────────────────────┐
│  ← Squad Lobby                      │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ 👥 Squad Engagement         │    │
│  │    25m · 10 shots           │    │
│  └─────────────────────────────┘    │
│                                     │
│  Waiting for participants...        │
│  2 of 3 ready                       │
│                                     │
│  PARTICIPANTS                       │
│  ┌─────────────────────────────┐    │
│  │ John Smith       ● Ready    │    │
│  │ Jane Doe         ○ Pending  │    │
│  │ Bob Wilson       ● Ready    │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [ Start Engagement (2 ready) ]     │
└─────────────────────────────────────┘
```

---

### Components

#### `components/training/SquadInvitationBanner.tsx`

**Purpose:** Shows pending squad engagement invitations to soldiers in training detail

**Features:**
- Auto-loads pending invitations for the current user
- Join/Decline buttons with haptic feedback
- Sends notifications to commander on action
- Realtime subscription for invitation changes
- Navigates to activeSession on join

**Props:**
```typescript
interface SquadInvitationBannerProps {
  trainingId: string;
  userId: string;
  onInvitationChanged?: () => void;
}
```

**UI:**
```
┌─────────────────────────────────────┐
│ 👥 Squad Engagement Invite          │
│    Commander invited you            │
├─────────────────────────────────────┤
│ Squad Engagement                    │
│ 25m · 10 shots                      │
├─────────────────────────────────────┤
│ [ Decline ]  [ Join Squad ]         │
└─────────────────────────────────────┘
```

#### `components/session/creation/InviteParticipantsPanel.tsx`

**Purpose:** Panel for commanders to invite team members to squad engagement

**Features:**
- Shows list of eligible team members
- Checkbox selection for inviting
- Displays current participant count
- Filters out already-invited users

#### `components/session/creation/AddParticipantsPanel.tsx`

**Purpose:** Panel showing current participants during session creation

**Features:**
- Lists invited participants with state
- Remove button for each participant
- Visual state indicators

#### `components/session/creation/EngagementModeToggle.tsx`

**Purpose:** Toggle between solo and squad engagement modes

**Usage:**
```typescript
<EngagementModeToggle
  mode={engagementMode}
  onModeChange={setEngagementMode}
  disabled={!isEngagementDrill}
/>
```

---

### Services

#### `services/session/participants.ts`

**Purpose:** CRUD operations for engagement participants

**Exports:**

```typescript
// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all participants for a session.
 * Includes user profile data (name, avatar).
 */
getSessionParticipants(sessionId: string): Promise<EngagementParticipant[]>

/**
 * Get eligible team members who can be added as participants.
 * Returns team members NOT already invited to this session.
 */
getEligibleParticipants(teamId: string, sessionId: string): Promise<EligibleMember[]>

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a participant to a squad engagement session.
 * Participant starts in 'pending' state.
 */
addParticipant(sessionId: string, userId: string): Promise<EngagementParticipant>

/**
 * Update the state of a participant.
 * Used when user joins or leaves.
 */
updateParticipantState(sessionId: string, userId: string, state: ParticipantState): Promise<EngagementParticipant>

/**
 * Remove a participant from a session.
 * Only session owner can remove participants.
 */
removeParticipant(sessionId: string, userId: string): Promise<void>

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if the session can start.
 * Requires at least one participant with state = 'joined'.
 */
canStartEngagement(participants: EngagementParticipant[]): boolean

/**
 * Get count of participants by state.
 */
getParticipantCounts(participants: EngagementParticipant[]): { pending, joined, left, total }
```

---

### Hooks

#### `hooks/realtime/useParticipantsRealtime.ts`

**Purpose:** Real-time subscription for participant changes

**Options:**
```typescript
interface UseParticipantsRealtimeOptions {
  sessionId: string | undefined | null;
  onParticipantAdded?: (participant: ParticipantRecord) => void;
  onParticipantChanged?: (participant: ParticipantRecord) => void;
  onParticipantRemoved?: (participant: ParticipantRecord) => void;
  enabled?: boolean;
}
```

**Returns:**
```typescript
interface UseParticipantsRealtimeReturn {
  isConnected: boolean;
  status: string | null;
  error: Error | null;
  reconnect: () => void;
}
```

**Usage:**
```typescript
const { isConnected } = useParticipantsRealtime({
  sessionId: session.id,
  onParticipantAdded: () => refreshParticipants(),
  onParticipantChanged: () => refreshParticipants(),
  onParticipantRemoved: () => refreshParticipants(),
});
```

---

## Modified Files

### `components/training/StartDrillSheet.tsx`

**Changes:**
1. Added support for `engagement_mode: 'squad'` on drills
2. Routes to `squadLobby` instead of `activeSession` for squad drills
3. Sends push notifications to invited participants
4. Added `teamName` prop for notification messages

**Key Logic:**
```typescript
// After session creation
if (isSquadMode) {
  // Navigate to lobby instead of activeSession
  router.push({
    pathname: '/(protected)/squadLobby',
    params: { sessionId: session.id, trainingId },
  });
} else {
  router.push({
    pathname: '/(protected)/activeSession',
    params: { sessionId: session.id, ... },
  });
}
```

### `services/session/types.ts`

**New Types:**
```typescript
/** Session engagement mode - solo or squad */
export type EngagementMode = 'solo' | 'squad';

/** State of a participant in a squad engagement session */
export type ParticipantState = 'pending' | 'joined' | 'left';

/** A participant invited to a squad engagement session */
export interface EngagementParticipant {
  id: string;
  session_id: string;
  user_id: string;
  state: ParticipantState;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  user_full_name?: string | null;
  user_avatar_url?: string | null;
}
```

**Updated Types:**
```typescript
export interface SessionWithDetails {
  // ... existing fields
  engagement_mode: EngagementMode;  // NEW
}

export interface BaseSessionConfig {
  // ... existing fields
  engagement_mode?: EngagementMode;  // NEW
}
```

### `services/pushService.ts`

**New Notification Types:**
```typescript
export type PushNotificationType =
  | ... existing types
  | 'squad_engagement_invite'
  | 'squad_engagement_joined'
  | 'squad_engagement_declined'
  | 'squad_engagement_starting';
```

**New Functions:**
```typescript
/**
 * Notify invited participants about a squad engagement
 */
notifySquadEngagementInvites(
  userIds: string[],
  sessionId: string,
  trainingId: string,
  drillName: string,
  commanderName: string,
  teamName: string
)

/**
 * Notify commander that a participant joined
 */
notifySquadParticipantJoined(
  commanderId: string,
  sessionId: string,
  participantName: string,
  drillName: string
)

/**
 * Notify commander that a participant declined
 */
notifySquadParticipantDeclined(
  commanderId: string,
  sessionId: string,
  participantName: string,
  drillName: string
)

/**
 * Notify all joined participants that engagement is starting
 */
notifySquadEngagementStarting(
  userIds: string[],
  sessionId: string,
  drillName: string
)
```

### `services/notifications.ts`

**New Local Notification Functions:**
```typescript
notifySquadEngagementInvite(userId, sessionId, drillName, commanderName)
notifySquadEngagementJoined(commanderId, sessionId, participantName)
notifySquadEngagementDeclined(commanderId, sessionId, participantName)
notifySquadEngagementStarting(sessionId, drillName)
```

### `supabase/functions/send-push-notification/index.ts`

**Changes:**
- Added squad engagement notification types to channel mapping
- All squad notifications use the "social" channel

### `types/workspace.ts`

**Updated TrainingDrill:**
```typescript
export interface TrainingDrill {
  // ... existing fields
  
  /** For engagement drills: solo (default) or squad */
  engagement_mode?: 'solo' | 'squad' | null;
}
```

**Updated CreateTrainingDrillInput:**
```typescript
export interface CreateTrainingDrillInput {
  // ... existing fields
  
  /** For engagement drills: solo (default) or squad */
  engagement_mode?: 'solo' | 'squad';
}
```

### `hooks/realtime/index.ts`

**Added Export:**
```typescript
export { useParticipantsRealtime } from './useParticipantsRealtime';
export type { ParticipantRecord } from './useParticipantsRealtime';
```

### `components/session/creation/index.ts`

**Added Exports:**
```typescript
export { EngagementModeToggle } from './EngagementModeToggle';
export { AddParticipantsPanel } from './AddParticipantsPanel';
export { InviteParticipantsPanel } from './InviteParticipantsPanel';
```

---

## User Flows

### Flow 1: Commander Starts Squad Engagement (from Drill)

```
1. Commander creates training with drill that has engagement_mode='squad'
2. Commander opens Training Detail
3. Commander taps the squad drill to start
4. StartDrillSheet opens (detects squad mode)
5. Commander optionally invites participants
6. Commander taps "Start" → Session created with engagement_mode='squad'
7. Invited participants receive push notification
8. Commander navigated to Squad Lobby
9. Commander sees realtime participant status
10. Commander taps "Start Engagement" when ≥1 participant joined
11. All joined participants notified via push
12. Everyone navigated to Active Session
```

### Flow 2: Soldier Joins Squad Engagement

```
1. Soldier receives push notification "Squad Engagement Invite"
2. Opens app → Training Detail
3. SquadInvitationBanner appears (if invitation pending)
4. Banner shows: drill name, commander name, distance, rounds
5. Soldier taps "Join Squad"
6. updateParticipantState(sessionId, odlerId, 'joined') called
7. Commander receives notification "X joined"
8. Soldier navigated to Active Session
   (shows waiting state if commander hasn't started)
```

### Flow 3: Soldier Declines Squad Engagement

```
1. Soldier sees SquadInvitationBanner
2. Taps "Decline"
3. Confirmation dialog appears
4. Soldier confirms
5. updateParticipantState(sessionId, odlerId, 'left') called
6. Commander receives notification "X declined"
7. Banner disappears
```

---

## API Reference

### Participants Service

```typescript
import {
  getSessionParticipants,
  getEligibleParticipants,
  addParticipant,
  updateParticipantState,
  removeParticipant,
  canStartEngagement,
  getParticipantCounts,
} from '@/services/session/participants';

// Get all participants for a session
const participants = await getSessionParticipants(sessionId);
// Returns: EngagementParticipant[] with user profile data

// Get eligible team members to invite
const eligible = await getEligibleParticipants(teamId, sessionId);
// Returns: { user_id, full_name, avatar_url, role }[]

// Add a participant (creates in 'pending' state)
const participant = await addParticipant(sessionId, userId);

// Update participant state
await updateParticipantState(sessionId, userId, 'joined');
// Valid states: 'pending' | 'joined' | 'left'

// Remove a participant
await removeParticipant(sessionId, userId);

// Check if engagement can start (at least one 'joined')
const canStart = canStartEngagement(participants);

// Get counts by state
const counts = getParticipantCounts(participants);
// Returns: { pending: 2, joined: 1, left: 0, total: 3 }
```

---

## Push Notifications

### Notification Types & Channels

| Type | Channel | When Sent |
|------|---------|-----------|
| `squad_engagement_invite` | social | Commander invites participants |
| `squad_engagement_joined` | social | Participant joins (→ commander) |
| `squad_engagement_declined` | social | Participant declines (→ commander) |
| `squad_engagement_starting` | social | Commander starts (→ joined participants) |

### Data Payloads

**squad_engagement_invite:**
```typescript
{
  screen: 'squadEngagementInvite',
  id: sessionId,
  trainingId: trainingId,
}
```

**squad_engagement_joined / declined:**
```typescript
{
  screen: 'squadLobby',
  id: sessionId,
}
```

**squad_engagement_starting:**
```typescript
{
  screen: 'activeSession',
  id: sessionId,
}
```

---

## Realtime Subscriptions

### useParticipantsRealtime

Subscribes to `engagement_participants` table changes filtered by `session_id`.

```typescript
const { isConnected, status, error, reconnect } = useParticipantsRealtime({
  sessionId: params.sessionId,
  onParticipantAdded: (p) => {
    console.log('New participant:', p.user_id);
    refreshList();
  },
  onParticipantChanged: (p) => {
    console.log('State changed:', p.user_id, p.state);
    refreshList();
  },
  onParticipantRemoved: (p) => {
    console.log('Removed:', p.user_id);
    refreshList();
  },
  enabled: true,
});
```

### Database Events

| Event | Trigger |
|-------|---------|
| INSERT | New participant invited via `addParticipant()` |
| UPDATE | State changed via `updateParticipantState()` |
| DELETE | Participant removed via `removeParticipant()` |

---

## Migration Notes

### Running the Migration

```bash
# Apply migration
supabase db push

# Or run migration directly
supabase migration up
```

### Backwards Compatibility

- Existing sessions default to `engagement_mode = 'solo'`
- Existing training drills keep `engagement_mode = NULL` (treated as solo)
- No data migration required

---

## Files Summary

### New Files (8)

| File | Purpose |
|------|---------|
| `app/(protected)/squadLobby.tsx` | Commander waiting room |
| `components/training/SquadInvitationBanner.tsx` | Soldier invitation UI |
| `components/session/creation/InviteParticipantsPanel.tsx` | Invite team members |
| `components/session/creation/AddParticipantsPanel.tsx` | Show current participants |
| `components/session/creation/EngagementModeToggle.tsx` | Solo/Squad toggle |
| `services/session/participants.ts` | Participant CRUD service |
| `hooks/realtime/useParticipantsRealtime.ts` | Realtime participant hook |
| `supabase/migrations/20260125_add_squad_engagement_mode.sql` | Database migration |

### Modified Files (8)

| File | Changes |
|------|---------|
| `components/training/StartDrillSheet.tsx` | Squad mode routing |
| `services/session/types.ts` | New types |
| `services/pushService.ts` | New notification functions |
| `services/notifications.ts` | New local notifications |
| `supabase/functions/send-push-notification/index.ts` | New notification types |
| `types/workspace.ts` | engagement_mode on drills |
| `hooks/realtime/index.ts` | Export new hook |
| `components/session/creation/index.ts` | Export new components |

---

## Testing Checklist

### Squad Engagement Flow
- [ ] Commander can start drill with `engagement_mode: 'squad'`
- [ ] StartDrillSheet navigates to squadLobby for squad drills
- [ ] Push notifications sent to invited participants
- [ ] Squad Lobby shows realtime participant status
- [ ] Commander cannot start until ≥1 participant joined
- [ ] "Start Engagement" button disabled when no one joined
- [ ] Commander can cancel and go back

### Participant Flow
- [ ] SquadInvitationBanner shows for pending invites
- [ ] Banner shows correct drill info and commander name
- [ ] Join button updates state and navigates to session
- [ ] Decline button shows confirmation and updates state
- [ ] Commander receives notifications for join/decline

### Push Notifications
- [ ] Invite notification received by participants
- [ ] Joined notification received by commander
- [ ] Declined notification received by commander
- [ ] Starting notification received by joined participants

### RLS Policies
- [ ] Participants can view their own records
- [ ] Session owner can view all participants
- [ ] Team members can view participants for team sessions
- [ ] Only session owner can add/remove participants
- [ ] Users can only update their own state

### Realtime
- [ ] Squad Lobby updates when participant joins
- [ ] Squad Lobby updates when participant declines
- [ ] SquadInvitationBanner updates on changes

---

*Last Updated: January 25, 2026*
