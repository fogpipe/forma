/**
 * Core Forma Type Definitions
 *
 * This module defines the complete type system for Forma specifications.
 * All conditional logic uses FEEL (Friendly Enough Expression Language).
 *
 * FieldDefinition is a discriminated union on the required `type` property,
 * grouped by shared capabilities:
 * - AdornableFieldDefinition: text-like and numeric inputs with prefix/suffix
 * - SelectionFieldDefinition: select/multiselect with options
 * - SimpleFieldDefinition: boolean, date, datetime (no type-specific props)
 * - ArrayFieldDefinition: array with itemFields, minItems, maxItems
 * - ObjectFieldDefinition: nested object grouping
 * - DisplayFieldDefinition: presentation content and computed output (no data)
 * - ComputedFieldDefinition: computed field reference in fields map
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
  default?: string;
}

export interface JSONSchemaNumber extends JSONSchemaBase {
  type: "number";
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  default?: number;
}

export interface JSONSchemaInteger extends JSONSchemaBase {
  type: "integer";
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  default?: number;
}

export interface JSONSchemaBoolean extends JSONSchemaBase {
  type: "boolean";
  default?: boolean;
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
  default?: string;
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
  | "computed"
  | "display";

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

// ============================================================================
// Field Definition - Discriminated Union
// ============================================================================

/**
 * Base properties shared by all field types.
 *
 * Note: Display fields technically inherit all base properties including
 * conditional logic (enabledWhen, requiredWhen, etc.), but these properties
 * are semantically meaningless on display fields and should not be set.
 * Runtime validation (Zod layer) enforces this constraint.
 */
export interface FieldDefinitionBase {
  /** Field type - REQUIRED, used as discriminant for the union */
  type: FieldType;
  /** Display label */
  label?: string;
  /** Help text or description */
  description?: string;
  /** Placeholder text for input fields */
  placeholder?: string;

  // Conditional logic (all FEEL expressions)

  /** When to show this field. If omitted, always visible. */
  visibleWhen?: FEELExpression;
  /** When this field is required. If omitted, uses schema required. */
  requiredWhen?: FEELExpression;
  /** When this field is editable. If omitted, always enabled. */
  enabledWhen?: FEELExpression;
  /** When this field is read-only (visible, not editable, value still submitted). */
  readonlyWhen?: FEELExpression;

  // Validation rules (in addition to JSON Schema validation)

  /** Custom validation rules using FEEL expressions */
  validations?: ValidationRule[];

  // Presentation

  /** Presentation variant hint (e.g., "slider", "radio", "nps", "metric") */
  variant?: string;
  /** Variant-specific configuration */
  variantConfig?: Record<string, unknown>;

  // Default value

  /**
   * Default value for this field when the form initializes.
   * Applied by the renderer during state initialization.
   * Ignored on display fields (enforced by Zod validation layer).
   *
   * Resolution order (highest to lowest priority):
   * 1. initialData prop (runtime)
   * 2. defaultValue (from spec)
   * 3. Implicit type defaults (boolean → false, etc.)
   */
  defaultValue?: unknown;
}

/**
 * Text-like and numeric input fields that support prefix/suffix adorners.
 *
 * Adorners are cross-variant: a "$" prefix applies to input, stepper,
 * and slider variants alike. That's why they're top-level properties
 * rather than inside variantConfig.
 */
export interface AdornableFieldDefinition extends FieldDefinitionBase {
  type:
    | "text"
    | "email"
    | "url"
    | "password"
    | "textarea"
    | "number"
    | "integer";
  /** Text/symbol displayed before input (e.g., "$", "https://") */
  prefix?: string;
  /** Text/symbol displayed after input (e.g., "USD", "kg", "%") */
  suffix?: string;
}

/**
 * Selection fields that have options.
 */
export interface SelectionFieldDefinition extends FieldDefinitionBase {
  type: "select" | "multiselect";
  /** Available options for selection */
  options?: SelectOption[];
}

/**
 * Simple fields with no type-specific properties beyond the base.
 */
export interface SimpleFieldDefinition extends FieldDefinitionBase {
  type: "boolean" | "date" | "datetime";
}

/**
 * Array fields with item field definitions and count constraints.
 */
export interface ArrayFieldDefinition extends FieldDefinitionBase {
  type: "array";
  /** Field definitions for each array item. Use `item.fieldName` in FEEL. */
  itemFields?: Record<string, FieldDefinition>;
  /** Minimum number of items (overrides schema) */
  minItems?: number;
  /** Maximum number of items (overrides schema) */
  maxItems?: number;
}

/**
 * Object fields (nested grouping).
 */
export interface ObjectFieldDefinition extends FieldDefinitionBase {
  type: "object";
}

/**
 * Display-only fields for presentation content and computed output.
 * Collect no data - excluded from JSON Schema, validation, and submission.
 *
 * Although display fields inherit all base properties, conditional logic
 * properties (readonlyWhen, requiredWhen, enabledWhen, validations, placeholder)
 * are semantically meaningless on display fields. Only visibleWhen is meaningful
 * (to conditionally show/hide display content). The Zod validation layer
 * enforces this constraint at runtime.
 */
export interface DisplayFieldDefinition extends FieldDefinitionBase {
  type: "display";
  /** Static content (plain text or markdown). For text, heading, alert, callout. */
  content?: string;
  /** Data source for dynamic display (e.g., "computed.totalPrice"). For metric, alert, summary. */
  source?: string;
  /** Display format (e.g., "currency", "percent", "decimal(2)", or template "{value} Nm") */
  format?: string;
}

/**
 * Computed fields (read-only calculated values).
 * Note: Computed field definitions live in Forma.computed, not Forma.fields.
 * This type exists for completeness if computed fields appear in the fields map.
 */
export interface ComputedFieldDefinition extends FieldDefinitionBase {
  type: "computed";
}

/**
 * Field definition - discriminated union on `type`.
 *
 * Use type narrowing to access type-specific properties:
 *
 * @example
 * if (field.type === "number") {
 *   field.prefix;  // string | undefined
 * }
 * if (field.type === "display") {
 *   field.content; // string | undefined
 * }
 * if (field.type === "select") {
 *   field.options; // SelectOption[] | undefined
 * }
 */
export type FieldDefinition =
  | AdornableFieldDefinition
  | SelectionFieldDefinition
  | SimpleFieldDefinition
  | ArrayFieldDefinition
  | ObjectFieldDefinition
  | DisplayFieldDefinition
  | ComputedFieldDefinition;

// ============================================================================
// Type Guards
// ============================================================================

/** Adornable field types that support prefix/suffix */
const ADORNABLE_TYPES: ReadonlySet<FieldType> = new Set([
  "text",
  "email",
  "url",
  "password",
  "textarea",
  "number",
  "integer",
]);

/** Check if field supports prefix/suffix adorners */
export function isAdornableField(
  field: FieldDefinition,
): field is AdornableFieldDefinition {
  return ADORNABLE_TYPES.has(field.type);
}

/** Check if field is a display-only field (no data) */
export function isDisplayField(
  field: FieldDefinition,
): field is DisplayFieldDefinition {
  return field.type === "display";
}

/** Check if field is a selection field (has options) */
export function isSelectionField(
  field: FieldDefinition,
): field is SelectionFieldDefinition {
  return field.type === "select" || field.type === "multiselect";
}

/** Check if field is an array field */
export function isArrayField(
  field: FieldDefinition,
): field is ArrayFieldDefinition {
  return field.type === "array";
}

/** Check if field collects data (not display) */
export function isDataField(field: FieldDefinition): boolean {
  return field.type !== "display";
}

// ============================================================================
// Computed Fields
// ============================================================================

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

// ============================================================================
// Page / Form Structure
// ============================================================================

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
 * Readonly fields result - map of field path to readonly state
 */
export interface ReadonlyResult {
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
