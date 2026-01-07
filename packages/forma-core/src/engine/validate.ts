/**
 * Validation Engine
 *
 * Validates form data against Forma field definitions.
 */

import type { Forma, FieldDefinition, FieldError, ValidationResult } from "../types.js";
import { evaluateBoolean, type EvaluationContext } from "../feel/index.js";
import { getVisibility } from "./visibility.js";
import { getRequired } from "./required.js";

export interface ValidateOptions {
  /** Computed values to include in context */
  computed?: Record<string, unknown>;
  /** Reference data to include in context */
  ref?: Record<string, unknown>;
  /** Only validate visible fields */
  onlyVisible?: boolean;
}

/**
 * Validate form data against a Forma specification
 */
export function validate(
  data: Record<string, unknown>,
  spec: Forma,
  options: ValidateOptions = {}
): ValidationResult {
  const errors: FieldError[] = [];
  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  // Get visibility and required state
  const visibility = options.onlyVisible
    ? getVisibility(data, spec, options)
    : null;
  const required = getRequired(data, spec, options);

  for (const field of spec.fields) {
    // Skip hidden fields if onlyVisible is true
    if (visibility && !visibility[field.id]) {
      continue;
    }

    const fieldErrors = validateField(field, data[field.id], context, required[field.id]);
    errors.push(...fieldErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single field
 */
export function validateSingleField(
  fieldId: string,
  value: unknown,
  data: Record<string, unknown>,
  spec: Forma,
  options: ValidateOptions = {}
): FieldError[] {
  const field = spec.fields.find((f) => f.id === fieldId);
  if (!field) return [];

  const context: EvaluationContext = {
    data,
    computed: options.computed,
    ref: options.ref,
  };

  const required = getRequired(data, spec, options);
  return validateField(field, value, context, required[fieldId]);
}

/**
 * Validate a single field value
 */
function validateField(
  field: FieldDefinition,
  value: unknown,
  context: EvaluationContext,
  isRequired: boolean
): FieldError[] {
  const errors: FieldError[] = [];

  // Required validation
  if (isRequired && isEmpty(value)) {
    errors.push({
      field: field.id,
      message: `${field.label} is required`,
      rule: "required",
    });
    return errors; // Don't continue validation if required field is empty
  }

  // Skip further validation if value is empty and not required
  if (isEmpty(value)) {
    return errors;
  }

  // Type-specific validation
  const typeErrors = validateType(field, value);
  errors.push(...typeErrors);

  // Custom validation rules (FEEL expressions)
  if (field.validation) {
    const validationContext: EvaluationContext = {
      ...context,
      value,
    };

    for (const rule of field.validation) {
      const isValid = evaluateBoolean(rule.rule, validationContext);
      if (!isValid) {
        errors.push({
          field: field.id,
          message: rule.message,
          rule: rule.rule,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate field value against its type
 */
function validateType(field: FieldDefinition, value: unknown): FieldError[] {
  const errors: FieldError[] = [];

  switch (field.type) {
    case "number":
    case "integer":
      if (typeof value !== "number" || isNaN(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be a valid number`,
          rule: "type",
        });
      } else {
        if (field.min !== undefined && value < field.min) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at least ${field.min}`,
            rule: "min",
          });
        }
        if (field.max !== undefined && value > field.max) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at most ${field.max}`,
            rule: "max",
          });
        }
        if (field.type === "integer" && !Number.isInteger(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} must be a whole number`,
            rule: "integer",
          });
        }
      }
      break;

    case "email":
      if (typeof value !== "string" || !isValidEmail(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be a valid email address`,
          rule: "email",
        });
      }
      break;

    case "url":
      if (typeof value !== "string" || !isValidUrl(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be a valid URL`,
          rule: "url",
        });
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be an array`,
          rule: "type",
        });
      } else {
        if (field.minItems !== undefined && value.length < field.minItems) {
          errors.push({
            field: field.id,
            message: `${field.label} must have at least ${field.minItems} items`,
            rule: "minItems",
          });
        }
        if (field.maxItems !== undefined && value.length > field.maxItems) {
          errors.push({
            field: field.id,
            message: `${field.label} must have at most ${field.maxItems} items`,
            rule: "maxItems",
          });
        }
      }
      break;
  }

  return errors;
}

/**
 * Check if a value is empty
 */
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Basic URL validation
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
