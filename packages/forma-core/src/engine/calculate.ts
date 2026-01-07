/**
 * Calculation Engine
 *
 * Evaluates computed fields based on form data.
 * Computed values are derived from form data using FEEL expressions.
 */

import { evaluate } from "../feel/index.js";
import type {
  Forma,
  ComputedField,
  EvaluationContext,
  CalculationResult,
  CalculationError,
} from "../types.js";

// ============================================================================
// Main Function
// ============================================================================

/**
 * Calculate all computed values from form data
 *
 * Evaluates each computed field's FEEL expression and returns the results.
 * Errors are collected rather than thrown, allowing partial results.
 *
 * @param data - Current form data
 * @param spec - Form specification with computed fields
 * @returns Computed values and any calculation errors
 *
 * @example
 * const spec = {
 *   computed: {
 *     bmi: {
 *       expression: "weight / (height / 100) ** 2",
 *       label: "BMI",
 *       format: "decimal(1)"
 *     },
 *     isObese: {
 *       expression: "$computed.bmi >= 30"
 *     }
 *   }
 * };
 *
 * const result = calculate({ weight: 85, height: 175 }, spec);
 * // => { values: { bmi: 27.76, isObese: false }, errors: [] }
 */
export function calculate(
  data: Record<string, unknown>,
  spec: Forma
): Record<string, unknown> {
  const result = calculateWithErrors(data, spec);
  return result.values;
}

/**
 * Calculate computed values with error reporting
 *
 * Same as calculate() but also returns any errors that occurred.
 *
 * @param data - Current form data
 * @param spec - Form specification
 * @returns Values and errors
 */
export function calculateWithErrors(
  data: Record<string, unknown>,
  spec: Forma
): CalculationResult {
  if (!spec.computed) {
    return { values: {}, errors: [] };
  }

  const values: Record<string, unknown> = {};
  const errors: CalculationError[] = [];

  // Get computation order (handles dependencies)
  const orderedFields = getComputationOrder(spec.computed);

  // Evaluate each computed field in dependency order
  for (const fieldName of orderedFields) {
    const fieldDef = spec.computed[fieldName];
    if (!fieldDef) continue;

    const result = evaluateComputedField(
      fieldName,
      fieldDef,
      data,
      values, // Pass already-computed values for dependencies
      spec.referenceData // Pass reference data for lookups
    );

    if (result.success) {
      values[fieldName] = result.value;
    } else {
      errors.push({
        field: fieldName,
        message: result.error,
        expression: fieldDef.expression,
      });
      // Set to null so dependent fields can still evaluate
      values[fieldName] = null;
    }
  }

  return { values, errors };
}

// ============================================================================
// Field Evaluation
// ============================================================================

interface ComputeSuccess {
  success: true;
  value: unknown;
}

interface ComputeFailure {
  success: false;
  error: string;
}

type ComputeResult = ComputeSuccess | ComputeFailure;

/**
 * Evaluate a single computed field
 */
function evaluateComputedField(
  _name: string,
  fieldDef: ComputedField,
  data: Record<string, unknown>,
  computedSoFar: Record<string, unknown>,
  referenceData?: Record<string, unknown>
): ComputeResult {
  // Check if any referenced computed field is null - propagate null to dependents
  // This prevents issues like: bmi is null, but bmiCategory still evaluates to "obese"
  // because `null < 18.5` is false in comparisons
  const referencedComputed = findComputedReferences(fieldDef.expression);
  for (const ref of referencedComputed) {
    if (computedSoFar[ref] === null) {
      return {
        success: true,
        value: null,
      };
    }
  }

  const context: EvaluationContext = {
    data,
    computed: computedSoFar,
    referenceData,
  };

  const result = evaluate(fieldDef.expression, context);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  // Treat NaN and Infinity as null - prevents unexpected behavior in conditional expressions
  // (e.g., NaN < 18.5 is false, causing fallthrough in if-else chains)
  if (typeof result.value === "number" && (!Number.isFinite(result.value))) {
    return {
      success: true,
      value: null,
    };
  }

  return {
    success: true,
    value: result.value,
  };
}

/**
 * Find computed field references in an expression (e.g., computed.bmi)
 */
function findComputedReferences(expression: string): string[] {
  const refs: string[] = [];
  const regex = /computed\.(\w+)/g;
  let match;
  while ((match = regex.exec(expression)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

// ============================================================================
// Dependency Resolution
// ============================================================================

/**
 * Determine the order to evaluate computed fields based on dependencies
 *
 * Computed fields can reference other computed fields via $computed.name.
 * This function performs topological sort to ensure dependencies are
 * evaluated first.
 */
function getComputationOrder(
  computed: Record<string, ComputedField>
): string[] {
  const fieldNames = Object.keys(computed);

  // Build dependency graph
  const deps = new Map<string, Set<string>>();
  for (const name of fieldNames) {
    deps.set(name, findComputedDependencies(computed[name].expression, fieldNames));
  }

  // Topological sort
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      // Circular dependency - just add it and let evaluation fail gracefully
      console.warn(`Circular dependency detected in computed field: ${name}`);
      sorted.push(name);
      visited.add(name);
      return;
    }

    visiting.add(name);

    const fieldDeps = deps.get(name) ?? new Set();
    for (const dep of fieldDeps) {
      visit(dep);
    }

    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }

  for (const name of fieldNames) {
    visit(name);
  }

  return sorted;
}

/**
 * Find which computed fields are referenced in an expression
 */
function findComputedDependencies(
  expression: string,
  availableFields: string[]
): Set<string> {
  const deps = new Set<string>();

  // Look for computed.fieldName patterns (without $ prefix)
  const regex = /computed\.(\w+)/g;
  let match;
  while ((match = regex.exec(expression)) !== null) {
    const fieldName = match[1];
    if (availableFields.includes(fieldName)) {
      deps.add(fieldName);
    }
  }

  return deps;
}

// ============================================================================
// Formatted Output
// ============================================================================

/**
 * Get a computed value formatted according to its format specification
 *
 * @param fieldName - Name of the computed field
 * @param data - Current form data
 * @param spec - Form specification
 * @returns Formatted string or null if not displayable
 */
export function getFormattedValue(
  fieldName: string,
  data: Record<string, unknown>,
  spec: Forma
): string | null {
  if (!spec.computed?.[fieldName]) {
    return null;
  }

  const fieldDef = spec.computed[fieldName];
  const computed = calculate(data, spec);
  const value = computed[fieldName];

  if (value === null || value === undefined) {
    return null;
  }

  return formatValue(value, fieldDef.format);
}

/**
 * Format a value according to a format specification
 *
 * Supported formats:
 * - decimal(n) - Number with n decimal places
 * - currency - Number formatted as currency
 * - percent - Number formatted as percentage
 * - (none) - Default string conversion
 */
function formatValue(value: unknown, format?: string): string {
  if (!format) {
    return String(value);
  }

  // Handle decimal(n) format
  const decimalMatch = format.match(/^decimal\((\d+)\)$/);
  if (decimalMatch) {
    const decimals = parseInt(decimalMatch[1], 10);
    return typeof value === "number" ? value.toFixed(decimals) : String(value);
  }

  // Handle currency format
  if (format === "currency") {
    return typeof value === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value)
      : String(value);
  }

  // Handle percent format
  if (format === "percent") {
    return typeof value === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "percent",
          minimumFractionDigits: 1,
        }).format(value)
      : String(value);
  }

  return String(value);
}

// ============================================================================
// Single Field Calculation
// ============================================================================

/**
 * Calculate a single computed field
 *
 * @param fieldName - Name of the computed field
 * @param data - Current form data
 * @param spec - Form specification
 * @returns Computed value or null if calculation failed
 */
export function calculateField(
  fieldName: string,
  data: Record<string, unknown>,
  spec: Forma
): unknown {
  const computed = calculate(data, spec);
  return computed[fieldName] ?? null;
}
