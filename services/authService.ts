/**
 * Auth Service
 *
 * Centralized service for all authentication operations.
 * All components should use this service instead of calling Supabase auth directly.
 *
 * Following architecture rules:
 * - Services are the only layer that can make API calls
 * - Consistent error handling using custom error classes
 */

import { supabase } from '@/lib/supabase';
import { AuthenticationError } from '@/lib/errors';
import type { User } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface SignInWithOtpOptions {
  /** Whether to create a new user if one doesn't exist (default: true) */
  shouldCreateUser?: boolean;
}

export interface VerifyOtpOptions {
  /** The type of OTP verification (default: 'email') */
  type?: 'email' | 'email_change' | 'signup' | 'invite' | 'recovery' | 'magiclink';
}

// ============================================================================
// GET CURRENT USER
// ============================================================================

/**
 * Get the currently authenticated user.
 *
 * @returns The current user or null if not authenticated
 * @throws {AuthenticationError} If there's an error fetching the user
 *
 * @example
 * ```ts
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log('Logged in as:', user.email);
 * }
 * ```
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw new AuthenticationError(error.message, error);
  }

  return user;
}

/**
 * Get the currently authenticated user, throwing if not logged in.
 * Use this when authentication is required.
 *
 * @returns The current user
 * @throws {AuthenticationError} If not authenticated or error fetching user
 *
 * @example
 * ```ts
 * const user = await requireCurrentUser();
 * // user is guaranteed to exist here
 * ```
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthenticationError('Not authenticated');
  }

  return user;
}

/**
 * Get the current user's ID, or null if not authenticated.
 * Convenience function for when you only need the ID.
 *
 * @returns The current user's ID or null
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Get the current user's ID, throwing if not logged in.
 *
 * @returns The current user's ID
 * @throws {AuthenticationError} If not authenticated
 */
export async function requireCurrentUserId(): Promise<string> {
  const user = await requireCurrentUser();
  return user.id;
}

// ============================================================================
// EMAIL OTP AUTHENTICATION
// ============================================================================

/**
 * Send a one-time password (OTP) to the user's email.
 *
 * @param email - The email address to send the OTP to
 * @param options - Optional configuration
 * @throws {AuthenticationError} If sending the OTP fails
 *
 * @example
 * ```ts
 * await signInWithOtp('user@example.com');
 * // User will receive a 6-digit code via email
 * ```
 */
export async function signInWithOtp(
  email: string,
  options: SignInWithOtpOptions = {}
): Promise<void> {
  const { shouldCreateUser = true } = options;

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser,
    },
  });

  if (error) {
    throw new AuthenticationError(error.message, error);
  }
}

/**
 * Verify the OTP code sent to the user's email.
 *
 * @param email - The email address that received the OTP
 * @param token - The 6-digit OTP code
 * @param options - Optional configuration
 * @throws {AuthenticationError} If verification fails (invalid/expired code)
 *
 * @example
 * ```ts
 * await verifyOtp('user@example.com', '123456');
 * // User is now authenticated
 * ```
 */
export async function verifyOtp(
  email: string,
  token: string,
  options: VerifyOtpOptions = {}
): Promise<void> {
  const { type = 'email' } = options;

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type,
  });

  if (error) {
    throw new AuthenticationError(error.message, error);
  }
}

// ============================================================================
// PASSWORD AUTHENTICATION
// ============================================================================

/**
 * Sign in with email and password.
 *
 * @param email - The user's email address
 * @param password - The user's password
 * @throws {AuthenticationError} If sign in fails (invalid credentials)
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new AuthenticationError(error.message, error);
  }
}

/**
 * Sign up with email and password.
 *
 * @param email - The user's email address
 * @param password - The user's password
 * @throws {AuthenticationError} If sign up fails
 */
export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new AuthenticationError(error.message, error);
  }
}

// ============================================================================
// SIGN OUT
// ============================================================================

/**
 * Sign out the current user.
 *
 * @throws {AuthenticationError} If sign out fails
 *
 * @example
 * ```ts
 * await signOut();
 * // User is now signed out
 * ```
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AuthenticationError(error.message, error);
  }
}
