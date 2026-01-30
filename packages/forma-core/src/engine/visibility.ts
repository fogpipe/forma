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
  SelectOption,
} from "../types.js";
import { calculate } from "./calculate.js";

// ============================================================================
// Types
// ============================================================================

export interface VisibilityOptions {
  /** Pre-calculated computed values (avoids recalculation) */
  computed?: Record<string, unknown>;
}

/**
 * Result of option visibility computation.
 * Maps field paths to their visible options.
 *
 * For array items, paths are like "items[0].category", "items[1].category", etc.
 */
export interface OptionsVisibilityResult {
  readonly [fieldPath: string]: readonly SelectOption[];
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Filter options by evaluating visibleWhen expressions against a context.
 * This is the core filtering logic used by both batch and individual computation.
 */
function filterOptionsByContext(
  options: readonly SelectOption[],
  context: EvaluationContext
): SelectOption[] {
  return options.filter((option) => {
    if (!option.visibleWhen) return true;
    try {
      return evaluateBoolean(option.visibleWhen, context);
    } catch {
      // Invalid expression - hide the option (fail closed)
      return false;
    }
  });
}

/**
 * Process array item fields and compute their option visibility.
 */
function processArrayItemOptions(
  arrayPath: string,
  fieldDef: FieldDefinition,
  arrayData: readonly unknown[],
  baseContext: EvaluationContext,
  result: Record<string, SelectOption[]>
): void {
  if (!fieldDef.itemFields) return;

  for (let i = 0; i < arrayData.length; i++) {
    const item = (arrayData[i] ?? {}) as Record<string, unknown>;
    const itemContext: EvaluationContext = {
      ...baseContext,
      item,
      itemIndex: i,
    };

    for (const [itemFieldName, itemFieldDef] of Object.entries(fieldDef.itemFields)) {
      if (itemFieldDef.options && itemFieldDef.options.length > 0) {
        const itemFieldPath = `${arrayPath}[${i}].${itemFieldName}`;
        result[itemFieldPath] = filterOptionsByContext(itemFieldDef.options, itemContext);
      }
    }
  }
}

// ============================================================================
// Field Visibility
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
  const computed = options.computed ?? calculate(data, spec);

  const baseContext: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  const result: VisibilityResult = {};

  for (const fieldPath of spec.fieldOrder) {
    const fieldDef = spec.fields[fieldPath];
    if (fieldDef) {
      evaluateFieldVisibility(fieldPath, fieldDef, data, baseContext, result);
    }
  }

  return result;
}

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
  if (fieldDef.visibleWhen) {
    result[path] = evaluateBoolean(fieldDef.visibleWhen, context);
  } else {
    result[path] = true;
  }

  if (!result[path]) {
    return;
  }

  if (fieldDef.itemFields) {
    const arrayData = data[path];
    if (Array.isArray(arrayData)) {
      evaluateArrayItemVisibility(path, fieldDef, arrayData, context, result);
    }
  }
}

/**
 * Evaluate visibility for array item fields
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
    const itemContext: EvaluationContext = {
      ...baseContext,
      item,
      itemIndex: i,
    };

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

/**
 * Check if a single field is visible
 *
 * Useful for checking visibility of one field without computing all.
 */
export function isFieldVisible(
  fieldPath: string,
  data: Record<string, unknown>,
  spec: Forma,
  options: VisibilityOptions = {}
): boolean {
  const fieldDef = spec.fields[fieldPath];
  if (!fieldDef) {
    return true;
  }

  if (!fieldDef.visibleWhen) {
    return true;
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

// ============================================================================
// Option Visibility - Batch Computation
// ============================================================================

/**
 * Compute visible options for ALL select/multiselect fields in a form.
 *
 * This is the primary API for option visibility - designed to be called once
 * and memoized (e.g., in a useMemo hook). Returns a map of field paths to
 * their visible options.
 *
 * Handles both top-level fields and array item fields. For array items,
 * paths include the index: "items[0].category", "items[1].category", etc.
 *
 * @param data - Current form data
 * @param spec - Form specification
 * @param options - Optional pre-calculated computed values
 * @returns Map of field paths to visible SelectOption arrays
 *
 * @example
 * // In a React component:
 * const optionsVisibility = useMemo(
 *   () => getOptionsVisibility(data, spec, { computed }),
 *   [data, spec, computed]
 * );
 *
 * // Access visible options for a field:
 * const departmentOptions = optionsVisibility["department"] ?? [];
 * const itemCategoryOptions = optionsVisibility["items[0].category"] ?? [];
 */
export function getOptionsVisibility(
  data: Record<string, unknown>,
  spec: Forma,
  options: VisibilityOptions = {}
): OptionsVisibilityResult {
  const computed = options.computed ?? calculate(data, spec);
  const result: Record<string, SelectOption[]> = {};

  const baseContext: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
  };

  for (const fieldPath of spec.fieldOrder) {
    const fieldDef = spec.fields[fieldPath];
    if (!fieldDef) continue;

    // Top-level fields with options
    if (fieldDef.options && fieldDef.options.length > 0) {
      result[fieldPath] = filterOptionsByContext(fieldDef.options, baseContext);
    }

    // Array item fields with options
    if (fieldDef.itemFields) {
      const arrayData = data[fieldPath];
      if (Array.isArray(arrayData)) {
        processArrayItemOptions(fieldPath, fieldDef, arrayData, baseContext, result);
      }
    }
  }

  return result;
}

// ============================================================================
// Option Visibility - Individual Computation (Utility)
// ============================================================================

/**
 * Filter select options for a single field.
 *
 * This is a utility function for ad-hoc option filtering. For form rendering,
 * prefer using `getOptionsVisibility()` which computes all options at once
 * and can be memoized.
 *
 * @param options - Select options to filter
 * @param data - Current form data
 * @param spec - Form specification (for referenceData)
 * @param context - Optional computed values and array item context
 * @returns Filtered array of visible options
 *
 * @example
 * // Ad-hoc filtering for a single field
 * const visibleOptions = getVisibleOptions(
 *   fieldDef.options,
 *   formData,
 *   spec,
 *   { computed, item: arrayItem, itemIndex: 0 }
 * );
 */
export function getVisibleOptions(
  options: SelectOption[] | undefined,
  data: Record<string, unknown>,
  spec: Forma,
  context: {
    computed?: Record<string, unknown>;
    item?: Record<string, unknown>;
    itemIndex?: number;
  } = {}
): SelectOption[] {
  if (!options || options.length === 0) return [];

  const computed = context.computed ?? calculate(data, spec);

  const evalContext: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
    item: context.item,
    itemIndex: context.itemIndex,
  };

  return filterOptionsByContext(options, evalContext);
}
