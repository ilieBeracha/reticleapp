-- Push tokens table for storing Expo push notification tokens
-- Each user can have multiple tokens (one per device)

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  device_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Each user can only have one entry per token
  UNIQUE(user_id, expo_push_token)
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- RLS policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can view own push tokens" 
  ON push_tokens FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens" 
  ON push_tokens FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" 
  ON push_tokens FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" 
  ON push_tokens FOR DELETE 
  USING (auth.uid() = user_id);

-- Service role can read all tokens (for Edge Functions)
-- This is handled by using service_role key in Edge Function
