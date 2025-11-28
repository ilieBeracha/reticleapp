# DATABASE SCHEMA REFERENCE

## Tables

### profiles
```sql
id          uuid PK (= auth.uid())
email       text UNIQUE
full_name   text
avatar_url  text
created_at  timestamptz
updated_at  timestamptz
```

### org_workspaces
```sql
id              uuid PK
created_by      uuid FK→profiles
name            text
description     text
settings        jsonb DEFAULT '{}'
created_at      timestamptz
updated_at      timestamptz
```

### workspace_access
```sql
id              uuid PK
org_workspace_id uuid FK→org_workspaces
member_id       uuid FK→profiles
role            text CHECK(owner|admin|instructor|member)
joined_at       timestamptz
invited_by      uuid FK→profiles
UNIQUE(org_workspace_id, member_id)
```

### workspace_invitations
```sql
id              uuid PK
org_workspace_id uuid FK→org_workspaces
invite_code     text UNIQUE
role            text CHECK(owner|admin|instructor|member)
status          text CHECK(pending|accepted|cancelled|expired)
invited_by      uuid FK→profiles
accepted_by     uuid FK→profiles
accepted_at     timestamptz
expires_at      timestamptz
team_id         uuid FK→teams (nullable)
team_role       text CHECK(commander|squad_commander|soldier)
details         jsonb DEFAULT '{}'
created_at      timestamptz
updated_at      timestamptz
```

### teams
```sql
id              uuid PK
org_workspace_id uuid FK→org_workspaces
name            text
team_type       text (field|back_office)
squads          text[] (squad names)
created_at      timestamptz
updated_at      timestamptz
UNIQUE(org_workspace_id, name)
```

### team_members
```sql
team_id     uuid FK→teams
user_id     uuid FK→profiles
role        text CHECK(commander|squad_commander|soldier)
joined_at   timestamptz
details     jsonb (must have squad_id for non-commanders)
PK(team_id, user_id)
```
CONSTRAINT: Only one commander per team (unique index)
CONSTRAINT: squad_commander/soldier MUST have squad_id in details

### trainings
```sql
id              uuid PK
org_workspace_id uuid FK→org_workspaces
team_id         uuid FK→teams
title           text
description     text
status          text CHECK(planned|in_progress|completed|cancelled)
scheduled_at    timestamptz
started_at      timestamptz
finished_at     timestamptz
created_by      uuid FK→profiles
created_at      timestamptz
updated_at      timestamptz
```

### training_drills
```sql
id          uuid PK
training_id uuid FK→trainings
name        text
description text
duration_minutes int
order_index int
target_type text CHECK(time|reps|distance)
target_value numeric
status      text CHECK(pending|in_progress|completed|skipped)
created_at  timestamptz
updated_at  timestamptz
```

### sessions
```sql
id              uuid PK
user_id         uuid FK→profiles
org_workspace_id uuid FK→org_workspaces (nullable for personal)
team_id         uuid FK→teams (nullable)
training_id     uuid FK→trainings (nullable)
drill_id        uuid FK→training_drills (nullable)
name            text
status          text CHECK(active|paused|completed)
start_time      timestamptz
end_time        timestamptz
environment     jsonb
created_at      timestamptz
updated_at      timestamptz
```

### session_stats
```sql
id          uuid PK
session_id  uuid FK→sessions
user_id     uuid FK→profiles
metric_type text
value       numeric
unit        text
recorded_at timestamptz
```

---

## RLS Policy Summary

### workspace_invitations
| Policy | Condition |
|--------|-----------|
| INSERT | owner/admin OR (commander + team_id match + role=member + team_role IN squad_commander,soldier) |
| SELECT | owner/admin OR commander(team) OR invited_by=self OR status=pending |
| UPDATE | owner/admin OR commander(team) OR (status=pending AND not expired) |
| DELETE | owner/admin OR commander(team) OR invited_by=self |

### trainings
| Policy | Condition |
|--------|-----------|
| INSERT | owner/admin/instructor OR commander(team_id matches) |
| SELECT | owner/admin/instructor OR member of team_id |
| UPDATE | owner/admin/instructor OR commander(team_id matches) |
| DELETE | owner/admin only |

### training_drills
| Policy | Condition |
|--------|-----------|
| INSERT | owner/admin/instructor OR commander(training's team) |
| SELECT | same as trainings (via training_id join) |
| UPDATE | owner/admin/instructor OR commander(training's team) |
| DELETE | owner/admin only |

### sessions
| Policy | Condition |
|--------|-----------|
| INSERT | user_id=self AND (personal OR org member AND (no training OR training team member)) |
| SELECT | user_id=self OR (org member AND (admin/owner/instructor OR same team)) |
| UPDATE | user_id=self |
| DELETE | user_id=self |

---

## Key Functions (RPC)

### accept_invite_code(p_invite_code text, p_user_id uuid)
1. Validates invite code
2. Checks not expired
3. Checks user not already member
4. Creates workspace_access record
5. If team invite, creates team_members record
6. Updates invitation status to 'accepted'
Returns: `{success, workspace_id, workspace_name, role, team_id?, team_name?, team_role?}`

### validate_invite_code(p_invite_code text)
Returns invite details for preview before accepting.
Returns: `{valid, invite_code, workspace_name, role, team_name?, team_role?, error?}`

