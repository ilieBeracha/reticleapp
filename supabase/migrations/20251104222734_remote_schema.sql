drop extension if exists "pg_net";

drop policy "profiles_select_self" on "public"."profiles";

drop policy "profiles_upsert_self_insert" on "public"."profiles";

drop policy "profiles_upsert_self_update" on "public"."profiles";

drop policy "projects_mutate_owner_in_org" on "public"."projects";

drop policy "projects_select_by_org" on "public"."projects";

drop policy "sessions_delete" on "public"."sessions";

drop policy "sessions_insert" on "public"."sessions";

drop policy "sessions_select" on "public"."sessions";

drop policy "sessions_update" on "public"."sessions";

drop policy "sights_delete" on "public"."sights";

drop policy "sights_insert" on "public"."sights";

drop policy "sights_select" on "public"."sights";

drop policy "sights_update" on "public"."sights";

drop policy "trainings_delete" on "public"."trainings";

drop policy "trainings_insert" on "public"."trainings";

drop policy "trainings_select" on "public"."trainings";

drop policy "trainings_update" on "public"."trainings";

drop policy "user_loadouts_delete" on "public"."user_loadouts";

drop policy "user_loadouts_insert" on "public"."user_loadouts";

drop policy "user_loadouts_select" on "public"."user_loadouts";

drop policy "user_loadouts_update" on "public"."user_loadouts";

drop policy "weapons_delete" on "public"."weapons";

drop policy "weapons_insert" on "public"."weapons";

drop policy "weapons_select" on "public"."weapons";

drop policy "weapons_update" on "public"."weapons";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."projects" from "anon";

revoke insert on table "public"."projects" from "anon";

revoke references on table "public"."projects" from "anon";

revoke select on table "public"."projects" from "anon";

revoke trigger on table "public"."projects" from "anon";

revoke truncate on table "public"."projects" from "anon";

revoke update on table "public"."projects" from "anon";

revoke delete on table "public"."projects" from "authenticated";

revoke insert on table "public"."projects" from "authenticated";

revoke references on table "public"."projects" from "authenticated";

revoke select on table "public"."projects" from "authenticated";

revoke trigger on table "public"."projects" from "authenticated";

revoke truncate on table "public"."projects" from "authenticated";

revoke update on table "public"."projects" from "authenticated";

revoke delete on table "public"."projects" from "service_role";

revoke insert on table "public"."projects" from "service_role";

revoke references on table "public"."projects" from "service_role";

revoke select on table "public"."projects" from "service_role";

revoke trigger on table "public"."projects" from "service_role";

revoke truncate on table "public"."projects" from "service_role";

revoke update on table "public"."projects" from "service_role";

alter table "public"."profiles" drop constraint "profiles_pkey";

alter table "public"."projects" drop constraint "projects_pkey";

drop index if exists "public"."idx_projects_org";

drop index if exists "public"."idx_projects_owner";

drop index if exists "public"."profiles_pkey";

drop index if exists "public"."projects_pkey";

drop index if exists "public"."idx_sessions_org";

drop index if exists "public"."idx_sights_org";

drop index if exists "public"."idx_trainings_org";

drop index if exists "public"."idx_user_loadouts_org";

drop index if exists "public"."idx_weapons_org";

drop table "public"."profiles";

drop table "public"."projects";


  create table "public"."org_memberships" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" text not null,
    "org_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."org_memberships" enable row level security;


  create table "public"."organization_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null,
    "email" text not null,
    "role" text not null,
    "status" text not null default 'pending'::text,
    "token" uuid,
    "invited_by" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "org_type" text not null,
    "parent_id" uuid,
    "root_id" uuid,
    "path" text[] not null default '{}'::text[],
    "depth" integer not null default 0,
    "description" text,
    "created_by" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."organizations" enable row level security;

alter table "public"."sessions" alter column "organization_id" set data type uuid using "organization_id"::uuid;

alter table "public"."sights" alter column "organization_id" set data type uuid using "organization_id"::uuid;

alter table "public"."trainings" alter column "organization_id" drop not null;

alter table "public"."trainings" alter column "organization_id" set data type uuid using "organization_id"::uuid;

alter table "public"."user_loadouts" alter column "organization_id" set data type uuid using "organization_id"::uuid;

alter table "public"."weapons" alter column "organization_id" set data type uuid using "organization_id"::uuid;

CREATE INDEX idx_memberships_org ON public.org_memberships USING btree (org_id);

CREATE INDEX idx_memberships_user ON public.org_memberships USING btree (user_id);

CREATE INDEX idx_org_invitations_email ON public.organization_invitations USING btree (email);

CREATE INDEX idx_org_invitations_invited_by ON public.organization_invitations USING btree (invited_by);

CREATE INDEX idx_org_invitations_org_id ON public.organization_invitations USING btree (organization_id);

CREATE INDEX idx_org_invitations_status ON public.organization_invitations USING btree (status);

CREATE INDEX idx_org_invitations_token ON public.organization_invitations USING btree (token);

CREATE INDEX idx_orgs_created_by ON public.organizations USING btree (created_by);

CREATE INDEX idx_orgs_parent ON public.organizations USING btree (parent_id);

CREATE INDEX idx_orgs_path ON public.organizations USING gin (path);

CREATE INDEX idx_orgs_root ON public.organizations USING btree (root_id);

CREATE INDEX idx_orgs_type ON public.organizations USING btree (org_type);

CREATE UNIQUE INDEX org_memberships_pkey ON public.org_memberships USING btree (id);

CREATE UNIQUE INDEX org_memberships_user_id_org_id_key ON public.org_memberships USING btree (user_id, org_id);

CREATE UNIQUE INDEX organization_invitations_pkey ON public.organization_invitations USING btree (id);

CREATE UNIQUE INDEX organization_invitations_token_key ON public.organization_invitations USING btree (token);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX unique_pending_invitation ON public.organization_invitations USING btree (organization_id, email, status);

CREATE INDEX idx_sessions_org ON public.sessions USING btree (organization_id);

CREATE INDEX idx_sights_org ON public.sights USING btree (organization_id);

CREATE INDEX idx_trainings_org ON public.trainings USING btree (organization_id);

CREATE INDEX idx_user_loadouts_org ON public.user_loadouts USING btree (organization_id);

CREATE INDEX idx_weapons_org ON public.weapons USING btree (organization_id);

alter table "public"."org_memberships" add constraint "org_memberships_pkey" PRIMARY KEY using index "org_memberships_pkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_pkey" PRIMARY KEY using index "organization_invitations_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."org_memberships" add constraint "org_memberships_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."org_memberships" validate constraint "org_memberships_org_id_fkey";

alter table "public"."org_memberships" add constraint "org_memberships_role_check" CHECK ((role = ANY (ARRAY['commander'::text, 'member'::text, 'viewer'::text]))) not valid;

alter table "public"."org_memberships" validate constraint "org_memberships_role_check";

alter table "public"."org_memberships" add constraint "org_memberships_user_id_org_id_key" UNIQUE using index "org_memberships_user_id_org_id_key";

alter table "public"."organization_invitations" add constraint "organization_invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_organization_id_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_role_check" CHECK ((role = ANY (ARRAY['member'::text, 'admin'::text, 'owner'::text]))) not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_role_check";

alter table "public"."organization_invitations" add constraint "organization_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text]))) not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_status_check";

alter table "public"."organization_invitations" add constraint "organization_invitations_token_key" UNIQUE using index "organization_invitations_token_key";

alter table "public"."organization_invitations" add constraint "unique_pending_invitation" UNIQUE using index "unique_pending_invitation";

alter table "public"."organizations" add constraint "fk_root" FOREIGN KEY (root_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organizations" validate constraint "fk_root";

alter table "public"."organizations" add constraint "organizations_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organizations" validate constraint "organizations_parent_id_fkey";

alter table "public"."sessions" add constraint "sessions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."sessions" validate constraint "sessions_organization_id_fkey";

alter table "public"."sights" add constraint "sights_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."sights" validate constraint "sights_organization_id_fkey";

alter table "public"."trainings" add constraint "trainings_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."trainings" validate constraint "trainings_organization_id_fkey";

alter table "public"."user_loadouts" add constraint "user_loadouts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."user_loadouts" validate constraint "user_loadouts_organization_id_fkey";

alter table "public"."weapons" add constraint "weapons_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."weapons" validate constraint "weapons_organization_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_child_organization(p_name text, p_org_type text, p_parent_id uuid, p_description text, p_user_id text)
 RETURNS TABLE(id uuid, name text, org_type text, parent_id uuid, root_id uuid, path text[], depth integer, description text, created_by text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_parent_root_id UUID;
  v_user_is_commander BOOLEAN;
BEGIN
  -- Validate name
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Organization name cannot be empty';
  END IF;

  -- Get parent's root_id
  SELECT organizations.root_id INTO v_parent_root_id
  FROM organizations
  WHERE organizations.id = p_parent_id;

  IF v_parent_root_id IS NULL THEN
    RAISE EXCEPTION 'Parent organization not found';
  END IF;

  -- Check if user is commander in parent's tree
  SELECT EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = p_user_id
      AND om.role = 'commander'
      AND org.root_id = v_parent_root_id
  ) INTO v_user_is_commander;

  IF NOT v_user_is_commander THEN
    RAISE EXCEPTION 'User is not a commander in this organization tree';
  END IF;

  -- Create the child organization
  INSERT INTO organizations (name, org_type, description, created_by, parent_id)
  VALUES (p_name, p_org_type, p_description, p_user_id, p_parent_id)
  RETURNING organizations.id INTO v_org_id;

  -- ✅ AUTO-ADD CREATOR AS COMMANDER OF THE NEW CHILD ORG
  -- This allows the creator to switch to and manage the child org
  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (p_user_id, v_org_id, 'commander')
  ON CONFLICT (user_id, org_id) DO NOTHING;

  -- Return the created organization
  RETURN QUERY
  SELECT org.id, org.name, org.org_type, org.parent_id, org.root_id,
         org.path, org.depth, org.description, org.created_by,
         org.created_at, org.updated_at
  FROM organizations org
  WHERE org.id = v_org_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_root_organization(p_name text, p_org_type text, p_description text, p_user_id text)
 RETURNS TABLE(id uuid, name text, org_type text, parent_id uuid, root_id uuid, path text[], depth integer, description text, created_by text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
BEGIN
  INSERT INTO organizations (name, org_type, description, created_by, parent_id)
  VALUES (p_name, p_org_type, p_description, p_user_id, NULL)
  RETURNING organizations.id INTO v_org_id;

  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (p_user_id, v_org_id, 'commander');

  RETURN QUERY
  SELECT org.id, org.name, org.org_type, org.parent_id, org.root_id,
         org.path, org.depth, org.description, org.created_by, 
         org.created_at, org.updated_at
  FROM organizations org
  WHERE org.id = v_org_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_organization(p_org_id uuid, p_user_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_root_id UUID;
  v_user_is_commander BOOLEAN;
BEGIN
  SELECT org.root_id INTO v_org_root_id
  FROM organizations org
  WHERE org.id = p_org_id;

  IF v_org_root_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = p_user_id
      AND om.role = 'commander'
      AND org.root_id = v_org_root_id
  ) INTO v_user_is_commander;

  IF NOT v_user_is_commander THEN
    RAISE EXCEPTION 'User is not a commander in this organization tree';
  END IF;

  DELETE FROM organizations WHERE id = p_org_id;
  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_old_invitations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
UPDATE organization_invitations
SET status = 'expired'
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '7 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
SELECT NULLIF(
COALESCE(
current_setting('request.jwt.claims', true)::json->>'sub',
current_setting('request.jwt.claim.sub', true)
),
''
)::text;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_children(p_org_id uuid)
 RETURNS TABLE(id uuid, name text, org_type text, depth integer, member_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.org_type,
    o.depth,
    COUNT(om.user_id) AS member_count
  FROM organizations o
  LEFT JOIN org_memberships om ON om.org_id = o.id
  WHERE o.parent_id = p_org_id
  GROUP BY o.id, o.name, o.org_type, o.depth
  ORDER BY o.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_subtree(p_org_id uuid)
 RETURNS TABLE(id uuid, name text, org_type text, depth integer, parent_id uuid, full_path text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.org_type,
    o.depth,
    o.parent_id,
    array_to_string(
      ARRAY(
        SELECT org.name 
        FROM organizations org 
        WHERE org.id = ANY(o.path::UUID[])
        ORDER BY array_position(o.path::UUID[], org.id)
      ),
      ' → '
    ) AS full_path
  FROM organizations o
  WHERE o.path @> ARRAY[p_org_id::TEXT]
  ORDER BY o.depth, o.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_org_tree(p_root_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'type', o.org_type,
        'depth', o.depth,
        'parent_id', o.parent_id,
        'path', array_to_string(
          ARRAY(
            SELECT org.name 
            FROM organizations org 
            WHERE org.id = ANY(o.path::UUID[])
            ORDER BY array_position(o.path::UUID[], org.id)
          ),
          ' → '
        )
      ) ORDER BY o.depth, o.name
    ), '[]'::jsonb)
    FROM organizations o
    WHERE o.path @> ARRAY[p_root_id::TEXT]
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_accessible_orgs(p_user_id text)
 RETURNS TABLE(id uuid, name text, org_type text, parent_id uuid, root_id uuid, path text[], depth integer, description text, created_by text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Get ALL organizations in trees where user has ANY membership
  -- Runs as function owner, bypasses RLS
  SELECT 
    o.id,
    o.name,
    o.org_type,
    o.parent_id,
    o.root_id,
    o.path,
    o.depth,
    o.description,
    o.created_by,
    o.created_at,
    o.updated_at
  FROM organizations o
  WHERE o.root_id IN (
    -- Get all root_ids where user has membership
    SELECT DISTINCT org.root_id
    FROM org_memberships om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = p_user_id
  )
  ORDER BY o.depth, o.name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_orgs(p_user_id text)
 RETURNS TABLE(org_id uuid, org_name text, org_type text, root_id uuid, root_name text, parent_id uuid, parent_name text, depth integer, role text, full_path text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.org_type,
    o.root_id,
    r.name AS root_name,
    o.parent_id,
    p.name AS parent_name,
    o.depth,
    om.role,
    array_to_string(
      ARRAY(
        SELECT org.name 
        FROM organizations org 
        WHERE org.id = ANY(o.path::UUID[])
        ORDER BY array_position(o.path::UUID[], org.id)
      ),
      ' → '
    ) AS full_path
  FROM org_memberships om
  JOIN organizations o ON o.id = om.org_id
  LEFT JOIN organizations r ON r.id = o.root_id
  LEFT JOIN organizations p ON p.id = o.parent_id
  WHERE om.user_id = p_user_id
  ORDER BY o.depth, o.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_root_ids(p_user_id text)
 RETURNS TABLE(root_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- This function runs as the owner (bypasses RLS)
  -- Returns root_ids of all orgs the user is a member of
  SELECT DISTINCT o.root_id
  FROM org_memberships om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = p_user_id;
$function$
;

CREATE OR REPLACE FUNCTION public.set_org_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  parent_path TEXT[];
  parent_depth INTEGER;
  parent_root UUID;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.root_id := NEW.id;
    NEW.path := ARRAY[NEW.id::TEXT];
    NEW.depth := 0;
  ELSE
    SELECT path, depth, root_id 
    INTO parent_path, parent_depth, parent_root
    FROM organizations
    WHERE id = NEW.parent_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent organization not found';
    END IF;
    
    NEW.root_id := parent_root;
    NEW.path := parent_path || NEW.id::TEXT;
    NEW.depth := parent_depth + 1;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_organization(p_org_id uuid, p_name text, p_org_type text, p_description text, p_user_id text)
 RETURNS TABLE(id uuid, name text, org_type text, parent_id uuid, root_id uuid, path text[], depth integer, description text, created_by text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_root_id UUID;
  v_user_is_commander BOOLEAN;
BEGIN
  SELECT org.root_id INTO v_org_root_id
  FROM organizations org
  WHERE org.id = p_org_id;

  IF v_org_root_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = p_user_id
      AND om.role = 'commander'
      AND org.root_id = v_org_root_id
  ) INTO v_user_is_commander;

  IF NOT v_user_is_commander THEN
    RAISE EXCEPTION 'User is not a commander in this organization tree';
  END IF;

  UPDATE organizations
  SET name = COALESCE(p_name, organizations.name),
      org_type = COALESCE(p_org_type, organizations.org_type),
      description = p_description,
      updated_at = NOW()
  WHERE organizations.id = p_org_id;

  RETURN QUERY
  SELECT org.id, org.name, org.org_type, org.parent_id, org.root_id,
         org.path, org.depth, org.description, org.created_by,
         org.created_at, org.updated_at
  FROM organizations org
  WHERE org.id = p_org_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$function$
;

grant delete on table "public"."org_memberships" to "anon";

grant insert on table "public"."org_memberships" to "anon";

grant references on table "public"."org_memberships" to "anon";

grant select on table "public"."org_memberships" to "anon";

grant trigger on table "public"."org_memberships" to "anon";

grant truncate on table "public"."org_memberships" to "anon";

grant update on table "public"."org_memberships" to "anon";

grant delete on table "public"."org_memberships" to "authenticated";

grant insert on table "public"."org_memberships" to "authenticated";

grant references on table "public"."org_memberships" to "authenticated";

grant select on table "public"."org_memberships" to "authenticated";

grant trigger on table "public"."org_memberships" to "authenticated";

grant truncate on table "public"."org_memberships" to "authenticated";

grant update on table "public"."org_memberships" to "authenticated";

grant delete on table "public"."org_memberships" to "service_role";

grant insert on table "public"."org_memberships" to "service_role";

grant references on table "public"."org_memberships" to "service_role";

grant select on table "public"."org_memberships" to "service_role";

grant trigger on table "public"."org_memberships" to "service_role";

grant truncate on table "public"."org_memberships" to "service_role";

grant update on table "public"."org_memberships" to "service_role";

grant delete on table "public"."organization_invitations" to "anon";

grant insert on table "public"."organization_invitations" to "anon";

grant references on table "public"."organization_invitations" to "anon";

grant select on table "public"."organization_invitations" to "anon";

grant trigger on table "public"."organization_invitations" to "anon";

grant truncate on table "public"."organization_invitations" to "anon";

grant update on table "public"."organization_invitations" to "anon";

grant delete on table "public"."organization_invitations" to "authenticated";

grant insert on table "public"."organization_invitations" to "authenticated";

grant references on table "public"."organization_invitations" to "authenticated";

grant select on table "public"."organization_invitations" to "authenticated";

grant trigger on table "public"."organization_invitations" to "authenticated";

grant truncate on table "public"."organization_invitations" to "authenticated";

grant update on table "public"."organization_invitations" to "authenticated";

grant delete on table "public"."organization_invitations" to "service_role";

grant insert on table "public"."organization_invitations" to "service_role";

grant references on table "public"."organization_invitations" to "service_role";

grant select on table "public"."organization_invitations" to "service_role";

grant trigger on table "public"."organization_invitations" to "service_role";

grant truncate on table "public"."organization_invitations" to "service_role";

grant update on table "public"."organization_invitations" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";


  create policy "memberships_delete"
  on "public"."org_memberships"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o1 ON ((o1.id = om.org_id)))
     JOIN public.organizations o2 ON ((o2.id = org_memberships.org_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (om.role = 'commander'::text) AND (o1.root_id = o2.root_id)))));



  create policy "memberships_insert"
  on "public"."org_memberships"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o1 ON ((o1.id = om.org_id)))
     JOIN public.organizations o2 ON ((o2.id = org_memberships.org_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (om.role = 'commander'::text) AND (o1.root_id = o2.root_id)))));



  create policy "memberships_select"
  on "public"."org_memberships"
  as permissive
  for select
  to public
using ((user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "memberships_update"
  on "public"."org_memberships"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o1 ON ((o1.id = om.org_id)))
     JOIN public.organizations o2 ON ((o2.id = org_memberships.org_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (om.role = 'commander'::text) AND (o1.root_id = o2.root_id)))));



  create policy "Create invitations"
  on "public"."organization_invitations"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.org_memberships
  WHERE ((org_memberships.user_id = public.get_clerk_user_id()) AND (org_memberships.org_id = organization_invitations.organization_id) AND (org_memberships.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));



  create policy "Delete invitations"
  on "public"."organization_invitations"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.org_memberships
  WHERE ((org_memberships.user_id = public.get_clerk_user_id()) AND (org_memberships.org_id = organization_invitations.organization_id) AND (org_memberships.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));



  create policy "Service role full access"
  on "public"."organization_invitations"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Update invitations"
  on "public"."organization_invitations"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.org_memberships
  WHERE ((org_memberships.user_id = public.get_clerk_user_id()) AND (org_memberships.org_id = organization_invitations.organization_id) AND (org_memberships.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));



  create policy "View org invitations"
  on "public"."organization_invitations"
  as permissive
  for select
  to authenticated
using ((organization_id IN ( SELECT org_memberships.org_id
   FROM public.org_memberships
  WHERE (org_memberships.user_id = public.get_clerk_user_id()))));



  create policy "orgs_delete"
  on "public"."organizations"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (om.role = 'commander'::text) AND (o.root_id = organizations.root_id)))));



  create policy "orgs_insert"
  on "public"."organizations"
  as permissive
  for insert
  to public
with check (((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND ((parent_id IS NULL) OR (EXISTS ( SELECT 1
   FROM (public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (om.role = 'commander'::text) AND (o.root_id = ( SELECT organizations_1.root_id
           FROM public.organizations organizations_1
          WHERE (organizations_1.id = organizations_1.parent_id)))))))));



  create policy "orgs_select"
  on "public"."organizations"
  as permissive
  for select
  to public
using (((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) OR (root_id IN ( SELECT public.get_user_root_ids(((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AS get_user_root_ids))));



  create policy "orgs_update"
  on "public"."organizations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (om.role = 'commander'::text) AND (o.root_id = organizations.root_id)))));



  create policy "sessions_delete"
  on "public"."sessions"
  as permissive
  for delete
  to public
using ((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "sessions_insert"
  on "public"."sessions"
  as permissive
  for insert
  to public
with check ((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "sessions_select"
  on "public"."sessions"
  as permissive
  for select
  to public
using (((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = sessions.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))))));



  create policy "sessions_update"
  on "public"."sessions"
  as permissive
  for update
  to public
using ((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "sights_delete"
  on "public"."sights"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = sights.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))));



  create policy "sights_insert"
  on "public"."sights"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = sights.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))));



  create policy "sights_select"
  on "public"."sights"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = sights.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))));



  create policy "sights_update"
  on "public"."sights"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = sights.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))));



  create policy "trainings_delete"
  on "public"."trainings"
  as permissive
  for delete
  to public
using ((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "trainings_insert"
  on "public"."trainings"
  as permissive
  for insert
  to public
with check ((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "trainings_select"
  on "public"."trainings"
  as permissive
  for select
  to public
using (((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = trainings.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))))));



  create policy "trainings_update"
  on "public"."trainings"
  as permissive
  for update
  to public
using ((created_by = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "user_loadouts_delete"
  on "public"."user_loadouts"
  as permissive
  for delete
  to public
using ((user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "user_loadouts_insert"
  on "public"."user_loadouts"
  as permissive
  for insert
  to public
with check ((user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "user_loadouts_select"
  on "public"."user_loadouts"
  as permissive
  for select
  to public
using (((user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = user_loadouts.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))))));



  create policy "user_loadouts_update"
  on "public"."user_loadouts"
  as permissive
  for update
  to public
using ((user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)));



  create policy "weapons_delete"
  on "public"."weapons"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = weapons.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))));



  create policy "weapons_insert"
  on "public"."weapons"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = weapons.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))));



  create policy "weapons_select"
  on "public"."weapons"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = weapons.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))));



  create policy "weapons_update"
  on "public"."weapons"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.org_memberships om
     JOIN public.organizations o ON ((o.id = om.org_id)))
     JOIN public.organizations target ON ((target.id = weapons.organization_id)))
  WHERE ((om.user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'user_id'::text)) AND (target.root_id = o.root_id)))));


CREATE TRIGGER update_organization_invitations_updated_at BEFORE UPDATE ON public.organization_invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_set_org_hierarchy BEFORE INSERT OR UPDATE OF parent_id ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_org_hierarchy();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


