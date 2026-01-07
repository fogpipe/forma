/**
 * useForma Hook
 *
 * Main hook for managing Forma form state.
 * This is a placeholder - the full implementation will be migrated from formidable.
 */

import { useCallback, useMemo, useReducer } from "react";
import type { Forma, FieldError, ValidationResult } from "@fogpipe/forma-core";
import {
  getVisibility,
  getRequired,
  getEnabled,
  validate,
  calculate,
  getPageVisibility,
} from "@fogpipe/forma-core";

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
  onChange?: (data: Record<string, unknown>, computed?: Record<string, unknown>) => void;
  /** When to validate: on change, blur, or submit only */
  validateOn?: "change" | "blur" | "submit";
}

/**
 * Form state
 */
interface FormState {
  data: Record<string, unknown>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isSubmitted: boolean;
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
        currentPage: 0,
      };
    default:
      return state;
  }
}

/**
 * Main Forma hook
 */
export function useForma(options: UseFormaOptions): UseFormaReturn {
  const { spec, initialData = {}, onSubmit, onChange, validateOn = "blur" } = options;

  const [state, dispatch] = useReducer(formReducer, {
    data: initialData,
    touched: {},
    isSubmitting: false,
    isSubmitted: false,
    currentPage: 0,
  });

  // Calculate computed values
  const computed = useMemo(
    () => calculate(state.data, spec),
    [state.data, spec]
  );

  // Calculate visibility
  const visibility = useMemo(
    () => getVisibility(state.data, spec, { computed }),
    [state.data, spec, computed]
  );

  // Calculate required state
  const required = useMemo(
    () => getRequired(state.data, spec, { computed }),
    [state.data, spec, computed]
  );

  // Calculate enabled state
  const enabled = useMemo(
    () => getEnabled(state.data, spec, { computed }),
    [state.data, spec, computed]
  );

  // Validate form
  const validation = useMemo(
    () => validate(state.data, spec, { computed, onlyVisible: true }),
    [state.data, spec, computed]
  );

  // Check if form is dirty
  const isDirty = useMemo(
    () => Object.keys(state.touched).length > 0,
    [state.touched]
  );

  // Actions
  const setFieldValue = useCallback(
    (path: string, value: unknown) => {
      dispatch({ type: "SET_FIELD_VALUE", field: path, value });
      if (validateOn === "change") {
        dispatch({ type: "SET_FIELD_TOUCHED", field: path, touched: true });
      }
      onChange?.(state.data, computed);
    },
    [validateOn, onChange, state.data, computed]
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
    [validation]
  );

  const validateForm = useCallback((): ValidationResult => {
    return validation;
  }, [validation]);

  const submitForm = useCallback(async () => {
    dispatch({ type: "SET_SUBMITTING", isSubmitting: true });
    try {
      if (validation.valid && onSubmit) {
        await onSubmit(state.data);
      }
      dispatch({ type: "SET_SUBMITTED", isSubmitted: true });
    } finally {
      dispatch({ type: "SET_SUBMITTING", isSubmitting: false });
    }
  }, [validation, onSubmit, state.data]);

  const resetForm = useCallback(() => {
    dispatch({ type: "RESET", initialData });
  }, [initialData]);

  // Wizard helpers
  const wizard = useMemo((): WizardHelpers | null => {
    if (!spec.pages || spec.pages.length === 0) return null;

    const pageVisibility = getPageVisibility(state.data, spec, { computed });
    const visiblePages = spec.pages.filter((p) => pageVisibility[p.id] !== false);

    const pages: PageState[] = visiblePages.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      visible: pageVisibility[p.id] !== false,
      fields: p.fields,
    }));

    const currentPage = pages[state.currentPage] || null;
    const hasNextPage = state.currentPage < pages.length - 1;
    const hasPreviousPage = state.currentPage > 0;
    const isLastPage = state.currentPage === pages.length - 1;

    return {
      pages,
      currentPageIndex: state.currentPage,
      currentPage,
      goToPage: (index: number) => dispatch({ type: "SET_PAGE", page: index }),
      nextPage: () => {
        if (hasNextPage) {
          dispatch({ type: "SET_PAGE", page: state.currentPage + 1 });
        }
      },
      previousPage: () => {
        if (hasPreviousPage) {
          dispatch({ type: "SET_PAGE", page: state.currentPage - 1 });
        }
      },
      hasNextPage,
      hasPreviousPage,
      canProceed: true, // TODO: Validate current page
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
          currentPage.fields.includes(e.field)
        );
        return pageErrors.length === 0;
      },
    };
  }, [spec.pages, state.data, state.currentPage, computed, validation]);

  return {
    data: state.data,
    computed,
    visibility,
    required,
    enabled,
    errors: validation.errors,
    isValid: validation.valid,
    isSubmitting: state.isSubmitting,
    isSubmitted: state.isSubmitted,
    isDirty,
    spec,
    wizard,
    setFieldValue,
    setFieldTouched,
    setValues,
    validateField,
    validateForm,
    submitForm,
    resetForm,
  };
}
