-- =====================================================
-- WORKSPACE INVITATIONS
-- =====================================================
-- Invitation system for organization workspaces
-- Users can generate shareable invite codes with role assignment

-- Create workspace_invitations table
CREATE TABLE IF NOT EXISTS "public"."workspace_invitations" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_workspace_id" "uuid" NOT NULL,
  "invite_code" "text" UNIQUE NOT NULL,
  "role" "text" NOT NULL DEFAULT 'member',
  "status" "text" NOT NULL DEFAULT 'pending',
  "invited_by" "uuid" NOT NULL,
  "accepted_by" "uuid",
  "accepted_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "workspace_invitations_role_check" CHECK ("role" IN ('owner', 'admin', 'instructor', 'member')),
  CONSTRAINT "workspace_invitations_status_check" CHECK ("status" IN ('pending', 'accepted', 'cancelled', 'expired'))
);

ALTER TABLE "public"."workspace_invitations" OWNER TO "postgres";
COMMENT ON TABLE "public"."workspace_invitations" IS 'Shareable invite codes for organization workspaces';

-- Foreign keys
ALTER TABLE ONLY "public"."workspace_invitations"
  ADD CONSTRAINT "workspace_invitations_org_workspace_fkey"
  FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_invitations"
  ADD CONSTRAINT "workspace_invitations_invited_by_fkey"
  FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_invitations"
  ADD CONSTRAINT "workspace_invitations_accepted_by_fkey"
  FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX "workspace_invitations_org_workspace_idx" ON "public"."workspace_invitations" ("org_workspace_id");
CREATE INDEX "workspace_invitations_invite_code_idx" ON "public"."workspace_invitations" ("invite_code");
CREATE INDEX "workspace_invitations_status_idx" ON "public"."workspace_invitations" ("status");
CREATE INDEX "workspace_invitations_expires_at_idx" ON "public"."workspace_invitations" ("expires_at");

-- Enable RLS
ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Workspace owners/admins can view all invitations for their workspace
CREATE POLICY "workspace_invitations_select_by_workspace_admin"
  ON "public"."workspace_invitations"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workspace_access"
      WHERE "workspace_access"."org_workspace_id" = "workspace_invitations"."org_workspace_id"
        AND "workspace_access"."member_id" = auth.uid()
        AND "workspace_access"."role" IN ('owner', 'admin')
    )
  );

-- 2. Anyone can view a specific invitation by code (for validation before accepting)
CREATE POLICY "workspace_invitations_select_by_code"
  ON "public"."workspace_invitations"
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 3. Workspace owners/admins can create invitations
CREATE POLICY "workspace_invitations_insert_by_workspace_admin"
  ON "public"."workspace_invitations"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "public"."workspace_access"
      WHERE "workspace_access"."org_workspace_id" = "workspace_invitations"."org_workspace_id"
        AND "workspace_access"."member_id" = auth.uid()
        AND "workspace_access"."role" IN ('owner', 'admin')
    )
  );

-- 4. Workspace owners/admins can update invitations (cancel, etc)
CREATE POLICY "workspace_invitations_update_by_workspace_admin"
  ON "public"."workspace_invitations"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workspace_access"
      WHERE "workspace_access"."org_workspace_id" = "workspace_invitations"."org_workspace_id"
        AND "workspace_access"."member_id" = auth.uid()
        AND "workspace_access"."role" IN ('owner', 'admin')
    )
  );

-- 5. Authenticated users can update invitation to accept it
CREATE POLICY "workspace_invitations_accept"
  ON "public"."workspace_invitations"
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND "status" = 'pending'
    AND "expires_at" > now()
  );

-- 6. Workspace owners/admins can delete invitations
CREATE POLICY "workspace_invitations_delete_by_workspace_admin"
  ON "public"."workspace_invitations"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "public"."workspace_access"
      WHERE "workspace_access"."org_workspace_id" = "workspace_invitations"."org_workspace_id"
        AND "workspace_access"."member_id" = auth.uid()
        AND "workspace_access"."role" IN ('owner', 'admin')
    )
  );

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars (0, O, 1, I)
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to auto-expire invitations (can be called by a cron job or trigger)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "public"."workspace_invitations"
  SET "status" = 'expired', "updated_at" = now()
  WHERE "status" = 'pending'
    AND "expires_at" < now();
END;
$$;

