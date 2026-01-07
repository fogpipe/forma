/**
 * FEEL Expression Evaluation
 *
 * This module provides functions for evaluating FEEL (Friendly Enough Expression Language)
 * expressions in the context of form data.
 */

import { evaluate as feelinEvaluate } from "feelin";

/**
 * Context for FEEL expression evaluation
 */
export interface EvaluationContext {
  /** Form field values */
  data: Record<string, unknown>;
  /** Computed field values */
  computed?: Record<string, unknown>;
  /** Reference data (external context) */
  ref?: Record<string, unknown>;
  /** Current array item (when evaluating within an array) */
  item?: Record<string, unknown>;
  /** Current array index */
  itemIndex?: number;
  /** Current field value (for validation expressions) */
  value?: unknown;
}

/**
 * Result of a successful evaluation
 */
export interface EvaluationSuccess<T> {
  success: true;
  value: T;
}

/**
 * Result of a failed evaluation
 */
export interface EvaluationFailure {
  success: false;
  error: string;
}

/**
 * Outcome of a FEEL expression evaluation
 */
export type EvaluationOutcome<T> = EvaluationSuccess<T> | EvaluationFailure;

/**
 * Build a FEEL context from the evaluation context
 */
function buildFeelContext(ctx: EvaluationContext): Record<string, unknown> {
  const context: Record<string, unknown> = { ...ctx.data };

  if (ctx.computed) {
    context.computed = ctx.computed;
  }

  if (ctx.ref) {
    context.ref = ctx.ref;
  }

  if (ctx.item) {
    context.item = ctx.item;
  }

  if (ctx.itemIndex !== undefined) {
    context.itemIndex = ctx.itemIndex;
  }

  if (ctx.value !== undefined) {
    context.value = ctx.value;
  }

  return context;
}

/**
 * Evaluate a FEEL expression
 */
export function evaluate<T>(
  expression: string,
  context: EvaluationContext
): EvaluationOutcome<T> {
  try {
    const feelContext = buildFeelContext(context);
    const result = feelinEvaluate(expression, feelContext) as T;
    return { success: true, value: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Evaluate a FEEL expression expected to return a boolean
 */
export function evaluateBoolean(
  expression: string,
  context: EvaluationContext
): boolean {
  const result = evaluate<unknown>(expression, context);
  if (!result.success) {
    return false;
  }
  return Boolean(result.value);
}

/**
 * Evaluate a FEEL expression expected to return a number
 */
export function evaluateNumber(
  expression: string,
  context: EvaluationContext
): number | null {
  const result = evaluate<unknown>(expression, context);
  if (!result.success) {
    return null;
  }
  const num = Number(result.value);
  return isNaN(num) ? null : num;
}

/**
 * Evaluate a FEEL expression expected to return a string
 */
export function evaluateString(
  expression: string,
  context: EvaluationContext
): string | null {
  const result = evaluate<unknown>(expression, context);
  if (!result.success) {
    return null;
  }
  return result.value == null ? null : String(result.value);
}

/**
 * Check if a FEEL expression is syntactically valid
 */
export function isValidExpression(expression: string): boolean {
  try {
    feelinEvaluate(expression, {});
    return true;
  } catch {
    return false;
  }
}

/**
 * Batch evaluate multiple boolean expressions
 */
export function evaluateBooleanBatch(
  expressions: Record<string, string>,
  context: EvaluationContext
): Record<string, boolean> {
  const results: Record<string, boolean> = {};
  for (const [key, expr] of Object.entries(expressions)) {
    results[key] = evaluateBoolean(expr, context);
  }
  return results;
}
