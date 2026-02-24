/**
 * Required Fields Engine
 *
 * Determines which fields are currently required based on
 * conditional requiredWhen expressions and schema required array.
 */

import { evaluateBoolean } from "../feel/index.js";
import type {
  Forma,
  FieldDefinition,
  EvaluationContext,
  RequiredFieldsResult,
} from "../types.js";
import { calculate } from "./calculate.js";

// ============================================================================
// Types
// ============================================================================

export interface RequiredOptions {
  /** Pre-calculated computed values */
  computed?: Record<string, unknown>;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Determine which fields are currently required
 *
 * Returns a map of field paths to boolean required states.
 * Evaluates requiredWhen expressions for conditional requirements.
 *
 * @param data - Current form data
 * @param spec - Form specification
 * @param options - Optional pre-calculated computed values
 * @returns Map of field paths to required states
 *
 * @example
 * const required = getRequired(
 *   { hasInsurance: true },
 *   forma
 * );
 * // => { hasInsurance: true, insuranceProvider: true, policyNumber: true }
 */
export function getRequired(
  data: Record<string, unknown>,
  spec: Forma,
  options: RequiredOptions = {},
): RequiredFieldsResult {
  const computed = options.computed ?? calculate(data, spec);
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  const result: RequiredFieldsResult = {};

  // Evaluate each field's required status
  for (const fieldPath of spec.fieldOrder) {
    const fieldDef = spec.fields[fieldPath];
    if (fieldDef) {
      result[fieldPath] = isFieldRequired(fieldPath, fieldDef, spec, context);
    }
  }

  // Also check array item fields
  for (const [fieldPath, fieldDef] of Object.entries(spec.fields)) {
    if (fieldDef.type === "array" && fieldDef.itemFields) {
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

          for (const [itemFieldName, itemFieldDef] of Object.entries(
            fieldDef.itemFields,
          )) {
            const itemFieldPath = `${fieldPath}[${i}].${itemFieldName}`;
            result[itemFieldPath] = isFieldRequired(
              itemFieldPath,
              itemFieldDef,
              spec,
              itemContext,
            );
          }
        }
      }
    }
  }

  return result;
}

// ============================================================================
// Field Required Check
// ============================================================================

/**
 * Check if a single field is required based on requiredWhen or schema
 * @internal Exported for use by validate.ts
 */
export function isFieldRequired(
  fieldPath: string,
  fieldDef: FieldDefinition,
  spec: Forma,
  context: EvaluationContext,
): boolean {
  // If field has requiredWhen, evaluate it
  if (fieldDef.requiredWhen) {
    return evaluateBoolean(fieldDef.requiredWhen, context);
  }

  // Otherwise, check schema required array
  return spec.schema.required?.includes(fieldPath) ?? false;
}

/**
 * Check if a single field is currently required
 *
 * @param fieldPath - Path to the field
 * @param data - Current form data
 * @param spec - Form specification
 * @returns True if the field is required
 */
export function isRequired(
  fieldPath: string,
  data: Record<string, unknown>,
  spec: Forma,
): boolean {
  const fieldDef = spec.fields[fieldPath];
  if (!fieldDef) {
    return spec.schema.required?.includes(fieldPath) ?? false;
  }

  const computed = calculate(data, spec);
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  return isFieldRequired(fieldPath, fieldDef, spec, context);
}
