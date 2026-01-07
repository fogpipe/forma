/**
 * Type definitions for forma-react components
 */

import type { FieldDefinition, FieldError, SelectOption } from "@formidable/forma-core";

/**
 * Base props shared by all field components
 */
export interface BaseFieldProps {
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
  fieldType: "number" | "integer";
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
  fieldType: "date" | "datetime";
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * Props for select fields
 */
export interface SelectFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "select" | "multiselect";
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  options: SelectOption[];
}

/**
 * Array manipulation helpers
 */
export interface ArrayHelpers {
  push: (item: unknown) => void;
  insert: (index: number, item: unknown) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  swap: (indexA: number, indexB: number) => void;
}

/**
 * Props for array fields
 */
export interface ArrayFieldProps extends Omit<BaseFieldProps, "value" | "onChange"> {
  fieldType: "array";
  value: unknown[];
  onChange: (value: unknown[]) => void;
  helpers: ArrayHelpers;
  itemFields?: FieldDefinition[];
}

/**
 * Union of all field prop types
 */
export type FieldProps =
  | TextFieldProps
  | NumberFieldProps
  | BooleanFieldProps
  | DateFieldProps
  | SelectFieldProps
  | ArrayFieldProps;

/**
 * Map of field types to React components
 */
export interface ComponentMap {
  text?: React.ComponentType<TextFieldProps>;
  email?: React.ComponentType<TextFieldProps>;
  password?: React.ComponentType<TextFieldProps>;
  url?: React.ComponentType<TextFieldProps>;
  textarea?: React.ComponentType<TextFieldProps>;
  number?: React.ComponentType<NumberFieldProps>;
  integer?: React.ComponentType<NumberFieldProps>;
  boolean?: React.ComponentType<BooleanFieldProps>;
  date?: React.ComponentType<DateFieldProps>;
  datetime?: React.ComponentType<DateFieldProps>;
  select?: React.ComponentType<SelectFieldProps>;
  multiselect?: React.ComponentType<SelectFieldProps>;
  array?: React.ComponentType<ArrayFieldProps>;
  fallback?: React.ComponentType<BaseFieldProps>;
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
  field: FieldDefinition;
  children: React.ReactNode;
  errors: FieldError[];
  touched: boolean;
  required: boolean;
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
