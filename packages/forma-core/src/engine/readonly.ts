/**
 * Readonly Fields Engine
 *
 * Determines which fields are currently read-only based on
 * conditional readonlyWhen expressions.
 *
 * Readonly vs disabled:
 * - readonlyWhen: field is visible with normal appearance, not editable, value IS submitted
 * - enabledWhen: field is greyed out/dimmed, not interactive, value may be excluded
 */

import { evaluateBoolean } from "../feel/index.js";
import type {
  Forma,
  FieldDefinition,
  ArrayFieldDefinition,
  EvaluationContext,
  ReadonlyResult,
} from "../types.js";
import { calculate } from "./calculate.js";

// ============================================================================
// Types
// ============================================================================

export interface ReadonlyOptions {
  /** Pre-calculated computed values */
  computed?: Record<string, unknown>;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Determine which fields are currently read-only
 *
 * Returns a map of field paths to boolean readonly states.
 * Fields without readonlyWhen expressions are never readonly.
 *
 * @param data - Current form data
 * @param spec - Form specification
 * @param options - Optional pre-calculated computed values
 * @returns Map of field paths to readonly states
 *
 * @example
 * const readonly = getReadonly(
 *   { status: "submitted" },
 *   forma
 * );
 * // => { status: false, policyNumber: true, ... }
 */
export function getReadonly(
  data: Record<string, unknown>,
  spec: Forma,
  options: ReadonlyOptions = {}
): ReadonlyResult {
  const computed = options.computed ?? calculate(data, spec);
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  const result: ReadonlyResult = {};

  // Evaluate each field's readonly status
  for (const fieldPath of spec.fieldOrder) {
    const fieldDef = spec.fields[fieldPath];
    if (fieldDef) {
      result[fieldPath] = isFieldReadonly(fieldDef, context);
    }
  }

  // Also check array item fields
  for (const [fieldPath, fieldDef] of Object.entries(spec.fields)) {
    if (fieldDef.type === "array" && fieldDef.itemFields) {
      const arrayData = data[fieldPath];
      if (Array.isArray(arrayData)) {
        evaluateArrayItemReadonly(fieldPath, fieldDef, arrayData, data, computed, spec, result);
      }
    }
  }

  return result;
}

// ============================================================================
// Field Readonly Check
// ============================================================================

/**
 * Check if a field is readonly based on its definition
 */
function isFieldReadonly(
  fieldDef: FieldDefinition,
  context: EvaluationContext
): boolean {
  // If field has readonlyWhen, evaluate it
  if (fieldDef.readonlyWhen) {
    return evaluateBoolean(fieldDef.readonlyWhen, context);
  }

  // No condition = never readonly
  return false;
}

/**
 * Evaluate readonly state for array item fields
 */
function evaluateArrayItemReadonly(
  arrayPath: string,
  fieldDef: ArrayFieldDefinition,
  arrayData: unknown[],
  data: Record<string, unknown>,
  computed: Record<string, unknown>,
  spec: Forma,
  result: ReadonlyResult
): void {
  if (!fieldDef.itemFields) return;

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
      const itemFieldPath = `${arrayPath}[${i}].${itemFieldName}`;
      result[itemFieldPath] = isFieldReadonly(itemFieldDef, itemContext);
    }
  }
}

/**
 * Check if a single field is currently readonly
 *
 * @param fieldPath - Path to the field
 * @param data - Current form data
 * @param spec - Form specification
 * @returns True if the field is readonly
 */
export function isReadonly(
  fieldPath: string,
  data: Record<string, unknown>,
  spec: Forma
): boolean {
  const fieldDef = spec.fields[fieldPath];
  if (!fieldDef) {
    return false; // Unknown fields are not readonly by default
  }

  if (!fieldDef.readonlyWhen) {
    return false; // No condition = never readonly
  }

  const computed = calculate(data, spec);
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  return evaluateBoolean(fieldDef.readonlyWhen, context);
}
