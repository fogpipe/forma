/**
 * Type definitions for forma-react components
 */

import type { Forma, FieldDefinition, FieldError, SelectOption } from "@fogpipe/forma-core";

/**
 * Base props shared by all field components
 */
export interface BaseFieldProps {
  /** Field path/name */
  name: string;
  /** Field definition from the Forma spec */
  field: FieldDefinition;
  /** Current field value */
  value: unknown;
  /** Whether the field has been touched */
  touched: boolean;
  /** Whether the field is required */
  required: boolean;
  /** Whether the field is disabled */
  disabled: boolean;
  /** Validation errors for this field */
  errors: FieldError[];
  /** Handler for value changes */
  onChange: (value: unknown) => void;
  /** Handler for blur events */
  onBlur: () => void;
  // Convenience properties (derived from field definition)
  /** Whether field is visible (always true since FormRenderer handles visibility) */
  visible: boolean;
  /** Whether field is enabled (inverse of disabled) */
  enabled: boolean;
  /** Display label from field definition */
  label: string;
  /** Help text or description from field definition */
  description?: string;
  /** Placeholder text from field definition */
  placeholder?: string;
}

/**
 * Props for text-based fields (text, email, password, url, textarea)
 */
export interface TextFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "text" | "email" | "password" | "url" | "textarea";
  value: string;
  onChange: (value: string) => void;
}

/**
 * Props for number fields
 */
export interface NumberFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "number";
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Props for integer fields
 */
export interface IntegerFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "integer";
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Props for boolean fields
 */
export interface BooleanFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "boolean";
  value: boolean;
  onChange: (value: boolean) => void;
}

/**
 * Props for date fields
 */
export interface DateFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "date";
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * Props for datetime fields
 */
export interface DateTimeFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "datetime";
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * Props for select fields (single selection)
 */
export interface SelectFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "select";
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
}

/**
 * Props for multi-select fields
 */
export interface MultiSelectFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "multiselect";
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
}

/**
 * Union type for all selection-based field props
 */
export type SelectionFieldProps = SelectFieldProps | MultiSelectFieldProps;

/**
 * Array item field props returned by getItemFieldProps
 */
export interface ArrayItemFieldPropsResult {
  /** Field path/name */
  name: string;
  /** Current field value */
  value: unknown;
  /** Field type */
  type: string;
  /** Display label */
  label: string;
  /** Help text or description */
  description?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is visible */
  visible: boolean;
  /** Whether field is enabled */
  enabled: boolean;
  /** Whether field is required */
  required: boolean;
  /** Whether field has been touched */
  touched: boolean;
  /** Validation errors for this field */
  errors: FieldError[];
  /** Handler for value changes */
  onChange: (value: unknown) => void;
  /** Handler for blur events */
  onBlur: () => void;
  /** Item index in the array */
  itemIndex: number;
  /** Field name within the item */
  fieldName: string;
  /** Options for select fields */
  options?: SelectOption[];
}

/**
 * Array manipulation helpers
 */
export interface ArrayHelpers {
  /** Current array items */
  items: unknown[];
  /** Add item to end of array */
  push: (item?: unknown) => void;
  /** Insert item at specific index */
  insert: (index: number, item: unknown) => void;
  /** Remove item at index */
  remove: (index: number) => void;
  /** Move item from one index to another */
  move: (from: number, to: number) => void;
  /** Swap items at two indices */
  swap: (indexA: number, indexB: number) => void;
  /** Get field props for an item field */
  getItemFieldProps: (index: number, fieldName: string) => ArrayItemFieldPropsResult;
  /** Minimum number of items allowed */
  minItems: number;
  /** Maximum number of items allowed */
  maxItems: number;
  /** Whether more items can be added */
  canAdd: boolean;
  /** Whether items can be removed */
  canRemove: boolean;
}

/**
 * Props for array fields
 */
export interface ArrayFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "array";
  value: unknown[];
  onChange: (value: unknown[]) => void;
  helpers: ArrayHelpers;
  /** Item field definitions keyed by field name */
  itemFields: Record<string, FieldDefinition>;
  minItems?: number;
  maxItems?: number;
}

/**
 * Props for object fields
 */
export interface ObjectFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "object";
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

/**
 * Props for computed fields (read-only)
 */
export interface ComputedFieldProps extends Omit<BaseFieldProps, "onChange"> {
  fieldType: "computed";
  value: unknown;
  expression: string;
  onChange?: never;
}

/**
 * Props for array item fields (within array context)
 */
export interface ArrayItemFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  /** The field type */
  fieldType: string;
  /** Current value */
  value: unknown;
  /** Change handler */
  onChange: (value: unknown) => void;
  /** Item index in the array */
  itemIndex: number;
  /** Field name within the item */
  fieldName: string;
}

/**
 * Union of all field prop types
 */
export type FieldProps =
  | TextFieldProps
  | NumberFieldProps
  | IntegerFieldProps
  | BooleanFieldProps
  | DateFieldProps
  | DateTimeFieldProps
  | SelectFieldProps
  | MultiSelectFieldProps
  | ArrayFieldProps
  | ObjectFieldProps
  | ComputedFieldProps;

/**
 * Map of field types to React components
 * Components receive wrapper props with { field, spec } structure
 */
export interface ComponentMap {
  text?: React.ComponentType<TextComponentProps>;
  email?: React.ComponentType<TextComponentProps>;
  password?: React.ComponentType<TextComponentProps>;
  url?: React.ComponentType<TextComponentProps>;
  textarea?: React.ComponentType<TextComponentProps>;
  number?: React.ComponentType<NumberComponentProps>;
  integer?: React.ComponentType<IntegerComponentProps>;
  boolean?: React.ComponentType<BooleanComponentProps>;
  date?: React.ComponentType<DateComponentProps>;
  datetime?: React.ComponentType<DateTimeComponentProps>;
  select?: React.ComponentType<SelectComponentProps>;
  multiselect?: React.ComponentType<MultiSelectComponentProps>;
  array?: React.ComponentType<ArrayComponentProps>;
  object?: React.ComponentType<ObjectComponentProps>;
  computed?: React.ComponentType<ComputedComponentProps>;
  fallback?: React.ComponentType<FieldComponentProps>;
}

/**
 * Props for custom layout components
 */
export interface LayoutProps {
  children: React.ReactNode;
  onSubmit: () => void;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Props for custom field wrapper components
 */
export interface FieldWrapperProps {
  /** Field path/identifier */
  fieldPath: string;
  /** Field definition from the Forma spec */
  field: FieldDefinition;
  children: React.ReactNode;
  errors: FieldError[];
  touched: boolean;
  required: boolean;
  /**
   * Whether to show the required indicator in the UI.
   * False for boolean fields since false is a valid answer.
   */
  showRequiredIndicator: boolean;
  visible: boolean;
}

/**
 * Props for page wrapper components (multi-page forms)
 */
export interface PageWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  pageIndex: number;
  totalPages: number;
}

// ============================================================================
// Component Props (wrapper types that include spec)
// ============================================================================

/**
 * Wrapper type that includes spec alongside field props
 * Components receive { field, spec } instead of just FieldProps
 */
export interface TextComponentProps {
  field: TextFieldProps;
  spec: Forma;
}

export interface NumberComponentProps {
  field: NumberFieldProps;
  spec: Forma;
}

export interface IntegerComponentProps {
  field: IntegerFieldProps;
  spec: Forma;
}

export interface BooleanComponentProps {
  field: BooleanFieldProps;
  spec: Forma;
}

export interface DateComponentProps {
  field: DateFieldProps;
  spec: Forma;
}

export interface DateTimeComponentProps {
  field: DateTimeFieldProps;
  spec: Forma;
}

export interface SelectComponentProps {
  field: SelectFieldProps;
  spec: Forma;
}

export interface MultiSelectComponentProps {
  field: MultiSelectFieldProps;
  spec: Forma;
}

export interface ArrayComponentProps {
  field: ArrayFieldProps;
  spec: Forma;
}

export interface ObjectComponentProps {
  field: ObjectFieldProps;
  spec: Forma;
}

export interface ComputedComponentProps {
  field: ComputedFieldProps;
  spec: Forma;
}

/**
 * Generic field component props (for fallback/dynamic components)
 */
export interface FieldComponentProps {
  field: FieldProps;
  spec: Forma;
}

// ============================================================================
// Re-exported types from useForma
// ============================================================================

/** Form state exported from useForma */
export type { UseFormaReturn as FormState } from "./useForma.js";
export type { UseFormaOptions } from "./useForma.js";
export type { PageState, WizardHelpers } from "./useForma.js";

// Re-export ValidationResult for convenience
export type { ValidationResult } from "@fogpipe/forma-core";

// ============================================================================
// Helper Method Return Types
// ============================================================================

/**
 * Field props returned by getFieldProps()
 * Contains all field information needed for rendering
 */
export interface GetFieldPropsResult {
  /** Field path/name */
  name: string;
  /** Current field value */
  value: unknown;
  /** Field type */
  type: string;
  /** Display label */
  label: string;
  /** Help text or description */
  description?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether field is visible */
  visible: boolean;
  /** Whether field is enabled (not disabled) */
  enabled: boolean;
  /** Whether field is required (for validation) */
  required: boolean;
  /**
   * Whether to show the required indicator in the UI.
   * False for boolean fields since false is a valid answer.
   */
  showRequiredIndicator: boolean;
  /** Whether field has been touched */
  touched: boolean;
  /** Validation errors for this field */
  errors: FieldError[];
  /** Handler for value changes */
  onChange: (value: unknown) => void;
  /** Handler for blur events */
  onBlur: () => void;
  // ARIA accessibility attributes
  /** ARIA: Indicates the field has validation errors */
  "aria-invalid"?: boolean;
  /** ARIA: ID of element(s) describing validation errors */
  "aria-describedby"?: string;
  /** ARIA: Indicates the field is required */
  "aria-required"?: boolean;
  /** Options for select/multiselect fields (filtered by visibleWhen) */
  options?: SelectOption[];
}

/**
 * Select field props returned by getSelectFieldProps()
 */
export interface GetSelectFieldPropsResult extends GetFieldPropsResult {
  /** Available options for selection */
  options: SelectOption[];
}

/**
 * Array helpers returned by getArrayHelpers()
 */
export interface GetArrayHelpersResult {
  /** Current array items */
  items: unknown[];
  /** Add item to end of array */
  push: (item: unknown) => void;
  /** Remove item at index */
  remove: (index: number) => void;
  /** Move item from one index to another */
  move: (from: number, to: number) => void;
  /** Swap items at two indices */
  swap: (indexA: number, indexB: number) => void;
  /** Insert item at specific index */
  insert: (index: number, item: unknown) => void;
  /** Get field props for an item field */
  getItemFieldProps: (index: number, fieldName: string) => GetFieldPropsResult;
  /** Minimum number of items allowed */
  minItems: number;
  /** Maximum number of items allowed */
  maxItems: number;
  /** Whether more items can be added */
  canAdd: boolean;
  /** Whether items can be removed */
  canRemove: boolean;
}

/**
 * @deprecated Use GetFieldPropsResult instead
 */
export type LegacyFieldProps = GetFieldPropsResult;
