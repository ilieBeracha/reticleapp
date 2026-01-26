/**
 * Supabase Realtime Hooks
 * 
 * A clean, type-safe system for subscribing to database changes.
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ARCHITECTURE                                                   │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                 │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │              Domain-Specific Hooks                       │   │
 * │  │  useTrainingRealtime  │  useSessionRealtime              │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * │                          │                                      │
 * │                          ▼                                      │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │              Generic Table Hook                          │   │
 * │  │                useTableSubscription                      │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * │                          │                                      │
 * │                          ▼                                      │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │              Core Channel Management                     │   │
 * │  │                useRealtimeChannel                        │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * │                          │                                      │
 * │                          ▼                                      │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │              Supabase Realtime Client                    │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * │                                                                 │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Simple table subscription:
 * ```tsx
 * useTableSubscription({
 *   table: 'messages',
 *   filter: 'channel_id=eq.123',
 *   onInsert: (msg) => addMessage(msg),
 * });
 * ```
 * 
 * 2. Training realtime (commander view):
 * ```tsx
 * useTrainingRealtime({
 *   trainingId: training.id,
 *   onSessionUpdate: () => refetchTeamProgress(),
 *   onNewTarget: () => refetchDrillProgress(),
 * });
 * ```
 * 
 * 3. Session realtime (active session):
 * ```tsx
 * useSessionRealtime({
 *   sessionId: session.id,
 *   onStatusChange: (status) => {
 *     if (status === 'completed') navigateAway();
 *   },
 * });
 * ```
 */

// Core hook
export { useRealtimeChannel } from './useRealtimeChannel';

// Generic table subscription
export { useTableSubscription } from './useTableSubscription';

// Domain-specific hooks
export { useTrainingRealtime } from './useTrainingRealtime';
export { useSessionRealtime } from './useSessionRealtime';
export { useTeamRealtime } from './useTeamRealtime';
export { useWeaponRealtime } from './useWeaponRealtime';
export { useParticipantsRealtime } from './useParticipantsRealtime';

// Types
export type {
  ChangePayload,
  ChannelConfig,
  ChannelStatus,
  PostgresChangeEvent,
  PostgresChangeFilter,
  SessionRecord,
  SessionTargetRecord,
  TableSubscription,
  TrainingRecord,
  UseRealtimeChannelReturn,
  UseTableSubscriptionOptions,
} from './types';

export type {
  TeamWeaponRecord,
  WeaponRequestRecord,
} from './useWeaponRealtime';

export type { ParticipantRecord } from './useParticipantsRealtime';
