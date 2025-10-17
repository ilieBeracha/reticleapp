// libs/supabase.ts
import { useAuth } from "@clerk/clerk-expo";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export function useSupabase() {
  const { getToken } = useAuth();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: async (input, init = {}) => {
        const token = await getToken({ template: "supabase" }); // HS256 Clerk template
        const headers = new Headers(init.headers);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });

  return supabase;
}
