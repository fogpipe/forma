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
export type { UseFormaOptions, UseFormaReturn, PageState, WizardHelpers } from "./useForma.js";

// Components
export { FormRenderer } from "./FormRenderer.js";
export type { FormRendererProps, FormRendererHandle } from "./FormRenderer.js";

// Context
export { FormaContext, useFormaContext } from "./context.js";

// Types
export type {
  BaseFieldProps,
  ComponentMap,
  FieldProps,
  TextFieldProps,
  NumberFieldProps,
  BooleanFieldProps,
  DateFieldProps,
  SelectFieldProps,
  ArrayFieldProps,
  ArrayHelpers,
  LayoutProps,
  FieldWrapperProps,
  PageWrapperProps,
} from "./types.js";
