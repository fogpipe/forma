/**
 * FormRenderer Component
 *
 * Renders a complete form from a Forma specification.
 * Supports single-page and multi-page (wizard) forms.
 */

import React, { forwardRef, useImperativeHandle, useRef, useMemo, useCallback } from "react";
import type { Forma, FieldDefinition, ValidationResult, JSONSchemaProperty } from "@fogpipe/forma-core";
import { useForma } from "./useForma.js";
import { FormaContext } from "./context.js";
import type { ComponentMap, LayoutProps, FieldWrapperProps, PageWrapperProps, BaseFieldProps, TextFieldProps, NumberFieldProps, SelectFieldProps, ArrayFieldProps, ArrayHelpers } from "./types.js";

/**
 * Props for FormRenderer component
 */
export interface FormRendererProps {
  /** The Forma specification */
  spec: Forma;
  /** Initial form data */
  initialData?: Record<string, unknown>;
  /** Submit handler */
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  /** Change handler */
  onChange?: (data: Record<string, unknown>, computed?: Record<string, unknown>) => void;
  /** Component map for rendering fields */
  components: ComponentMap;
  /** Custom layout component */
  layout?: React.ComponentType<LayoutProps>;
  /** Custom field wrapper component */
  fieldWrapper?: React.ComponentType<FieldWrapperProps>;
  /** Custom page wrapper component */
  pageWrapper?: React.ComponentType<PageWrapperProps>;
  /** When to validate */
  validateOn?: "change" | "blur" | "submit";
  /** Current page for controlled wizard */
  page?: number;
}

/**
 * Imperative handle for FormRenderer
 */
export interface FormRendererHandle {
  submitForm: () => Promise<void>;
  resetForm: () => void;
  validateForm: () => ValidationResult;
  focusField: (path: string) => void;
  focusFirstError: () => void;
  getValues: () => Record<string, unknown>;
  setValues: (values: Record<string, unknown>) => void;
  isValid: boolean;
  isDirty: boolean;
}

/**
 * Default layout component
 */
function DefaultLayout({ children, onSubmit, isSubmitting }: LayoutProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

/**
 * Default field wrapper component with accessibility support
 */
function DefaultFieldWrapper({ fieldPath, field, children, errors, showRequiredIndicator, visible }: FieldWrapperProps) {
  if (!visible) return null;

  const errorId = `${fieldPath}-error`;
  const descriptionId = field.description ? `${fieldPath}-description` : undefined;
  const hasErrors = errors.length > 0;

  return (
    <div className="field-wrapper" data-field-path={fieldPath}>
      {field.label && (
        <label htmlFor={fieldPath}>
          {field.label}
          {showRequiredIndicator && <span className="required" aria-hidden="true">*</span>}
          {showRequiredIndicator && <span className="sr-only"> (required)</span>}
        </label>
      )}
      {children}
      {hasErrors && (
        <div
          id={errorId}
          className="field-errors"
          role="alert"
          aria-live="polite"
        >
          {errors.map((error, i) => (
            <span key={i} className="error">
              {error.message}
            </span>
          ))}
        </div>
      )}
      {field.description && (
        <p id={descriptionId} className="field-description">
          {field.description}
        </p>
      )}
    </div>
  );
}

/**
 * Default page wrapper component
 */
function DefaultPageWrapper({ title, description, children }: PageWrapperProps) {
  return (
    <div className="page-wrapper">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}

/**
 * Extract numeric constraints from JSON Schema property
 */
function getNumberConstraints(schema?: JSONSchemaProperty): { min?: number; max?: number; step?: number } {
  if (!schema) return {};
  if (schema.type !== "number" && schema.type !== "integer") return {};

  // Extract min/max from schema
  const min = "minimum" in schema && typeof schema.minimum === "number" ? schema.minimum : undefined;
  const max = "maximum" in schema && typeof schema.maximum === "number" ? schema.maximum : undefined;

  // Use multipleOf for step if defined, otherwise default to 1 for integers
  let step: number | undefined;
  if ("multipleOf" in schema && typeof schema.multipleOf === "number") {
    step = schema.multipleOf;
  } else if (schema.type === "integer") {
    step = 1;
  }

  return { min, max, step };
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
 * FormRenderer component
 */
export const FormRenderer = forwardRef<FormRendererHandle, FormRendererProps>(
  function FormRenderer(props, ref) {
    const {
      spec,
      initialData,
      onSubmit,
      onChange,
      components,
      layout: Layout = DefaultLayout,
      fieldWrapper: FieldWrapper = DefaultFieldWrapper,
      pageWrapper: PageWrapper = DefaultPageWrapper,
      validateOn,
    } = props;

    const forma = useForma({
      spec,
      initialData,
      onSubmit,
      onChange,
      validateOn,
    });

    const fieldRefs = useRef<Map<string, HTMLElement>>(new Map());

    // Focus a specific field by path
    const focusField = useCallback((path: string) => {
      const element = fieldRefs.current.get(path);
      element?.focus();
    }, []);

    // Focus the first field with an error
    const focusFirstError = useCallback(() => {
      const firstError = forma.errors[0];
      if (firstError) {
        focusField(firstError.field);
      }
    }, [forma.errors, focusField]);

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        submitForm: forma.submitForm,
        resetForm: forma.resetForm,
        validateForm: forma.validateForm,
        focusField,
        focusFirstError,
        getValues: () => forma.data,
        setValues: forma.setValues,
        isValid: forma.isValid,
        isDirty: forma.isDirty,
      }),
      [forma, focusField, focusFirstError]
    );

    // Determine which fields to render based on pages or fieldOrder
    const fieldsToRender = useMemo(() => {
      if (spec.pages && spec.pages.length > 0 && forma.wizard) {
        // Wizard mode - render fields for the active page
        const currentPage = forma.wizard.currentPage;
        if (currentPage) {
          return currentPage.fields;
        }
        // Fallback to first page
        return spec.pages[0]?.fields ?? [];
      }
      // Single page mode - render all fields in order
      return spec.fieldOrder;
    }, [spec.pages, spec.fieldOrder, forma.wizard]);

    // Render a single field (memoized)
    const renderField = useCallback((fieldPath: string) => {
      const fieldDef = spec.fields[fieldPath];
      if (!fieldDef) return null;

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

      // Boolean fields: hide asterisk unless they have validation rules (consent pattern)
      // - Binary question ("Do you smoke?"): no validation → false is valid → hide asterisk
      // - Consent checkbox ("I accept terms"): has validation rule → show asterisk
      const isBooleanField = schemaProperty?.type === "boolean" || fieldDef?.type === "boolean";
      const hasValidationRules = (fieldDef?.validations?.length ?? 0) > 0;
      const showRequiredIndicator = required && (!isBooleanField || hasValidationRules);

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
      let fieldProps: BaseFieldProps | TextFieldProps | NumberFieldProps | SelectFieldProps | ArrayFieldProps = baseProps;

      if (fieldType === "number" || fieldType === "integer") {
        const constraints = getNumberConstraints(schemaProperty);
        fieldProps = {
          ...baseProps,
          fieldType,
          value: baseProps.value as number | null,
          onChange: baseProps.onChange as (value: number | null) => void,
          ...constraints,
        } as NumberFieldProps;
      } else if (fieldType === "select" || fieldType === "multiselect") {
        fieldProps = {
          ...baseProps,
          fieldType,
          value: baseProps.value as string | string[] | null,
          onChange: baseProps.onChange as (value: string | string[] | null) => void,
          options: fieldDef.options ?? [],
        } as SelectFieldProps;
      } else if (fieldType === "array" && fieldDef.itemFields) {
        const arrayValue = Array.isArray(baseProps.value) ? baseProps.value : [];
        const minItems = fieldDef.minItems ?? 0;
        const maxItems = fieldDef.maxItems ?? Infinity;
        const itemFieldDefs = fieldDef.itemFields;

        // Get helpers from useForma - these are fresh on each render, avoiding stale closures
        const baseHelpers = forma.getArrayHelpers(fieldPath);

        // Wrap push to add default item creation when called without arguments
        const pushWithDefault = (item?: unknown): void => {
          const newItem = item ?? createDefaultItem(itemFieldDefs);
          baseHelpers.push(newItem);
        };

        // Extend getItemFieldProps to include additional metadata (itemIndex, fieldName, options)
        const getItemFieldPropsExtended = (index: number, fieldName: string) => {
          const baseProps = baseHelpers.getItemFieldProps(index, fieldName);
          const itemFieldDef = itemFieldDefs[fieldName];
          return {
            ...baseProps,
            itemIndex: index,
            fieldName,
            options: itemFieldDef?.options,
          };
        };

        const helpers: ArrayHelpers = {
          items: arrayValue,
          push: pushWithDefault,
          insert: baseHelpers.insert,
          remove: baseHelpers.remove,
          move: baseHelpers.move,
          swap: baseHelpers.swap,
          getItemFieldProps: getItemFieldPropsExtended,
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

      return (
        <FieldWrapper
          key={fieldPath}
          fieldPath={fieldPath}
          field={fieldDef}
          errors={errors}
          touched={touched}
          required={required}
          showRequiredIndicator={showRequiredIndicator}
          visible={isVisible}
        >
          {React.createElement(Component as React.ComponentType<typeof componentProps>, componentProps)}
        </FieldWrapper>
      );
    }, [spec, forma, components, FieldWrapper]);

    // Render fields (memoized)
    const renderedFields = useMemo(
      () => fieldsToRender.map(renderField),
      [fieldsToRender, renderField]
    );

    // Render with page wrapper if using pages
    const content = useMemo(() => {
      if (spec.pages && spec.pages.length > 0 && forma.wizard) {
        const currentPage = forma.wizard.currentPage;
        if (!currentPage) return null;

        return (
          <PageWrapper
            title={currentPage.title}
            description={currentPage.description}
            pageIndex={forma.wizard.currentPageIndex}
            totalPages={forma.wizard.pages.length}
          >
            {renderedFields}
          </PageWrapper>
        );
      }

      return <>{renderedFields}</>;
    }, [spec.pages, forma.wizard, PageWrapper, renderedFields]);

    return (
      <FormaContext.Provider value={forma}>
        <Layout
          onSubmit={forma.submitForm}
          isSubmitting={forma.isSubmitting}
          isValid={forma.isValid}
        >
          {content}
        </Layout>
      </FormaContext.Provider>
    );
  }
);
