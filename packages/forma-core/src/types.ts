/**
 * Core Forma Type Definitions
 *
 * This module defines the complete type system for Forma specifications.
 * All conditional logic uses FEEL (Friendly Enough Expression Language).
 */

// ============================================================================
// FEEL Expression Type
// ============================================================================

/**
 * FEEL expression - a string that will be evaluated at runtime.
 *
 * Available context variables:
 * - `fieldName` - Any field value by name
 * - `computed.name` - Computed value by name
 * - `ref.path` - Reference data lookup (external lookup tables)
 * - `item.fieldName` - Field within current array item
 * - `itemIndex` - Current item index (0-based)
 * - `value` - Current field value (in validation expressions)
 *
 * @example
 * "age >= 18"
 * "claimType = \"Auto\" and wasDriver = true"
 * "computed.bmi > 30"
 * "item.frequency = \"daily\""
 */
export type FEELExpression = string;

// ============================================================================
// JSON Schema Types
// ============================================================================

/**
 * Standard JSON Schema (subset we support)
 */
export interface JSONSchema {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  $defs?: Record<string, JSONSchemaProperty>;
}

export type JSONSchemaProperty =
  | JSONSchemaString
  | JSONSchemaNumber
  | JSONSchemaInteger
  | JSONSchemaBoolean
  | JSONSchemaArray
  | JSONSchemaObject
  | JSONSchemaEnum;

export interface JSONSchemaBase {
  description?: string;
  title?: string;
}

export interface JSONSchemaString extends JSONSchemaBase {
  type: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "date" | "date-time" | "email" | "uri" | "uuid";
  enum?: string[];
}

export interface JSONSchemaNumber extends JSONSchemaBase {
  type: "number";
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
}

export interface JSONSchemaInteger extends JSONSchemaBase {
  type: "integer";
  minimum?: number;
  maximum?: number;
}

export interface JSONSchemaBoolean extends JSONSchemaBase {
  type: "boolean";
}

export interface JSONSchemaArray extends JSONSchemaBase {
  type: "array";
  items: JSONSchemaProperty;
  minItems?: number;
  maxItems?: number;
}

export interface JSONSchemaObject extends JSONSchemaBase {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchemaEnum extends JSONSchemaBase {
  type: "string";
  enum: string[];
}

// ============================================================================
// Field Types
// ============================================================================

/**
 * Field type enumeration - maps to UI component types
 */
export type FieldType =
  | "text"
  | "password"
  | "number"
  | "integer"
  | "boolean"
  | "select"
  | "multiselect"
  | "date"
  | "datetime"
  | "email"
  | "url"
  | "textarea"
  | "array"
  | "object"
  | "computed";

/**
 * Validation rule with FEEL expression
 */
export interface ValidationRule {
  /** FEEL expression that should evaluate to true for valid data */
  rule: FEELExpression;
  /** Error message shown when validation fails */
  message: string;
  /** Severity level - errors block submission, warnings are informational */
  severity?: "error" | "warning";
}

/**
 * Option for select/multiselect fields
 */
export interface SelectOption {
  /** Option value - can be string or number to match schema types */
  value: string | number;
  label: string;
  /** When to show this option */
  visibleWhen?: FEELExpression;
}

/**
 * Field definition with all conditional logic
 */
export interface FieldDefinition {
  /** Display label for the field */
  label?: string;
  /** Help text or description */
  description?: string;
  /** Placeholder text for input fields */
  placeholder?: string;
  /** Field type override (inferred from schema if not provided) */
  type?: FieldType;

  // Conditional logic (all FEEL expressions)

  /** When to show this field. If omitted, always visible. */
  visibleWhen?: FEELExpression;
  /** When this field is required. If omitted, uses schema required. */
  requiredWhen?: FEELExpression;
  /** When this field is editable. If omitted, always enabled. */
  enabledWhen?: FEELExpression;

  // Validation rules (in addition to JSON Schema validation)

  /** Custom validation rules using FEEL expressions */
  validations?: ValidationRule[];

  // Array-specific properties

  /** For array fields: field definitions for each item. Requires type: "array" */
  itemFields?: Record<string, FieldDefinition>;
  /** Minimum number of items (overrides schema) */
  minItems?: number;
  /** Maximum number of items (overrides schema) */
  maxItems?: number;

  // Select field options

  /** For select fields: available options */
  options?: SelectOption[];
}

/**
 * Computed field definition - derived values from form data
 */
export interface ComputedField {
  /** FEEL expression to calculate the value */
  expression: FEELExpression;
  /** Display label */
  label?: string;
  /** Display format (e.g., "decimal(1)", "currency", "percent") */
  format?: string;
  /** Whether to display this value in the form */
  display?: boolean;
}

/**
 * Page definition for multi-step wizard forms
 */
export interface PageDefinition {
  /** Unique page identifier */
  id: string;
  /** Page title */
  title: string;
  /** Page description/instructions */
  description?: string;
  /** When to show this page */
  visibleWhen?: FEELExpression;
  /** Field paths to include on this page */
  fields: string[];
}

/**
 * Form metadata
 */
export interface FormMeta {
  /** Unique form identifier */
  id: string;
  /** Form title */
  title: string;
  /** Form description */
  description?: string;
  /** Form version */
  version?: string;
}

/**
 * Complete Form Specification
 *
 * This is the root type that defines an entire form including:
 * - Data schema (JSON Schema)
 * - Computed values
 * - Reference data (lookup tables for calculations)
 * - Field-level configuration and conditional logic
 * - Field ordering
 * - Optional wizard/page structure
 */
export interface Forma {
  /** Schema version identifier */
  $schema?: string;
  /** Spec version */
  version: "1.0";
  /** Form metadata */
  meta: FormMeta;
  /** JSON Schema defining the data structure */
  schema: JSONSchema;
  /** Computed/calculated values */
  computed?: Record<string, ComputedField>;
  /** Reference data for lookups (external data sources, lookup tables) */
  referenceData?: Record<string, unknown>;
  /** Field-level definitions and rules */
  fields: Record<string, FieldDefinition>;
  /** Order in which fields should be displayed */
  fieldOrder: string[];
  /** Optional multi-page wizard structure */
  pages?: PageDefinition[];
}

// ============================================================================
// Evaluation Context
// ============================================================================

/**
 * Context provided when evaluating FEEL expressions
 */
export interface EvaluationContext {
  /** Current form data */
  data: Record<string, unknown>;
  /** Computed values (calculated before field evaluation) */
  computed?: Record<string, unknown>;
  /** Reference data for lookups (external data sources, lookup tables) */
  referenceData?: Record<string, unknown>;
  /** Current array item (when evaluating within array context) */
  item?: Record<string, unknown>;
  /** Current array item index (0-based) */
  itemIndex?: number;
  /** Current field value (for validation expressions) */
  value?: unknown;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Field visibility result - map of field path to visibility state
 */
export interface VisibilityResult {
  [fieldPath: string]: boolean;
}

/**
 * Required fields result - map of field path to required state
 */
export interface RequiredResult {
  [fieldPath: string]: boolean;
}

/**
 * Alias for RequiredResult (backwards compatibility)
 */
export type RequiredFieldsResult = RequiredResult;

/**
 * Enabled fields result - map of field path to enabled state
 */
export interface EnabledResult {
  [fieldPath: string]: boolean;
}

/**
 * Field validation error
 */
export interface FieldError {
  /** Field path that has the error */
  field: string;
  /** Error message */
  message: string;
  /** Error severity */
  severity: "error" | "warning";
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the form data is valid */
  valid: boolean;
  /** List of validation errors */
  errors: FieldError[];
}

/**
 * Calculation error
 */
export interface CalculationError {
  /** Computed field name */
  field: string;
  /** Error message */
  message: string;
  /** The expression that failed */
  expression: string;
}

/**
 * Calculation result with potential errors
 */
export interface CalculationResult {
  /** Computed values */
  values: Record<string, unknown>;
  /** Errors encountered during calculation */
  errors: CalculationError[];
}

