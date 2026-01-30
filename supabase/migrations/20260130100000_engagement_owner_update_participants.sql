-- Allow engagement owner (commander) to update participant records
-- Currently only the participant themselves can update their own row.
-- This blocks the commander from changing roles (shooter/spotter).

CREATE POLICY "Engagement owner can update participants"
ON "public"."engagement_participants"
FOR UPDATE
USING (
  "public"."get_engagement_session_owner"("engagement_id") = "auth"."uid"()
)
WITH CHECK (
  "public"."get_engagement_session_owner"("engagement_id") = "auth"."uid"()
);
