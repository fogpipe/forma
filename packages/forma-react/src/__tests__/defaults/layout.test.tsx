/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for default layout components
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { FieldError } from "@fogpipe/forma-core";
import type { FieldWrapperProps, PageWrapperProps } from "../../types.js";
import { FieldWrapper } from "../../defaults/layout/FieldWrapper.js";
import { FormLayout } from "../../defaults/layout/FormLayout.js";
import { PageWrapper } from "../../defaults/layout/PageWrapper.js";
import { FormaContext } from "../../context.js";
import type { UseFormaReturn } from "../../useForma.js";

function mockFormaContext(
  overrides: Partial<UseFormaReturn> = {},
): UseFormaReturn {
  return {
    data: {},
    computed: {},
    visibility: {},
    required: {},
    enabled: {},
    readonly: {},
    optionsVisibility: {},
    touched: {},
    errors: [],
    isValid: true,
    isSubmitting: false,
    isSubmitted: false,
    isDirty: false,
    spec: {} as UseFormaReturn["spec"],
    wizard: null,
    setFieldValue: vi.fn(),
    setFieldTouched: vi.fn(),
    setValues: vi.fn(),
    validateField: vi.fn(),
    validateForm: vi.fn(),
    submitForm: vi.fn(),
    resetForm: vi.fn(),
    getFieldProps: vi.fn(),
    getSelectFieldProps: vi.fn(),
    getArrayHelpers: vi.fn(),
    on: vi.fn(),
    ...overrides,
  } as unknown as UseFormaReturn;
}

function renderWithContext(
  ui: React.ReactElement,
  contextOverrides: Partial<UseFormaReturn> = {},
) {
  const ctx = mockFormaContext(contextOverrides);
  return render(
    <FormaContext.Provider value={ctx}>{ui}</FormaContext.Provider>,
  );
}

// ============================================================================
// FieldWrapper
// ============================================================================
describe("FieldWrapper", () => {
  function makeProps(
    overrides: Partial<FieldWrapperProps> = {},
  ): FieldWrapperProps {
    return {
      fieldPath: "testField",
      field: {
        type: "text",
        label: "Test Field",
      } as FieldWrapperProps["field"],
      children: <input type="text" />,
      errors: [],
      touched: false,
      required: false,
      showRequiredIndicator: false,
      visible: true,
      ...overrides,
    };
  }

  it("renders label with field name", () => {
    renderWithContext(<FieldWrapper {...makeProps()} />);
    expect(screen.getByText("Test Field")).toBeInTheDocument();
  });

  it("shows required indicator when showRequiredIndicator is true", () => {
    renderWithContext(
      <FieldWrapper {...makeProps({ showRequiredIndicator: true })} />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("hides required indicator when showRequiredIndicator is false", () => {
    renderWithContext(
      <FieldWrapper {...makeProps({ showRequiredIndicator: false })} />,
    );
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("renders description when provided", () => {
    renderWithContext(
      <FieldWrapper
        {...makeProps({
          field: {
            type: "text",
            label: "Test Field",
            description: "Help text here",
          } as FieldWrapperProps["field"],
        })}
      />,
    );
    expect(screen.getByText("Help text here")).toBeInTheDocument();
  });

  it("renders children", () => {
    renderWithContext(
      <FieldWrapper
        {...makeProps({ children: <span>Child content</span> })}
      />,
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("does NOT render errors when touched is false and not submitted", () => {
    const errors: FieldError[] = [
      { field: "testField", message: "Required", severity: "error" },
    ];
    renderWithContext(
      <FieldWrapper {...makeProps({ errors, touched: false })} />,
    );
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });

  it("renders errors when touched is true and errors exist", () => {
    const errors: FieldError[] = [
      { field: "testField", message: "Required", severity: "error" },
    ];
    renderWithContext(
      <FieldWrapper {...makeProps({ errors, touched: true })} />,
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders errors when isSubmitted is true even if not touched", () => {
    const errors: FieldError[] = [
      { field: "testField", message: "Required", severity: "error" },
    ];
    renderWithContext(
      <FieldWrapper {...makeProps({ errors, touched: false })} />,
      { isSubmitted: true },
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("error container has role=alert", () => {
    const errors: FieldError[] = [
      { field: "testField", message: "Required", severity: "error" },
    ];
    renderWithContext(
      <FieldWrapper {...makeProps({ errors, touched: true })} />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("returns null when visible is false", () => {
    const { container } = renderWithContext(
      <FieldWrapper {...makeProps({ visible: false })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("applies forma-field--error class when has visible errors", () => {
    const errors: FieldError[] = [
      { field: "testField", message: "Required", severity: "error" },
    ];
    const { container } = renderWithContext(
      <FieldWrapper {...makeProps({ errors, touched: true })} />,
    );
    expect(container.firstChild).toHaveClass("forma-field--error");
  });

  it("applies forma-field--required class when showRequiredIndicator", () => {
    const { container } = renderWithContext(
      <FieldWrapper {...makeProps({ showRequiredIndicator: true })} />,
    );
    expect(container.firstChild).toHaveClass("forma-field--required");
  });
});

// ============================================================================
// FormLayout
// ============================================================================
describe("FormLayout", () => {
  it("renders as form element", () => {
    const { container } = render(
      <FormLayout onSubmit={vi.fn()} isSubmitting={false} isValid={true}>
        <div>Content</div>
      </FormLayout>,
    );
    expect(container.querySelector("form")).toBeInTheDocument();
  });

  it("calls onSubmit on form submit", () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <FormLayout onSubmit={onSubmit} isSubmitting={false} isValid={true}>
        <div>Content</div>
      </FormLayout>,
    );
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("renders submit button with Submit text", () => {
    render(
      <FormLayout onSubmit={vi.fn()} isSubmitting={false} isValid={true}>
        <div>Content</div>
      </FormLayout>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Submit");
  });

  it("shows Submitting... and disables button when isSubmitting", () => {
    render(
      <FormLayout onSubmit={vi.fn()} isSubmitting={true} isValid={true}>
        <div>Content</div>
      </FormLayout>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Submitting...");
    expect(button).toBeDisabled();
  });

  it("sets aria-busy on button when submitting", () => {
    render(
      <FormLayout onSubmit={vi.fn()} isSubmitting={true} isValid={true}>
        <div>Content</div>
      </FormLayout>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("renders children inside form", () => {
    render(
      <FormLayout onSubmit={vi.fn()} isSubmitting={false} isValid={true}>
        <div>Form content</div>
      </FormLayout>,
    );
    expect(screen.getByText("Form content")).toBeInTheDocument();
  });
});

// ============================================================================
// PageWrapper
// ============================================================================
describe("PageWrapper", () => {
  function makePageProps(
    overrides: Partial<PageWrapperProps> = {},
  ): PageWrapperProps {
    return {
      title: "Page Title",
      children: <div>Page content</div>,
      pageIndex: 0,
      totalPages: 3,
      ...overrides,
    };
  }

  it("renders title as h2", () => {
    render(<PageWrapper {...makePageProps()} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Page Title",
    );
  });

  it("renders description when provided", () => {
    render(
      <PageWrapper
        {...makePageProps({ description: "Some description" })}
      />,
    );
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("omits description element when not provided", () => {
    const { container } = render(<PageWrapper {...makePageProps()} />);
    expect(
      container.querySelector(".forma-page__description"),
    ).not.toBeInTheDocument();
  });

  it("renders children", () => {
    render(<PageWrapper {...makePageProps()} />);
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
