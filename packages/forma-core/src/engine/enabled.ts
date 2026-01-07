/**
 * Enabled Engine
 *
 * Evaluates which fields are enabled/disabled based on FEEL expressions.
 */

import type { Forma, FieldDefinition } from "../types.js";
import { evaluateBoolean, type EvaluationContext } from "../feel/index.js";

export interface EnabledOptions {
  /** Computed values to include in context */
  computed?: Record<string, unknown>;
  /** Reference data to include in context */
  ref?: Record<string, unknown>;
}

/**
 * Get enabled state for all fields in a Forma spec
 */
export function getEnabled(
  data: Record<string, unknown>,
  spec: Forma,
  options: EnabledOptions = {}
): Record<string, boolean> {
  const enabled: Record<string, boolean> = {};
  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  for (const field of spec.fields) {
    enabled[field.id] = evaluateFieldEnabled(field, context);
  }

  return enabled;
}

/**
 * Check if a specific field is enabled
 */
export function isEnabled(
  fieldId: string,
  data: Record<string, unknown>,
  spec: Forma,
  options: EnabledOptions = {}
): boolean {
  const field = spec.fields.find((f) => f.id === fieldId);
  if (!field) return true; // Default to enabled if field not found

  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  return evaluateFieldEnabled(field, context);
}

/**
 * Evaluate enabled state for a single field
 */
function evaluateFieldEnabled(
  field: FieldDefinition,
  context: EvaluationContext
): boolean {
  if (!field.enabled) {
    return true;
  }
  return evaluateBoolean(field.enabled, context);
}
