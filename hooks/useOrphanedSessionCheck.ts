/**
 * useOrphanedSessionCheck
 * 
 * Checks for orphaned/stale sessions on app start and prompts the user to resolve them.
 * This prevents sessions from staying "active" forever when users exit without ending.
 */

import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import {
  deleteSession,
  endSession,
  getMyActiveSessionsAll,
  getSessionAge,
  isSessionStale,
  shouldAutoCancelSession,
  type SessionWithDetails,
} from '@/services/sessionService';

interface OrphanCheckResult {
  /** Whether the check is currently running */
  checking: boolean;
  /** Number of orphaned sessions found */
  orphanedCount: number;
  /** The most recent active session (if any) */
  activeSession: SessionWithDetails | null;
}

/**
 * Hook to check for orphaned sessions on mount.
 * 
 * Behavior:
 * - On mount, fetches all active sessions for the current user
 * - Sessions older than 24h are auto-cancelled silently
 * - Sessions 2-24h old trigger a user prompt to end/continue
 * - Returns the most recent active session for banner display
 */
export function useOrphanedSessionCheck(): OrphanCheckResult {
  const [checking, setChecking] = useState(true);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [activeSession, setActiveSession] = useState<SessionWithDetails | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Only run once per app lifecycle
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function checkOrphanedSessions() {
      try {
        const activeSessions = await getMyActiveSessionsAll();
        
        if (activeSessions.length === 0) {
          setChecking(false);
          return;
        }

        console.log(`[OrphanCheck] Found ${activeSessions.length} active session(s)`);
        
        let orphaned = 0;
        let mostRecent: SessionWithDetails | null = null;

        for (const session of activeSessions) {
          // Auto-cancel extremely old sessions (24h+)
          if (shouldAutoCancelSession(session)) {
            console.log(`[OrphanCheck] Auto-cancelling session ${session.id} (${getSessionAge(session)} old)`);
            try {
              await deleteSession(session.id);
              orphaned++;
            } catch (err) {
              console.error('[OrphanCheck] Failed to cancel old session:', err);
            }
            continue;
          }

          // Track the most recent session
          if (!mostRecent) {
            mostRecent = session;
          }

          // Prompt for stale sessions (2-24h old)
          if (isSessionStale(session)) {
            orphaned++;
            const sessionName = session.drill_name || session.training_title || 'Session';
            const age = getSessionAge(session);

            // Show prompt for stale session
            Alert.alert(
              'Unfinished Session',
              `You have an unfinished session: "${sessionName}" (started ${age} ago).\n\nWhat would you like to do?`,
              [
                {
                  text: 'End Session',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await endSession(session.id);
                      console.log(`[OrphanCheck] Ended stale session ${session.id}`);
                      // Update state
                      if (mostRecent?.id === session.id) {
                        setActiveSession(null);
                      }
                    } catch (err) {
                      console.error('[OrphanCheck] Failed to end session:', err);
                    }
                  },
                },
                {
                  text: 'Continue',
                  onPress: () => {
                    router.push(`/(protected)/activeSession?sessionId=${session.id}`);
                  },
                },
                {
                  text: 'Dismiss',
                  style: 'cancel',
                },
              ]
            );
            // Only show one prompt at a time
            break;
          }
        }

        setOrphanedCount(orphaned);
        setActiveSession(mostRecent);
      } catch (err) {
        console.error('[OrphanCheck] Error checking sessions:', err);
      } finally {
        setChecking(false);
      }
    }

    checkOrphanedSessions();
  }, []);

  return { checking, orphanedCount, activeSession };
}

