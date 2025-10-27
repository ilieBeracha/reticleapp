-- Create session_stats table for tracking shooting sessions
-- Uses Clerk JWT claims for authentication (auth.jwt()->>'sub' for user_id, auth.jwt()->>'org_id' for org_id)

create table if not exists public.session_stats (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references public.trainings(id) on delete set null, -- NULL = personal/standalone session
  organization_id text, -- Clerk org id (org_*), nullable for personal sessions
  name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  range_location text,
  weather jsonb, -- Wind, temp, visibility, pressure, etc.
  day_period day_period, -- Using existing enum from previous migration
  is_squad boolean default false,
  comments text,
  created_by text not null, -- Clerk user id (user_*)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_session_stats_training on public.session_stats (training_id);
create index if not exists idx_session_stats_org on public.session_stats (organization_id);
create index if not exists idx_session_stats_created_by on public.session_stats (created_by);
create index if not exists idx_session_stats_started_at on public.session_stats (started_at desc);
create index if not exists idx_session_stats_day_period on public.session_stats (day_period);

-- Enable Row Level Security
alter table public.session_stats enable row level security;

-- RLS: Read session_stats - users can read stats they created OR stats in orgs they belong to
create policy "session_stats_select"
on public.session_stats for select to anon
using (
  created_by = auth.jwt()->>'sub'
  or (
    organization_id = auth.jwt()->>'org_id'
    and auth.jwt()->>'org_id' is not null
  )
);

-- RLS: Insert session_stats - users can insert if they're authenticated and match created_by
create policy "session_stats_insert"
on public.session_stats for insert to anon
with check (
  created_by = auth.jwt()->>'sub'
);

-- RLS: Update your own session_stats
create policy "session_stats_update"
on public.session_stats for update to anon
using (
  created_by = auth.jwt()->>'sub'
);

-- RLS: Delete your own session_stats
create policy "session_stats_delete"
on public.session_stats for delete to anon
using (
  created_by = auth.jwt()->>'sub'
);

-- Trigger to update updated_at timestamp
create trigger update_session_stats_updated_at
  before update on public.session_stats
  for each row
  execute function public.update_updated_at_column();

