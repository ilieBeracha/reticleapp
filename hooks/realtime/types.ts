/**
 * Supabase Realtime Types
 * 
 * Type definitions for the realtime subscription system.
 * Provides type-safe interfaces for all realtime operations.
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE CHANGE EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface PostgresChangeFilter {
  /** The event type to listen for */
  event: PostgresChangeEvent;
  /** The database schema (usually 'public') */
  schema?: string;
  /** The table to monitor */
  table: string;
  /** Optional filter expression (e.g., 'training_id=eq.123') */
  filter?: string;
}

export interface ChangePayload<T = Record<string, unknown>> {
  /** The type of change that occurred */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** The new record (for INSERT/UPDATE) */
  new: T;
  /** The old record (for UPDATE/DELETE) */
  old: T;
  /** Errors if any */
  errors: string[] | null;
  /** The schema name */
  schema: string;
  /** The table name */
  table: string;
  /** Commit timestamp */
  commit_timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export type ChannelStatus = 
  | 'SUBSCRIBED' 
  | 'TIMED_OUT' 
  | 'CLOSED' 
  | 'CHANNEL_ERROR';

export interface ChannelConfig {
  /** Unique channel name */
  name: string;
  /** Table subscriptions */
  subscriptions: TableSubscription<any>[];
  /** Called when channel status changes */
  onStatusChange?: (status: ChannelStatus) => void;
  /** Called on any error */
  onError?: (error: Error) => void;
}

export interface TableSubscription<T = Record<string, unknown>> {
  /** Table name to subscribe to */
  table: string;
  /** Event type to listen for */
  event?: PostgresChangeEvent;
  /** Filter expression (e.g., 'user_id=eq.123') */
  filter?: string;
  /** Callback when change occurs */
  onData: (payload: ChangePayload<T>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK RETURNS
// ═══════════════════════════════════════════════════════════════════════════

export interface UseRealtimeChannelReturn {
  /** The underlying Supabase channel */
  channel: RealtimeChannel | null;
  /** Current subscription status */
  status: ChannelStatus | null;
  /** Whether currently connected and subscribed */
  isConnected: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
}

export interface UseTableSubscriptionOptions<T = Record<string, unknown>> {
  /** Table name to subscribe to */
  table: string;
  /** Event type (default: '*' for all events) */
  event?: PostgresChangeEvent;
  /** Filter expression */
  filter?: string;
  /** Called on INSERT */
  onInsert?: (record: T) => void;
  /** Called on UPDATE */
  onUpdate?: (newRecord: T, oldRecord: T) => void;
  /** Called on DELETE */
  onDelete?: (record: T) => void;
  /** Called on any change */
  onChange?: (payload: ChangePayload<T>) => void;
  /** Whether subscription is enabled */
  enabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOMAIN-SPECIFIC TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Session record from database */
export interface SessionRecord {
  id: string;
  user_id: string;
  team_id: string | null;
  training_id: string | null;
  drill_id: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Session target record from database */
export interface SessionTargetRecord {
  id: string;
  session_id: string;
  target_type: string;
  distance_m: number;
  created_at: string;
}

/** Training record from database */
export interface TrainingRecord {
  id: string;
  team_id: string | null;
  status: 'planned' | 'ongoing' | 'finished' | 'cancelled';
  created_at: string;
  updated_at: string;
}
