/**
 * Visibility Engine
 *
 * Determines which fields should be visible based on form data
 * and Forma visibility rules.
 */

import { evaluateBoolean } from "../feel/index.js";
import type {
  Forma,
  FieldDefinition,
  EvaluationContext,
  VisibilityResult,
} from "../types.js";
import { calculate } from "./calculate.js";

// ============================================================================
// Types
// ============================================================================

export interface VisibilityOptions {
  /** Pre-calculated computed values (avoids recalculation) */
  computed?: Record<string, unknown>;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Determine visibility for all fields in a form
 *
 * Returns a map of field paths to boolean visibility states.
 * Fields without visibleWhen expressions are always visible.
 *
 * @param data - Current form data
 * @param spec - Form specification
 * @param options - Optional pre-calculated computed values
 * @returns Map of field paths to visibility states
 *
 * @example
 * const visibility = getVisibility(
 *   { age: 21, hasLicense: true },
 *   forma
 * );
 * // => { age: true, hasLicense: true, vehicleType: true, ... }
 */
export function getVisibility(
  data: Record<string, unknown>,
  spec: Forma,
  options: VisibilityOptions = {}
): VisibilityResult {
  // Calculate computed values if not provided
  const computed = options.computed ?? calculate(data, spec);

  // Build base evaluation context
  const baseContext: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  const result: VisibilityResult = {};

  // Process all fields in field order
  for (const fieldPath of spec.fieldOrder) {
    const fieldDef = spec.fields[fieldPath];
    if (fieldDef) {
      evaluateFieldVisibility(fieldPath, fieldDef, data, baseContext, result);
    }
  }

  return result;
}

// ============================================================================
// Field Evaluation
// ============================================================================

/**
 * Evaluate visibility for a single field and its nested fields
 */
function evaluateFieldVisibility(
  path: string,
  fieldDef: FieldDefinition,
  data: Record<string, unknown>,
  context: EvaluationContext,
  result: VisibilityResult
): void {
  // Evaluate the field's own visibility
  if (fieldDef.visibleWhen) {
    result[path] = evaluateBoolean(fieldDef.visibleWhen, context);
  } else {
    result[path] = true; // No condition = always visible
  }

  // If not visible, children are implicitly not visible
  if (!result[path]) {
    return;
  }

  // Handle array fields with item visibility
  if (fieldDef.itemFields) {
    const arrayData = data[path];
    if (Array.isArray(arrayData)) {
      evaluateArrayItemVisibility(path, fieldDef, arrayData, context, result);
    }
  }
}

/**
 * Evaluate visibility for array item fields
 *
 * For each item in the array, evaluates the visibility of each
 * item field using the $item context.
 */
function evaluateArrayItemVisibility(
  arrayPath: string,
  fieldDef: FieldDefinition,
  arrayData: unknown[],
  baseContext: EvaluationContext,
  result: VisibilityResult
): void {
  if (!fieldDef.itemFields) return;

  for (let i = 0; i < arrayData.length; i++) {
    const item = arrayData[i] as Record<string, unknown>;

    // Create item-specific context
    const itemContext: EvaluationContext = {
      ...baseContext,
      item,
      itemIndex: i,
    };

    // Evaluate each item field's visibility
    for (const [fieldName, itemFieldDef] of Object.entries(fieldDef.itemFields)) {
      const itemFieldPath = `${arrayPath}[${i}].${fieldName}`;

      if (itemFieldDef.visibleWhen) {
        result[itemFieldPath] = evaluateBoolean(itemFieldDef.visibleWhen, itemContext);
      } else {
        result[itemFieldPath] = true;
      }
    }
  }
}

// ============================================================================
// Individual Field Visibility
// ============================================================================

/**
 * Check if a single field is visible
 *
 * Useful for checking visibility of one field without computing all.
 *
 * @param fieldPath - Field path to check
 * @param data - Current form data
 * @param spec - Form specification
 * @param options - Optional pre-calculated computed values
 * @returns True if the field is visible
 */
export function isFieldVisible(
  fieldPath: string,
  data: Record<string, unknown>,
  spec: Forma,
  options: VisibilityOptions = {}
): boolean {
  const fieldDef = spec.fields[fieldPath];
  if (!fieldDef) {
    return true; // Unknown fields are visible by default
  }

  if (!fieldDef.visibleWhen) {
    return true; // No condition = always visible
  }

  const computed = options.computed ?? calculate(data, spec);
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  return evaluateBoolean(fieldDef.visibleWhen, context);
}

// ============================================================================
// Page Visibility
// ============================================================================

/**
 * Determine which pages are visible in a wizard form
 *
 * @param data - Current form data
 * @param spec - Form specification with pages
 * @param options - Optional pre-calculated computed values
 * @returns Map of page IDs to visibility states
 */
export function getPageVisibility(
  data: Record<string, unknown>,
  spec: Forma,
  options: VisibilityOptions = {}
): Record<string, boolean> {
  if (!spec.pages) {
    return {};
  }

  const computed = options.computed ?? calculate(data, spec);
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  const result: Record<string, boolean> = {};

  for (const page of spec.pages) {
    if (page.visibleWhen) {
      result[page.id] = evaluateBoolean(page.visibleWhen, context);
    } else {
      result[page.id] = true;
    }
  }

  return result;
}
