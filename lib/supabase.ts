import { useAuth } from "@clerk/clerk-expo";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create a singleton Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We use Clerk for auth
    autoRefreshToken: false,
  },
});

/**
 * Hook to get an authenticated Supabase client
 * This client will automatically include the Clerk JWT in requests
 */
export function useSupabaseClient() {
  const { getToken } = useAuth();

  const getAuthenticatedClient = async () => {
    const token = await getToken({ template: "supabase" });

    if (!token) {
      throw new Error("No auth token available");
    }

    // Set the auth header with Clerk's JWT
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return authenticatedClient;
  };

  return { getAuthenticatedClient, getToken };
}
