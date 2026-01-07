/**
 * Visibility Engine
 *
 * Evaluates which fields should be visible based on FEEL expressions.
 */

import type { Forma, FieldDefinition } from "../types.js";
import { evaluateBoolean, type EvaluationContext } from "../feel/index.js";

export interface VisibilityOptions {
  /** Computed values to include in context */
  computed?: Record<string, unknown>;
  /** Reference data to include in context */
  ref?: Record<string, unknown>;
}

/**
 * Get visibility state for all fields in a Forma spec
 */
export function getVisibility(
  data: Record<string, unknown>,
  spec: Forma,
  options: VisibilityOptions = {}
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};
  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  for (const field of spec.fields) {
    visibility[field.id] = evaluateFieldVisibility(field, context);
  }

  return visibility;
}

/**
 * Check if a specific field is visible
 */
export function isFieldVisible(
  fieldId: string,
  data: Record<string, unknown>,
  spec: Forma,
  options: VisibilityOptions = {}
): boolean {
  const field = spec.fields.find((f) => f.id === fieldId);
  if (!field) return false;

  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  return evaluateFieldVisibility(field, context);
}

/**
 * Get visibility state for all pages in a multi-page form
 */
export function getPageVisibility(
  data: Record<string, unknown>,
  spec: Forma,
  options: VisibilityOptions = {}
): Record<string, boolean> {
  if (!spec.pages) return {};

  const visibility: Record<string, boolean> = {};
  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  for (const page of spec.pages) {
    if (page.visible) {
      visibility[page.id] = evaluateBoolean(page.visible, context);
    } else {
      visibility[page.id] = true;
    }
  }

  return visibility;
}

/**
 * Evaluate visibility for a single field
 */
function evaluateFieldVisibility(
  field: FieldDefinition,
  context: EvaluationContext
): boolean {
  if (!field.visible) {
    return true;
  }
  return evaluateBoolean(field.visible, context);
}
