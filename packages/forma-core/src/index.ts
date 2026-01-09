/**
 * @fogpipe/forma-core
 *
 * Core runtime for Forma dynamic forms.
 * Provides types, FEEL expression evaluation, and form state engines.
 */

// Types (explicit type-only exports)
export type {
  // FEEL
  FEELExpression,
  // JSON Schema
  JSONSchema,
  JSONSchemaProperty,
  JSONSchemaBase,
  JSONSchemaString,
  JSONSchemaNumber,
  JSONSchemaInteger,
  JSONSchemaBoolean,
  JSONSchemaArray,
  JSONSchemaObject,
  JSONSchemaEnum,
  // Field types
  FieldType,
  ValidationRule,
  SelectOption,
  FieldDefinition,
  ComputedField,
  PageDefinition,
  FormMeta,
  Forma,
  // Evaluation
  EvaluationContext,
  // Results
  VisibilityResult,
  RequiredResult,
  RequiredFieldsResult,
  EnabledResult,
  FieldError,
  ValidationResult,
  CalculationError,
  CalculationResult,
} from "./types.js";

// FEEL expression evaluation
export * from "./feel/index.js";

// Form state engines
export * from "./engine/index.js";
