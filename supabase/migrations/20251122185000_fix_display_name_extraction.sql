-- Fix the display name extraction function

-- Function to extract display name from auth.users metadata  
CREATE OR REPLACE FUNCTION get_display_name_from_auth(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_record record;
  v_display_name text;
  v_meta jsonb;
BEGIN
  -- Get user data from auth.users
  SELECT raw_user_meta_data, email INTO v_user_record
  FROM auth.users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'Unknown User';
  END IF;
  
  v_meta := v_user_record.raw_user_meta_data;
  
  -- Try different name fields in order of preference
  -- Check for full_name first (OAuth)
  IF v_meta ? 'full_name' AND v_meta->>'full_name' IS NOT NULL AND trim(v_meta->>'full_name') != '' THEN
    v_display_name := trim(v_meta->>'full_name');
  -- Check for name field
  ELSIF v_meta ? 'name' AND v_meta->>'name' IS NOT NULL AND trim(v_meta->>'name') != '' THEN
    v_display_name := trim(v_meta->>'name');
  -- Try combining first and last names
  ELSIF v_meta ? 'first_name' AND v_meta ? 'last_name' THEN
    v_display_name := trim(COALESCE(v_meta->>'first_name', '') || ' ' || COALESCE(v_meta->>'last_name', ''));
    IF trim(v_display_name) = '' THEN
      v_display_name := NULL;
    END IF;
  -- Try given_name and family_name (Google format)
  ELSIF v_meta ? 'given_name' AND v_meta ? 'family_name' THEN
    v_display_name := trim(COALESCE(v_meta->>'given_name', '') || ' ' || COALESCE(v_meta->>'family_name', ''));
    IF trim(v_display_name) = '' THEN
      v_display_name := NULL;
    END IF;
  END IF;
  
  -- Fallback to email username if no name found
  IF v_display_name IS NULL OR trim(v_display_name) = '' THEN
    v_display_name := split_part(v_user_record.email, '@', 1);
  END IF;
  
  -- Final fallback
  IF v_display_name IS NULL OR trim(v_display_name) = '' THEN
    v_display_name := 'New Member';
  END IF;
  
  RETURN v_display_name;
END;
$$;

-- Function to sync display names for existing profiles
CREATE OR REPLACE FUNCTION sync_all_display_names()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_profile record;
  v_new_name text;
BEGIN
  -- Update all profiles with null or empty display names
  FOR v_profile IN 
    SELECT id, user_id, display_name, org_id
    FROM profiles 
    WHERE display_name IS NULL OR display_name = '' OR display_name = 'Unknown'
  LOOP
    -- Get the new display name
    v_new_name := get_display_name_from_auth(v_profile.user_id);
    
    -- Update the profile
    UPDATE profiles 
    SET 
      display_name = v_new_name,
      updated_at = now()
    WHERE id = v_profile.id;
    
    v_count := v_count + 1;
    
    RAISE NOTICE 'Updated profile % with display_name: %', v_profile.id, v_new_name;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Trigger to automatically set display_name when creating new profiles
CREATE OR REPLACE FUNCTION auto_set_display_name()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- If display_name is not set, get it from auth data
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := get_display_name_from_auth(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS auto_set_display_name_trigger ON profiles;
CREATE TRIGGER auto_set_display_name_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_display_name();

-- Fix existing null display names
SELECT sync_all_display_names() as updated_profiles;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_display_name_from_auth(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_display_names() TO service_role;

COMMENT ON FUNCTION get_display_name_from_auth(uuid) IS 'Extract display name from auth.users metadata with comprehensive fallbacks';
COMMENT ON FUNCTION sync_all_display_names() IS 'Update all profiles with null display names using auth data';
COMMENT ON TRIGGER auto_set_display_name_trigger ON profiles IS 'Automatically set display_name when creating new profiles';

