/**
 * Training Components
 * 
 * NOTE: Training is a read-only dashboard showing context and history.
 * All execution-related components (ActiveSquadEngagementsCard, SquadInvitationBanner, etc.)
 * have been removed per the canonical model.
 */

// Components
export { DrillCard } from './DrillCard';
export { ParticipantInsights } from './ParticipantInsights';

// Hooks
export { useTrainingDetail } from './hooks';

// Utils
export { formatDate, formatTime, getStatusConfig } from './utils';

// Types
export type {
    SessionWithDetails,
    StatusConfig,
    ThemeColors,
    TrainingDrill,
    TrainingStatus,
    TrainingWithDetails
} from './types';
