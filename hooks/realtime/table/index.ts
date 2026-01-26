/**
 * Table Subscription Module
 *
 * Generic table-level subscriptions.
 */

export { useTableSubscription } from './useTableSubscription';

export type {
  ChangePayload,
  PostgresChangeEvent,
  TableSubscription,
  UseTableSubscriptionOptions,
  UseTableSubscriptionReturn,
} from './table.types';
