-- Create enum types for session
create type session_type as enum ('steel', 'paper');
create type day_period as enum ('day', 'night');

-- Create trainings table
create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,           -- Clerk org id (org_*)
  name text not null,
  description text,
  created_by text not null,                -- Clerk user id (user_*)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trainings_org on public.trainings (organization_id);
create index if not exists idx_trainings_created_by on public.trainings (created_by);

alter table public.trainings enable row level security;

-- RLS: Read trainings within active org
create policy "trainings_select_by_org"
on public.trainings for select to anon
using (organization_id = auth.jwt()->>'org_id');

-- RLS: Insert trainings within active org
create policy "trainings_insert_in_org"
on public.trainings for insert to anon
with check (
  organization_id = auth.jwt()->>'org_id'
  and created_by = auth.jwt()->>'sub'
);

-- RLS: Update/delete your own trainings within active org
create policy "trainings_update_own"
on public.trainings for update to anon
using (
  organization_id = auth.jwt()->>'org_id'
  and created_by = auth.jwt()->>'sub'
);

create policy "trainings_delete_own"
on public.trainings for delete to anon
using (
  organization_id = auth.jwt()->>'org_id'
  and created_by = auth.jwt()->>'sub'
);

-- Create sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  organization_id text not null,           -- Clerk org id (org_*) - denormalized for RLS
  name text not null,
  session_type session_type not null,
  range_m integer,                          -- Range in meters
  day_period day_period not null,
  env_wind_mps numeric(5,2),               -- Wind speed in meters per second
  env_temp_c numeric(5,2),                 -- Temperature in Celsius
  env_pressure_hpa numeric(7,2),           -- Pressure in hectopascals
  created_by text not null,                -- Clerk user id (user_*)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_sessions_training on public.sessions (training_id);
create index if not exists idx_sessions_org on public.sessions (organization_id);
create index if not exists idx_sessions_created_by on public.sessions (created_by);
create index if not exists idx_sessions_type on public.sessions (session_type);
create index if not exists idx_sessions_created_at on public.sessions (created_at desc);

alter table public.sessions enable row level security;

-- RLS: Read sessions within active org
create policy "sessions_select_by_org"
on public.sessions for select to anon
using (organization_id = auth.jwt()->>'org_id');

-- RLS: Insert sessions within active org
create policy "sessions_insert_in_org"
on public.sessions for insert to anon
with check (
  organization_id = auth.jwt()->>'org_id'
  and created_by = auth.jwt()->>'sub'
);

-- RLS: Update your own sessions within active org
create policy "sessions_update_own"
on public.sessions for update to anon
using (
  organization_id = auth.jwt()->>'org_id'
  and created_by = auth.jwt()->>'sub'
);

-- RLS: Delete your own sessions within active org
create policy "sessions_delete_own"
on public.sessions for delete to anon
using (
  organization_id = auth.jwt()->>'org_id'
  and created_by = auth.jwt()->>'sub'
);

-- Trigger to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_trainings_updated_at
  before update on public.trainings
  for each row
  execute function public.update_updated_at_column();

create trigger update_sessions_updated_at
  before update on public.sessions
  for each row
  execute function public.update_updated_at_column();

