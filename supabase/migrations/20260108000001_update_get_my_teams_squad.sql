-- Update get_my_teams function to include squad_id and user_id for the current user
-- This enables squad commander functionality in the app

DROP FUNCTION IF EXISTS public.get_my_teams();

CREATE OR REPLACE FUNCTION public.get_my_teams()
RETURNS TABLE(
    id uuid,
    name text,
    description text,
    squads text[],
    team_type text,
    created_by uuid,
    created_at timestamp with time zone,
    my_role text,
    my_squad_id text,
    my_user_id uuid,
    member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        t.squads,
        t.team_type,
        t.created_by,
        t.created_at,
        tm.role,
        tm.squad_id,
        tm.user_id,
        (SELECT COUNT(*) FROM public.team_members WHERE team_id = t.id)
    FROM public.teams t
    JOIN public.team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = auth.uid()
    ORDER BY t.created_at DESC;
END;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION public.get_my_teams() TO anon;
GRANT ALL ON FUNCTION public.get_my_teams() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_teams() TO service_role;

