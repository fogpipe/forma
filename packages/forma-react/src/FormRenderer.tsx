/**
 * FormRenderer Component
 *
 * Renders a complete form from a Forma specification.
 * This is a placeholder - the full implementation will be migrated from formidable.
 */

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import type { Forma, ValidationResult } from "@formidable/forma-core";
import { useForma, type UseFormaReturn } from "./useForma.js";
import { FormaContext } from "./context.js";
import type { ComponentMap, LayoutProps, FieldWrapperProps, PageWrapperProps } from "./types.js";

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
 * Default field wrapper component
 */
function DefaultFieldWrapper({ field, children, errors, required }: FieldWrapperProps) {
  return (
    <div className="field-wrapper">
      <label>
        {field.label}
        {required && <span className="required">*</span>}
      </label>
      {children}
      {errors.length > 0 && (
        <div className="field-errors">
          {errors.map((error, i) => (
            <span key={i} className="error">
              {error.message}
            </span>
          ))}
        </div>
      )}
      {field.description && <p className="field-description">{field.description}</p>}
    </div>
  );
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

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        submitForm: forma.submitForm,
        resetForm: forma.resetForm,
        validateForm: forma.validateForm,
        focusField: (path: string) => {
          const field = fieldRefs.current.get(path);
          field?.focus();
        },
        focusFirstError: () => {
          const firstError = forma.errors[0];
          if (firstError) {
            const field = fieldRefs.current.get(firstError.field);
            field?.focus();
          }
        },
        getValues: () => forma.data,
        setValues: forma.setValues,
        isValid: forma.isValid,
        isDirty: forma.isDirty,
      }),
      [forma]
    );

    // Render fields
    const renderField = (fieldDef: typeof spec.fields[0]) => {
      if (!forma.visibility[fieldDef.id]) {
        return null;
      }

      const componentKey = fieldDef.type as keyof ComponentMap;
      const Component = components[componentKey] || components.fallback;
      if (!Component) {
        console.warn(`No component found for field type: ${fieldDef.type}`);
        return null;
      }

      const errors = forma.errors.filter((e) => e.field === fieldDef.id);
      const touched = Boolean(forma.data[fieldDef.id]);
      const required = forma.required[fieldDef.id] || false;
      const disabled = !forma.enabled[fieldDef.id];

      const fieldProps = {
        field: fieldDef,
        value: forma.data[fieldDef.id],
        touched,
        required,
        disabled,
        errors,
        onChange: (value: unknown) => forma.setFieldValue(fieldDef.id, value),
        onBlur: () => forma.setFieldTouched(fieldDef.id),
        fieldType: fieldDef.type,
        options: fieldDef.options,
        min: fieldDef.min,
        max: fieldDef.max,
        step: fieldDef.step,
      };

      return (
        <FieldWrapper
          key={fieldDef.id}
          field={fieldDef}
          errors={errors}
          touched={touched}
          required={required}
        >
          {React.createElement(Component as unknown as React.ComponentType<typeof fieldProps>, fieldProps)}
        </FieldWrapper>
      );
    };

    return (
      <FormaContext.Provider value={forma}>
        <Layout
          onSubmit={forma.submitForm}
          isSubmitting={forma.isSubmitting}
          isValid={forma.isValid}
        >
          {spec.fields.map(renderField)}
        </Layout>
      </FormaContext.Provider>
    );
  }
);
