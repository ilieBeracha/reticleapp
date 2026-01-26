/**
 * Training Creation Steps
 *
 * 2-Step Flow (Simplified):
 * 1. TrainingDetailsStep - Team, name, schedule
 * 2. AddDrillStep - Define drill configurations for the training
 *
 * NOTE: Training only defines context and drill configurations.
 * Actual execution happens via startEngagement when users shoot.
 */

export { AddDrillStep } from './AddDrillStep';
export { DrillAdjustModal } from './DrillAdjustModal';
export { DrillConfigSheet } from './DrillConfigSheet';
export { DrillCreator } from './DrillCreator';
export { DrillQuickAdd } from './DrillQuickAdd';
export { DrillsBuilder } from './DrillsBuilder';
export { DrillSelectionStep } from './DrillSelectionStep';
export { DrillSelectionStepV2 } from './DrillSelectionStepV2';
export { TrainingDetailsStep } from './TrainingDetailsStep';
export { TrainingDrillsStep } from './TrainingDrillsStep';

