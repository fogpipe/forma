/// <reference types="@testing-library/jest-dom" />
/**
 * Integration tests for DefaultFormRenderer
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DefaultFormRenderer } from "../../defaults/DefaultFormRenderer.js";
import {
  defaultComponentMap,
  defaultFieldWrapper,
  defaultLayout,
} from "../../defaults/componentMap.js";
import { createTestSpec } from "../test-utils.js";
import type { FormRendererHandle } from "../../FormRenderer.js";

// ============================================================================
// DefaultFormRenderer
// ============================================================================
describe("DefaultFormRenderer", () => {
  it("renders a form with just spec and onSubmit (minimal props)", () => {
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name" },
      },
    });
    render(<DefaultFormRenderer spec={spec} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("uses defaultComponentMap when components not provided", () => {
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name" },
      },
    });
    render(<DefaultFormRenderer spec={spec} onSubmit={vi.fn()} />);
    // The default TextInput renders a native input
    const input = screen.getByLabelText("Name");
    expect(input.tagName).toBe("INPUT");
  });

  it("uses provided components when explicitly passed (override)", () => {
    const CustomText = ({ field }: { field: { label: string } }) => (
      <div data-testid="custom">Custom: {field.label}</div>
    );
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name" },
      },
    });
    render(
      <DefaultFormRenderer
        spec={spec}
        onSubmit={vi.fn()}
        components={{ ...defaultComponentMap, text: CustomText as never }}
      />,
    );
    expect(screen.getByTestId("custom")).toHaveTextContent("Custom: Name");
  });

  it("forwards ref correctly", async () => {
    const ref = React.createRef<FormRendererHandle>();
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name" },
      },
    });
    render(<DefaultFormRenderer ref={ref} spec={spec} onSubmit={vi.fn()} />);
    expect(ref.current).toBeTruthy();
    expect(typeof ref.current!.submitForm).toBe("function");
    expect(typeof ref.current!.getValues).toBe("function");
  });
});

// ============================================================================
// componentMap exports
// ============================================================================
describe("defaultComponentMap", () => {
  it("has entries for all 18 field types + fallback", () => {
    const expectedKeys = [
      "text",
      "email",
      "phone",
      "url",
      "password",
      "textarea",
      "number",
      "integer",
      "boolean",
      "date",
      "datetime",
      "select",
      "multiselect",
      "array",
      "object",
      "computed",
      "display",
      "matrix",
      "fallback",
    ];
    for (const key of expectedKeys) {
      expect(defaultComponentMap[key as keyof typeof defaultComponentMap]).toBeDefined();
    }
  });

  it("all entries are valid React components", () => {
    for (const [, component] of Object.entries(defaultComponentMap)) {
      expect(typeof component).toBe("function");
    }
  });
});

describe("layout exports", () => {
  it("defaultFieldWrapper is defined", () => {
    expect(defaultFieldWrapper).toBeDefined();
    expect(typeof defaultFieldWrapper).toBe("function");
  });

  it("defaultLayout is defined", () => {
    expect(defaultLayout).toBeDefined();
    expect(typeof defaultLayout).toBe("function");
  });
});

// ============================================================================
// Simple Form Integration
// ============================================================================
describe("Simple form integration", () => {
  it("fills in text, number, boolean, select fields and submits", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name" },
        age: { type: "number", label: "Age" },
        agree: { type: "boolean", label: "I agree" },
        color: {
          type: "select",
          label: "Color",
          options: [
            { value: "red", label: "Red" },
            { value: "blue", label: "Blue" },
          ],
        },
      },
    });

    render(<DefaultFormRenderer spec={spec} onSubmit={onSubmit} />);

    // Fill in text field
    await user.type(screen.getByLabelText("Name"), "John");

    // Fill in number field
    await user.type(screen.getByLabelText("Age"), "30");

    // Check boolean
    await user.click(screen.getByLabelText("I agree"));

    // Select an option
    await user.selectOptions(screen.getByLabelText("Color"), "blue");

    // Submit
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const data = onSubmit.mock.calls[0][0];
    expect(data.name).toBe("John");
    expect(data.age).toBe(30);
    expect(data.agree).toBe(true);
    expect(data.color).toBe("blue");
  });
});

// ============================================================================
// Validation Integration
// ============================================================================
describe("Validation integration", () => {
  it("shows validation errors after submission", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name", required: true },
      },
    });

    render(<DefaultFormRenderer spec={spec} onSubmit={onSubmit} />);

    // Submit without filling in required field
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      // After submit, isSubmitted is true so FieldWrapper shows errors
      const alerts = screen.queryAllByRole("alert");
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Touched-gating Integration
// ============================================================================
describe("Touched-gating integration", () => {
  it("does NOT show errors on initial render", () => {
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name", required: true },
      },
    });

    render(<DefaultFormRenderer spec={spec} onSubmit={vi.fn()} />);

    // No errors visible initially
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows error after blur on empty required field", async () => {
    const user = userEvent.setup();
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name", required: true },
      },
    });

    render(
      <DefaultFormRenderer spec={spec} onSubmit={vi.fn()} validateOn="blur" />,
    );

    // Tab through the field (focus + blur)
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Component Override Integration
// ============================================================================
describe("Component override integration", () => {
  it("renders custom component for overridden field type, defaults for others", () => {
    const CustomSelect = () => (
      <div data-testid="custom-select">Custom Select</div>
    );
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name" },
        color: {
          type: "select",
          label: "Color",
          options: [{ value: "red", label: "Red" }],
        },
      },
    });

    render(
      <DefaultFormRenderer
        spec={spec}
        onSubmit={vi.fn()}
        components={{ ...defaultComponentMap, select: CustomSelect as never }}
      />,
    );

    // Custom select rendered
    expect(screen.getByTestId("custom-select")).toBeInTheDocument();
    // Default text input still works
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});

// ============================================================================
// Wizard Form Integration
// ============================================================================
describe("Wizard form integration", () => {
  function createWizardSpec() {
    return createTestSpec({
      fields: {
        name: { type: "text", label: "Name" },
        email: { type: "text", label: "Email" },
        city: { type: "text", label: "City" },
      },
      pages: [
        { id: "page1", title: "Personal", fields: ["name"] },
        { id: "page2", title: "Contact", fields: ["email"] },
        { id: "page3", title: "Address", fields: ["city"] },
      ],
    });
  }

  it("renders page 1 fields initially", () => {
    render(
      <DefaultFormRenderer
        spec={createWizardSpec()}
        onSubmit={vi.fn()}
        wizardLayout
      />,
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("navigates Next to page 2 and Previous back", async () => {
    const user = userEvent.setup();
    render(
      <DefaultFormRenderer
        spec={createWizardSpec()}
        onSubmit={vi.fn()}
        wizardLayout
      />,
    );

    // Page 1 — click Next
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();

    // Page 2 — click Previous
    await user.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });
  });

  it("shows Submit button only on last page", async () => {
    const user = userEvent.setup();
    render(
      <DefaultFormRenderer
        spec={createWizardSpec()}
        onSubmit={vi.fn()}
        wizardLayout
      />,
    );

    // Page 1 — no Submit, has Next
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    // Navigate to last page
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => screen.getByLabelText("Email"));
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Last page — has Submit, no Next
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("renders step indicator with correct count", () => {
    const { container } = render(
      <DefaultFormRenderer
        spec={createWizardSpec()}
        onSubmit={vi.fn()}
        wizardLayout
      />,
    );
    // Step indicator labels (inside .forma-step__label spans)
    const stepLabels = container.querySelectorAll(".forma-step__label");
    expect(stepLabels).toHaveLength(3);
    expect(stepLabels[0].textContent).toBe("Personal");
    expect(stepLabels[1].textContent).toBe("Contact");
    expect(stepLabels[2].textContent).toBe("Address");
  });
});

// ============================================================================
// Wizard Validation Integration
// ============================================================================
describe("Wizard validation integration", () => {
  it("does NOT advance when required field is empty", async () => {
    const user = userEvent.setup();
    const spec = createTestSpec({
      fields: {
        name: { type: "text", label: "Name", required: true },
        email: { type: "text", label: "Email" },
      },
      pages: [
        { id: "page1", title: "Step 1", fields: ["name"] },
        { id: "page2", title: "Step 2", fields: ["email"] },
      ],
    });

    const { container } = render(
      <DefaultFormRenderer spec={spec} onSubmit={vi.fn()} wizardLayout />,
    );

    // Verify we're on page 1
    const page1Title = container.querySelector(".forma-page__title");
    expect(page1Title?.textContent).toBe("Step 1");

    // Click Next without filling in required name
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Should still be on page 1
    await waitFor(() => {
      const currentTitle = container.querySelector(".forma-page__title");
      expect(currentTitle?.textContent).toBe("Step 1");
    });
  });
});

// ============================================================================
// Array Field Integration
// ============================================================================
describe("Array field integration", () => {
  it("adds items, fills sub-fields, removes an item, and submits", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const spec = createTestSpec({
      fields: {
        items: {
          type: "array",
          label: "Items",
          itemFields: {
            title: { type: "text", label: "Title" },
          },
          itemFieldOrder: ["title"],
          items: { type: "object", properties: { title: { type: "string" } } },
        },
      },
    });

    render(<DefaultFormRenderer spec={spec} onSubmit={onSubmit} />);

    // Initially empty
    expect(screen.getByText("No items")).toBeInTheDocument();

    // Add two items
    await user.click(screen.getByRole("button", { name: "+ Add Item" }));
    await user.click(screen.getByRole("button", { name: "+ Add Item" }));

    // No items message gone
    expect(screen.queryByText("No items")).not.toBeInTheDocument();

    // Two title inputs should exist
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(2);

    // Fill them in
    await user.type(inputs[0], "First");
    await user.type(inputs[1], "Second");

    // Remove the first item
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await user.click(removeButtons[0]);

    // Only one input left
    await waitFor(() => {
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
    });

    // Submit
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const data = onSubmit.mock.calls[0][0];
    expect(data.items).toHaveLength(1);
    expect(data.items[0].title).toBe("Second");
  });
});

// ============================================================================
// Disabled/Readonly Integration
// ============================================================================
describe("Disabled field integration", () => {
  it("renders disabled fields as not editable", () => {
    const spec = createTestSpec({
      fields: {
        name: {
          type: "text",
          label: "Name",
          enabledWhen: "false",
        },
      },
    });

    render(<DefaultFormRenderer spec={spec} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toBeDisabled();
  });

  it("display field inherits format from source computed field", () => {
    const spec = createTestSpec({
      fields: {
        totalDisplay: {
          type: "display",
          label: "Total",
          source: "total",
        },
      },
      computed: {
        total: {
          expression: "42",
          format: "currency",
        },
      },
    });

    // Provide initial data with the computed value already resolved
    render(
      <DefaultFormRenderer
        spec={spec}
        onSubmit={vi.fn()}
        initialData={{ total: 1234.56 }}
      />,
    );

    // The display field should inherit "currency" format from computed.total
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
  });

  it("display field's own format takes priority over computed source format", () => {
    const spec = createTestSpec({
      fields: {
        totalDisplay: {
          type: "display",
          label: "Total",
          source: "total",
          format: "percent",
        },
      },
      computed: {
        total: {
          expression: "42",
          format: "currency",
        },
      },
    });

    render(
      <DefaultFormRenderer
        spec={spec}
        onSubmit={vi.fn()}
        initialData={{ total: 0.75 }}
      />,
    );

    // Display field's own format "percent" should win over computed "currency"
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});

// ============================================================================
// Spec-Level Locale/Currency Integration
// ============================================================================
describe("Spec-level locale/currency", () => {
  it("display field uses spec.meta.locale and spec.meta.currency for formatting", () => {
    const spec = createTestSpec({
      meta: { locale: "sv-SE", currency: "SEK" },
      fields: {
        totalDisplay: {
          type: "display",
          label: "Total",
          source: "total",
        },
      },
      computed: {
        total: {
          expression: "42",
          format: "currency",
        },
      },
    });

    render(
      <DefaultFormRenderer
        spec={spec}
        onSubmit={vi.fn()}
        initialData={{ total: 209550 }}
      />,
    );

    // Should render with Swedish locale and SEK currency, not USD
    const text = screen.getByText((content) =>
      content.includes("209") && content.includes("550") && content.includes("kr"),
    );
    expect(text).toBeInTheDocument();
  });

  it("formatOptions prop overrides spec.meta locale/currency", () => {
    const spec = createTestSpec({
      meta: { locale: "sv-SE", currency: "SEK" },
      fields: {
        totalDisplay: {
          type: "display",
          label: "Total",
          source: "total",
        },
      },
      computed: {
        total: {
          expression: "42",
          format: "currency",
        },
      },
    });

    render(
      <DefaultFormRenderer
        spec={spec}
        onSubmit={vi.fn()}
        initialData={{ total: 1000 }}
        formatOptions={{ locale: "de-DE", currency: "EUR" }}
      />,
    );

    // Should render with German locale and EUR, overriding spec meta
    const text = screen.getByText((content) =>
      content.includes("1.000") && content.includes("€"),
    );
    expect(text).toBeInTheDocument();
  });
});
