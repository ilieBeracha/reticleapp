/**
 * Drill Service Exports
 * 
 * New simplified architecture:
 * - Canonical Drills (global, read-only)
 * - Team Presets (saved configurations)
 */

export {
  // Types
  type CanonicalDrill,
  type TeamDrillPreset,
  type DrillConfig,
  type TrainingDrillItem,
  type DrillGoal,
  type TargetType,
  type DrillCategory,
  type DrillDifficulty,
  type ShootingPosition,
  type CreatePresetInput,
  
  // Canonical Drills (read-only)
  getAllDrills,
  getDrill,
  getDrillsByCategory,
  getDrillsGroupedByCategory,
  
  // Team Presets
  getTeamPresets,
  getPresetsForDrill,
  createTeamPreset,
  updateTeamPreset,
  deleteTeamPreset,
  
  // Helpers
  buildTrainingDrillItem,
  buildTrainingDrillItemFromPreset,
  getDrillDisplayName,
  validateDrillConfig,
} from './drillService';
