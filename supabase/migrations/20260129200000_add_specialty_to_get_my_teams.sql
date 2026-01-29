-- Migration: Add specialty field to get_my_teams RPC
-- The specialty field is used for feature flags like military debrief format
DROP FUNCTION IF EXISTS "public"."get_my_teams"();

-- Drop and recreate the function with specialty field
CREATE OR REPLACE FUNCTION "public"."get_my_teams"() 
RETURNS TABLE(
    "id" "uuid", 
    "name" "text", 
    "description" "text", 
    "squads" "text"[], 
    "team_type" "text", 
    "specialty" "text",  -- Added specialty field
    "created_by" "uuid", 
    "created_at" timestamp with time zone, 
    "my_role" "text", 
    "member_count" bigint
)
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        t.squads,
        t.team_type,
        t.specialty,  -- Added specialty field
        t.created_by,
        t.created_at,
        tm.role,
        (SELECT COUNT(*) FROM public.team_members WHERE team_id = t.id)
    FROM public.teams t
    JOIN public.team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = auth.uid()
    ORDER BY t.created_at DESC;
END;
$$;

-- Add comment
COMMENT ON FUNCTION "public"."get_my_teams"() IS 'Returns all teams the current user belongs to, including specialty for feature flags';
