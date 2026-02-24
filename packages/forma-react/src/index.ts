/**
 * @fogpipe/forma-react
 *
 * Headless React form renderer for Forma specifications.
 * Provides hooks and components for building dynamic forms.
 */

// Re-export core types
export type {
  Forma,
  FieldDefinition,
  FieldType,
  FieldError,
  ValidationResult,
  ComputedField,
  PageDefinition,
  SelectOption,
  ValidationRule,
} from "@fogpipe/forma-core";

// Hook
export { useForma } from "./useForma.js";
export type {
  UseFormaOptions,
  UseFormaReturn,
  PageState,
  WizardHelpers,
} from "./useForma.js";

// Components
export { FormRenderer } from "./FormRenderer.js";
export type { FormRendererProps, FormRendererHandle } from "./FormRenderer.js";
export { FieldRenderer } from "./FieldRenderer.js";
export type { FieldRendererProps } from "./FieldRenderer.js";
export { FormaErrorBoundary } from "./ErrorBoundary.js";
export type { FormaErrorBoundaryProps } from "./ErrorBoundary.js";

// Context
export { FormaContext, useFormaContext } from "./context.js";

// Types
export type {
  // Base field props
  BaseFieldProps,

  // Helper method return types
  GetFieldPropsResult,
  GetSelectFieldPropsResult,
  GetArrayHelpersResult,

  // Deprecated alias
  LegacyFieldProps,

  // Discriminated field props (for type narrowing)
  FieldProps,
  TextFieldProps,
  NumberFieldProps,
  IntegerFieldProps,
  BooleanFieldProps,
  DateFieldProps,
  DateTimeFieldProps,
  SelectFieldProps,
  MultiSelectFieldProps,
  SelectionFieldProps,
  ObjectFieldProps,
  ComputedFieldProps,

  // Array types
  ArrayFieldProps,
  ArrayHelpers,
  ArrayItemFieldProps,
  ArrayItemFieldPropsResult,

  // Component props (wrapper types with spec)
  FieldComponentProps,
  TextComponentProps,
  NumberComponentProps,
  IntegerComponentProps,
  BooleanComponentProps,
  DateComponentProps,
  DateTimeComponentProps,
  SelectComponentProps,
  MultiSelectComponentProps,
  ArrayComponentProps,
  ObjectComponentProps,
  ComputedComponentProps,
  DisplayFieldProps,
  DisplayComponentProps,
  ComponentMap,

  // Form state
  FormState,

  // Renderer props
  LayoutProps,
  FieldWrapperProps,
  PageWrapperProps,
} from "./types.js";
