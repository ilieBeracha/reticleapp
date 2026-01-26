/**
 * Table Subscription Types
 *
 * Generic types for table-level subscriptions.
 * Used by useTableSubscription and domain hooks.
 */

// ═══════════════════════════════════════════════════════════════════════════
// POSTGRES CHANGE EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE PAYLOAD (generic)
// ═══════════════════════════════════════════════════════════════════════════

export interface ChangePayload<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors: string[] | null;
  schema: string;
  table: string;
  commit_timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE SUBSCRIPTION CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface TableSubscription<T = Record<string, unknown>> {
  table: string;
  event?: PostgresChangeEvent;
  filter?: string;
  onData: (payload: ChangePayload<T>) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

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
// HOOK RETURN
// ═══════════════════════════════════════════════════════════════════════════

export interface UseTableSubscriptionReturn {
  status: string | null;
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
  disconnect: () => void;
}
