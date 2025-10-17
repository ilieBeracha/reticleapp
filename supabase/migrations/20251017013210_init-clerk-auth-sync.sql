-- Basic user profile mirror (Clerk is still the source of truth)
create table if not exists public.profiles (
  user_id text primary key,             -- Clerk user id (user_*)
  email text,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Allow users to read/update only their own row
create policy "profiles_select_self"
on public.profiles for select to anon
using (user_id = auth.jwt()->>'sub');

-- Ensure pgcrypto for gen_random_uuid
create extension if not exists pgcrypto with schema public;


-- Example tenant-scoped table using claims-only (no mirrors required)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null, -- Clerk org id (org_*)
  owner_id text not null,        -- Clerk user id (user_*)
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Indexes for common filters
create index if not exists idx_projects_org on public.projects (organization_id);
create index if not exists idx_projects_owner on public.projects (owner_id);

alter table public.projects enable row level security;

-- Read only within active org
create policy "projects_select_by_org"
on public.projects for select to anon
using (organization_id = auth.jwt()->>'org_id');

-- Mutations: only owner within active org
create policy "projects_mutate_owner_in_org"
on public.projects for all to anon
using (
  organization_id = auth.jwt()->>'org_id'
  and owner_id = auth.jwt()->>'sub'
)
with check (
  organization_id = auth.jwt()->>'org_id'
  and owner_id = auth.jwt()->>'sub'
);

create policy "profiles_upsert_self_insert"
on public.profiles for insert to anon
with check (user_id = auth.jwt()->>'sub');

create policy "profiles_upsert_self_update"
on public.profiles for update to anon
using (user_id = auth.jwt()->>'sub');