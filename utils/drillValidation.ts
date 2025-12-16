/**
 * DRILL VALIDATION
 *
 * Type-specific parameter validation for drill instances.
 * Pure TypeScript validation (no external dependencies).
 */

import { DRILL_TYPES, type DrillTypeId, type DrillTemplate, type ParamConstraint } from '@/types/drillTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  param: string;
  message: string;
  value?: any;
}

// ============================================================================
// CORE VALIDATION
// ============================================================================

/**
 * Validate parameters for a drill type
 */
export function validateDrillParams(
  drillType: DrillTypeId,
  params: Record<string, any>
): ValidationResult {
  const type = DRILL_TYPES[drillType];
  const errors: ValidationError[] = [];

  // 1. Check required params
  for (const param of type.requiredParams) {
    const value = params[param];
    if (value === undefined || value === null || value === '') {
      errors.push({
        param,
        message: `${formatParamName(param)} is required`,
        value,
      });
    }
  }

  // 2. Validate each param against constraints
  for (const [param, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    const constraint = type.paramConstraints[param];
    if (!constraint) continue;

    const error = validateParamValue(param, value, constraint);
    if (error) {
      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single parameter value against its constraint
 */
function validateParamValue(
  param: string,
  value: any,
  constraint: ParamConstraint
): ValidationError | null {
  const paramName = formatParamName(param);

  switch (constraint.type) {
    case 'range': {
      if (typeof value !== 'number') {
        return { param, message: `${paramName} must be a number`, value };
      }
      if (constraint.min !== undefined && value < constraint.min) {
        return {
          param,
          message: `${paramName} must be at least ${constraint.min}${constraint.unit || ''}`,
          value,
        };
      }
      if (constraint.max !== undefined && value > constraint.max) {
        return {
          param,
          message: `${paramName} must be at most ${constraint.max}${constraint.unit || ''}`,
          value,
        };
      }
      break;
    }

    case 'options': {
      if (constraint.options && !constraint.options.includes(value)) {
        return {
          param,
          message: `${paramName} must be one of: ${constraint.options.join(', ')}`,
          value,
        };
      }
      break;
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        return { param, message: `${paramName} must be true or false`, value };
      }
      break;
    }
  }

  return null;
}

// ============================================================================
// TEMPLATE VALIDATION
// ============================================================================

/**
 * Validate a drill template
 */
export function validateTemplate(template: Partial<DrillTemplate>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!template.name || template.name.trim() === '') {
    errors.push({ param: 'name', message: 'Name is required' });
  }

  if (!template.drillType) {
    errors.push({ param: 'drillType', message: 'Drill type is required' });
  } else if (!DRILL_TYPES[template.drillType]) {
    errors.push({
      param: 'drillType',
      message: `Invalid drill type: ${template.drillType}`,
      value: template.drillType,
    });
  }

  if (!template.source) {
    errors.push({ param: 'source', message: 'Source is required' });
  } else if (!['library', 'team', 'personal'].includes(template.source)) {
    errors.push({
      param: 'source',
      message: 'Source must be library, team, or personal',
      value: template.source,
    });
  }

  // Validate defaults against drill type constraints
  if (template.drillType && template.defaults) {
    const paramValidation = validateDrillParams(template.drillType, template.defaults);
    errors.push(...paramValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// INSTANCE VALIDATION
// ============================================================================

/**
 * Validate instance params against template constraints
 */
export function validateInstanceParams(
  template: DrillTemplate,
  params: Record<string, any>
): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. First validate against drill type
  const typeValidation = validateDrillParams(template.drillType, params);
  errors.push(...typeValidation.errors);

  // 2. Check template constraints
  if (template.constraints) {
    // Locked params must match defaults
    if (template.constraints.lockedParams) {
      for (const param of template.constraints.lockedParams) {
        const defaultValue = template.defaults[param];
        const instanceValue = params[param];
        if (defaultValue !== undefined && instanceValue !== defaultValue) {
          errors.push({
            param,
            message: `${formatParamName(param)} is locked to ${defaultValue}`,
            value: instanceValue,
          });
        }
      }
    }

    // Allowed distances
    if (template.constraints.allowedDistances && params.distance) {
      if (!template.constraints.allowedDistances.includes(params.distance)) {
        errors.push({
          param: 'distance',
          message: `Distance must be one of: ${template.constraints.allowedDistances.join(', ')}m`,
          value: params.distance,
        });
      }
    }

    // Min/max shots
    if (template.constraints.minShots && params.shots < template.constraints.minShots) {
      errors.push({
        param: 'shots',
        message: `Minimum ${template.constraints.minShots} shots required`,
        value: params.shots,
      });
    }
    if (template.constraints.maxShots && params.shots > template.constraints.maxShots) {
      errors.push({
        param: 'shots',
        message: `Maximum ${template.constraints.maxShots} shots allowed`,
        value: params.shots,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format param name for display
 */
function formatParamName(param: string): string {
  return param
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/**
 * Get configurable params for a template
 * (params not locked by template constraints)
 */
export function getConfigurableParams(template: DrillTemplate): string[] {
  const type = DRILL_TYPES[template.drillType];
  const allParams = [...type.requiredParams, ...type.optionalParams];
  const lockedParams = template.constraints?.lockedParams || [];

  return allParams.filter((param) => !lockedParams.includes(param));
}

/**
 * Check if a param is locked for a template
 */
export function isParamLocked(template: DrillTemplate, param: string): boolean {
  return template.constraints?.lockedParams?.includes(param) ?? false;
}

/**
 * Get allowed values for a param (considering both type and template constraints)
 */
export function getAllowedValues(
  template: DrillTemplate,
  param: string
): (number | string)[] | null {
  const type = DRILL_TYPES[template.drillType];
  const constraint = type.paramConstraints[param];

  if (!constraint || constraint.type !== 'options') {
    return null;
  }

  let options = constraint.options || [];

  // Apply template constraints
  if (param === 'distance' && template.constraints?.allowedDistances) {
    options = options.filter((v) =>
      template.constraints!.allowedDistances!.includes(v as number)
    );
  }

  return options;
}

/**
 * Merge defaults with instance params
 */
export function mergeWithDefaults(
  template: DrillTemplate,
  instanceParams: Record<string, any>
): Record<string, any> {
  return {
    ...template.defaults,
    ...instanceParams,
  };
}
