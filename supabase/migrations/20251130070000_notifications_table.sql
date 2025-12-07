-- ============================================================================
-- Migration: Create notifications table
-- ============================================================================
-- This table stores in-app notifications for users.
-- When a training is created, all team members receive a notification.
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "type" text NOT NULL, -- 'training_created', 'training_started', 'session_completed', etc.
    "title" text NOT NULL,
    "body" text,
    "data" jsonb, -- Additional data like training_id, session_id, etc.
    "read" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "public"."notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "public"."notifications" ("user_id", "read") WHERE read = false;
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "public"."notifications" ("created_at" DESC);

-- Enable RLS
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON "public"."notifications"
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON "public"."notifications"
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON "public"."notifications"
FOR DELETE
USING (auth.uid() = user_id);

-- System/Service can insert notifications for any user
-- This is done via a function that bypasses RLS
CREATE POLICY "System can insert notifications"
ON "public"."notifications"
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- Function: Notify team members when training is created
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_team_on_training_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    team_member RECORD;
    training_title TEXT;
    team_name TEXT;
    creator_name TEXT;
BEGIN
    -- Get training title
    training_title := NEW.title;
    
    -- Get team name if available
    IF NEW.team_id IS NOT NULL THEN
        SELECT name INTO team_name FROM public.teams WHERE id = NEW.team_id;
    END IF;
    
    -- Get creator name
    SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.created_by;
    
    -- If there's a team, notify all team members (except creator)
    IF NEW.team_id IS NOT NULL THEN
        FOR team_member IN 
            SELECT DISTINCT tm.member_id 
            FROM public.team_members tm
            WHERE tm.team_id = NEW.team_id
            AND tm.member_id != NEW.created_by
        LOOP
            INSERT INTO public.notifications (user_id, type, title, body, data)
            VALUES (
                team_member.member_id,
                'training_created',
                'New Training Scheduled',
                COALESCE(creator_name, 'Someone') || ' created "' || training_title || '"' || 
                    CASE WHEN team_name IS NOT NULL THEN ' for ' || team_name ELSE '' END,
                jsonb_build_object(
                    'training_id', NEW.id,
                    'team_id', NEW.team_id,
                    'scheduled_at', NEW.scheduled_at
                )
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for training creation
DROP TRIGGER IF EXISTS on_training_created ON public.trainings;
CREATE TRIGGER on_training_created
    AFTER INSERT ON public.trainings
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_team_on_training_created();

-- ============================================================================
-- Function: Notify team members when training starts
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_team_on_training_started()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    team_member RECORD;
    training_title TEXT;
BEGIN
    -- Only trigger when status changes to 'ongoing'
    IF OLD.status != 'ongoing' AND NEW.status = 'ongoing' THEN
        training_title := NEW.title;
        
        -- If there's a team, notify all team members
        IF NEW.team_id IS NOT NULL THEN
            FOR team_member IN 
                SELECT DISTINCT tm.member_id 
                FROM public.team_members tm
                WHERE tm.team_id = NEW.team_id
            LOOP
                INSERT INTO public.notifications (user_id, type, title, body, data)
                VALUES (
                    team_member.member_id,
                    'training_started',
                    'Training Started!',
                    '"' || training_title || '" is now live. Join now!',
                    jsonb_build_object(
                        'training_id', NEW.id,
                        'team_id', NEW.team_id
                    )
                );
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for training start
DROP TRIGGER IF EXISTS on_training_started ON public.trainings;
CREATE TRIGGER on_training_started
    AFTER UPDATE ON public.trainings
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_team_on_training_started();






