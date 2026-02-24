/**
 * useForma Hook
 *
 * Main hook for managing Forma form state.
 * This is a placeholder - the full implementation will be migrated from formidable.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  Forma,
  FieldError,
  ValidationResult,
  SelectOption,
} from "@fogpipe/forma-core";
import { isAdornableField } from "@fogpipe/forma-core";
import type {
  GetFieldPropsResult,
  GetSelectFieldPropsResult,
  GetArrayHelpersResult,
} from "./types.js";
import {
  getVisibility,
  getRequired,
  getEnabled,
  getReadonly,
  validate,
  calculate,
  getPageVisibility,
  getOptionsVisibility,
} from "@fogpipe/forma-core";
import type { OptionsVisibilityResult } from "@fogpipe/forma-core";

/**
 * Options for useForma hook
 */
export interface UseFormaOptions {
  /** The Forma specification */
  spec: Forma;
  /** Initial form data */
  initialData?: Record<string, unknown>;
  /** Submit handler */
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  /** Change handler */
  onChange?: (
    data: Record<string, unknown>,
    computed?: Record<string, unknown>,
  ) => void;
  /** When to validate: on change, blur, or submit only */
  validateOn?: "change" | "blur" | "submit";
  /** Additional reference data to merge with spec.referenceData */
  referenceData?: Record<string, unknown>;
  /**
   * Debounce validation by this many milliseconds.
   * Useful for large forms to improve performance.
   * Set to 0 (default) for immediate validation.
   */
  validationDebounceMs?: number;
}

/**
 * Form state
 */
interface FormState {
  data: Record<string, unknown>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  isDirty: boolean;
  currentPage: number;
}

/**
 * State actions
 */
type FormAction =
  | { type: "SET_FIELD_VALUE"; field: string; value: unknown }
  | { type: "SET_FIELD_TOUCHED"; field: string; touched: boolean }
  | { type: "SET_VALUES"; values: Record<string, unknown> }
  | { type: "SET_SUBMITTING"; isSubmitting: boolean }
  | { type: "SET_SUBMITTED"; isSubmitted: boolean }
  | { type: "SET_PAGE"; page: number }
  | { type: "RESET"; initialData: Record<string, unknown> };

/**
 * Page state for multi-page forms
 */
export interface PageState {
  id: string;
  title: string;
  description?: string;
  visible: boolean;
  fields: string[];
}

/**
 * Wizard navigation helpers
 */
export interface WizardHelpers {
  pages: PageState[];
  currentPageIndex: number;
  currentPage: PageState | null;
  goToPage: (index: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  canProceed: boolean;
  isLastPage: boolean;
  touchCurrentPageFields: () => void;
  validateCurrentPage: () => boolean;
}

/**
 * Return type of useForma hook
 */
export interface UseFormaReturn {
  /** Current form data */
  data: Record<string, unknown>;
  /** Computed field values */
  computed: Record<string, unknown>;
  /** Field visibility map */
  visibility: Record<string, boolean>;
  /** Field required state map */
  required: Record<string, boolean>;
  /** Field enabled state map */
  enabled: Record<string, boolean>;
  /** Field readonly state map */
  readonly: Record<string, boolean>;
  /** Visible options for select/multiselect fields, keyed by field path */
  optionsVisibility: OptionsVisibilityResult;
  /** Field touched state map */
  touched: Record<string, boolean>;
  /** Validation errors */
  errors: FieldError[];
  /** Whether form is valid */
  isValid: boolean;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Whether form has been submitted */
  isSubmitted: boolean;
  /** Whether any field has been modified */
  isDirty: boolean;
  /** The Forma spec */
  spec: Forma;
  /** Wizard helpers (if multi-page) */
  wizard: WizardHelpers | null;

  /** Set a field value */
  setFieldValue: (path: string, value: unknown) => void;
  /** Set a field as touched */
  setFieldTouched: (path: string, touched?: boolean) => void;
  /** Set multiple values */
  setValues: (values: Record<string, unknown>) => void;
  /** Validate a single field */
  validateField: (path: string) => FieldError[];
  /** Validate entire form */
  validateForm: () => ValidationResult;
  /** Submit the form */
  submitForm: () => Promise<void>;
  /** Reset the form */
  resetForm: () => void;

  // Helper methods for getting field props
  /** Get props for any field */
  getFieldProps: (path: string) => GetFieldPropsResult;
  /** Get props for select field (includes options) */
  getSelectFieldProps: (path: string) => GetSelectFieldPropsResult;
  /** Get array helpers for array field */
  getArrayHelpers: (path: string) => GetArrayHelpersResult;
}

/**
 * State reducer
 */
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD_VALUE":
      return {
        ...state,
        data: { ...state.data, [action.field]: action.value },
        isDirty: true,
        isSubmitted: false, // Clear on data change
      };
    case "SET_FIELD_TOUCHED":
      return {
        ...state,
        touched: { ...state.touched, [action.field]: action.touched },
      };
    case "SET_VALUES":
      return {
        ...state,
        data: { ...state.data, ...action.values },
        isDirty: true,
        isSubmitted: false, // Clear on data change
      };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.isSubmitting };
    case "SET_SUBMITTED":
      return { ...state, isSubmitted: action.isSubmitted };
    case "SET_PAGE":
      return { ...state, currentPage: action.page };
    case "RESET":
      return {
        data: action.initialData,
        touched: {},
        isSubmitting: false,
        isSubmitted: false,
        isDirty: false,
        currentPage: 0,
      };
    default:
      return state;
  }
}

/**
 * Get default initial values for boolean fields.
 * Boolean fields default to false to avoid undefined state,
 * which provides better UX since false is a valid answer.
 */
function getDefaultBooleanValues(spec: Forma): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const fieldPath of spec.fieldOrder) {
    const schemaProperty = spec.schema.properties?.[fieldPath];
    const fieldDef = spec.fields[fieldPath];
    if (schemaProperty?.type === "boolean" || fieldDef?.type === "boolean") {
      defaults[fieldPath] = false;
    }
  }
  return defaults;
}

/**
 * Get default values from field definitions.
 * Collects `defaultValue` from each field that specifies one.
 * These are applied after boolean defaults but before initialData,
 * so explicit defaults override type-implicit defaults,
 * and runtime initialData overrides everything.
 */
function getFieldDefaults(spec: Forma): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const [fieldPath, fieldDef] of Object.entries(spec.fields)) {
    if (fieldDef.defaultValue !== undefined) {
      defaults[fieldPath] = fieldDef.defaultValue;
    }
  }
  return defaults;
}

/**
 * Main Forma hook
 */
export function useForma(options: UseFormaOptions): UseFormaReturn {
  const {
    spec: inputSpec,
    initialData = {},
    onSubmit,
    onChange,
    validateOn = "blur",
    referenceData,
    validationDebounceMs = 0,
  } = options;

  // Merge referenceData from options with spec.referenceData
  const spec = useMemo((): Forma => {
    if (!referenceData) return inputSpec;
    return {
      ...inputSpec,
      referenceData: {
        ...inputSpec.referenceData,
        ...referenceData,
      },
    };
  }, [inputSpec, referenceData]);

  const [state, dispatch] = useReducer(formReducer, {
    data: {
      ...getDefaultBooleanValues(spec),
      ...getFieldDefaults(spec),
      ...initialData,
    },
    touched: {},
    isSubmitting: false,
    isSubmitted: false,
    isDirty: false,
    currentPage: 0,
  });

  // Keep a ref to current state.data to avoid stale closures in cached handlers
  const stateDataRef = useRef(state.data);
  stateDataRef.current = state.data;

  // Track if we've initialized (to avoid calling onChange on first render)
  const hasInitialized = useRef(false);

  // Calculate computed values
  const computed = useMemo(
    () => calculate(state.data, spec),
    [state.data, spec],
  );

  // Calculate visibility
  const visibility = useMemo(
    () => getVisibility(state.data, spec, { computed }),
    [state.data, spec, computed],
  );

  // Calculate required state
  const required = useMemo(
    () => getRequired(state.data, spec, { computed }),
    [state.data, spec, computed],
  );

  // Calculate enabled state
  const enabled = useMemo(
    () => getEnabled(state.data, spec, { computed }),
    [state.data, spec, computed],
  );

  // Calculate readonly state
  const readonly = useMemo(
    () => getReadonly(state.data, spec, { computed }),
    [state.data, spec, computed],
  );

  // Calculate visible options for all select/multiselect fields (memoized)
  const optionsVisibility = useMemo(
    () => getOptionsVisibility(state.data, spec, { computed }),
    [state.data, spec, computed],
  );

  // Validate form - compute immediate result
  const immediateValidation = useMemo(
    () => validate(state.data, spec, { computed, onlyVisible: true }),
    [state.data, spec, computed],
  );

  // Debounced validation state (only used when validationDebounceMs > 0)
  const [debouncedValidation, setDebouncedValidation] =
    useState<ValidationResult>(immediateValidation);

  // Apply debouncing if configured
  useEffect(() => {
    if (validationDebounceMs <= 0) {
      // No debouncing - use immediate validation
      setDebouncedValidation(immediateValidation);
      return;
    }

    // Debounce validation updates
    const timeoutId = setTimeout(() => {
      setDebouncedValidation(immediateValidation);
    }, validationDebounceMs);

    return () => clearTimeout(timeoutId);
  }, [immediateValidation, validationDebounceMs]);

  // Use debounced validation for display, but immediate for submit
  const validation =
    validationDebounceMs > 0 ? debouncedValidation : immediateValidation;

  // isDirty is tracked via reducer state for O(1) performance

  // Call onChange when data changes (not on initial render)
  useEffect(() => {
    if (hasInitialized.current) {
      onChange?.(state.data, computed);
    } else {
      hasInitialized.current = true;
    }
  }, [state.data, computed, onChange]);

  // Helper function to set value at nested path
  const setNestedValue = useCallback(
    (path: string, value: unknown): void => {
      // Handle array index notation: "items[0].name" -> nested structure
      const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");

      if (parts.length === 1) {
        // Simple path - just set directly
        dispatch({ type: "SET_FIELD_VALUE", field: path, value });
        return;
      }

      // Build nested object for complex paths
      const buildNestedObject = (
        data: Record<string, unknown>,
        pathParts: string[],
        val: unknown,
      ): Record<string, unknown> => {
        const result = { ...data };
        let current: Record<string, unknown> = result;

        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          const nextPart = pathParts[i + 1];
          const isNextArrayIndex = /^\d+$/.test(nextPart);

          if (current[part] === undefined) {
            current[part] = isNextArrayIndex ? [] : {};
          } else if (Array.isArray(current[part])) {
            current[part] = [...(current[part] as unknown[])];
          } else {
            current[part] = { ...(current[part] as Record<string, unknown>) };
          }
          current = current[part] as Record<string, unknown>;
        }

        current[pathParts[pathParts.length - 1]] = val;
        return result;
      };

      dispatch({
        type: "SET_VALUES",
        values: buildNestedObject(state.data, parts, value),
      });
    },
    [state.data],
  );

  // Actions
  const setFieldValue = useCallback(
    (path: string, value: unknown) => {
      setNestedValue(path, value);
      if (validateOn === "change") {
        dispatch({ type: "SET_FIELD_TOUCHED", field: path, touched: true });
      }
    },
    [validateOn, setNestedValue],
  );

  const setFieldTouched = useCallback((path: string, touched = true) => {
    dispatch({ type: "SET_FIELD_TOUCHED", field: path, touched });
  }, []);

  const setValues = useCallback((values: Record<string, unknown>) => {
    dispatch({ type: "SET_VALUES", values });
  }, []);

  const validateField = useCallback(
    (path: string): FieldError[] => {
      return validation.errors.filter((e) => e.field === path);
    },
    [validation],
  );

  const validateForm = useCallback((): ValidationResult => {
    return validation;
  }, [validation]);

  const submitForm = useCallback(async () => {
    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });
    try {
      // Always use immediate validation on submit to ensure accurate result
      if (immediateValidation.valid && onSubmit) {
        await onSubmit(state.data);
      }
      dispatch({ type: "SET_SUBMITTED", isSubmitted: true });
    } finally {
      dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
    }
  }, [immediateValidation, onSubmit, state.data]);

  const resetForm = useCallback(() => {
    dispatch({
      type: "RESET",
      initialData: {
        ...getDefaultBooleanValues(spec),
        ...getFieldDefaults(spec),
        ...initialData,
      },
    });
  }, [spec, initialData]);

  // Wizard helpers
  const wizard = useMemo((): WizardHelpers | null => {
    if (!spec.pages || spec.pages.length === 0) return null;

    const pageVisibility = getPageVisibility(state.data, spec, { computed });

    // Include all pages with their visibility status
    const pages: PageState[] = spec.pages.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      visible: pageVisibility[p.id] !== false,
      fields: p.fields,
    }));

    // For navigation, only count visible pages
    const visiblePages = pages.filter((p) => p.visible);

    // Clamp currentPage to valid range (handles case where current page becomes hidden)
    const maxPageIndex = Math.max(0, visiblePages.length - 1);
    const clampedPageIndex = Math.min(
      Math.max(0, state.currentPage),
      maxPageIndex,
    );

    // Auto-correct page index if it's out of bounds
    if (clampedPageIndex !== state.currentPage && visiblePages.length > 0) {
      dispatch({ type: "SET_PAGE", page: clampedPageIndex });
    }

    const currentPage = visiblePages[clampedPageIndex] || null;
    const hasNextPage = clampedPageIndex < visiblePages.length - 1;
    const hasPreviousPage = clampedPageIndex > 0;
    const isLastPage = clampedPageIndex === visiblePages.length - 1;

    return {
      pages,
      currentPageIndex: clampedPageIndex,
      currentPage,
      goToPage: (index: number) => {
        // Clamp to valid range
        const validIndex = Math.min(Math.max(0, index), maxPageIndex);
        dispatch({ type: "SET_PAGE", page: validIndex });
      },
      nextPage: () => {
        if (hasNextPage) {
          dispatch({ type: "SET_PAGE", page: clampedPageIndex + 1 });
        }
      },
      previousPage: () => {
        if (hasPreviousPage) {
          dispatch({ type: "SET_PAGE", page: clampedPageIndex - 1 });
        }
      },
      hasNextPage,
      hasPreviousPage,
      canProceed: (() => {
        if (!currentPage) return true;
        // Get errors only for visible fields on the current page
        const pageErrors = validation.errors.filter((e) => {
          // Check if field is on current page (including array items like "items[0].name")
          const isOnCurrentPage =
            currentPage.fields.includes(e.field) ||
            currentPage.fields.some((f) => e.field.startsWith(`${f}[`));
          // Only count errors for visible fields
          const isVisible = visibility[e.field] !== false;
          // Only count actual errors, not warnings
          const isError = e.severity === "error";
          return isOnCurrentPage && isVisible && isError;
        });
        return pageErrors.length === 0;
      })(),
      isLastPage,
      touchCurrentPageFields: () => {
        if (currentPage) {
          currentPage.fields.forEach((field) => {
            dispatch({ type: "SET_FIELD_TOUCHED", field, touched: true });
          });
        }
      },
      validateCurrentPage: () => {
        if (!currentPage) return true;
        const pageErrors = validation.errors.filter((e) =>
          currentPage.fields.includes(e.field),
        );
        return pageErrors.length === 0;
      },
    };
  }, [spec, state.data, state.currentPage, computed, validation, visibility]);

  // Helper to get value at nested path
  // Uses stateDataRef to always access current state, avoiding stale closure issues
  const getValueAtPath = useCallback((path: string): unknown => {
    // Handle array index notation: "items[0].name" -> ["items", "0", "name"]
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    let value: unknown = stateDataRef.current;
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  }, []); // No dependencies - uses ref for current state

  // Helper to set value at nested path
  // Uses stateDataRef to always access current state, avoiding stale closure issues
  const setValueAtPath = useCallback((path: string, value: unknown): void => {
    // For nested paths, we need to build the nested structure
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    if (parts.length === 1) {
      dispatch({ type: "SET_FIELD_VALUE", field: path, value });
      return;
    }

    // Build nested object from CURRENT state via ref (not stale closure)
    const newData = { ...stateDataRef.current };
    let current: Record<string, unknown> = newData;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const isNextArrayIndex = /^\d+$/.test(nextPart);

      if (current[part] === undefined) {
        current[part] = isNextArrayIndex ? [] : {};
      } else if (Array.isArray(current[part])) {
        current[part] = [...(current[part] as unknown[])];
      } else {
        current[part] = { ...(current[part] as Record<string, unknown>) };
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
    dispatch({ type: "SET_VALUES", values: newData });
  }, []); // No dependencies - uses ref for current state

  // Memoized onChange/onBlur handlers for fields
  const fieldHandlers = useRef<
    Map<string, { onChange: (value: unknown) => void; onBlur: () => void }>
  >(new Map());

  // Clean up stale field handlers when spec changes to prevent memory leaks
  useEffect(() => {
    const validFields = new Set(spec.fieldOrder);
    // Also include array item field patterns
    for (const fieldId of spec.fieldOrder) {
      const fieldDef = spec.fields[fieldId];
      if (fieldDef?.type === "array" && fieldDef.itemFields) {
        for (const key of fieldHandlers.current.keys()) {
          if (key.startsWith(`${fieldId}[`)) {
            validFields.add(key);
          }
        }
      }
    }
    // Remove handlers for fields that no longer exist
    for (const key of fieldHandlers.current.keys()) {
      const baseField = key.split("[")[0];
      if (!validFields.has(key) && !validFields.has(baseField)) {
        fieldHandlers.current.delete(key);
      }
    }
  }, [spec]);

  const getFieldHandlers = useCallback(
    (path: string) => {
      if (!fieldHandlers.current.has(path)) {
        fieldHandlers.current.set(path, {
          onChange: (value: unknown) => setValueAtPath(path, value),
          onBlur: () => setFieldTouched(path),
        });
      }
      return fieldHandlers.current.get(path)!;
    },
    [setValueAtPath, setFieldTouched],
  );

  // Get field props for any field
  const getFieldProps = useCallback(
    (path: string): GetFieldPropsResult => {
      const fieldDef = spec.fields[path];
      const handlers = getFieldHandlers(path);

      // Determine field type from definition or infer from schema
      let fieldType = fieldDef?.type || "text";
      if (!fieldType || fieldType === "computed") {
        const schemaProperty = spec.schema.properties[path];
        if (schemaProperty) {
          if (schemaProperty.type === "number") fieldType = "number";
          else if (schemaProperty.type === "integer") fieldType = "integer";
          else if (schemaProperty.type === "boolean") fieldType = "boolean";
          else if (schemaProperty.type === "array") fieldType = "array";
          else if (schemaProperty.type === "object") fieldType = "object";
          else if ("enum" in schemaProperty && schemaProperty.enum)
            fieldType = "select";
          else if ("format" in schemaProperty) {
            if (schemaProperty.format === "date") fieldType = "date";
            else if (schemaProperty.format === "date-time")
              fieldType = "datetime";
            else if (schemaProperty.format === "email") fieldType = "email";
            else if (schemaProperty.format === "uri") fieldType = "url";
          }
        }
      }

      const fieldErrors = validation.errors.filter((e) => e.field === path);
      const isTouched = state.touched[path] ?? false;
      const showErrors =
        validateOn === "change" ||
        (validateOn === "blur" && isTouched) ||
        state.isSubmitted;
      const displayedErrors = showErrors ? fieldErrors : [];
      const hasErrors = displayedErrors.length > 0;
      const isRequired = required[path] ?? false;

      // Boolean fields: hide asterisk unless they have validation rules (consent pattern)
      // - Binary question ("Do you smoke?"): no validation → false is valid → hide asterisk
      // - Consent checkbox ("I accept terms"): has validation rule → show asterisk
      const schemaProperty = spec.schema.properties[path];
      const isBooleanField =
        schemaProperty?.type === "boolean" || fieldDef?.type === "boolean";
      const hasValidationRules = (fieldDef?.validations?.length ?? 0) > 0;
      const showRequiredIndicator =
        isRequired && (!isBooleanField || hasValidationRules);

      // Pass through adorner props for adornable field types
      const adornerProps =
        fieldDef && isAdornableField(fieldDef)
          ? { prefix: fieldDef.prefix, suffix: fieldDef.suffix }
          : {};

      return {
        name: path,
        value: getValueAtPath(path),
        type: fieldType,
        label: fieldDef?.label || path.charAt(0).toUpperCase() + path.slice(1),
        description: fieldDef?.description,
        placeholder: fieldDef?.placeholder,
        visible: visibility[path] !== false,
        enabled: enabled[path] !== false,
        readonly: readonly[path] ?? false,
        required: isRequired,
        showRequiredIndicator,
        touched: isTouched,
        errors: displayedErrors,
        onChange: handlers.onChange,
        onBlur: handlers.onBlur,
        // ARIA accessibility attributes
        "aria-invalid": hasErrors || undefined,
        "aria-describedby": hasErrors ? `${path}-error` : undefined,
        "aria-required": isRequired || undefined,
        // Adorner props (only for adornable field types)
        ...adornerProps,
        // Presentation variant
        variant: fieldDef?.variant,
        variantConfig: fieldDef?.variantConfig,
      };
    },
    [
      spec,
      state.touched,
      state.isSubmitted,
      visibility,
      enabled,
      readonly,
      required,
      validation.errors,
      validateOn,
      getValueAtPath,
      getFieldHandlers,
    ],
  );

  // Get select field props - uses pre-computed optionsVisibility map
  const getSelectFieldProps = useCallback(
    (path: string): GetSelectFieldPropsResult => {
      const baseProps = getFieldProps(path);

      // Look up pre-computed visible options from memoized map
      const visibleOptions = optionsVisibility[path] ?? [];

      return {
        ...baseProps,
        options: visibleOptions as SelectOption[],
      };
    },
    [getFieldProps, optionsVisibility],
  );

  // Get array helpers
  const getArrayHelpers = useCallback(
    (path: string): GetArrayHelpersResult => {
      const fieldDef = spec.fields[path];
      const currentValue = (getValueAtPath(path) as unknown[]) ?? [];
      const arrayDef = fieldDef?.type === "array" ? fieldDef : undefined;
      const minItems = arrayDef?.minItems ?? 0;
      const maxItems = arrayDef?.maxItems ?? Infinity;

      const canAdd = currentValue.length < maxItems;
      const canRemove = currentValue.length > minItems;

      const getItemFieldProps = (
        index: number,
        fieldName: string,
      ): GetFieldPropsResult => {
        const itemPath = `${path}[${index}].${fieldName}`;
        const itemFieldDef = arrayDef?.itemFields?.[fieldName];
        const handlers = getFieldHandlers(itemPath);

        // Get item value
        const item = (currentValue[index] as Record<string, unknown>) ?? {};
        const itemValue = item[fieldName];

        const fieldErrors = validation.errors.filter(
          (e) => e.field === itemPath,
        );
        const isTouched = state.touched[itemPath] ?? false;
        const showErrors =
          validateOn === "change" ||
          (validateOn === "blur" && isTouched) ||
          state.isSubmitted;

        // Look up pre-computed visible options from memoized map
        const visibleOptions = optionsVisibility[itemPath] as
          | SelectOption[]
          | undefined;

        return {
          name: itemPath,
          value: itemValue,
          type: itemFieldDef?.type || "text",
          label:
            itemFieldDef?.label ||
            fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
          description: itemFieldDef?.description,
          placeholder: itemFieldDef?.placeholder,
          visible: true,
          enabled: enabled[path] !== false,
          readonly: readonly[itemPath] ?? false,
          required: false, // TODO: Evaluate item field required
          showRequiredIndicator: false, // Item fields don't show required indicator
          touched: isTouched,
          errors: showErrors ? fieldErrors : [],
          onChange: handlers.onChange,
          onBlur: handlers.onBlur,
          options: visibleOptions,
        };
      };

      return {
        items: currentValue,
        push: (item: unknown) => {
          if (canAdd) {
            setValueAtPath(path, [...currentValue, item]);
          }
        },
        remove: (index: number) => {
          if (canRemove) {
            const newArray = [...currentValue];
            newArray.splice(index, 1);
            setValueAtPath(path, newArray);
          }
        },
        move: (from: number, to: number) => {
          const newArray = [...currentValue];
          const [item] = newArray.splice(from, 1);
          newArray.splice(to, 0, item);
          setValueAtPath(path, newArray);
        },
        swap: (indexA: number, indexB: number) => {
          const newArray = [...currentValue];
          [newArray[indexA], newArray[indexB]] = [
            newArray[indexB],
            newArray[indexA],
          ];
          setValueAtPath(path, newArray);
        },
        insert: (index: number, item: unknown) => {
          if (canAdd) {
            const newArray = [...currentValue];
            newArray.splice(index, 0, item);
            setValueAtPath(path, newArray);
          }
        },
        getItemFieldProps,
        minItems,
        maxItems,
        canAdd,
        canRemove,
      };
    },
    [
      spec.fields,
      getValueAtPath,
      setValueAtPath,
      getFieldHandlers,
      enabled,
      readonly,
      state.touched,
      state.isSubmitted,
      validation.errors,
      validateOn,
      optionsVisibility,
    ],
  );

  return useMemo(
    (): UseFormaReturn => ({
      data: state.data,
      computed,
      visibility,
      required,
      enabled,
      readonly,
      optionsVisibility,
      touched: state.touched,
      errors: validation.errors,
      isValid: validation.valid,
      isSubmitting: state.isSubmitting,
      isSubmitted: state.isSubmitted,
      isDirty: state.isDirty,
      spec,
      wizard,
      setFieldValue,
      setFieldTouched,
      setValues,
      validateField,
      validateForm,
      submitForm,
      resetForm,
      getFieldProps,
      getSelectFieldProps,
      getArrayHelpers,
    }),
    [
      state.data,
      state.touched,
      state.isSubmitting,
      state.isSubmitted,
      state.isDirty,
      computed,
      visibility,
      required,
      enabled,
      readonly,
      optionsVisibility,
      validation.errors,
      validation.valid,
      spec,
      wizard,
      setFieldValue,
      setFieldTouched,
      setValues,
      validateField,
      validateForm,
      submitForm,
      resetForm,
      getFieldProps,
      getSelectFieldProps,
      getArrayHelpers,
    ],
  );
}
