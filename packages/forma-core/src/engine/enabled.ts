/**
 * Enabled Fields Engine
 *
 * Determines which fields are currently enabled (editable) based on
 * conditional enabledWhen expressions.
 */

import { evaluateBoolean } from "../feel/index.js";
import type {
  Forma,
  FieldDefinition,
  EvaluationContext,
  EnabledResult,
} from "../types.js";
import { calculate } from "./calculate.js";

// ============================================================================
// Types
// ============================================================================

export interface EnabledOptions {
  /** Pre-calculated computed values */
  computed?: Record<string, unknown>;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Determine which fields are currently enabled (editable)
 *
 * Returns a map of field paths to boolean enabled states.
 * Fields without enabledWhen expressions are always enabled.
 *
 * @param data - Current form data
 * @param spec - Form specification
 * @param options - Optional pre-calculated computed values
 * @returns Map of field paths to enabled states
 *
 * @example
 * const enabled = getEnabled(
 *   { isLocked: true },
 *   forma
 * );
 * // => { isLocked: true, lockedField: false, ... }
 */
export function getEnabled(
  data: Record<string, unknown>,
  spec: Forma,
  options: EnabledOptions = {}
): EnabledResult {
  const computed = options.computed ?? calculate(data, spec);
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  const result: EnabledResult = {};

  // Evaluate each field's enabled status
  for (const fieldPath of spec.fieldOrder) {
    const fieldDef = spec.fields[fieldPath];
    if (fieldDef) {
      result[fieldPath] = isFieldEnabled(fieldDef, context);
    }
  }

  // Also check array item fields
  for (const [fieldPath, fieldDef] of Object.entries(spec.fields)) {
    if (fieldDef.itemFields) {
      const arrayData = data[fieldPath];
      if (Array.isArray(arrayData)) {
        for (let i = 0; i < arrayData.length; i++) {
          const item = arrayData[i] as Record<string, unknown>;
          const itemContext: EvaluationContext = {
            data,
            computed,
            referenceData: spec.referenceData,
            item,
            itemIndex: i,
          };

          for (const [itemFieldName, itemFieldDef] of Object.entries(fieldDef.itemFields)) {
            const itemFieldPath = `${fieldPath}[${i}].${itemFieldName}`;
            result[itemFieldPath] = isFieldEnabled(itemFieldDef, itemContext);
          }
        }
      }
    }
  }

  return result;
}

// ============================================================================
// Field Enabled Check
// ============================================================================

/**
 * Check if a field is enabled based on its definition
 */
function isFieldEnabled(
  fieldDef: FieldDefinition,
  context: EvaluationContext
): boolean {
  // If field has enabledWhen, evaluate it
  if (fieldDef.enabledWhen) {
    return evaluateBoolean(fieldDef.enabledWhen, context);
  }

  // No condition = always enabled
  return true;
}

/**
 * Check if a single field is currently enabled
 *
 * @param fieldPath - Path to the field
 * @param data - Current form data
 * @param spec - Form specification
 * @returns True if the field is enabled
 */
export function isEnabled(
  fieldPath: string,
  data: Record<string, unknown>,
  spec: Forma
): boolean {
  const fieldDef = spec.fields[fieldPath];
  if (!fieldDef) {
    return true; // Unknown fields are enabled by default
  }

  if (!fieldDef.enabledWhen) {
    return true; // No condition = always enabled
  }

  const computed = calculate(data, spec);
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  return evaluateBoolean(fieldDef.enabledWhen, context);
}
