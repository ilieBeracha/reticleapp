# Query Map (Core Training Loop)

This document inventories **Supabase queries and RPC calls** in the **core training loop** and links them to their **entry points** and **callers** (stores/screens).

## DB objects referenced

### Tables
- `sessions`
- `session_targets`
- `paper_target_results`
- `tactical_target_results`
- `trainings`
- `training_drills`
- `teams`
- `team_members`
- `team_invitations`
- `profiles`
- `user_drill_completions`

### RPCs
- `create_team_with_owner`
- `get_my_teams`
- `get_team_with_members`
- `accept_team_invitation`

## Query inventory

| Query ID | Entry point | Callers (examples) | DB object | Query shape (high level) | Risk flags |
|---|---|---|---|---|---|
| SESS-01 | `getMyActiveSessionForTraining(trainingId)` (`services/session/queries.ts`) | `services/session/mutations.ts:createSession` | `sessions` | `select` session + joined `profiles/teams/trainings/training_drills`, filter `training_id,user_id,status=active`, `maybeSingle` | medium payload join |
| SESS-02 | `getMyActiveSession()` (`services/session/queries.ts`) | Home / active session flows | `sessions` | `select` session + joins, filter `user_id,status=active`, `order started_at desc`, `limit 1` | medium payload join |
| SESS-03 | `getMyActivePersonalSession()` (`services/session/queries.ts`) | Home (unified) | `sessions` | `select` session + joins, filter `user_id,status=active,team_id IS NULL`, `limit 1` | debug logs present |
| SESS-04 | `getSessions(teamId?)` (`services/session/queries.ts`) | `store/sessionStore.tsx:loadSessions/loadPersonalSessions` | `sessions` | `select` session + joins, optional team filter, `order started_at desc` | **unbounded** (no limit/range) |
| SESS-05 | `getSessionsWithStats(teamId?)` (`services/session/queries.ts`) | analytics/widgets | `sessions` + `session_targets` (+ nested results) | phase1: `getSessions()`; phase2: `session_targets.in(session_id, ids)` selecting nested results; aggregate client-side | **fanout**, **unbounded**, large `.in()` |
| SESS-06 | `getRecentSessionsWithStats({days,limit,teamId})` (`services/session/queries.ts`) | `components/home/UnifiedHomePage.tsx` | `sessions` + `session_targets` (+ nested results) | sessions filtered by `started_at >= threshold OR status=active`, `limit`, then `session_targets.in(session_id, ids)` | bounded; `.in()` still scales with limit |
| SESS-07 | `getTrainingSessions(trainingId)` (`services/session/queries.ts`) | training detail screens | `sessions` | `select` session + joins, filter training_id, `order` | likely needs limit/pagination |
| SESS-08 | `getTeamSessions(teamId)` (`services/session/queries.ts`) | `store/sessionStore.tsx:loadTeamSessions` | `sessions` | `select` session + joins, filter team_id, `order` | **unbounded** |
| SESS-09 | `getSessionById(sessionId)` (`services/session/queries.ts`) | session detail screens | `sessions` | `select` session + joins + detailed drill fields, `single` | heavy but single-row |
| SESS-10 | `getSessionSummary(sessionId)` (`services/session/queries.ts`) | personal-home widgets | `session_targets` | count targets via `select('*',{count,head})` | `select('*')` for count |
| TGT-01 | `getSessionTargets(sessionId)` (`services/session/targets.ts`) | session detail/add target | `session_targets` | `select('*')`, filter session_id, order sequence | **select(*)** |
| TGT-02 | `addSessionTarget(params)` (`services/session/targets.ts`) | add target flows | `session_targets` | count query (`select('*',{count,head})`) then insert target + select single | count uses `*` |
| TGT-03 | `getSessionTargetsWithResults(sessionId)` (`services/session/targets.ts`) | session detail | `session_targets` + results | `select(*, paper_target_results(*), tactical_target_results(*))` | **wide nested select** |
| RES-P-01 | `savePaperTargetResult(params)` (`services/session/targets.ts`) | add target + save result | `paper_target_results` | read existing by `session_target_id` then update or insert | 2 roundtrips + debug logs |
| RES-T-01 | `saveTacticalTargetResult(params)` (`services/session/targets.ts`) | add target + save result | `tactical_target_results` | read existing then update or insert | 2 roundtrips |
| TRN-01 | `createTraining(input)` (`services/trainingService.ts`) | `app/(protected)/createTraining.tsx` via store/service | `trainings` + `training_drills` | insert training with join select; then bulk insert drills | large insert payload |
| TRN-02 | `getTeamTrainings(teamId,{status,limit})` (`services/trainingService.ts`) | `store/trainingStore.tsx:loadTeamTrainings` | `trainings` (+ joins) | select training + `training_drills(id)` to compute count | drill list just for count |
| TEAM-01 | `getMyTeams()` (`services/teamService.ts`) | `store/teamStore.tsx:loadTeams` | `rpc:get_my_teams` | RPC returning team list + role | payload depends on RPC |
| TEAM-02 | `getTeamWithMembers(teamId)` (`services/teamService.ts`) | `store/teamStore.tsx:loadActiveTeam` | `rpc:get_team_with_members` (+ fallback select) | RPC -> maybe fallback to `getTeamMembers` for profile hydration | possible 2 queries |
| INV-01 | `createInvitation(...)` (`services/invitationService.ts`) | team invites UI/store | `team_invitations` (+ uniqueness checks) | up to 5 `select('id').eq(invite_code).single()` then insert+select | multiple roundtrips |
| INV-02 | `validateInviteCode(code)` (`services/invitationService.ts`) | `store/inviteStore.tsx:validateInviteCode` | `team_invitations` + `team_members` | select invitation + joins, then select membership | 2 queries |
| INV-03 | `acceptInvitation(code)` (`services/invitationService.ts`) | `store/inviteStore.tsx:acceptInviteCode` | `rpc:accept_team_invitation` (+ profile select) | RPC then `profiles.select(full_name)` | 2 queries |
| UI-01 | `MemberActivityScreen.loadActivity()` (`app/(protected)/memberActivity.tsx`) | direct in screen | `sessions` | select sessions for member+team with joins; `limit 50` | bypasses services/store |
| UI-02 | `ScansPage.loadScans()` (`app/(protected)/scans.tsx`) | direct in screen | `sessions` then `session_targets` | phase1: sessions `select(id)` (no limit); phase2: targets `.in(session_id, ids)`, `limit 100` | potentially huge `.in()` + unbounded phase1 |


