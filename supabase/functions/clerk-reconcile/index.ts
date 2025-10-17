import { serve } from "https://deno.land/std@0.202.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ClerkEmail = { id: string; email_address: string };
type ClerkUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmail[];
};

serve(async (req: Request): Promise<Response> => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const CLERK_API_KEY = Deno.env.get("CLERK_API_KEY");
  const BACKFILL_TOKEN = Deno.env.get("BACKFILL_TOKEN");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CLERK_API_KEY || !BACKFILL_TOKEN) {
    return new Response("Missing env", { status: 500 });
  }

  if (req.headers.get("x-backfill-token") !== BACKFILL_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const base = "https://api.clerk.com/v1";
  const headers = { Authorization: `Bearer ${CLERK_API_KEY}` };

  const users: ClerkUser[] = [];
  let nextUrl: string | null = `${base}/users?limit=100`;
  while (nextUrl) {
    const res: Response = await fetch(nextUrl, { headers });
    if (!res.ok)
      return new Response(`Clerk users fetch failed: ${res.status}`, {
        status: 502,
      });
    const body: any = await res.json();
    const batch =
      (Array.isArray(body) ? body : (body.data as ClerkUser[] | undefined)) ??
      [];
    users.push(...batch);
    nextUrl = (body?.next_url as string | undefined) ?? null;
    if (!nextUrl) break;
  }

  for (const u of users) {
    const email =
      (u.email_addresses ?? []).find((e) => e.id === u.primary_email_address_id)
        ?.email_address ?? null;
    const display =
      u.username ||
      [u.first_name, u.last_name].filter(Boolean).join(" ") ||
      email;
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: u.id,
        email,
        display_name: display,
        avatar_url: u.image_url ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error)
      return new Response(`Upsert error: ${error.message}`, { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
