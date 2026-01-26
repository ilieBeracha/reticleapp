/**
 * Supabase Realtime Hooks
 *
 * A clean, type-safe system for subscribing to database changes.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ARCHITECTURE                                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  ┌───────────────────────────────────────────────────────────────────┐ │
 * │  │                    Domain Hooks                                    │ │
 * │  │  useSessionRealtime  │  useTrainingRealtime  │  useTeamRealtime   │ │
 * │  │  useParticipantsRealtime  │  useWeaponRealtime                    │ │
 * │  └───────────────────────────────────────────────────────────────────┘ │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  ┌───────────────────────────────────────────────────────────────────┐ │
 * │  │                 Generic Table Hook                                 │ │
 * │  │                  useTableSubscription                              │ │
 * │  └───────────────────────────────────────────────────────────────────┘ │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  ┌───────────────────────────────────────────────────────────────────┐ │
 * │  │                 Core Channel Management                            │ │
 * │  │                   useRealtimeChannel                               │ │
 * │  └───────────────────────────────────────────────────────────────────┘ │
 * │                              │                                          │
 * │                              ▼                                          │
 * │  ┌───────────────────────────────────────────────────────────────────┐ │
 * │  │                 Supabase Realtime Client                           │ │
 * │  └───────────────────────────────────────────────────────────────────┘ │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * USAGE:
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
 * 2. Domain hooks (recommended):
 * ```tsx
 * useSessionRealtime({
 *   sessionId: session.id,
 *   onStatusChange: (status) => {
 *     if (status === 'completed') navigateAway();
 *   },
 * });
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE
// ═══════════════════════════════════════════════════════════════════════════

export { useRealtimeChannel } from './core';
export type {
  ChannelChangePayload,
  ChannelConfig,
  ChannelStatus,
  ChannelSubscription,
  UseRealtimeChannelReturn,
} from './core';

// ═══════════════════════════════════════════════════════════════════════════
// TABLE (GENERIC)
// ═══════════════════════════════════════════════════════════════════════════

export { useTableSubscription } from './table';
export type {
  ChangePayload,
  PostgresChangeEvent,
  TableSubscription,
  UseTableSubscriptionOptions,
  UseTableSubscriptionReturn,
} from './table';

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE RECORDS
// ═══════════════════════════════════════════════════════════════════════════

export type {
  ParticipantRecord,
  SessionRecord,
  SessionTargetRecord,
  TeamInvitationRecord,
  TeamMemberRecord,
  TeamTrainingRecord,
  TeamWeaponRecord,
  TrainingRecord,
  WeaponRequestRecord,
} from './records';

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// Session
export { useSessionRealtime } from './session';
export type { UseSessionRealtimeOptions, UseSessionRealtimeReturn } from './session';

// Training
export { useTrainingRealtime } from './training';
export type { UseTrainingRealtimeOptions, UseTrainingRealtimeReturn } from './training';

// Team
export { useTeamRealtime } from './team';
export type { UseTeamRealtimeOptions, UseTeamRealtimeReturn } from './team';

// Participants
export { useParticipantsRealtime } from './participants';
export type { UseParticipantsRealtimeOptions, UseParticipantsRealtimeReturn } from './participants';

// Weapon
export { useWeaponRealtime } from './weapon';
export type { UseWeaponRealtimeOptions, UseWeaponRealtimeReturn } from './weapon';
