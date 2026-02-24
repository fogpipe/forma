/**
 * Test utilities for @fogpipe/forma-react
 */

import { render, type RenderOptions } from "@testing-library/react";
import type {
  Forma,
  FieldDefinition,
  PageDefinition,
} from "@fogpipe/forma-core";
import type {
  ComponentMap,
  TextComponentProps,
  NumberComponentProps,
  BooleanComponentProps,
  SelectComponentProps,
  MultiSelectComponentProps,
  ArrayComponentProps,
} from "../types.js";

/**
 * Create a minimal Forma for testing
 */
export function createTestSpec(
  options: {
    fields?: Record<string, { type: string; [key: string]: unknown }>;
    fieldOrder?: string[];
    computed?: Record<string, { expression: string }>;
    pages?: PageDefinition[];
    referenceData?: Record<string, unknown>;
  } = {},
): Forma {
  const { fields = {}, fieldOrder, computed, pages, referenceData } = options;

  // Build schema from fields
  const schemaProperties: Record<string, unknown> = {};
  const schemaRequired: string[] = [];

  for (const [name, field] of Object.entries(fields)) {
    const {
      type,
      required,
      options: fieldOptions,
      items,
      ...rest
    } = field as Record<string, unknown>;

    let schemaType = type;
    if (
      type === "text" ||
      type === "email" ||
      type === "url" ||
      type === "textarea" ||
      type === "password"
    ) {
      schemaType = "string";
    }
    if (type === "select") {
      schemaType = "string";
      if (fieldOptions) {
        schemaProperties[name] = {
          type: "string",
          enum: (fieldOptions as Array<{ value: string }>).map((o) => o.value),
          ...rest,
        };
        if (required) schemaRequired.push(name);
        continue;
      }
    }
    if (type === "multiselect") {
      schemaProperties[name] = {
        type: "array",
        items: { type: "string" },
        ...rest,
      };
      continue;
    }
    if (type === "boolean") {
      schemaProperties[name] = { type: "boolean", ...rest };
      if (required) schemaRequired.push(name);
      continue;
    }
    if (type === "array") {
      schemaProperties[name] = {
        type: "array",
        items: items || { type: "object", properties: {} },
        ...rest,
      };
      if (required) schemaRequired.push(name);
      continue;
    }

    schemaProperties[name] = { type: schemaType || "string", ...rest };
    if (required) schemaRequired.push(name);
  }

  // Build field definitions
  const fieldDefs: Record<string, FieldDefinition> = {};
  for (const [name, field] of Object.entries(fields)) {
    // Extract type and required (required is used in schema building above)
    const { type, required: __, ...rest } = field as Record<string, unknown>;
    void __; // Mark as intentionally unused
    fieldDefs[name] = {
      type: type as FieldDefinition["type"],
      label:
        (rest.label as string) || name.charAt(0).toUpperCase() + name.slice(1),
      ...rest,
    } as FieldDefinition;
  }

  return {
    version: "1.0",
    meta: {
      id: "test-form",
      title: "Test Form",
    },
    schema: {
      type: "object",
      properties: schemaProperties as Forma["schema"]["properties"],
      required: schemaRequired.length > 0 ? schemaRequired : undefined,
    },
    fields: fieldDefs,
    fieldOrder: fieldOrder || Object.keys(fields),
    computed,
    pages,
    referenceData,
  };
}

/**
 * Create a basic component map for testing
 *
 * Components receive wrapper props { field, spec } from FormRenderer
 */
export function createTestComponentMap(): ComponentMap {
  // Text-based fields (text, email, password, url, textarea)
  const TextComponent = ({ field: props }: TextComponentProps) => {
    const { name, field, value, errors, onChange, onBlur, disabled } = props;
    return (
      <div data-testid={`field-${name}`}>
        <label htmlFor={name}>{field.label}</label>
        <input
          id={name}
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
        />
        {errors.length > 0 && (
          <span data-testid={`error-${name}`}>{errors[0].message}</span>
        )}
      </div>
    );
  };

  // Number fields
  const NumberComponent = ({ field: props }: NumberComponentProps) => {
    const { name, field, value, errors, onChange, onBlur, disabled } = props;
    return (
      <div data-testid={`field-${name}`}>
        <label htmlFor={name}>{field.label}</label>
        <input
          id={name}
          type="number"
          value={value !== null ? String(value) : ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === "" ? null : Number(val));
          }}
          onBlur={onBlur}
          disabled={disabled}
        />
        {errors.length > 0 && (
          <span data-testid={`error-${name}`}>{errors[0].message}</span>
        )}
      </div>
    );
  };

  // Boolean/checkbox fields
  const BooleanComponent = ({ field: props }: BooleanComponentProps) => {
    const { name, field, value, onChange, onBlur, disabled } = props;
    return (
      <div data-testid={`field-${name}`}>
        <label>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
            disabled={disabled}
          />
          {field.label}
        </label>
      </div>
    );
  };

  // Select fields (single selection)
  const SelectComponent = ({ field: props }: SelectComponentProps) => {
    const { name, field, value, options, onChange, onBlur, disabled } = props;
    return (
      <div data-testid={`field-${name}`}>
        <label htmlFor={name}>{field.label}</label>
        <select
          id={name}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={onBlur}
          disabled={disabled}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Multiselect fields
  const MultiSelectComponent = ({
    field: props,
  }: MultiSelectComponentProps) => {
    const { name, field, value, options, onChange, onBlur, disabled } = props;
    const displayValue = (value || []).join(",");
    return (
      <div data-testid={`field-${name}`}>
        <label htmlFor={name}>{field.label}</label>
        <select
          id={name}
          value={displayValue}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val ? val.split(",") : []);
          }}
          onBlur={onBlur}
          disabled={disabled}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Array fields
  const ArrayComponent = ({ field: props }: ArrayComponentProps) => {
    const { name, field, value, helpers } = props;
    const items = (value || []) as unknown[];
    return (
      <div data-testid={`field-${name}`}>
        <label>{field.label}</label>
        <div data-testid={`array-items-${name}`}>
          {items.map((_, index) => (
            <div key={index} data-testid={`array-item-${name}-${index}`}>
              Item {index}
              <button
                type="button"
                onClick={() => helpers.remove(index)}
                data-testid={`remove-${name}-${index}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => helpers.push({})}
          data-testid={`add-${name}`}
        >
          Add
        </button>
      </div>
    );
  };

  return {
    text: TextComponent,
    email: TextComponent,
    password: TextComponent,
    url: TextComponent,
    textarea: TextComponent,
    number: NumberComponent,
    integer: NumberComponent,
    boolean: BooleanComponent,
    date: TextComponent as ComponentMap["date"],
    datetime: TextComponent as ComponentMap["datetime"],
    select: SelectComponent,
    multiselect: MultiSelectComponent,
    array: ArrayComponent,
    object: TextComponent as ComponentMap["object"],
    computed: TextComponent as ComponentMap["computed"],
  };
}

/**
 * Custom render function with common providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
