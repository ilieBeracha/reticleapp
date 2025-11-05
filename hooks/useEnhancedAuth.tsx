import {
  AuthenticatedClient,
  AuthenticationError,
} from "@/lib/authenticatedClient";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { SupabaseClient } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
} from "react";

/**
 * Enhanced auth context type that provides both Clerk auth state
 * and simplified client access methods
 */
export interface EnhancedAuthContextType {
  // Clerk auth state
  user: any | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;

  // Organization context (from hierarchy store)
  organizationId: string | null;

  // Enhanced client access
  getClient: () => Promise<SupabaseClient>;

  // Manual token access for edge cases
  getToken: () => Promise<string>;

  // Auth actions
  signOut: () => Promise<void>;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | null>(null);

/**
 * Enhanced Auth Provider that integrates Clerk authentication
 * with the singleton AuthenticatedClient pattern
 */
export function EnhancedAuthProvider({ children }: { children: ReactNode }) {
  const {
    getToken,
    isLoaded,
    isSignedIn,
    userId,
    signOut: clerkSignOut,
  } = useAuth();
  const { user } = useUser();
  const { selectedOrgId } = useOrganizationsStore();
  const router = useRouter();

  // Initialize AuthenticatedClient when user is authenticated
  useEffect(() => {
    if (isLoaded && isSignedIn && !AuthenticatedClient.isInitialized()) {
      AuthenticatedClient.initialize(async () => {
        try {
          const token = await getToken({ template: "supabase" });
          if (!token) {
            throw new AuthenticationError("No auth token available");
          }
          return token;
        } catch (error) {
          console.error("Error getting token for AuthenticatedClient:", error);
          // Redirect to sign-in on token errors
          router.push("/auth/sign-in");
          throw new AuthenticationError("Failed to get authentication token");
        }
      });
    }
  }, [isLoaded, isSignedIn, getToken, router]);

  // Enhanced getClient method with automatic error handling
  const getClient = useCallback(async (): Promise<SupabaseClient> => {
    if (!isLoaded) {
      throw new AuthenticationError("Authentication not loaded");
    }

    if (!isSignedIn) {
      // Automatically redirect to sign-in
      router.push("/auth/sign-in");
      throw new AuthenticationError("User not authenticated");
    }

    try {
      return await AuthenticatedClient.getClient();
    } catch (error) {
      console.error("Error getting authenticated client:", error);

      // Handle authentication errors by redirecting to sign-in
      if (error instanceof AuthenticationError) {
        router.push("/auth/sign-in");
      }

      throw error;
    }
  }, [isLoaded, isSignedIn, router]);

  // Enhanced getToken method with error handling
  const getTokenEnhanced = useCallback(async (): Promise<string> => {
    if (!isLoaded || !isSignedIn) {
      router.push("/auth/sign-in");
      throw new AuthenticationError("User not authenticated");
    }

    try {
      const token = await getToken({ template: "supabase" });
      if (!token) {
        throw new AuthenticationError("No auth token available");
      }
      return token;
    } catch (error) {
      console.error("Error getting token:", error);
      router.push("/auth/sign-in");
      throw new AuthenticationError("Failed to get authentication token");
    }
  }, [isLoaded, isSignedIn, getToken, router]);

  // Enhanced signOut method
  const signOut = useCallback(async (): Promise<void> => {
    try {
      // Invalidate the AuthenticatedClient
      AuthenticatedClient.invalidate();

      // Sign out from Clerk
      await clerkSignOut();

      // Redirect to sign-in
      router.push("/auth/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
      // Still redirect even if sign out fails
      router.push("/auth/sign-in");
    }
  }, [clerkSignOut, router]);

  const contextValue: EnhancedAuthContextType = {
    // Clerk auth state
    user,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,

    // Organization context
    organizationId: selectedOrgId ?? null,

    // Enhanced methods
    getClient,
    getToken: getTokenEnhanced,
    signOut,
  };

  return (
    <EnhancedAuthContext.Provider value={contextValue}>
      {children}
    </EnhancedAuthContext.Provider>
  );
}

/**
 * Hook to use the enhanced auth context
 * Provides simplified access to authenticated Supabase client and auth state
 */
export function useEnhancedAuth(): EnhancedAuthContextType {
  const context = useContext(EnhancedAuthContext);

  if (!context) {
    throw new Error(
      "useEnhancedAuth must be used within an EnhancedAuthProvider"
    );
  }

  return context;
}

/**
 * Hook that provides just the getClient method for services
 * This is the recommended way for services to get authenticated clients
 */
export function useAuthenticatedClient() {
  const { getClient } = useEnhancedAuth();
  return { getClient };
}
