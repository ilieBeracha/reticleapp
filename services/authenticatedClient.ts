import { AuthenticatedClient } from "@/lib/authenticatedClient";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * @deprecated Use AuthenticatedClient.getClient() directly instead
 * This function is kept for backward compatibility during migration
 */
export async function getAuthenticatedClientService(token: string) {
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
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
  } catch (err: any) {
    console.error("Error creating authenticated client:", err);
    throw err;
  }
}

/**
 * Enhanced service function that uses the singleton AuthenticatedClient
 * This is the recommended approach for new code
 */
export async function getAuthenticatedClient() {
  try {
    return await AuthenticatedClient.getClient();
  } catch (err: any) {
    console.error("Error getting authenticated client:", err);
    throw err;
  }
}
