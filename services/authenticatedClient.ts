import { AuthenticationError } from "@/lib/errors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Workspace context for automatic scoping
 */
export interface WorkspaceContext {
  userId: string;
  workspaceId: string | null;
}

/**
 * Singleton AuthenticatedClient class that automatically handles:
 * 1. Token injection (auth)
 * 2. Workspace context injection (data scoping)
 * 
 * This eliminates the need to pass auth/context manually to service functions
 */
export class AuthenticatedClient {
  private static instance: SupabaseClient | null = null;
  private static tokenProvider: (() => Promise<string>) | null = null;
  private static contextProvider: (() => WorkspaceContext | null) | null = null;

  /**
   * Initialize the client with token and context providers
   * This should be called once during app initialization
   */
  static initialize(
    tokenProvider: () => Promise<string>,
    contextProvider: () => WorkspaceContext | null
  ) {
    this.tokenProvider = tokenProvider;
    this.contextProvider = contextProvider;
    this.instance = null; // Reset instance to force recreation
  }

  /**
   * Get the authenticated Supabase client
   * Automatically handles token injection and refresh
   */
  static async getClient(): Promise<SupabaseClient> {
    if (!this.tokenProvider) {
      throw new AuthenticationError(
        "AuthenticatedClient not initialized. Call initialize() first."
      );
    }

    try {
      // Always get a fresh token to ensure it's not expired
      const token = await this.tokenProvider();

      if (!token) {
        throw new AuthenticationError("No authentication token available");
      }

      // Create a new client instance with the current token
      // We don't cache the client to ensure fresh tokens are always used
      const client = createClient(supabaseUrl, supabaseAnonKey, {
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

      return client;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Handle token retrieval errors
      console.error("Error getting authentication token:", error);
      throw new AuthenticationError("Failed to retrieve authentication token");
    }
  }

  /**
   * Invalidate the current client instance
   * Useful for forcing token refresh on authentication errors
   */
  static invalidate() {
    this.instance = null;
  }

  /**
   * Get the current workspace context
   * Returns { userId, workspaceId } automatically
   */
  static getContext(): WorkspaceContext {
    if (!this.contextProvider) {
      throw new AuthenticationError(
        "AuthenticatedClient not initialized. Call initialize() first."
      );
    }

    const context = this.contextProvider();
    
    if (!context) {
      throw new AuthenticationError("No user context available");
    }

    return context;
  }

  /**
   * Check if the client is initialized
   */
  static isInitialized(): boolean {
    return this.tokenProvider !== null && this.contextProvider !== null;
  }
}

/**
 * Helper to get context in service functions
 * Usage: const { userId, workspaceId } = getContext()
 */
export function getContext(): WorkspaceContext {
  return AuthenticatedClient.getContext();
}

// Re-export error classes and helper for backward compatibility
export {
  AuthenticationError,
  DatabaseError,
  handleServiceError,
  NetworkError,
  NotFoundError,
  PermissionError,
  ServiceError,
  ValidationError
} from "@/lib/errors";

