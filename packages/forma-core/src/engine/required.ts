/**
 * Required Engine
 *
 * Evaluates which fields are required based on static values or FEEL expressions.
 */

import type { Forma, FieldDefinition } from "../types.js";
import { evaluateBoolean, type EvaluationContext } from "../feel/index.js";

export interface RequiredOptions {
  /** Computed values to include in context */
  computed?: Record<string, unknown>;
  /** Reference data to include in context */
  ref?: Record<string, unknown>;
}

/**
 * Get required state for all fields in a Forma spec
 */
export function getRequired(
  data: Record<string, unknown>,
  spec: Forma,
  options: RequiredOptions = {}
): Record<string, boolean> {
  const required: Record<string, boolean> = {};
  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  for (const field of spec.fields) {
    required[field.id] = evaluateFieldRequired(field, context);
  }

  return required;
}

/**
 * Check if a specific field is required
 */
export function isRequired(
  fieldId: string,
  data: Record<string, unknown>,
  spec: Forma,
  options: RequiredOptions = {}
): boolean {
  const field = spec.fields.find((f) => f.id === fieldId);
  if (!field) return false;

  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  return evaluateFieldRequired(field, context);
}

/**
 * Evaluate required state for a single field
 */
function evaluateFieldRequired(
  field: FieldDefinition,
  context: EvaluationContext
): boolean {
  if (field.required === undefined) {
    return false;
  }

  if (typeof field.required === "boolean") {
    return field.required;
  }

  // It's a FEEL expression
  return evaluateBoolean(field.required, context);
}
