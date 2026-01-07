/**
 * FieldRenderer Component
 *
 * Routes a single field to the appropriate component based on its type.
 * This is useful for custom form layouts where you need field-by-field control.
 */

import React from "react";
import type { FieldDefinition, JSONSchemaProperty } from "@fogpipe/forma-core";
import { useFormaContext } from "./context.js";
import type {
  ComponentMap,
  BaseFieldProps,
  TextFieldProps,
  NumberFieldProps,
  IntegerFieldProps,
  SelectFieldProps,
  MultiSelectFieldProps,
  ArrayFieldProps,
  ArrayHelpers,
} from "./types.js";

/**
 * Props for FieldRenderer component
 */
export interface FieldRendererProps {
  /** Field path (e.g., "firstName" or "address.city") */
  fieldPath: string;
  /** Component map for rendering fields */
  components: ComponentMap;
  /** Optional class name for the wrapper */
  className?: string;
}

/**
 * Extract numeric constraints from JSON Schema property
 */
function getNumberConstraints(schema?: JSONSchemaProperty): { min?: number; max?: number; step?: number } {
  if (!schema) return {};
  if (schema.type !== "number" && schema.type !== "integer") return {};

  return {
    min: "minimum" in schema ? schema.minimum : undefined,
    max: "maximum" in schema ? schema.maximum : undefined,
    step: schema.type === "integer" ? 1 : undefined,
  };
}

/**
 * Create a default item for an array field based on item field definitions
 */
function createDefaultItem(itemFields: Record<string, FieldDefinition>): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const [fieldName, fieldDef] of Object.entries(itemFields)) {
    if (fieldDef.type === "boolean") {
      item[fieldName] = false;
    } else if (fieldDef.type === "number" || fieldDef.type === "integer") {
      item[fieldName] = null;
    } else {
      item[fieldName] = "";
    }
  }
  return item;
}

/**
 * FieldRenderer component
 *
 * @example
 * ```tsx
 * // Render a specific field with custom components
 * <FieldRenderer fieldPath="email" components={componentMap} />
 * ```
 */
export function FieldRenderer({ fieldPath, components, className }: FieldRendererProps) {
  const forma = useFormaContext();
  const { spec } = forma;

  const fieldDef = spec.fields[fieldPath];
  if (!fieldDef) {
    console.warn(`Field not found: ${fieldPath}`);
    return null;
  }

  const isVisible = forma.visibility[fieldPath] !== false;
  if (!isVisible) return null;

  // Infer field type
  const fieldType = fieldDef.type || (fieldDef.itemFields ? "array" : "text");
  const componentKey = fieldType as keyof ComponentMap;
  const Component = components[componentKey] || components.fallback;

  if (!Component) {
    console.warn(`No component found for field type: ${fieldType}`);
    return null;
  }

  const errors = forma.errors.filter((e) => e.field === fieldPath);
  const touched = forma.touched[fieldPath] ?? false;
  const required = forma.required[fieldPath] ?? false;
  const disabled = forma.enabled[fieldPath] === false;

  // Get schema property for additional constraints
  const schemaProperty = spec.schema.properties[fieldPath];

  // Base field props
  const baseProps: BaseFieldProps = {
    name: fieldPath,
    field: fieldDef,
    value: forma.data[fieldPath],
    touched,
    required,
    disabled,
    errors,
    onChange: (value: unknown) => forma.setFieldValue(fieldPath, value),
    onBlur: () => forma.setFieldTouched(fieldPath),
    // Convenience properties
    visible: true, // Always true since we already filtered for visibility
    enabled: !disabled,
    label: fieldDef.label ?? fieldPath,
    description: fieldDef.description,
    placeholder: fieldDef.placeholder,
  };

  // Build type-specific props
  let fieldProps: BaseFieldProps | TextFieldProps | NumberFieldProps | IntegerFieldProps | SelectFieldProps | MultiSelectFieldProps | ArrayFieldProps = baseProps;

  if (fieldType === "number") {
    const constraints = getNumberConstraints(schemaProperty);
    fieldProps = {
      ...baseProps,
      fieldType: "number",
      value: baseProps.value as number | null,
      onChange: baseProps.onChange as (value: number | null) => void,
      ...constraints,
    } as NumberFieldProps;
  } else if (fieldType === "integer") {
    const constraints = getNumberConstraints(schemaProperty);
    fieldProps = {
      ...baseProps,
      fieldType: "integer",
      value: baseProps.value as number | null,
      onChange: baseProps.onChange as (value: number | null) => void,
      min: constraints.min,
      max: constraints.max,
    } as IntegerFieldProps;
  } else if (fieldType === "select") {
    fieldProps = {
      ...baseProps,
      fieldType: "select",
      value: baseProps.value as string | null,
      onChange: baseProps.onChange as (value: string | null) => void,
      options: fieldDef.options ?? [],
    } as SelectFieldProps;
  } else if (fieldType === "multiselect") {
    fieldProps = {
      ...baseProps,
      fieldType: "multiselect",
      value: (baseProps.value as string[] | undefined) ?? [],
      onChange: baseProps.onChange as (value: string[]) => void,
      options: fieldDef.options ?? [],
    } as MultiSelectFieldProps;
  } else if (fieldType === "array" && fieldDef.itemFields) {
    const arrayValue = (baseProps.value as unknown[] | undefined) ?? [];
    const minItems = fieldDef.minItems ?? 0;
    const maxItems = fieldDef.maxItems ?? Infinity;
    const itemFieldDefs = fieldDef.itemFields;

    const helpers: ArrayHelpers = {
      items: arrayValue,
      push: (item?: unknown) => {
        const newItem = item ?? createDefaultItem(itemFieldDefs);
        forma.setFieldValue(fieldPath, [...arrayValue, newItem]);
      },
      insert: (index: number, item: unknown) => {
        const newArray = [...arrayValue];
        newArray.splice(index, 0, item);
        forma.setFieldValue(fieldPath, newArray);
      },
      remove: (index: number) => {
        const newArray = [...arrayValue];
        newArray.splice(index, 1);
        forma.setFieldValue(fieldPath, newArray);
      },
      move: (from: number, to: number) => {
        const newArray = [...arrayValue];
        const [item] = newArray.splice(from, 1);
        newArray.splice(to, 0, item);
        forma.setFieldValue(fieldPath, newArray);
      },
      swap: (indexA: number, indexB: number) => {
        const newArray = [...arrayValue];
        [newArray[indexA], newArray[indexB]] = [newArray[indexB], newArray[indexA]];
        forma.setFieldValue(fieldPath, newArray);
      },
      getItemFieldProps: (index: number, fieldName: string) => {
        const itemFieldDef = itemFieldDefs[fieldName];
        const itemPath = `${fieldPath}[${index}].${fieldName}`;
        const itemValue = (arrayValue[index] as Record<string, unknown>)?.[fieldName];
        return {
          name: itemPath,
          value: itemValue,
          type: itemFieldDef?.type ?? "text",
          label: itemFieldDef?.label ?? fieldName,
          description: itemFieldDef?.description,
          placeholder: itemFieldDef?.placeholder,
          visible: true,
          enabled: !disabled,
          required: itemFieldDef?.requiredWhen === "true",
          touched: forma.touched[itemPath] ?? false,
          errors: forma.errors.filter((e) => e.field === itemPath),
          onChange: (value: unknown) => {
            const newArray = [...arrayValue];
            const item = (newArray[index] ?? {}) as Record<string, unknown>;
            newArray[index] = { ...item, [fieldName]: value };
            forma.setFieldValue(fieldPath, newArray);
          },
          onBlur: () => forma.setFieldTouched(itemPath),
          itemIndex: index,
          fieldName,
          options: itemFieldDef?.options,
        };
      },
      minItems,
      maxItems,
      canAdd: arrayValue.length < maxItems,
      canRemove: arrayValue.length > minItems,
    };
    fieldProps = {
      ...baseProps,
      fieldType: "array",
      value: arrayValue,
      onChange: baseProps.onChange as (value: unknown[]) => void,
      helpers,
      itemFields: itemFieldDefs,
      minItems,
      maxItems,
    } as ArrayFieldProps;
  } else {
    // Text-based fields
    fieldProps = {
      ...baseProps,
      fieldType: fieldType as "text" | "email" | "password" | "url" | "textarea",
      value: (baseProps.value as string) ?? "",
      onChange: baseProps.onChange as (value: string) => void,
    };
  }

  // Wrap props in { field, spec } structure for components
  const componentProps = { field: fieldProps, spec };
  const element = React.createElement(Component as React.ComponentType<typeof componentProps>, componentProps);

  if (className) {
    return <div className={className}>{element}</div>;
  }

  return element;
}
