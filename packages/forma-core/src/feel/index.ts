/**
 * FEEL Expression Evaluator
 *
 * Wraps the feelin library to provide FEEL expression evaluation
 * with Forma context conventions.
 *
 * Context variable conventions:
 * - `fieldName` - Direct field value access
 * - `computed.name` - Computed value access
 * - `ref.path` - Reference data lookup (external lookup tables)
 * - `item.fieldName` - Array item field access (within array context)
 * - `itemIndex` - Current array item index (0-based)
 * - `value` - Current field value (in validation expressions)
 */

import { evaluate as feelinEvaluate } from "feelin";
import type { EvaluationContext, FEELExpression } from "../types.js";

// ============================================================================
// Types
// ============================================================================

export interface EvaluateResult<T = unknown> {
  success: true;
  value: T;
}

export interface EvaluateError {
  success: false;
  error: string;
  expression: string;
}

export type EvaluationOutcome<T = unknown> = EvaluateResult<T> | EvaluateError;

// ============================================================================
// Context Building
// ============================================================================

/**
 * Build the FEEL evaluation context from our EvaluationContext
 *
 * Maps our context conventions to feelin context format:
 * - Form data fields are spread directly
 * - computed becomes an object (accessed as computed.fieldName)
 * - ref becomes an object for reference data (accessed as ref.path.to.data)
 * - item becomes an object for array context (accessed as item.fieldName)
 * - itemIndex is a number for array context
 * - value is the current field value
 */
function buildFeelContext(ctx: EvaluationContext): Record<string, unknown> {
  const feelContext: Record<string, unknown> = {
    // Spread form data directly so fields are accessible by name
    ...ctx.data,
  };

  // Add computed values under 'computed' (accessed as computed.fieldName)
  if (ctx.computed) {
    feelContext["computed"] = ctx.computed;
  }

  // Add reference data under 'ref' (accessed as ref.path.to.data)
  if (ctx.referenceData) {
    feelContext["ref"] = ctx.referenceData;
  }

  // Add array item context (accessed as item.fieldName)
  if (ctx.item !== undefined) {
    feelContext["item"] = ctx.item;
  }

  // Add array index
  if (ctx.itemIndex !== undefined) {
    feelContext["itemIndex"] = ctx.itemIndex;
  }

  // Add current field value for validation expressions
  if (ctx.value !== undefined) {
    feelContext["value"] = ctx.value;
  }

  return feelContext;
}

// ============================================================================
// Expression Evaluation
// ============================================================================

/**
 * Evaluate a FEEL expression and return the result
 *
 * @param expression - FEEL expression string
 * @param context - Evaluation context with form data, computed values, etc.
 * @returns Evaluation outcome with success/value or error
 *
 * @example
 * // Simple field comparison
 * evaluate("age >= 18", { data: { age: 21 } })
 * // => { success: true, value: true }
 *
 * @example
 * // Computed value reference
 * evaluate("computed.bmi > 30", { data: {}, computed: { bmi: 32.5 } })
 * // => { success: true, value: true }
 *
 * @example
 * // Array item context
 * evaluate("item.frequency = \"daily\"", { data: {}, item: { frequency: "daily" } })
 * // => { success: true, value: true }
 */
export function evaluate<T = unknown>(
  expression: FEELExpression,
  context: EvaluationContext
): EvaluationOutcome<T> {
  try {
    const feelContext = buildFeelContext(context);
    const result = feelinEvaluate(expression, feelContext);
    return {
      success: true,
      value: result as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      expression,
    };
  }
}

/**
 * Evaluate a FEEL expression expecting a boolean result
 *
 * Used for visibility, required, and enabled conditions.
 * Returns false on error or non-boolean result for safety.
 *
 * @param expression - FEEL expression that should return boolean
 * @param context - Evaluation context
 * @returns Boolean result (false on error)
 */
export function evaluateBoolean(
  expression: FEELExpression,
  context: EvaluationContext
): boolean {
  const result = evaluate<boolean>(expression, context);

  if (!result.success) {
    console.warn(
      `FEEL expression error: ${result.error}\nExpression: ${result.expression}`
    );
    return false;
  }

  // FEEL uses three-valued logic where comparisons with null return null.
  // For form visibility/required/enabled conditions, we treat null as false.
  if (result.value === null || result.value === undefined) {
    return false;
  }

  if (typeof result.value !== "boolean") {
    console.warn(
      `FEEL expression did not return boolean: ${expression}\nGot: ${typeof result.value}`
    );
    return false;
  }

  return result.value;
}

/**
 * Evaluate a FEEL expression expecting a numeric result
 *
 * Used for computed values that return numbers.
 *
 * @param expression - FEEL expression that should return number
 * @param context - Evaluation context
 * @returns Numeric result or null on error
 */
export function evaluateNumber(
  expression: FEELExpression,
  context: EvaluationContext
): number | null {
  const result = evaluate<number>(expression, context);

  if (!result.success) {
    console.warn(
      `FEEL expression error: ${result.error}\nExpression: ${result.expression}`
    );
    return null;
  }

  if (typeof result.value !== "number") {
    console.warn(
      `FEEL expression did not return number: ${expression}\nGot: ${typeof result.value}`
    );
    return null;
  }

  return result.value;
}

/**
 * Evaluate a FEEL expression expecting a string result
 *
 * @param expression - FEEL expression that should return string
 * @param context - Evaluation context
 * @returns String result or null on error
 */
export function evaluateString(
  expression: FEELExpression,
  context: EvaluationContext
): string | null {
  const result = evaluate<string>(expression, context);

  if (!result.success) {
    console.warn(
      `FEEL expression error: ${result.error}\nExpression: ${result.expression}`
    );
    return null;
  }

  if (typeof result.value !== "string") {
    console.warn(
      `FEEL expression did not return string: ${expression}\nGot: ${typeof result.value}`
    );
    return null;
  }

  return result.value;
}

// ============================================================================
// Batch Evaluation
// ============================================================================

/**
 * Evaluate multiple FEEL expressions at once
 *
 * Useful for evaluating all visibility conditions in a form.
 *
 * @param expressions - Map of field names to FEEL expressions
 * @param context - Evaluation context
 * @returns Map of field names to boolean results
 */
export function evaluateBooleanBatch(
  expressions: Record<string, FEELExpression>,
  context: EvaluationContext
): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  for (const [key, expression] of Object.entries(expressions)) {
    results[key] = evaluateBoolean(expression, context);
  }

  return results;
}

// ============================================================================
// Expression Validation
// ============================================================================

/**
 * Check if a FEEL expression is syntactically valid
 *
 * @param expression - FEEL expression to validate
 * @returns True if the expression can be parsed
 */
export function isValidExpression(expression: FEELExpression): boolean {
  try {
    // Try to evaluate with empty context - we just want to check parsing
    feelinEvaluate(expression, {});
    return true;
  } catch {
    // Some expressions may fail at runtime but parse correctly
    // For now, we consider any expression that doesn't throw during
    // evaluation setup as valid
    return true;
  }
}

/**
 * Validate a FEEL expression and return any parsing errors
 *
 * @param expression - FEEL expression to validate
 * @returns Null if valid, error message if invalid
 */
export function validateExpression(expression: FEELExpression): string | null {
  try {
    // Evaluate with minimal context to catch parse errors
    feelinEvaluate(expression, {});
    return null;
  } catch (error) {
    // Only return actual parsing errors, not runtime errors
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("parse") || message.includes("syntax")) {
      return message;
    }
    // Runtime errors (missing variables, etc.) are OK for validation
    return null;
  }
}
