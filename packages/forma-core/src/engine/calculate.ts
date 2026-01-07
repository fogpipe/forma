/**
 * Calculation Engine
 *
 * Evaluates computed fields based on FEEL expressions.
 */

import type { Forma, ComputedField } from "../types.js";
import { evaluate, type EvaluationContext } from "../feel/index.js";

export interface CalculateOptions {
  /** Reference data to include in context */
  ref?: Record<string, unknown>;
}

export interface CalculationError {
  field: string;
  error: string;
}

export interface CalculationResult {
  values: Record<string, unknown>;
  errors: CalculationError[];
}

/**
 * Calculate all computed field values
 */
export function calculate(
  data: Record<string, unknown>,
  spec: Forma,
  options: CalculateOptions = {}
): Record<string, unknown> {
  if (!spec.computed || spec.computed.length === 0) {
    return {};
  }

  const computed: Record<string, unknown> = {};
  const context: EvaluationContext = {
    data,
    computed,
    ref: options.ref,
  };

  // Evaluate computed fields in order (allows dependencies)
  for (const field of spec.computed) {
    const result = evaluate<unknown>(field.expression, context);
    if (result.success) {
      computed[field.name] = formatValue(result.value, field.format);
    } else {
      computed[field.name] = null;
    }
    // Update context with new computed value for next iteration
    context.computed = computed;
  }

  return computed;
}

/**
 * Calculate computed field values with error reporting
 */
export function calculateWithErrors(
  data: Record<string, unknown>,
  spec: Forma,
  options: CalculateOptions = {}
): CalculationResult {
  if (!spec.computed || spec.computed.length === 0) {
    return { values: {}, errors: [] };
  }

  const values: Record<string, unknown> = {};
  const errors: CalculationError[] = [];
  const context: EvaluationContext = {
    data,
    computed: values,
    ref: options.ref,
  };

  for (const field of spec.computed) {
    const result = evaluate<unknown>(field.expression, context);
    if (result.success) {
      values[field.name] = formatValue(result.value, field.format);
    } else {
      values[field.name] = null;
      errors.push({ field: field.name, error: result.error });
    }
    context.computed = values;
  }

  return { values, errors };
}

/**
 * Calculate a single computed field
 */
export function calculateField(
  fieldName: string,
  data: Record<string, unknown>,
  spec: Forma,
  existingComputed: Record<string, unknown> = {},
  options: CalculateOptions = {}
): unknown {
  const field = spec.computed?.find((f) => f.name === fieldName);
  if (!field) return null;

  const context: EvaluationContext = {
    data,
    computed: existingComputed,
    ref: options.ref,
  };

  const result = evaluate<unknown>(field.expression, context);
  if (result.success) {
    return formatValue(result.value, field.format);
  }
  return null;
}

/**
 * Format a computed value according to the field's format specification
 */
export function formatValue(value: unknown, format?: string): unknown {
  if (value == null || !format) {
    return value;
  }

  if (typeof value === "number") {
    if (format === "currency") {
      return value.toFixed(2);
    }
    if (format === "percent") {
      return (value * 100).toFixed(0) + "%";
    }
    if (format.startsWith("decimal:")) {
      const decimals = parseInt(format.split(":")[1], 10);
      return value.toFixed(decimals);
    }
  }

  return value;
}
