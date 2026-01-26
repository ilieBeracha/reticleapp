/**
 * Core Channel Types
 *
 * Type definitions for Supabase Realtime channel management.
 * These are infrastructure types, not domain-specific.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL STATUS
// ═══════════════════════════════════════════════════════════════════════════

export type ChannelStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export interface ChannelConfig {
  /** Unique channel name */
  name: string;
  /** Table subscriptions to attach to this channel */
  subscriptions: ChannelSubscription[];
  /** Called when channel status changes */
  onStatusChange?: (status: ChannelStatus) => void;
  /** Called on any error */
  onError?: (error: Error) => void;
}

export interface ChannelSubscription {
  /** Table name to subscribe to */
  table: string;
  /** Event type to listen for */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** Filter expression (e.g., 'user_id=eq.123') */
  filter?: string;
  /** Callback when change occurs */
  onData: (payload: ChannelChangePayload) => void;
}

export interface ChannelChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  errors: string[] | null;
  schema: string;
  table: string;
  commit_timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK RETURN TYPE
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
