/**
 * Session Service — Public API
 *
 * Single entry-point for session operations. The implementation is split
 * across files in services/session/* for maintainability.
 */

export type * from '@/types/session';
export type * from '@/types/session.watch';
export { enforceEngagementMode } from '@/utils/engagementMode';
export * from './session/mutations';
export * from './session/queries';
export * from './session/stats';
export * from './session/targets';
export * from './session/participants';
export * from './session/watchDataTransformer';
