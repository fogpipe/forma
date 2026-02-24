/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for FormRenderer component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useRef } from "react";
import { FormRenderer } from "../FormRenderer.js";
import { useFormaContext } from "../context.js";
import { createTestSpec, createTestComponentMap } from "./test-utils.js";
import type { FormRendererHandle } from "../FormRenderer.js";
import type { LayoutProps, PageWrapperProps, ComponentMap } from "../types.js";
import type { UseFormaReturn } from "../useForma.js";

describe("FormRenderer", () => {
  // ============================================================================
  // Basic Rendering
  // ============================================================================

  describe("basic rendering", () => {
    it("should render fields from spec", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name" },
          email: { type: "email", label: "Email" },
        },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      expect(screen.getByTestId("field-name")).toBeInTheDocument();
      expect(screen.getByTestId("field-email")).toBeInTheDocument();
    });

    it("should render fields in fieldOrder", () => {
      const spec = createTestSpec({
        fields: {
          a: { type: "text", label: "A" },
          b: { type: "text", label: "B" },
          c: { type: "text", label: "C" },
        },
        fieldOrder: ["c", "a", "b"],
      });

      const { container } = render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      const fields = container.querySelectorAll("[data-testid^='field-']");
      expect(fields[0]).toHaveAttribute("data-testid", "field-c");
      expect(fields[1]).toHaveAttribute("data-testid", "field-a");
      expect(fields[2]).toHaveAttribute("data-testid", "field-b");
    });

    it("should render with initial data", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name" },
        },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ name: "John Doe" }}
          components={createTestComponentMap()}
        />,
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("John Doe");
    });

    it("should render with defaultValue pre-populated", () => {
      const spec = createTestSpec({
        fields: {
          country: {
            type: "select",
            label: "Country",
            defaultValue: "us",
            options: [
              { value: "us", label: "United States" },
              { value: "ca", label: "Canada" },
            ],
          },
          quantity: {
            type: "number",
            label: "Quantity",
            defaultValue: 5,
          },
        },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("us");

      const numberInput = screen.getByRole("spinbutton");
      expect(numberInput).toHaveValue(5);
    });

    it("should let initialData override defaultValue in rendered output", () => {
      const spec = createTestSpec({
        fields: {
          name: {
            type: "text",
            label: "Name",
            defaultValue: "Default Name",
          },
        },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ name: "Override" }}
          components={createTestComponentMap()}
        />,
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("Override");
    });

    it("should use custom layout component", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const CustomLayout = ({ children }: LayoutProps) => (
        <div data-testid="custom-layout">{children}</div>
      );

      render(
        <FormRenderer
          spec={spec}
          components={createTestComponentMap()}
          layout={CustomLayout}
        />,
      );

      expect(screen.getByTestId("custom-layout")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Field Type Rendering
  // ============================================================================

  describe("field type rendering", () => {
    it("should render text field", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should render number field", () => {
      const spec = createTestSpec({
        fields: { age: { type: "number" } },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("should render boolean field", () => {
      const spec = createTestSpec({
        fields: { agree: { type: "boolean" } },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("should render select field with options", () => {
      const spec = createTestSpec({
        fields: {
          country: {
            type: "select",
            options: [
              { value: "us", label: "United States" },
              { value: "ca", label: "Canada" },
            ],
          },
        },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("Canada")).toBeInTheDocument();
    });

    it("should render array field", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            label: "Items",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ items: [{ name: "Item 1" }] }}
          components={createTestComponentMap()}
        />,
      );

      expect(screen.getByTestId("field-items")).toBeInTheDocument();
      expect(screen.getByTestId("add-items")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // User Interactions
  // ============================================================================

  describe("user interactions", () => {
    it("should update value on text input", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      render(
        <FormRenderer
          spec={spec}
          components={createTestComponentMap()}
          onChange={onChange}
        />,
      );

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello");

      expect(input).toHaveValue("Hello");
      expect(onChange).toHaveBeenCalled();
    });

    it("should update value on checkbox toggle", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: { agree: { type: "boolean" } },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ agree: false }}
          components={createTestComponentMap()}
        />,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it("should update value on select change", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          country: {
            type: "select",
            options: [
              { value: "us", label: "United States" },
              { value: "ca", label: "Canada" },
            ],
          },
        },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "ca");

      expect(select).toHaveValue("ca");
    });
  });

  // ============================================================================
  // Form Submission
  // ============================================================================

  describe("form submission", () => {
    it("should call onSubmit with form data", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ name: "John" }}
          onSubmit={onSubmit}
          components={createTestComponentMap()}
        />,
      );

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({ name: "John" });
    });

    it("should not submit when form is invalid", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const spec = createTestSpec({
        fields: { name: { type: "text", required: true } },
      });

      render(
        <FormRenderer
          spec={spec}
          onSubmit={onSubmit}
          components={createTestComponentMap()}
        />,
      );

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should show validation errors after submit attempt", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: { name: { type: "text", required: true } },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      // Error should now be visible
      await waitFor(() => {
        expect(screen.getByTestId("error-name")).toBeInTheDocument();
      });
    });

    it("should disable submit button while submitting", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(
        (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ name: "John" }}
          onSubmit={onSubmit}
          components={createTestComponentMap()}
        />,
      );

      const submitButton = screen.getByRole("button", { name: /submit/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Submitting...");

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  // ============================================================================
  // Imperative Handle (ref)
  // ============================================================================

  describe("imperative handle (ref)", () => {
    it("should expose submitForm via ref", async () => {
      const onSubmit = vi.fn();
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      let formRef: React.RefObject<FormRendererHandle | null>;

      function TestComponent() {
        formRef = useRef<FormRendererHandle>(null);
        return (
          <FormRenderer
            ref={formRef}
            spec={spec}
            initialData={{ name: "Test" }}
            onSubmit={onSubmit}
            components={createTestComponentMap()}
          />
        );
      }

      render(<TestComponent />);

      await act(async () => {
        await formRef!.current?.submitForm();
      });

      expect(onSubmit).toHaveBeenCalledWith({ name: "Test" });
    });

    it("should expose resetForm via ref", async () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      let formRef: React.RefObject<FormRendererHandle | null>;

      function TestComponent() {
        formRef = useRef<FormRendererHandle>(null);
        return (
          <FormRenderer
            ref={formRef}
            spec={spec}
            initialData={{ name: "Original" }}
            components={createTestComponentMap()}
          />
        );
      }

      const { rerender } = render(<TestComponent />);
      const user = userEvent.setup();

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "Changed");
      expect(input).toHaveValue("Changed");

      act(() => {
        formRef!.current?.resetForm();
      });
      rerender(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByRole("textbox")).toHaveValue("Original");
      });
    });

    it("should expose validateForm via ref", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text", required: true } },
      });

      let formRef: React.RefObject<FormRendererHandle | null>;

      function TestComponent() {
        formRef = useRef<FormRendererHandle>(null);
        return (
          <FormRenderer
            ref={formRef}
            spec={spec}
            components={createTestComponentMap()}
          />
        );
      }

      render(<TestComponent />);

      const result = formRef!.current?.validateForm();

      expect(result?.valid).toBe(false);
      expect(result?.errors.length).toBeGreaterThan(0);
    });

    it("should expose getValues via ref", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      let formRef: React.RefObject<FormRendererHandle | null>;

      function TestComponent() {
        formRef = useRef<FormRendererHandle>(null);
        return (
          <FormRenderer
            ref={formRef}
            spec={spec}
            initialData={{ name: "Test Value" }}
            components={createTestComponentMap()}
          />
        );
      }

      render(<TestComponent />);

      const values = formRef!.current?.getValues();

      expect(values).toEqual({ name: "Test Value" });
    });

    it("should expose setValues via ref", async () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      let formRef: React.RefObject<FormRendererHandle | null>;

      function TestComponent() {
        formRef = useRef<FormRendererHandle>(null);
        return (
          <FormRenderer
            ref={formRef}
            spec={spec}
            components={createTestComponentMap()}
          />
        );
      }

      const { rerender } = render(<TestComponent />);

      act(() => {
        formRef!.current?.setValues({ name: "New Value" });
      });
      rerender(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByRole("textbox")).toHaveValue("New Value");
      });
    });

    it("should expose isValid and isDirty via ref", async () => {
      const spec = createTestSpec({
        fields: { name: { type: "text", required: true } },
      });

      let formRef: React.RefObject<FormRendererHandle | null>;

      function TestComponent() {
        formRef = useRef<FormRendererHandle>(null);
        return (
          <FormRenderer
            ref={formRef}
            spec={spec}
            components={createTestComponentMap()}
          />
        );
      }

      const { rerender } = render(<TestComponent />);

      expect(formRef!.current?.isValid).toBe(false);
      expect(formRef!.current?.isDirty).toBe(false);

      act(() => {
        formRef!.current?.setValues({ name: "Value" });
      });
      rerender(<TestComponent />);

      await waitFor(() => {
        expect(formRef!.current?.isValid).toBe(true);
        expect(formRef!.current?.isDirty).toBe(true);
      });
    });
  });

  // ============================================================================
  // Context
  // ============================================================================

  describe("context", () => {
    it("should provide form state via FormaContext", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      let contextValue: UseFormaReturn | null = null;

      function ContextConsumer() {
        contextValue = useFormaContext();
        return <div data-testid="consumer">Consumer</div>;
      }

      // Custom component that uses context
      const components: ComponentMap = {
        ...createTestComponentMap(),
        text: () => <ContextConsumer />,
      };

      render(
        <FormRenderer
          spec={spec}
          initialData={{ name: "Test" }}
          components={components}
        />,
      );

      expect(screen.getByTestId("consumer")).toBeInTheDocument();
      expect(contextValue).not.toBeNull();
      expect(contextValue!.data).toEqual({ name: "Test" });
    });

    it("should throw error when useFormaContext used outside provider", () => {
      function BadComponent() {
        useFormaContext();
        return null;
      }

      expect(() => render(<BadComponent />)).toThrow(
        /useFormaContext must be used within/,
      );
    });
  });

  // ============================================================================
  // Wizard / Multi-page Forms
  // ============================================================================

  describe("wizard / multi-page forms", () => {
    it("should render fields for current page only", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name" },
          email: { type: "email", label: "Email" },
        },
        pages: [
          { id: "page1", title: "Step 1", fields: ["name"] },
          { id: "page2", title: "Step 2", fields: ["email"] },
        ],
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      // First page should be visible
      expect(screen.getByTestId("field-name")).toBeInTheDocument();
      // Second page should not be visible
      expect(screen.queryByTestId("field-email")).not.toBeInTheDocument();
    });

    it("should use custom page wrapper", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
        pages: [{ id: "page1", title: "Step 1", fields: ["name"] }],
      });

      // Note: forma-oss passes title/description directly, not a page object
      const CustomPageWrapper = ({ title, children }: PageWrapperProps) => (
        <div data-testid="custom-page" data-page-title={title}>
          {children}
        </div>
      );

      render(
        <FormRenderer
          spec={spec}
          components={createTestComponentMap()}
          pageWrapper={CustomPageWrapper}
        />,
      );

      const pageWrapper = screen.getByTestId("custom-page");
      expect(pageWrapper).toBeInTheDocument();
      expect(pageWrapper).toHaveAttribute("data-page-title", "Step 1");
    });
  });

  // ============================================================================
  // Visibility
  // ============================================================================

  describe("visibility", () => {
    it("should hide fields when visibility is false", () => {
      const spec = createTestSpec({
        fields: {
          showDetails: { type: "boolean", label: "Show Details" },
          details: {
            type: "text",
            label: "Details",
            visibleWhen: "showDetails = true",
          },
        },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ showDetails: false }}
          components={createTestComponentMap()}
        />,
      );

      // Details field should not be rendered when hidden
      expect(screen.queryByTestId("field-details")).not.toBeInTheDocument();
    });

    it("should show fields when visibility becomes true", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          showDetails: { type: "boolean", label: "Show Details" },
          details: {
            type: "text",
            label: "Details",
            visibleWhen: "showDetails = true",
          },
        },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ showDetails: false }}
          components={createTestComponentMap()}
        />,
      );

      // Initially hidden
      expect(screen.queryByTestId("field-details")).not.toBeInTheDocument();

      // Click checkbox to show
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Now visible
      await waitFor(() => {
        expect(screen.getByTestId("field-details")).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Option Visibility (visibleWhen on select options)
  // ============================================================================

  describe("option visibility in FormRenderer", () => {
    it("should filter select options based on visibleWhen expressions", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          department: {
            type: "select",
            label: "Department",
            options: [
              { value: "engineering", label: "Engineering" },
              { value: "sales", label: "Sales" },
            ],
          },
          position: {
            type: "select",
            label: "Position",
            options: [
              {
                value: "dev",
                label: "Developer",
                visibleWhen: 'department = "engineering"',
              },
              {
                value: "qa",
                label: "QA Engineer",
                visibleWhen: 'department = "engineering"',
              },
              {
                value: "rep",
                label: "Sales Rep",
                visibleWhen: 'department = "sales"',
              },
              {
                value: "mgr",
                label: "Sales Manager",
                visibleWhen: 'department = "sales"',
              },
            ],
          },
        },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      // Initially no department selected - no position options should show
      const positionSelect = screen
        .getByTestId("field-position")
        .querySelector("select")!;
      // Only the placeholder "Select..." option should be present
      expect(positionSelect.querySelectorAll("option")).toHaveLength(1);

      // Select Engineering department
      const departmentSelect = screen
        .getByTestId("field-department")
        .querySelector("select")!;
      await user.selectOptions(departmentSelect, "engineering");

      // Now only engineering positions should show
      await waitFor(() => {
        const options = positionSelect.querySelectorAll("option");
        // placeholder + 2 engineering options
        expect(options).toHaveLength(3);
        expect(screen.getByText("Developer")).toBeInTheDocument();
        expect(screen.getByText("QA Engineer")).toBeInTheDocument();
        expect(screen.queryByText("Sales Rep")).not.toBeInTheDocument();
        expect(screen.queryByText("Sales Manager")).not.toBeInTheDocument();
      });

      // Switch to Sales department
      await user.selectOptions(departmentSelect, "sales");

      // Now only sales positions should show
      await waitFor(() => {
        const options = positionSelect.querySelectorAll("option");
        // placeholder + 2 sales options
        expect(options).toHaveLength(3);
        expect(screen.getByText("Sales Rep")).toBeInTheDocument();
        expect(screen.getByText("Sales Manager")).toBeInTheDocument();
        expect(screen.queryByText("Developer")).not.toBeInTheDocument();
        expect(screen.queryByText("QA Engineer")).not.toBeInTheDocument();
      });
    });

    it("should show all options when none have visibleWhen", () => {
      const spec = createTestSpec({
        fields: {
          color: {
            type: "select",
            label: "Color",
            options: [
              { value: "red", label: "Red" },
              { value: "blue", label: "Blue" },
              { value: "green", label: "Green" },
            ],
          },
        },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      expect(screen.getByText("Red")).toBeInTheDocument();
      expect(screen.getByText("Blue")).toBeInTheDocument();
      expect(screen.getByText("Green")).toBeInTheDocument();
    });

    it("should filter multiselect options based on visibleWhen expressions", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          tier: {
            type: "select",
            label: "Tier",
            options: [
              { value: "basic", label: "Basic" },
              { value: "premium", label: "Premium" },
            ],
          },
          features: {
            type: "multiselect",
            label: "Features",
            options: [
              { value: "email", label: "Email Support" },
              {
                value: "phone",
                label: "Phone Support",
                visibleWhen: 'tier = "premium"',
              },
              {
                value: "priority",
                label: "Priority Queue",
                visibleWhen: 'tier = "premium"',
              },
            ],
          },
        },
      });

      render(
        <FormRenderer spec={spec} components={createTestComponentMap()} />,
      );

      // Initially no tier selected - only non-conditional option visible
      const featuresSelect = screen
        .getByTestId("field-features")
        .querySelector("select")!;
      await waitFor(() => {
        // placeholder + 1 option without visibleWhen
        expect(featuresSelect.querySelectorAll("option")).toHaveLength(2);
        expect(screen.getByText("Email Support")).toBeInTheDocument();
        expect(screen.queryByText("Phone Support")).not.toBeInTheDocument();
      });

      // Select Premium tier
      const tierSelect = screen
        .getByTestId("field-tier")
        .querySelector("select")!;
      await user.selectOptions(tierSelect, "premium");

      // All options should now show
      await waitFor(() => {
        // placeholder + 3 options
        expect(featuresSelect.querySelectorAll("option")).toHaveLength(4);
        expect(screen.getByText("Email Support")).toBeInTheDocument();
        expect(screen.getByText("Phone Support")).toBeInTheDocument();
        expect(screen.getByText("Priority Queue")).toBeInTheDocument();
      });
    });

    it("should return empty options when all are filtered out", async () => {
      const spec = createTestSpec({
        fields: {
          category: {
            type: "select",
            label: "Category",
            options: [
              { value: "a", label: "Option A", visibleWhen: "toggle = true" },
              { value: "b", label: "Option B", visibleWhen: "toggle = true" },
            ],
          },
          toggle: {
            type: "boolean",
            label: "Toggle",
          },
        },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ toggle: false }}
          components={createTestComponentMap()}
        />,
      );

      // All options have visibleWhen that evaluates to false
      const categorySelect = screen
        .getByTestId("field-category")
        .querySelector("select")!;
      // Only placeholder
      expect(categorySelect.querySelectorAll("option")).toHaveLength(1);
    });
  });

  // ============================================================================
  // Array Field Interactions
  // ============================================================================

  describe("array field interactions", () => {
    it("should add item when add button clicked", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            label: "Items",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ items: [] }}
          components={createTestComponentMap()}
        />,
      );

      const addButton = screen.getByTestId("add-items");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId("array-item-items-0")).toBeInTheDocument();
      });
    });

    it("should remove item when remove button clicked", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            label: "Items",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      render(
        <FormRenderer
          spec={spec}
          initialData={{ items: [{ name: "Item 1" }, { name: "Item 2" }] }}
          components={createTestComponentMap()}
        />,
      );

      expect(screen.getByTestId("array-item-items-0")).toBeInTheDocument();
      expect(screen.getByTestId("array-item-items-1")).toBeInTheDocument();

      const removeButton = screen.getByTestId("remove-items-0");
      await user.click(removeButton);

      await waitFor(() => {
        // After removing first item, we should have only 1 item (at index 0)
        expect(
          screen.queryByTestId("array-item-items-1"),
        ).not.toBeInTheDocument();
      });
    });

    // Stale closure regression tests - these verify the fix for the bug where
    // cached array helper functions captured stale forma state
    describe("stale closure regression", () => {
      it("should add multiple items consecutively without losing items", async () => {
        const user = userEvent.setup();
        const spec = createTestSpec({
          fields: {
            items: {
              type: "array",
              label: "Items",
              itemFields: { name: { type: "text" } },
            },
          },
        });

        render(
          <FormRenderer
            spec={spec}
            initialData={{ items: [] }}
            components={createTestComponentMap()}
          />,
        );

        const addButton = screen.getByTestId("add-items");

        // Add first item
        await user.click(addButton);
        await waitFor(() => {
          expect(screen.getByTestId("array-item-items-0")).toBeInTheDocument();
        });

        // Add second item - this would fail with stale closure bug
        await user.click(addButton);
        await waitFor(() => {
          expect(screen.getByTestId("array-item-items-0")).toBeInTheDocument();
          expect(screen.getByTestId("array-item-items-1")).toBeInTheDocument();
        });

        // Add third item - verifies the fix works across multiple operations
        await user.click(addButton);
        await waitFor(() => {
          expect(screen.getByTestId("array-item-items-0")).toBeInTheDocument();
          expect(screen.getByTestId("array-item-items-1")).toBeInTheDocument();
          expect(screen.getByTestId("array-item-items-2")).toBeInTheDocument();
        });
      });

      it("should remove items correctly after adding multiple items", async () => {
        const user = userEvent.setup();
        const spec = createTestSpec({
          fields: {
            items: {
              type: "array",
              label: "Items",
              itemFields: { name: { type: "text" } },
            },
          },
        });

        render(
          <FormRenderer
            spec={spec}
            initialData={{ items: [] }}
            components={createTestComponentMap()}
          />,
        );

        const addButton = screen.getByTestId("add-items");

        // Add three items
        await user.click(addButton);
        await user.click(addButton);
        await user.click(addButton);

        await waitFor(() => {
          expect(screen.getByTestId("array-item-items-2")).toBeInTheDocument();
        });

        // Remove middle item - this would fail with stale closure bug
        const removeMiddle = screen.getByTestId("remove-items-1");
        await user.click(removeMiddle);

        await waitFor(() => {
          // Should have 2 items remaining (indices 0 and 1)
          expect(screen.getByTestId("array-item-items-0")).toBeInTheDocument();
          expect(screen.getByTestId("array-item-items-1")).toBeInTheDocument();
          expect(
            screen.queryByTestId("array-item-items-2"),
          ).not.toBeInTheDocument();
        });
      });

      it("should preserve existing items when adding to non-empty array", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const spec = createTestSpec({
          fields: {
            items: {
              type: "array",
              label: "Items",
              itemFields: { name: { type: "text" } },
            },
          },
        });

        render(
          <FormRenderer
            spec={spec}
            initialData={{ items: [{ name: "Existing Item" }] }}
            components={createTestComponentMap()}
            onChange={onChange}
          />,
        );

        // Verify initial state
        expect(screen.getByTestId("array-item-items-0")).toBeInTheDocument();

        // Add new item
        const addButton = screen.getByTestId("add-items");
        await user.click(addButton);

        await waitFor(() => {
          expect(screen.getByTestId("array-item-items-0")).toBeInTheDocument();
          expect(screen.getByTestId("array-item-items-1")).toBeInTheDocument();
        });

        // Verify onChange was called with both items
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        const data = lastCall[0];
        expect(data.items).toHaveLength(2);
        expect(data.items[0]).toEqual({ name: "Existing Item" });
      });

      it("should handle rapid consecutive add operations", async () => {
        const user = userEvent.setup();
        const spec = createTestSpec({
          fields: {
            items: {
              type: "array",
              label: "Items",
              itemFields: { name: { type: "text" } },
            },
          },
        });

        render(
          <FormRenderer
            spec={spec}
            initialData={{ items: [] }}
            components={createTestComponentMap()}
          />,
        );

        const addButton = screen.getByTestId("add-items");

        // Rapidly add 5 items
        for (let i = 0; i < 5; i++) {
          await user.click(addButton);
        }

        // All 5 items should be present
        await waitFor(() => {
          for (let i = 0; i < 5; i++) {
            expect(
              screen.getByTestId(`array-item-items-${i}`),
            ).toBeInTheDocument();
          }
        });
      });
    });
  });

  // ============================================================================
  // Visibility Wrapper Stability
  // ============================================================================

  describe("visibility wrapper stability", () => {
    it("should render a hidden wrapper div when field is invisible", () => {
      const spec = createTestSpec({
        fields: {
          toggle: { type: "boolean", label: "Toggle" },
          details: {
            type: "text",
            label: "Details",
            visibleWhen: "toggle = true",
          },
        },
      });

      const { container } = render(
        <FormRenderer
          spec={spec}
          initialData={{ toggle: false }}
          components={createTestComponentMap()}
        />,
      );

      // The wrapper div should exist with hidden attribute
      const wrapper = container.querySelector('[data-field-path="details"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveAttribute("hidden");
      // Should have no children (field content not rendered)
      expect(wrapper!.children).toHaveLength(0);
    });

    it("should remove hidden attribute when field becomes visible", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          toggle: { type: "boolean", label: "Toggle" },
          details: {
            type: "text",
            label: "Details",
            visibleWhen: "toggle = true",
          },
        },
      });

      const { container } = render(
        <FormRenderer
          spec={spec}
          initialData={{ toggle: false }}
          components={createTestComponentMap()}
        />,
      );

      // Initially hidden
      const wrapper = container.querySelector('[data-field-path="details"]');
      expect(wrapper).toHaveAttribute("hidden");

      // Toggle visibility
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Now visible - wrapper should not have hidden attribute
      await waitFor(() => {
        const visibleWrapper = container.querySelector(
          '[data-field-path="details"]',
        );
        expect(visibleWrapper).toBeInTheDocument();
        expect(visibleWrapper).not.toHaveAttribute("hidden");
      });
    });

    it("should reuse the same DOM node when toggling visibility", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          toggle: { type: "boolean", label: "Toggle" },
          details: {
            type: "text",
            label: "Details",
            visibleWhen: "toggle = true",
          },
        },
      });

      const { container } = render(
        <FormRenderer
          spec={spec}
          initialData={{ toggle: false }}
          components={createTestComponentMap()}
        />,
      );

      // Get reference to the wrapper DOM node
      const wrapperBefore = container.querySelector(
        '[data-field-path="details"]',
      );
      expect(wrapperBefore).toHaveAttribute("hidden");

      // Toggle to visible
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      await waitFor(() => {
        const wrapperAfter = container.querySelector(
          '[data-field-path="details"]',
        );
        expect(wrapperAfter).not.toHaveAttribute("hidden");
        // Same DOM node should be reused (React reconciliation with same key + element type)
        expect(wrapperAfter).toBe(wrapperBefore);
      });
    });

    it("should not render field content inside hidden wrapper", () => {
      const spec = createTestSpec({
        fields: {
          toggle: { type: "boolean", label: "Toggle" },
          details: {
            type: "text",
            label: "Details",
            visibleWhen: "toggle = true",
          },
        },
      });

      const { container } = render(
        <FormRenderer
          spec={spec}
          initialData={{ toggle: false }}
          components={createTestComponentMap()}
        />,
      );

      const wrapper = container.querySelector('[data-field-path="details"]');
      expect(wrapper).toHaveAttribute("hidden");
      // The test component renders data-testid="field-details" - should not exist
      expect(screen.queryByTestId("field-details")).not.toBeInTheDocument();
      // Wrapper should be empty
      expect(wrapper!.innerHTML).toBe("");
    });

    it("should render field content inside visible wrapper", async () => {
      const user = userEvent.setup();
      const spec = createTestSpec({
        fields: {
          toggle: { type: "boolean", label: "Toggle" },
          details: {
            type: "text",
            label: "Details",
            visibleWhen: "toggle = true",
          },
        },
      });

      const { container } = render(
        <FormRenderer
          spec={spec}
          initialData={{ toggle: false }}
          components={createTestComponentMap()}
        />,
      );

      // Toggle to visible
      await user.click(screen.getByRole("checkbox"));

      await waitFor(() => {
        const wrapper = container.querySelector('[data-field-path="details"]');
        expect(wrapper).not.toHaveAttribute("hidden");
        // Field content should be rendered inside
        expect(wrapper!.children.length).toBeGreaterThan(0);
        expect(screen.getByTestId("field-details")).toBeInTheDocument();
      });
    });
  });
});
