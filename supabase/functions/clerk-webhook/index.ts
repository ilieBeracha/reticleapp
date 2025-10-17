import { serve } from "https://deno.land/std@0.202.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Webhook } from "https://esm.sh/svix@1.24.0";

serve(async (req: Request) => {
  const SIGNING_SECRET = Deno.env.get("CLERK_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SIGNING_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response("Missing env", { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();
  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(SIGNING_SECRET);
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const type = evt.type as string;
  const data = evt.data as Record<string, unknown>;

  if (type === "user.created" || type === "user.updated") {
    const userId = data.id as string;
    const emails = (data.email_addresses ?? []) as Array<{
      id: string;
      email_address: string;
    }>;
    const primaryEmailId = data.primary_email_address_id as string | undefined;
    const primaryEmail =
      emails.find((e) => e.id === primaryEmailId)?.email_address ?? null;
    const avatarUrl = (data.image_url as string | undefined) ?? null;
    const displayName =
      (data.username as string | undefined) ||
      [
        data.first_name as string | undefined,
        data.last_name as string | undefined,
      ]
        .filter(Boolean)
        .join(" ") ||
      primaryEmail;

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        email: primaryEmail,
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error)
      return new Response(`Upsert error: ${error.message}`, { status: 500 });
  }

  if (type === "user.deleted") {
    const userId = data.id as string;
    await supabase.from("profiles").delete().eq("user_id", userId);
  }

  return new Response("OK", { status: 200 });
});
