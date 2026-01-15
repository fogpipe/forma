/**
 * Validation Engine
 *
 * Validates form data against Forma rules including:
 * - JSON Schema type validation
 * - Required field validation (with conditional requiredWhen)
 * - Custom FEEL validation rules
 * - Array item validation
 */

import { evaluateBoolean } from "../feel/index.js";
import type {
  Forma,
  FieldDefinition,
  ValidationRule,
  EvaluationContext,
  ValidationResult,
  FieldError,
  JSONSchemaProperty,
} from "../types.js";
import { calculate } from "./calculate.js";
import { getVisibility } from "./visibility.js";
import { isFieldRequired } from "./required.js";

// ============================================================================
// Types
// ============================================================================

export interface ValidateOptions {
  /** Pre-calculated computed values */
  computed?: Record<string, unknown>;
  /** Pre-calculated visibility */
  visibility?: Record<string, boolean>;
  /** Only validate visible fields (default: true) */
  onlyVisible?: boolean;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Validate form data against a Forma
 *
 * Performs comprehensive validation including:
 * - Required field checks (respecting conditional requiredWhen)
 * - JSON Schema type validation
 * - Custom FEEL validation rules
 * - Array min/max items validation
 * - Array item field validation
 *
 * By default, only visible fields are validated.
 *
 * @param data - Current form data
 * @param spec - Form specification
 * @param options - Validation options
 * @returns Validation result with valid flag and errors array
 *
 * @example
 * const result = validate(
 *   { name: "", age: 15 },
 *   forma
 * );
 * // => {
 * //   valid: false,
 * //   errors: [
 * //     { field: "name", message: "Name is required", severity: "error" },
 * //     { field: "age", message: "Must be 18 or older", severity: "error" }
 * //   ]
 * // }
 */
export function validate(
  data: Record<string, unknown>,
  spec: Forma,
  options: ValidateOptions = {}
): ValidationResult {
  const { onlyVisible = true } = options;

  // Calculate computed values
  const computed = options.computed ?? calculate(data, spec);

  // Calculate visibility
  const visibility = options.visibility ?? getVisibility(data, spec, { computed });

  // Collect errors
  const errors: FieldError[] = [];

  // Validate each field
  for (const fieldPath of spec.fieldOrder) {
    const fieldDef = spec.fields[fieldPath];
    if (!fieldDef) continue;

    // Skip hidden fields if onlyVisible is true
    if (onlyVisible && visibility[fieldPath] === false) {
      continue;
    }

    // Get schema property for type validation
    const schemaProperty = spec.schema.properties[fieldPath];

    // Validate this field
    const fieldErrors = validateField(
      fieldPath,
      data[fieldPath],
      fieldDef,
      schemaProperty,
      spec,
      data,
      computed,
      visibility,
      onlyVisible
    );

    errors.push(...fieldErrors);
  }

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
  };
}

// ============================================================================
// Field Validation
// ============================================================================

/**
 * Validate a single field and its nested fields
 */
function validateField(
  path: string,
  value: unknown,
  fieldDef: FieldDefinition,
  schemaProperty: JSONSchemaProperty | undefined,
  spec: Forma,
  data: Record<string, unknown>,
  computed: Record<string, unknown>,
  visibility: Record<string, boolean>,
  onlyVisible: boolean
): FieldError[] {
  const errors: FieldError[] = [];
  const context: EvaluationContext = {
    data,
    computed,
    referenceData: spec.referenceData,
    value,
  };

  // 1. Required validation
  const required = isFieldRequired(path, fieldDef, spec, context);
  if (required && isEmpty(value)) {
    errors.push({
      field: path,
      message: fieldDef.label
        ? `${fieldDef.label} is required`
        : "This field is required",
      severity: "error",
    });
  }

  // 2. Type validation (only if value is present)
  if (!isEmpty(value) && schemaProperty) {
    const typeError = validateType(path, value, schemaProperty, fieldDef);
    if (typeError) {
      errors.push(typeError);
    }
  }

  // 3. Custom FEEL validation rules
  if (fieldDef.validations && !isEmpty(value)) {
    const customErrors = validateCustomRules(path, fieldDef.validations, context);
    errors.push(...customErrors);
  }

  // 4. Array validation
  if (Array.isArray(value) && fieldDef.itemFields) {
    const arrayErrors = validateArray(
      path,
      value,
      fieldDef,
      spec,
      data,
      computed,
      visibility,
      onlyVisible
    );
    errors.push(...arrayErrors);
  }

  return errors;
}

/**
 * Check if a value is empty
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

// ============================================================================
// Type Validation
// ============================================================================

/**
 * Validate value against JSON Schema type
 */
function validateType(
  path: string,
  value: unknown,
  schema: JSONSchemaProperty,
  fieldDef: FieldDefinition
): FieldError | null {
  const label = fieldDef.label ?? path;

  switch (schema.type) {
    case "string": {
      if (typeof value !== "string") {
        return {
          field: path,
          message: `${label} must be a string`,
          severity: "error",
        };
      }

      // String-specific validations
      if ("minLength" in schema && schema.minLength !== undefined) {
        if (value.length < schema.minLength) {
          return {
            field: path,
            message: `${label} must be at least ${schema.minLength} characters`,
            severity: "error",
          };
        }
      }

      if ("maxLength" in schema && schema.maxLength !== undefined) {
        if (value.length > schema.maxLength) {
          return {
            field: path,
            message: `${label} must be no more than ${schema.maxLength} characters`,
            severity: "error",
          };
        }
      }

      if ("pattern" in schema && schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          return {
            field: path,
            message: `${label} format is invalid`,
            severity: "error",
          };
        }
      }

      if ("enum" in schema && schema.enum) {
        if (!schema.enum.includes(value)) {
          return {
            field: path,
            message: `${label} must be one of: ${schema.enum.join(", ")}`,
            severity: "error",
          };
        }
      }

      if ("format" in schema && schema.format) {
        const formatError = validateFormat(path, value, schema.format, label);
        if (formatError) return formatError;
      }

      return null;
    }

    case "number":
    case "integer": {
      if (typeof value !== "number") {
        return {
          field: path,
          message: `${label} must be a number`,
          severity: "error",
        };
      }

      if (schema.type === "integer" && !Number.isInteger(value)) {
        return {
          field: path,
          message: `${label} must be a whole number`,
          severity: "error",
        };
      }

      if ("minimum" in schema && schema.minimum !== undefined) {
        if (value < schema.minimum) {
          return {
            field: path,
            message: `${label} must be at least ${schema.minimum}`,
            severity: "error",
          };
        }
      }

      if ("maximum" in schema && schema.maximum !== undefined) {
        if (value > schema.maximum) {
          return {
            field: path,
            message: `${label} must be no more than ${schema.maximum}`,
            severity: "error",
          };
        }
      }

      if ("exclusiveMinimum" in schema && schema.exclusiveMinimum !== undefined) {
        if (value <= schema.exclusiveMinimum) {
          return {
            field: path,
            message: `${label} must be greater than ${schema.exclusiveMinimum}`,
            severity: "error",
          };
        }
      }

      if ("exclusiveMaximum" in schema && schema.exclusiveMaximum !== undefined) {
        if (value >= schema.exclusiveMaximum) {
          return {
            field: path,
            message: `${label} must be less than ${schema.exclusiveMaximum}`,
            severity: "error",
          };
        }
      }

      if ("multipleOf" in schema && schema.multipleOf !== undefined) {
        const multipleOf = schema.multipleOf;
        // Use epsilon comparison to handle floating point precision issues
        const remainder = Math.abs(value % multipleOf);
        const isValid = remainder < 1e-10 || Math.abs(remainder - multipleOf) < 1e-10;
        if (!isValid) {
          return {
            field: path,
            message: `${label} must be a multiple of ${multipleOf}`,
            severity: "error",
          };
        }
      }

      return null;
    }

    case "boolean": {
      if (typeof value !== "boolean") {
        return {
          field: path,
          message: `${label} must be true or false`,
          severity: "error",
        };
      }
      return null;
    }

    case "array": {
      if (!Array.isArray(value)) {
        return {
          field: path,
          message: `${label} must be a list`,
          severity: "error",
        };
      }
      return null;
    }

    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return {
          field: path,
          message: `${label} must be an object`,
          severity: "error",
        };
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Validate string format
 */
function validateFormat(
  path: string,
  value: string,
  format: string,
  label: string
): FieldError | null {
  switch (format) {
    case "email": {
      // Simple email regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return {
          field: path,
          message: `${label} must be a valid email address`,
          severity: "error",
        };
      }
      return null;
    }

    case "date": {
      // ISO date format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        return {
          field: path,
          message: `${label} must be a valid date`,
          severity: "error",
        };
      }
      // Verify the date is actually valid (e.g., not Feb 30)
      const parsed = new Date(value + "T00:00:00Z");
      if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        return {
          field: path,
          message: `${label} must be a valid date`,
          severity: "error",
        };
      }
      return null;
    }

    case "date-time": {
      if (isNaN(Date.parse(value))) {
        return {
          field: path,
          message: `${label} must be a valid date and time`,
          severity: "error",
        };
      }
      return null;
    }

    case "uri": {
      try {
        new URL(value);
        return null;
      } catch {
        return {
          field: path,
          message: `${label} must be a valid URL`,
          severity: "error",
        };
      }
    }

    case "uuid": {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        return {
          field: path,
          message: `${label} must be a valid UUID`,
          severity: "error",
        };
      }
      return null;
    }

    default:
      return null;
  }
}

// ============================================================================
// Custom Rule Validation
// ============================================================================

/**
 * Validate custom FEEL validation rules
 */
function validateCustomRules(
  path: string,
  rules: ValidationRule[],
  context: EvaluationContext
): FieldError[] {
  const errors: FieldError[] = [];

  for (const rule of rules) {
    const isValid = evaluateBoolean(rule.rule, context);

    if (!isValid) {
      errors.push({
        field: path,
        message: rule.message,
        severity: rule.severity ?? "error",
      });
    }
  }

  return errors;
}

// ============================================================================
// Array Validation
// ============================================================================

/**
 * Validate array field including items
 */
function validateArray(
  path: string,
  value: unknown[],
  fieldDef: FieldDefinition,
  spec: Forma,
  data: Record<string, unknown>,
  computed: Record<string, unknown>,
  visibility: Record<string, boolean>,
  onlyVisible: boolean
): FieldError[] {
  const errors: FieldError[] = [];
  const label = fieldDef.label ?? path;

  // Check min/max items
  if (fieldDef.minItems !== undefined && value.length < fieldDef.minItems) {
    errors.push({
      field: path,
      message: `${label} must have at least ${fieldDef.minItems} items`,
      severity: "error",
    });
  }

  if (fieldDef.maxItems !== undefined && value.length > fieldDef.maxItems) {
    errors.push({
      field: path,
      message: `${label} must have no more than ${fieldDef.maxItems} items`,
      severity: "error",
    });
  }

  // Validate each item's fields
  if (fieldDef.itemFields) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i] as Record<string, unknown>;
      const itemErrors = validateArrayItem(
        path,
        i,
        item,
        fieldDef.itemFields,
        spec,
        data,
        computed,
        visibility,
        onlyVisible
      );
      errors.push(...itemErrors);
    }
  }

  return errors;
}

/**
 * Validate fields within a single array item
 */
function validateArrayItem(
  arrayPath: string,
  index: number,
  item: Record<string, unknown>,
  itemFields: Record<string, FieldDefinition>,
  spec: Forma,
  data: Record<string, unknown>,
  computed: Record<string, unknown>,
  visibility: Record<string, boolean>,
  onlyVisible: boolean
): FieldError[] {
  const errors: FieldError[] = [];

  for (const [fieldName, fieldDef] of Object.entries(itemFields)) {
    const itemFieldPath = `${arrayPath}[${index}].${fieldName}`;

    // Skip hidden fields
    if (onlyVisible && visibility[itemFieldPath] === false) {
      continue;
    }

    const value = item[fieldName];
    const context: EvaluationContext = {
      data,
      computed,
      referenceData: spec.referenceData,
      item,
      itemIndex: index,
      value,
    };

    // Required check
    const isRequired = fieldDef.requiredWhen
      ? evaluateBoolean(fieldDef.requiredWhen, context)
      : false;

    if (isRequired && isEmpty(value)) {
      errors.push({
        field: itemFieldPath,
        message: fieldDef.label
          ? `${fieldDef.label} is required`
          : "This field is required",
        severity: "error",
      });
    }

    // Custom validations
    if (fieldDef.validations && !isEmpty(value)) {
      const customErrors = validateCustomRules(itemFieldPath, fieldDef.validations, context);
      errors.push(...customErrors);
    }
  }

  return errors;
}

// ============================================================================
// Single Field Validation
// ============================================================================

/**
 * Validate a single field
 *
 * @param fieldPath - Path to the field
 * @param data - Current form data
 * @param spec - Form specification
 * @returns Array of errors for this field
 */
export function validateSingleField(
  fieldPath: string,
  data: Record<string, unknown>,
  spec: Forma
): FieldError[] {
  const fieldDef = spec.fields[fieldPath];
  if (!fieldDef) {
    return [];
  }

  const computed = calculate(data, spec);
  const visibility = getVisibility(data, spec, { computed });
  const schemaProperty = spec.schema.properties[fieldPath];

  return validateField(
    fieldPath,
    data[fieldPath],
    fieldDef,
    schemaProperty,
    spec,
    data,
    computed,
    visibility,
    true
  );
}
