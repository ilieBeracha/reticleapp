-- Fix the invite code generation function type error

-- Drop and recreate the function with correct integer casting
DROP FUNCTION IF EXISTS generate_invite_code();

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code_chars text := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; -- No O, 0 for clarity
  code text := '';
  i integer;
BEGIN
  -- Generate 8-character code
  FOR i IN 1..8 LOOP
    code := code || substr(code_chars, (floor(random() * length(code_chars)) + 1)::integer, 1);
  END LOOP;
  
  RETURN code;
END;
$$;

COMMENT ON FUNCTION generate_invite_code() IS 'Generate a unique 8-character invite code - fixed integer casting';

