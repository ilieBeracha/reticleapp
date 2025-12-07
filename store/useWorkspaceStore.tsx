/**
 * @deprecated This store is deprecated. Use teamStore instead.
 * Kept for backwards compatibility during migration.
 * 
 * Team-First Architecture: Teams are the primary entity.
 * This file re-exports teamStore for any legacy code still importing useWorkspaceStore.
 */

import { useTeamStore } from './teamStore';

// Re-export for backwards compatibility
export const useWorkspaceStore = useTeamStore;

// Legacy types - map to team equivalents
export type { TeamWithRole as Workspace } from '@/types/workspace';
