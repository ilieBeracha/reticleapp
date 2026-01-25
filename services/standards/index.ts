/**
 * Standards Module
 * 
 * Commander-defined performance standards with condition modifiers.
 * 
 * DOCTRINE: Rules decide outcomes. AI advises, never judges.
 */

// Service (CRUD operations)
export {
  // Types
  type AppliedModifier,
  type CreateModifierInput,
  type CreateStandardInput,
  type ModifierConditionType,
  type SessionVerdict,
  type StandardModifier,
  type TeamStandard,
  type VerdictBreakdown,
  
  // Standards CRUD
  createStandard,
  deleteStandard,
  getStandardById,
  getTeamStandards,
  updateStandard,
  
  // Modifiers CRUD
  createModifier,
  deleteModifier,
  getTeamModifiers,
  updateModifier,
  
  // Verdict queries
  getSessionVerdict,
  getSessionVerdicts,
} from './standardsService';

// Engine (Deterministic evaluation)
export {
  // Types
  type SessionContext,
  type StandardsVerdictResult,
  
  // Core function
  calculateVerdict,
  
  // High-level API
  buildSessionContext,
  evaluateAndStoreVerdict,
} from './standardsEngine';
