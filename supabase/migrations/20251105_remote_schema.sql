


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invitation record;
  v_user_id uuid;
  v_user_email text;
  v_org record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email FROM users WHERE id = v_user_id;
  
  -- Get invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > now()
    AND email = v_user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = v_user_id AND org_id = v_invitation.organization_id
  ) THEN
    RAISE EXCEPTION 'Already a member of this organization';
  END IF;
  
  -- Add member
  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (v_user_id, v_invitation.organization_id, v_invitation.role);
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = p_invitation_id;
  
  -- Get org details
  SELECT * INTO v_org FROM organizations WHERE id = v_invitation.organization_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_org.id,
    'org_name', v_org.name,
    'role', v_invitation.role
  );
END;
$$;


ALTER FUNCTION "public"."accept_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_org_invite"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_invitation record;
  v_user_id uuid;
  v_user_email text;
  v_org record;
BEGIN
  -- Get authenticated user ID from JWT
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  -- Get user email from auth.users (not from custom users table)
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = v_user_id;
  
  -- Find invitation by TOKEN (stored in email field) - not by user email!
  SELECT * INTO v_invitation
  FROM invitations
  WHERE code = UPPER(p_token)  -- Match the invite code
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;
  
  -- Check if already a member of this org
  IF EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = v_user_id 
      AND org_id = v_invitation.organization_id
  ) THEN
    RAISE EXCEPTION 'Already a member of this organization';
  END IF;
  
  -- Create org membership
  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (v_user_id, v_invitation.organization_id, v_invitation.role);
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET 
    status = 'accepted', 
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_invitation.id;
  
  -- Get organization details
  SELECT * INTO v_org 
  FROM organizations 
  WHERE id = v_invitation.organization_id;
  
  -- Return success with org details
  RETURN jsonb_build_object(
    'success', true,
    'invitation', row_to_json(v_invitation),
    'org_id', v_org.id,
    'org_name', v_org.name,
    'role', v_invitation.role
  );
END;$$;


ALTER FUNCTION "public"."accept_org_invite"("p_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_org_invite"("p_token" "text") IS 'Accept an organization invitation using an invite code/token. The token is stored in the invitations.email field.';



CREATE OR REPLACE FUNCTION "public"."create_child_organization"("p_name" "text", "p_org_type" "text", "p_parent_id" "uuid", "p_description" "text", "p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "org_type" "text", "parent_id" "uuid", "root_id" "uuid", "path" "text"[], "depth" integer, "description" "text", "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id UUID;
  v_parent_root_id UUID;
  v_parent_depth INTEGER;
  v_user_is_commander BOOLEAN;
BEGIN
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Organization name cannot be empty';
  END IF;

  -- Get parent info
  SELECT organizations.root_id, organizations.depth
  INTO v_parent_root_id, v_parent_depth
  FROM organizations
  WHERE organizations.id = p_parent_id;

  IF v_parent_root_id IS NULL THEN
    RAISE EXCEPTION 'Parent organization not found';
  END IF;

  -- ⚠️ Check depth limit: Maximum 3 levels (0-2)
  IF v_parent_depth >= 2 THEN
    RAISE EXCEPTION 'Cannot create child organization: Parent is at maximum depth (%). Maximum hierarchy is 3 levels (0-2). Consider creating at a higher level.', v_parent_depth;
  END IF;

  -- Check user is commander in tree
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

  -- Create organization
  INSERT INTO organizations (name, org_type, description, created_by, parent_id)
  VALUES (p_name, p_org_type, p_description, p_user_id, p_parent_id)
  RETURNING organizations.id INTO v_org_id;

  -- Add creator as commander
  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (p_user_id, v_org_id, 'commander')
  ON CONFLICT (user_id, org_id) DO NOTHING;

  -- Return created org
  RETURN QUERY
  SELECT org.id, org.name, org.org_type, org.parent_id, org.root_id,
         org.path, org.depth, org.description, org.created_by,
         org.created_at, org.updated_at
  FROM organizations org
  WHERE org.id = v_org_id;
END;
$$;


ALTER FUNCTION "public"."create_child_organization"("p_name" "text", "p_org_type" "text", "p_parent_id" "uuid", "p_description" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation"("p_email" "text", "p_organization_id" "uuid", "p_role" "text" DEFAULT 'member'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
  v_invitation_id uuid;
  v_org record;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is commander
  IF NOT EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = v_user_id
    AND org_id = p_organization_id
    AND role = 'commander'
  ) THEN
    RAISE EXCEPTION 'Only commanders can invite members';
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM org_memberships om
    JOIN users u ON u.id = om.user_id
    WHERE om.org_id = p_organization_id AND u.email = p_email
  ) THEN
    RAISE EXCEPTION 'User is already a member';
  END IF;
  
  -- Check for pending invitation
  IF EXISTS (
    SELECT 1 FROM invitations
    WHERE email = p_email 
    AND organization_id = p_organization_id 
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Invitation already pending for this email';
  END IF;
  
  -- Create invitation
  INSERT INTO invitations (email, organization_id, role, invited_by)
  VALUES (p_email, p_organization_id, p_role, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  -- Get org details
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'email', p_email,
    'org_name', v_org.name,
    'role', p_role
  );
END;
$$;


ALTER FUNCTION "public"."create_invitation"("p_email" "text", "p_organization_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_org_invite"("p_org_id" "uuid", "p_role" "text" DEFAULT 'member'::"text", "p_max_uses" integer DEFAULT NULL::integer) RETURNS TABLE("token" "text", "invite_link" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_token text; v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM org_memberships om JOIN organizations o ON o.id = om.org_id 
    WHERE om.user_id = v_user_id AND om.role = 'commander' 
    AND o.root_id = (SELECT root_id FROM organizations WHERE id = p_org_id)) THEN
    RAISE EXCEPTION 'Only commanders can create invites';
  END IF;
  v_token := encode(gen_random_bytes(6), 'base64');
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');
  INSERT INTO org_invites (org_id, token, role, created_by, max_uses)
  VALUES (p_org_id, v_token, p_role, v_user_id, p_max_uses);
  RETURN QUERY SELECT v_token, 'reticle://invite/' || v_token;
END; $$;


ALTER FUNCTION "public"."create_org_invite"("p_org_id" "uuid", "p_role" "text", "p_max_uses" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_root_organization"("p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "org_type" "text", "parent_id" "uuid", "root_id" "uuid", "path" "text"[], "depth" integer, "description" "text", "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_root_organization"("p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_organization"("p_org_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."delete_organization"("p_org_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_invitations"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$;


ALTER FUNCTION "public"."expire_old_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hierarchy_path"("org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "depth" integer, "commander_user_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE path AS (
    SELECT 
      o.id,
      o.name,
      o.depth,
      o.commander_user_id,
      o.parent_id
    FROM organizations o
    WHERE o.id = org_id
    
    UNION ALL
    
    SELECT 
      o.id,
      o.name,
      o.depth,
      o.commander_user_id,
      o.parent_id
    FROM organizations o
    INNER JOIN path ON o.id = path.parent_id
  )
  SELECT 
    path.id, 
    path.name, 
    path.depth, 
    path.commander_user_id 
  FROM path 
  ORDER BY path.depth ASC;
END;
$$;


ALTER FUNCTION "public"."get_hierarchy_path"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_children"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "org_type" "text", "depth" integer, "member_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_org_children"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_subtree"("p_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "org_type" "text", "depth" integer, "parent_id" "uuid", "full_path" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_org_subtree"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_tree"("p_root_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_org_tree"("p_root_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organizations_in_scope"("scope_org_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "parent_id" "uuid", "depth" integer, "commander_user_id" "uuid", "commander_approved_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE org_tree AS (
    SELECT 
      o.id,
      o.name,
      o.description,
      o.parent_id,
      o.depth,
      o.commander_user_id,
      o.commander_approved_at,
      o.created_at,
      o.updated_at
    FROM organizations o
    WHERE o.id = scope_org_id
    
    UNION ALL
    
    SELECT 
      o.id,
      o.name,
      o.description,
      o.parent_id,
      o.depth,
      o.commander_user_id,
      o.commander_approved_at,
      o.created_at,
      o.updated_at
    FROM organizations o
    INNER JOIN org_tree t ON o.parent_id = t.id
  )
  SELECT 
    org_tree.id,
    org_tree.name,
    org_tree.description,
    org_tree.parent_id,
    org_tree.depth,
    org_tree.commander_user_id,
    org_tree.commander_approved_at,
    org_tree.created_at,
    org_tree.updated_at
  FROM org_tree;
END;
$$;


ALTER FUNCTION "public"."get_organizations_in_scope"("scope_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accessible_orgs"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "org_type" "text", "parent_id" "uuid", "root_id" "uuid", "path" "text"[], "depth" integer, "description" "text", "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    SELECT DISTINCT org.root_id
    FROM org_memberships om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = p_user_id
  )
  ORDER BY o.depth, o.name;
$$;


ALTER FUNCTION "public"."get_user_accessible_orgs"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") RETURNS TABLE("org_id" "uuid", "org_name" "text", "org_type" "text", "root_id" "uuid", "root_name" "text", "parent_id" "uuid", "parent_name" "text", "depth" integer, "role" "text", "full_path" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_root_ids"("p_user_id" "uuid") RETURNS TABLE("root_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT DISTINCT o.root_id
  FROM org_memberships om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_root_ids"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
DROP TRIGGER IF EXISTS "on_auth_user_updated" ON "auth"."users";

CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."handle_new_user"();

CREATE TRIGGER "on_auth_user_updated"
  AFTER UPDATE ON "auth"."users"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."handle_new_user"();


CREATE OR REPLACE FUNCTION "public"."set_org_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  parent_path TEXT[];
  parent_depth INTEGER;
  parent_root UUID;
BEGIN
  IF NEW.parent_id IS NULL THEN
    -- Root organization
    NEW.root_id := NEW.id;
    NEW.path := ARRAY[NEW.id::TEXT];
    NEW.depth := 0;
  ELSE
    -- Child organization
    SELECT path, depth, root_id 
    INTO parent_path, parent_depth, parent_root
    FROM organizations
    WHERE id = NEW.parent_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent organization not found';
    END IF;
    
    -- ⚠️ Check depth limit: Maximum 3 levels (0-2)
    IF parent_depth >= 2 THEN
      RAISE EXCEPTION 'Cannot create organization: Maximum depth of 3 levels reached (0-2). Parent is at depth %. Try creating at a higher level.', parent_depth;
    END IF;
    
    NEW.root_id := parent_root;
    NEW.path := parent_path || NEW.id::TEXT;
    NEW.depth := parent_depth + 1;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_org_hierarchy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organization"("p_org_id" "uuid", "p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "org_type" "text", "parent_id" "uuid", "root_id" "uuid", "path" "text"[], "depth" integer, "description" "text", "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_organization"("p_org_id" "uuid", "p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."group_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "participant_id" "uuid",
    "bullets_fired" integer,
    "cm_dispersion" numeric,
    "shooting_position" "text",
    "effort" boolean,
    "weapon_snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invitations_role_check" CHECK (("role" = ANY (ARRAY['commander'::"text", 'member'::"text", 'viewer'::"text"]))),
    CONSTRAINT "invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "org_memberships_role_check" CHECK (("role" = ANY (ARRAY['commander'::"text", 'member'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."org_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "org_type" "text" NOT NULL,
    "parent_id" "uuid",
    "root_id" "uuid",
    "path" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "depth" integer DEFAULT 0 NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organizations_depth_limit" CHECK ((("depth" >= 0) AND ("depth" <= 2)))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "role" "text",
    "weapon_snapshot" "jsonb" NOT NULL,
    "sight_snapshot" "jsonb",
    "other_equipment" "jsonb",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "training_id" "uuid",
    "organization_id" "uuid",
    "name" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "range_location" "text",
    "weather" "jsonb",
    "day_period" "text",
    "is_squad" boolean DEFAULT false NOT NULL,
    "comments" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "session_stats_day_period_check" CHECK (("day_period" = ANY (ARRAY['morning'::"text", 'afternoon'::"text", 'evening'::"text", 'night'::"text"])))
);


ALTER TABLE "public"."session_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "participant_id" "uuid",
    "timestamp" timestamp with time zone,
    "target_id" "uuid",
    "coords" "jsonb",
    "is_hit" boolean,
    "shot_distance_m" numeric,
    "wind_m_s" numeric,
    "notes" "text"
);


ALTER TABLE "public"."shots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sight_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "magnification_range" "text",
    "reticle_type" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sight_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "uuid",
    "org_id" "uuid",
    "owner_user_id" "uuid",
    "serial_number" "text",
    "calibration" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."target_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "participant_id" "uuid",
    "target_label" "text",
    "shots_fired" integer,
    "hits" integer,
    "eliminated" boolean,
    "avg_time_first_shot" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."target_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "scheduled_date" timestamp with time zone,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trainings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weapon_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "manufacturer" "text",
    "caliber" "text",
    "typical_muzzle_velocity" numeric,
    "effective_ranges" "jsonb",
    "expected_grouping" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weapon_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weapons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_id" "uuid",
    "org_id" "uuid",
    "owner_user_id" "uuid",
    "serial_number" "text",
    "modifications" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weapons" OWNER TO "postgres";


ALTER TABLE ONLY "public"."group_scores"
    ADD CONSTRAINT "group_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_memberships"
    ADD CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_memberships"
    ADD CONSTRAINT "org_memberships_user_id_org_id_key" UNIQUE ("user_id", "org_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shots"
    ADD CONSTRAINT "shots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sight_models"
    ADD CONSTRAINT "sight_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sights"
    ADD CONSTRAINT "sights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."target_stats"
    ADD CONSTRAINT "target_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weapon_models"
    ADD CONSTRAINT "weapon_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weapons"
    ADD CONSTRAINT "weapons_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_group_scores_participant" ON "public"."group_scores" USING "btree" ("participant_id");



CREATE INDEX "idx_group_scores_session" ON "public"."group_scores" USING "btree" ("session_id");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("code");



CREATE INDEX "idx_invitations_invited_by" ON "public"."invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_invitations_organization_id" ON "public"."invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_invitations_status" ON "public"."invitations" USING "btree" ("status");



CREATE INDEX "idx_memberships_org" ON "public"."org_memberships" USING "btree" ("org_id");



CREATE INDEX "idx_memberships_user" ON "public"."org_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_orgs_created_by" ON "public"."organizations" USING "btree" ("created_by");



CREATE INDEX "idx_orgs_parent" ON "public"."organizations" USING "btree" ("parent_id");



CREATE INDEX "idx_orgs_path" ON "public"."organizations" USING "gin" ("path");



CREATE INDEX "idx_orgs_root" ON "public"."organizations" USING "btree" ("root_id");



CREATE INDEX "idx_orgs_type" ON "public"."organizations" USING "btree" ("org_type");



CREATE INDEX "idx_session_participants_session" ON "public"."session_participants" USING "btree" ("session_id");



CREATE INDEX "idx_session_participants_user" ON "public"."session_participants" USING "btree" ("user_id");



CREATE INDEX "idx_session_stats_created_by" ON "public"."session_stats" USING "btree" ("created_by");



CREATE INDEX "idx_session_stats_org" ON "public"."session_stats" USING "btree" ("organization_id");



CREATE INDEX "idx_session_stats_started_at" ON "public"."session_stats" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_session_stats_training" ON "public"."session_stats" USING "btree" ("training_id");



CREATE INDEX "idx_shots_participant" ON "public"."shots" USING "btree" ("participant_id");



CREATE INDEX "idx_shots_session" ON "public"."shots" USING "btree" ("session_id");



CREATE INDEX "idx_sights_org" ON "public"."sights" USING "btree" ("org_id");



CREATE INDEX "idx_target_stats_participant" ON "public"."target_stats" USING "btree" ("participant_id");



CREATE INDEX "idx_target_stats_session" ON "public"."target_stats" USING "btree" ("session_id");



CREATE INDEX "idx_weapons_org" ON "public"."weapons" USING "btree" ("org_id");



CREATE UNIQUE INDEX "unique_pending_invitation_email" ON "public"."invitations" USING "btree" ("organization_id", "code", "status") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "users_email_key" ON "public"."users" USING "btree" ("email");



CREATE OR REPLACE TRIGGER "trg_set_org_hierarchy" BEFORE INSERT OR UPDATE OF "parent_id" ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_hierarchy"();



CREATE OR REPLACE TRIGGER "update_invitations_updated_at" BEFORE UPDATE ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_session_stats_updated_at" BEFORE UPDATE ON "public"."session_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "fk_root" FOREIGN KEY ("root_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_scores"
    ADD CONSTRAINT "group_scores_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."session_participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_scores"
    ADD CONSTRAINT "group_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session_stats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_memberships"
    ADD CONSTRAINT "org_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_memberships"
    ADD CONSTRAINT "org_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session_stats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shots"
    ADD CONSTRAINT "shots_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."session_participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shots"
    ADD CONSTRAINT "shots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session_stats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sights"
    ADD CONSTRAINT "sights_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."sight_models"("id");



ALTER TABLE ONLY "public"."sights"
    ADD CONSTRAINT "sights_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."sights"
    ADD CONSTRAINT "sights_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."target_stats"
    ADD CONSTRAINT "target_stats_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."session_participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."target_stats"
    ADD CONSTRAINT "target_stats_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."session_stats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weapons"
    ADD CONSTRAINT "weapons_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."weapon_models"("id");



ALTER TABLE ONLY "public"."weapons"
    ADD CONSTRAINT "weapons_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."weapons"
    ADD CONSTRAINT "weapons_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id");



CREATE POLICY "commanders_create_invitations" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."org_id" = "invitations"."organization_id") AND ("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."role" = 'commander'::"text")))) AND ("invited_by" = "auth"."uid"())));



ALTER TABLE "public"."group_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_scores_all" ON "public"."group_scores" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."session_stats"
  WHERE (("session_stats"."id" = "group_scores"."session_id") AND (("session_stats"."created_by" = "auth"."uid"()) OR (("session_stats"."organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."org_memberships"
          WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "session_stats"."organization_id"))))))))));



ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inviters_delete_invitations" ON "public"."invitations" FOR DELETE TO "authenticated" USING (("invited_by" = "auth"."uid"()));



CREATE POLICY "memberships_delete" ON "public"."org_memberships" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."org_memberships" "om"
     JOIN "public"."organizations" "o1" ON (("o1"."id" = "om"."org_id")))
     JOIN "public"."organizations" "o2" ON (("o2"."id" = "org_memberships"."org_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'commander'::"text") AND ("o1"."root_id" = "o2"."root_id")))));



CREATE POLICY "memberships_insert" ON "public"."org_memberships" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."org_memberships" "om"
     JOIN "public"."organizations" "o1" ON (("o1"."id" = "om"."org_id")))
     JOIN "public"."organizations" "o2" ON (("o2"."id" = "org_memberships"."org_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'commander'::"text") AND ("o1"."root_id" = "o2"."root_id")))));



CREATE POLICY "memberships_select" ON "public"."org_memberships" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "memberships_update" ON "public"."org_memberships" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."org_memberships" "om"
     JOIN "public"."organizations" "o1" ON (("o1"."id" = "om"."org_id")))
     JOIN "public"."organizations" "o2" ON (("o2"."id" = "org_memberships"."org_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'commander'::"text") AND ("o1"."root_id" = "o2"."root_id")))));



ALTER TABLE "public"."org_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_memberships_delete" ON "public"."org_memberships" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."org_memberships" "om"
     JOIN "public"."organizations" "o1" ON (("o1"."id" = "om"."org_id")))
     JOIN "public"."organizations" "o2" ON (("o2"."id" = "org_memberships"."org_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'commander'::"text") AND ("o1"."root_id" = "o2"."root_id")))));



CREATE POLICY "org_memberships_insert" ON "public"."org_memberships" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "org_memberships_select" ON "public"."org_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "org_memberships_update" ON "public"."org_memberships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."org_memberships" "om"
     JOIN "public"."organizations" "o1" ON (("o1"."id" = "om"."org_id")))
     JOIN "public"."organizations" "o2" ON (("o2"."id" = "org_memberships"."org_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'commander'::"text") AND ("o1"."root_id" = "o2"."root_id")))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_delete" ON "public"."organizations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."org_memberships" "om"
     JOIN "public"."organizations" "o" ON (("o"."id" = "om"."org_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'commander'::"text") AND ("o"."root_id" = "organizations"."root_id")))));



CREATE POLICY "organizations_insert" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ((("parent_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."org_id" = "organizations"."parent_id") AND ("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."role" = 'commander'::"text"))))));



CREATE POLICY "organizations_select" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "organizations"."id"))))));



CREATE POLICY "organizations_update" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."org_memberships" "om"
     JOIN "public"."organizations" "o" ON (("o"."id" = "om"."org_id")))
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."role" = 'commander'::"text") AND ("o"."root_id" = "organizations"."root_id")))));



ALTER TABLE "public"."session_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_participants_delete" ON "public"."session_participants" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."session_stats"
  WHERE (("session_stats"."id" = "session_participants"."session_id") AND ("session_stats"."created_by" = "auth"."uid"())))));



CREATE POLICY "session_participants_insert" ON "public"."session_participants" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."session_stats"
  WHERE (("session_stats"."id" = "session_participants"."session_id") AND ("session_stats"."created_by" = "auth"."uid"())))));



CREATE POLICY "session_participants_select" ON "public"."session_participants" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."session_stats"
  WHERE (("session_stats"."id" = "session_participants"."session_id") AND (("session_stats"."created_by" = "auth"."uid"()) OR (("session_stats"."organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."org_memberships"
          WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "session_stats"."organization_id")))))))))));



CREATE POLICY "session_participants_update" ON "public"."session_participants" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."session_stats"
  WHERE (("session_stats"."id" = "session_participants"."session_id") AND ("session_stats"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."session_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_stats_delete" ON "public"."session_stats" FOR DELETE TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "session_stats_insert" ON "public"."session_stats" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (("organization_id" IS NULL) OR (("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "session_stats"."organization_id"))))))));



CREATE POLICY "session_stats_select" ON "public"."session_stats" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR (("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "session_stats"."organization_id")))))));



CREATE POLICY "session_stats_update" ON "public"."session_stats" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."shots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shots_all" ON "public"."shots" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."session_stats"
  WHERE (("session_stats"."id" = "shots"."session_id") AND (("session_stats"."created_by" = "auth"."uid"()) OR (("session_stats"."organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."org_memberships"
          WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "session_stats"."organization_id"))))))))));



ALTER TABLE "public"."sight_models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sight_models_select" ON "public"."sight_models" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sights_all" ON "public"."sights" TO "authenticated" USING ((("owner_user_id" = "auth"."uid"()) OR (("org_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "sights"."org_id")))))));



ALTER TABLE "public"."target_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "target_stats_all" ON "public"."target_stats" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."session_stats"
  WHERE (("session_stats"."id" = "target_stats"."session_id") AND (("session_stats"."created_by" = "auth"."uid"()) OR (("session_stats"."organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."org_memberships"
          WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "session_stats"."organization_id"))))))))));



ALTER TABLE "public"."trainings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trainings_all" ON "public"."trainings" TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR (("org_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "trainings"."org_id")))))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_select_self" ON "public"."users" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "users_update_invitations" ON "public"."invitations" FOR UPDATE TO "authenticated" USING ((("invited_by" = "auth"."uid"()) OR ("code" = ( SELECT "users"."email"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "users_update_self" ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "users_view_invitations" ON "public"."invitations" FOR SELECT TO "authenticated" USING ((("organization_id" IN ( SELECT "org_memberships"."org_id"
   FROM "public"."org_memberships"
  WHERE ("org_memberships"."user_id" = "auth"."uid"()))) OR ("code" = ( SELECT "users"."email"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



ALTER TABLE "public"."weapon_models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "weapon_models_select" ON "public"."weapon_models" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."weapons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "weapons_all" ON "public"."weapons" TO "authenticated" USING ((("owner_user_id" = "auth"."uid"()) OR (("org_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."user_id" = "auth"."uid"()) AND ("org_memberships"."org_id" = "weapons"."org_id")))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."accept_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_org_invite"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_org_invite"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_org_invite"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_child_organization"("p_name" "text", "p_org_type" "text", "p_parent_id" "uuid", "p_description" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_child_organization"("p_name" "text", "p_org_type" "text", "p_parent_id" "uuid", "p_description" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_child_organization"("p_name" "text", "p_org_type" "text", "p_parent_id" "uuid", "p_description" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_organization_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_organization_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_organization_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_org_invite"("p_org_id" "uuid", "p_role" "text", "p_max_uses" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_org_invite"("p_org_id" "uuid", "p_role" "text", "p_max_uses" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_invite"("p_org_id" "uuid", "p_role" "text", "p_max_uses" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_root_organization"("p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_root_organization"("p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_root_organization"("p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_organization"("p_org_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_organization"("p_org_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_organization"("p_org_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hierarchy_path"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_hierarchy_path"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hierarchy_path"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_children"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_children"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_children"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_subtree"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_subtree"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_subtree"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_tree"("p_root_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_tree"("p_root_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_tree"("p_root_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organizations_in_scope"("scope_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organizations_in_scope"("scope_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organizations_in_scope"("scope_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_accessible_orgs"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_accessible_orgs"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_accessible_orgs"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_orgs"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_root_ids"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_root_ids"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_root_ids"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_org_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_org_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_org_hierarchy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_organization"("p_org_id" "uuid", "p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_organization"("p_org_id" "uuid", "p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_organization"("p_org_id" "uuid", "p_name" "text", "p_org_type" "text", "p_description" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."group_scores" TO "anon";
GRANT ALL ON TABLE "public"."group_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."group_scores" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."org_memberships" TO "anon";
GRANT ALL ON TABLE "public"."org_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."org_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."session_participants" TO "anon";
GRANT ALL ON TABLE "public"."session_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."session_participants" TO "service_role";



GRANT ALL ON TABLE "public"."session_stats" TO "anon";
GRANT ALL ON TABLE "public"."session_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."session_stats" TO "service_role";



GRANT ALL ON TABLE "public"."shots" TO "anon";
GRANT ALL ON TABLE "public"."shots" TO "authenticated";
GRANT ALL ON TABLE "public"."shots" TO "service_role";



GRANT ALL ON TABLE "public"."sight_models" TO "anon";
GRANT ALL ON TABLE "public"."sight_models" TO "authenticated";
GRANT ALL ON TABLE "public"."sight_models" TO "service_role";



GRANT ALL ON TABLE "public"."sights" TO "anon";
GRANT ALL ON TABLE "public"."sights" TO "authenticated";
GRANT ALL ON TABLE "public"."sights" TO "service_role";



GRANT ALL ON TABLE "public"."target_stats" TO "anon";
GRANT ALL ON TABLE "public"."target_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."target_stats" TO "service_role";



GRANT ALL ON TABLE "public"."trainings" TO "anon";
GRANT ALL ON TABLE "public"."trainings" TO "authenticated";
GRANT ALL ON TABLE "public"."trainings" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."weapon_models" TO "anon";
GRANT ALL ON TABLE "public"."weapon_models" TO "authenticated";
GRANT ALL ON TABLE "public"."weapon_models" TO "service_role";



GRANT ALL ON TABLE "public"."weapons" TO "anon";
GRANT ALL ON TABLE "public"."weapons" TO "authenticated";
GRANT ALL ON TABLE "public"."weapons" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































