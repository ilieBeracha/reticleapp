// Base components (may still be useful for any custom sheets)
export { BaseBottomSheet } from './BaseBottomSheet';
export type { BaseBottomSheetRef } from './BaseBottomSheet';
export { BaseDetachedBottomSheet } from './BaseDetachedBottomSheet';
export type { BaseDetachedBottomSheetRef } from './BaseDetachedBottomSheet';

// Remaining sheets
export { ComingSoonSheet } from './ComingSoonSheet';

/**
 * All sheets have been migrated to native form sheet routes:
 * 
 * - AcceptInviteSheet → app/(protected)/acceptInvite.tsx
 * - CreateSessionSheet → app/(protected)/createSession.tsx
 * - CreateTeamSheet → app/(protected)/createTeam.tsx
 * - CreateTrainingSheet → app/(protected)/createTraining.tsx
 * - CreateWorkspaceSheet → app/(protected)/createWorkspace.tsx
 * - InviteMembersSheet → app/(protected)/inviteMembers.tsx
 * - MemberPreviewSheet → app/(protected)/memberPreview.tsx
 * - TeamPreviewSheet → app/(protected)/teamPreview.tsx
 * - TrainingDetailSheet → app/(protected)/trainingDetail.tsx
 * - UserMenuBottomSheet → app/(protected)/userMenu.tsx
 * - WorkspaceSwitcherSheet → app/(protected)/workspaceSwitcher.tsx
 * 
 * Open sheets with: router.push('/(protected)/sheetName')
 */
