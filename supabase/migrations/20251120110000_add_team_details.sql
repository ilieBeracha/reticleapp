-- Add details column to team_members for flexible metadata (squads, callsigns, etc)
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- Drop the old function first to allow changing return type
DROP FUNCTION IF EXISTS "public"."get_team_members"("p_team_id" "uuid");

-- Re-create get_team_members to return the new column
CREATE OR REPLACE FUNCTION "public"."get_team_members"("p_team_id" "uuid") 
RETURNS TABLE(
  "user_id" "uuid", 
  "email" "text", 
  "full_name" "text", 
  "role" "text",
  "details" "jsonb",
  "joined_at" timestamptz
)
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Get workspace owner from team
  SELECT workspace_owner_id INTO v_workspace_id
  FROM teams WHERE id = p_team_id;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    tm.role,
    tm.details,
    tm.joined_at
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id
  ORDER BY tm.role, p.full_name;
END;
$$;
