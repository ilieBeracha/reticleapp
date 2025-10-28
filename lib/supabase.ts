import { useAuth } from "@clerk/clerk-expo";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useCallback } from "react";
import { AuthenticatedClient } from "./authenticatedClient";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create a singleton Supabase client for unauthenticated requests
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We use Clerk for auth
    autoRefreshToken: false,
  },
});

/**
 * Hook to get an authenticated Supabase client
 * This client will automatically include the Clerk JWT in requests
 *
 * @deprecated Use AuthenticatedClient.getClient() directly in services instead
 */
export function useSupabaseClient() {
  const { getToken } = useAuth();

  // ✅ Memoize this function to prevent infinite loops
  const getAuthenticatedClient = useCallback(async () => {
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
  }, [getToken]); // ✅ Only recreate when getToken changes

  return { getAuthenticatedClient, getToken };
}

/**
 * Enhanced hook that provides both legacy and new authentication patterns
 * Includes getClient() method that uses the singleton AuthenticatedClient
 */
export function useEnhancedAuth() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();

  // Initialize AuthenticatedClient with token provider if not already done
  if (isLoaded && isSignedIn && !AuthenticatedClient.isInitialized()) {
    AuthenticatedClient.initialize(async () => {
      const token = await getToken({ template: "supabase" });
      if (!token) {
        throw new Error("No auth token available");
      }
      return token;
    });
  }

  // Enhanced getClient method using singleton pattern
  const getClient = useCallback(async (): Promise<SupabaseClient> => {
    if (!isLoaded || !isSignedIn) {
      throw new Error("User not authenticated");
    }

    return AuthenticatedClient.getClient();
  }, [isLoaded, isSignedIn]);

  // Legacy method for backward compatibility
  const getAuthenticatedClient = useCallback(async () => {
    const token = await getToken({ template: "supabase" });

    if (!token) {
      throw new Error("No auth token available");
    }

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
  }, [getToken]);

  return {
    // Enhanced methods
    getClient,

    // Legacy methods for backward compatibility
    getAuthenticatedClient,
    getToken,

    // Auth state
    isLoaded,
    isSignedIn,
    userId,
  };
}
