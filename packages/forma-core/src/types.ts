/**
 * Core Forma types
 *
 * These types define the structure of a Forma specification.
 * The Forma spec combines JSON Schema-like field definitions with
 * FEEL expressions for dynamic behavior.
 */

/**
 * Field types supported by Forma
 */
export type FieldType =
  | "text"
  | "email"
  | "password"
  | "url"
  | "textarea"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "array"
  | "object";

/**
 * A FEEL expression string
 */
export type FEELExpression = string;

/**
 * Options for select/multiselect fields
 */
export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Validation rule with FEEL expression
 */
export interface ValidationRule {
  rule: FEELExpression;
  message: string;
}

/**
 * Field definition in a Forma specification
 */
export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean | FEELExpression;
  visible?: FEELExpression;
  enabled?: FEELExpression;
  default?: unknown;
  validation?: ValidationRule[];
  options?: SelectOption[];
  // Array field specific
  minItems?: number;
  maxItems?: number;
  items?: FieldDefinition[];
  // Object field specific
  fields?: FieldDefinition[];
  // Number field specific
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Computed field definition
 */
export interface ComputedField {
  name: string;
  expression: FEELExpression;
  label?: string;
  format?: string;
}

/**
 * Page definition for multi-page forms
 */
export interface PageDefinition {
  id: string;
  title: string;
  description?: string;
  fields: string[];
  visible?: FEELExpression;
}

/**
 * Form metadata
 */
export interface FormMeta {
  title: string;
  description?: string;
  version?: string;
}

/**
 * Complete Forma specification
 */
export interface Forma {
  meta: FormMeta;
  fields: FieldDefinition[];
  computed?: ComputedField[];
  pages?: PageDefinition[];
}

/**
 * Field validation error
 */
export interface FieldError {
  field: string;
  message: string;
  rule?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
}
