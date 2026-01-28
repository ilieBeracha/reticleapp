Supabase + Cursor — Canonical Schema Workflow
Context (must be read first)

Supabase projects: staging + production

Baseline migration exists and is frozen

Migration history has been reset cleanly

Dashboard edits are allowed only in staging

Cursor must NEVER invent schema state

Cursor must NEVER touch the baseline

Global Rules (absolute)

Baseline migration is immutable

Never edited

Never regenerated

Never referenced as a diff target

All schema changes originate in Supabase Dashboard

Cursor does NOT design schema directly in SQL

Cursor only captures and organizes changes

supabase db pull is the ONLY way to create migrations

No hand-written migrations

No migra output

No db dump syncing

One migration = one logical change

No bundling

No “cleanup while here”

FLOW 1 — Add a new table (standard case)
Human (you)

Open Supabase Dashboard → Staging

Run SQL:

create table public.weapon_requests (
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id),
weapon_name text not null,
status text not null default 'pending',
created_at timestamptz default now()
);

Confirm table exists in dashboard

Cursor (after dashboard change)

Prompt to Cursor:

A new table was created in Supabase staging. Capture it safely.

Cursor actions:

supabase db pull

Result:

New migration file created:

supabase/migrations/20260128_add_weapon_requests.sql

Cursor must:

Inspect migration

Verify it does NOT touch baseline

Verify it contains ONLY the new table

Human
git add supabase/migrations
git commit -m "add weapon_requests table"

Deployment
supabase db push

FLOW 2 — Modify existing table (add column)
Human

In Supabase Dashboard (staging):

alter table public.trainings
add column capture_mode text not null default 'phone';

Cursor
supabase db pull

Expected migration:

alter table public.trainings
add column capture_mode text not null default 'phone';

Cursor must verify:

No DROP

No CREATE OR REPLACE

No unrelated changes

FLOW 3 — Change RLS policy (security-critical)
Human

In Supabase Dashboard (staging):

drop policy if exists "Users can view own trainings" on public.trainings;

create policy "Users can view own trainings"
on public.trainings
for select
using (auth.uid() = user_id);

Cursor
supabase db pull

Cursor must:

Treat this as high-risk

Ensure migration:

Drops only intended policy

Recreates only intended policy

Flag if unrelated policies appear

FLOW 4 — Create or update a function
Human

In Supabase Dashboard (staging):

create or replace function public.can_edit_training(tid uuid)
returns boolean
language sql
security definer
as $$
select exists (
select 1
from trainings
where id = tid
and user_id = auth.uid()
);

$$
;

Cursor
supabase db pull


Cursor must:

Accept create or replace only for functions

Confirm no tables or policies are affected

Confirm function body matches dashboard intent

FLOW 5 — Multiple changes (must be split)
Human

You do multiple dashboard changes:

Add column

Update RLS

Create index

❌ WRONG:

One big migration

✅ CORRECT:

Cursor workflow

Stop

Ask:

“These are multiple logical changes. Should I split them?”

Human

Confirms split

Cursor

Manually separates migrations:

Migration A: column

Migration B: RLS

Migration C: index

FLOW 6 — What Cursor must NEVER do

Cursor must NEVER:

Edit *_baseline*.sql

Run supabase migration repair

Run supabase db dump

Apply migra output

Generate DROP TABLE migrations unless explicitly instructed

Invent schema changes not present in dashboard

If Cursor sees:

drop table ...


It must STOP and ask for confirmation.

FLOW 7 — Verification step (mandatory)

After every db pull or db push, Cursor must run:

supabase migration list
supabase db diff


Expected:

One new migration

No destructive diffs

FLOW 8 — Production deployment

Cursor is NOT allowed to deploy to prod automatically.

Human runs:

supabase link --project-ref PROD
supabase db push


Cursor may:

Read output

Verify no DROP

Confirm success

FLOW 9 — Recovery (read-only)

If Cursor sees:

“Remote migration versions not found”

DROP TABLE diffs

Revert suggestions

Cursor must:

STOP

Report exact output

Take no action

Summary Rules for Cursor (TL;DR)

Dashboard = write

db pull = record

Migrations = contract

Baseline = constitution

Cursor = scribe, not architect

Final instruction you can give Cursor verbatim

You are not allowed to invent schema state.
You only reflect what exists in Supabase staging.
If history and reality disagree, you stop and ask.
$$
