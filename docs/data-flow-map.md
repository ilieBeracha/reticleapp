# Data Flow Map (Core Training Loop)

This document maps the **runtime flow** from **UI → store/hook → service → Supabase → DB**, including the current **bypass paths** where screens call Supabase directly.

## Global structure

```mermaid
flowchart TD
  ui[UI_Screens_And_Components] --> store[Zustand_Stores]
  store --> services[services_*]
  services --> supabase[Supabase_JS_Client]
  supabase --> db[(Postgres)]

  ui -->|bypasses_services| supabase
```

## Sessions flows

### Sessions list (personal/team)

```mermaid
flowchart TD
  TabsSessions[app_protected_tabs_sessions] --> sessionStoreLoad[store_sessionStore_loadSessions]
  sessionStoreLoad --> getSessions[services_session_queries_getSessions]
  getSessions --> sessionsTable[(sessions)]
```

```mermaid
flowchart TD
  ActiveSession[app_protected_activeSession] --> sessionStoreTeam[store_sessionStore_loadTeamSessions]
  sessionStoreTeam --> getTeamSessions[services_session_queries_getTeamSessions]
  getTeamSessions --> sessionsTable[(sessions)]
```

### Unified home “recent sessions + stats”

```mermaid
flowchart TD
  UnifiedHome[components_home_UnifiedHomePage] --> recentWithStats[services_session_queries_getRecentSessionsWithStats]
  recentWithStats --> sessionsTable[(sessions)]
  recentWithStats --> sessionTargets[(session_targets)]
  sessionTargets --> paperResults[(paper_target_results)]
  sessionTargets --> tacticalResults[(tactical_target_results)]
```

### Session detail (targets + results)

```mermaid
flowchart TD
  SessionDetail[app_protected_sessionDetail] --> getSessionById[services_session_queries_getSessionById]
  getSessionById --> sessionsTable[(sessions)]

  SessionDetail --> getTargetsWithResults[services_session_targets_getSessionTargetsWithResults]
  getTargetsWithResults --> sessionTargets[(session_targets)]
  sessionTargets --> paperResults[(paper_target_results)]
  sessionTargets --> tacticalResults[(tactical_target_results)]
```

## Trainings flows

### Team trainings list

```mermaid
flowchart TD
  TabsTrainings[app_protected_tabs_trainings] --> trainingStoreLoad[store_trainingStore_loadMyUpcomingTrainings]
  trainingStoreLoad --> getMyUpcoming[services_trainingService_getMyUpcomingTrainings]
  getMyUpcoming --> trainingsTable[(trainings)]
```

```mermaid
flowchart TD
  TeamDetail[app_protected_teamDetail] --> trainingStoreTeam[store_trainingStore_loadTeamTrainings]
  trainingStoreTeam --> getTeamTrainings[services_trainingService_getTeamTrainings]
  getTeamTrainings --> trainingsTable[(trainings)]
  getTeamTrainings --> trainingDrills[(training_drills)]
```

### Create training

```mermaid
flowchart TD
  CreateTraining[app_protected_createTraining] --> createTrainingFn[services_trainingService_createTraining]
  createTrainingFn --> trainingsTable[(trainings)]
  createTrainingFn --> trainingDrills[(training_drills)]
```

## Teams flows

### My teams (RPC)

```mermaid
flowchart TD
  TabsTeams[app_protected_tabs_teams] --> teamStoreLoad[store_teamStore_loadTeams]
  teamStoreLoad --> rpcGetMyTeams[services_teamService_getMyTeams]
  rpcGetMyTeams --> rpc[(rpc_get_my_teams)]
```

### Active team + members (RPC + fallback select)

> **Note:** As of the Unified Team Tab update, `teamWorkspace.tsx` is deprecated.
> The Team Tab (`trainings.tsx`) IS the team workspace when an activeTeam is selected.
> Team switching happens only through the pill/sheet - no separate "team page" navigation.

```mermaid
flowchart TD
  TeamTab[app_protected_tabs_trainings] --> teamStoreLoad[store_teamStore_loadTeams]
  teamStoreLoad --> rpcGetMyTeams[services_teamService_getMyTeams]
  rpcGetMyTeams --> rpc[(rpc_get_my_teams)]
  
  TeamTab --> teamMembers[app_protected_teamMembers]
  teamMembers --> getTeamMembers[services_teamService_getTeamMembers]
  getTeamMembers --> teamMembersTable[(team_members)]
  teamMembersTable --> profiles[(profiles)]
```

### Legacy: Team Workspace (deprecated)

```mermaid
flowchart TD
  TeamWorkspace[app_protected_teamWorkspace_DEPRECATED] --> teamStoreActive[store_teamStore_loadActiveTeam]
  teamStoreActive --> rpcTeamWithMembers[services_teamService_getTeamWithMembers]
  rpcTeamWithMembers --> rpc[(rpc_get_team_with_members)]
  rpcTeamWithMembers -->|fallback_when_profiles_incomplete| teamMembers[(team_members)]
  teamMembers --> profiles[(profiles)]
```

## Invitations flows

```mermaid
flowchart TD
  InviteFlow[store_inviteStore_acceptInviteCode] --> invAccept[services_invitationService_acceptInvitation]
  invAccept --> rpc[(rpc_accept_team_invitation)]
  invAccept --> profiles[(profiles)]
  InviteFlow --> teamStoreLoad[store_teamStore_loadTeams]
```

## Current bypass paths (should be routed through services)

```mermaid
flowchart TD
  MemberActivity[app_protected_memberActivity] -->|direct| sessionsTable[(sessions)]
  Scans[app_protected_scans] -->|direct_step1| sessionsTable[(sessions)]
  Scans -->|direct_step2| sessionTargets[(session_targets)]
  sessionTargets --> paperResults[(paper_target_results)]
```












