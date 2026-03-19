/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for default field components
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { Forma } from "@fogpipe/forma-core";
import type {
  TextFieldProps,
  NumberFieldProps,
  IntegerFieldProps,
  BooleanFieldProps,
  DateFieldProps,
  DateTimeFieldProps,
  SelectFieldProps,
  MultiSelectFieldProps,
  ComputedFieldProps,
  DisplayFieldProps,
  MatrixFieldProps,
} from "../../types.js";
import { TextInput } from "../../defaults/components/TextInput.js";
import { TextareaInput } from "../../defaults/components/TextareaInput.js";
import {
  NumberInput,
  IntegerInput,
} from "../../defaults/components/NumberInput.js";
import { BooleanInput } from "../../defaults/components/BooleanInput.js";
import { DateInput, DateTimeInput } from "../../defaults/components/DateInput.js";
import { SelectInput } from "../../defaults/components/SelectInput.js";
import { MultiSelectInput } from "../../defaults/components/MultiSelectInput.js";
import { ComputedDisplay } from "../../defaults/components/ComputedDisplay.js";
import { DisplayField } from "../../defaults/components/DisplayField.js";
import { MatrixField } from "../../defaults/components/MatrixField.js";
import { FallbackField } from "../../defaults/components/FallbackField.js";

const mockSpec = {
  version: "1.0",
  meta: { id: "test", title: "Test" },
  schema: { type: "object", properties: {} },
  fields: {},
  fieldOrder: [],
} as unknown as Forma;

function makeBaseProps(overrides: Record<string, unknown> = {}) {
  return {
    name: "testField",
    field: { type: "text", label: "Test Field" },
    touched: false,
    required: false,
    disabled: false,
    errors: [],
    visibleErrors: [],
    onBlur: vi.fn(),
    visible: true,
    enabled: true,
    readonly: false,
    label: "Test Field",
    ...overrides,
  };
}

// ============================================================================
// TextInput
// ============================================================================
describe("TextInput", () => {
  function makeTextProps(
    overrides: Record<string, unknown> = {},
  ): TextFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "text",
      value: "",
      onChange: vi.fn(),
      ...overrides,
    } as unknown as TextFieldProps;
  }

  it("renders an input with correct type for text", () => {
    render(<TextInput field={makeTextProps()} spec={mockSpec} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("renders tel type for phone fieldType", () => {
    render(
      <TextInput
        field={makeTextProps({ fieldType: "phone" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "tel");
  });

  it("renders email type for email fieldType", () => {
    render(
      <TextInput
        field={makeTextProps({ fieldType: "email" })}
        spec={mockSpec}
      />,
    );
    const input = document.querySelector('input[type="email"]');
    expect(input).toBeTruthy();
  });

  it("fires onChange with string value", () => {
    const onChange = vi.fn();
    render(
      <TextInput field={makeTextProps({ onChange })} spec={mockSpec} />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("fires onBlur", () => {
    const onBlur = vi.fn();
    render(
      <TextInput field={makeTextProps({ onBlur })} spec={mockSpec} />,
    );
    fireEvent.blur(screen.getByRole("textbox"));
    expect(onBlur).toHaveBeenCalled();
  });

  it("renders disabled state", () => {
    render(
      <TextInput
        field={makeTextProps({ disabled: true })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("renders readonly state", () => {
    render(
      <TextInput
        field={makeTextProps({ readonly: true })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
  });

  it("sets aria-invalid when there are visible errors", () => {
    render(
      <TextInput
        field={makeTextProps({
          visibleErrors: [{ field: "testField", message: "Required" }],
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("sets aria-required when required", () => {
    render(
      <TextInput
        field={makeTextProps({ required: true })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-required",
      "true",
    );
  });

  it("renders adorners when prefix and suffix provided", () => {
    render(
      <TextInput
        field={makeTextProps({ prefix: "$", suffix: "USD" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("$")).toBeTruthy();
    expect(screen.getByText("USD")).toBeTruthy();
  });
});

// ============================================================================
// TextareaInput
// ============================================================================
describe("TextareaInput", () => {
  function makeTextareaProps(
    overrides: Record<string, unknown> = {},
  ): TextFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "textarea",
      value: "",
      onChange: vi.fn(),
      ...overrides,
    } as unknown as TextFieldProps;
  }

  it("renders a textarea element", () => {
    render(
      <TextareaInput field={makeTextareaProps()} spec={mockSpec} />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
  });

  it("fires onChange with string value", () => {
    const onChange = vi.fn();
    render(
      <TextareaInput
        field={makeTextareaProps({ onChange })}
        spec={mockSpec}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("hello");
  });
});

// ============================================================================
// NumberInput
// ============================================================================
describe("NumberInput", () => {
  function makeNumberProps(
    overrides: Record<string, unknown> = {},
  ): NumberFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "number",
      value: null,
      onChange: vi.fn(),
      ...overrides,
    } as unknown as NumberFieldProps;
  }

  it("renders a number input", () => {
    render(<NumberInput field={makeNumberProps()} spec={mockSpec} />);
    expect(screen.getByRole("spinbutton")).toHaveAttribute("type", "number");
  });

  it("converts empty string to null", async () => {
    const onChange = vi.fn();
    render(
      <NumberInput
        field={makeNumberProps({ value: 5, onChange })}
        spec={mockSpec}
      />,
    );
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    // Use userEvent for reliable number input interaction
    await userEvent.clear(input);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("parses valid number with parseFloat", async () => {
    const onChange = vi.fn();
    render(
      <NumberInput field={makeNumberProps({ onChange })} spec={mockSpec} />,
    );
    const input = screen.getByRole("spinbutton");
    // Type a single digit — jsdom handles single digits on number inputs
    await userEvent.type(input, "5");
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("displays value correctly for number", () => {
    render(
      <NumberInput
        field={makeNumberProps({ value: 3.14 })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("spinbutton")).toHaveValue(3.14);
  });

  it("passes min/max/step to HTML", () => {
    render(
      <NumberInput
        field={makeNumberProps({ min: 0, max: 100, step: 0.5 })}
        spec={mockSpec}
      />,
    );
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "100");
    expect(input).toHaveAttribute("step", "0.5");
  });

  it("renders adorners", () => {
    render(
      <NumberInput
        field={makeNumberProps({ prefix: "$", suffix: "USD" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("$")).toBeTruthy();
    expect(screen.getByText("USD")).toBeTruthy();
  });
});

// ============================================================================
// IntegerInput
// ============================================================================
describe("IntegerInput", () => {
  function makeIntegerProps(
    overrides: Record<string, unknown> = {},
  ): IntegerFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "integer",
      value: null,
      onChange: vi.fn(),
      ...overrides,
    } as unknown as IntegerFieldProps;
  }

  it("parses with parseInt", () => {
    const onChange = vi.fn();
    render(
      <IntegerInput
        field={makeIntegerProps({ onChange })}
        spec={mockSpec}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "42" },
    });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it("defaults step to 1", () => {
    render(
      <IntegerInput field={makeIntegerProps()} spec={mockSpec} />,
    );
    expect(screen.getByRole("spinbutton")).toHaveAttribute("step", "1");
  });
});

// ============================================================================
// BooleanInput
// ============================================================================
describe("BooleanInput", () => {
  function makeBooleanProps(
    overrides: Record<string, unknown> = {},
  ): BooleanFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "boolean",
      value: false,
      onChange: vi.fn(),
      ...overrides,
    } as unknown as BooleanFieldProps;
  }

  it("renders a checkbox", () => {
    render(
      <BooleanInput field={makeBooleanProps()} spec={mockSpec} />,
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("toggles checked state", () => {
    const onChange = vi.fn();
    render(
      <BooleanInput
        field={makeBooleanProps({ onChange })}
        spec={mockSpec}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders unchecked when value is false", () => {
    render(
      <BooleanInput
        field={makeBooleanProps({ value: false })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders checked when value is true", () => {
    render(
      <BooleanInput
        field={makeBooleanProps({ value: true })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("disables when disabled", () => {
    render(
      <BooleanInput
        field={makeBooleanProps({ disabled: true })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});

// ============================================================================
// DateInput
// ============================================================================
describe("DateInput", () => {
  function makeDateProps(
    overrides: Record<string, unknown> = {},
  ): DateFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "date",
      value: null,
      onChange: vi.fn(),
      ...overrides,
    } as unknown as DateFieldProps;
  }

  it("renders date input", () => {
    const { container } = render(
      <DateInput field={makeDateProps()} spec={mockSpec} />,
    );
    const input = container.querySelector('input[type="date"]');
    expect(input).toBeTruthy();
  });

  it("passes null for empty value", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateInput
        field={makeDateProps({ value: "2024-01-01", onChange })}
        spec={mockSpec}
      />,
    );
    const input = container.querySelector('input[type="date"]')! as HTMLInputElement;
    // Set value directly and dispatch change since jsdom date inputs are limited
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "");
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("passes date string for valid value", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateInput field={makeDateProps({ onChange })} spec={mockSpec} />,
    );
    const input = container.querySelector('input[type="date"]')! as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "2024-03-15");
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith("2024-03-15");
  });
});

// ============================================================================
// DateTimeInput
// ============================================================================
describe("DateTimeInput", () => {
  function makeDateTimeProps(
    overrides: Record<string, unknown> = {},
  ): DateTimeFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "datetime",
      value: null,
      onChange: vi.fn(),
      ...overrides,
    } as unknown as DateTimeFieldProps;
  }

  it("renders datetime-local input", () => {
    const { container } = render(
      <DateTimeInput field={makeDateTimeProps()} spec={mockSpec} />,
    );
    const input = container.querySelector('input[type="datetime-local"]');
    expect(input).toBeTruthy();
  });
});

// ============================================================================
// SelectInput
// ============================================================================
describe("SelectInput", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
    { value: "c", label: "Option C" },
  ];

  function makeSelectProps(
    overrides: Record<string, unknown> = {},
  ): SelectFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "select",
      value: null,
      onChange: vi.fn(),
      options,
      ...overrides,
    } as unknown as SelectFieldProps;
  }

  it("renders all options", () => {
    render(<SelectInput field={makeSelectProps()} spec={mockSpec} />);
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("Option C")).toBeInTheDocument();
  });

  it("renders placeholder option when value is null", () => {
    render(<SelectInput field={makeSelectProps()} spec={mockSpec} />);
    expect(screen.getByText("Select...")).toBeInTheDocument();
  });

  it("calls onChange with selected value", () => {
    const onChange = vi.fn();
    render(
      <SelectInput field={makeSelectProps({ onChange })} spec={mockSpec} />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "b" },
    });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("calls onChange with null for empty selection", () => {
    const onChange = vi.fn();
    render(
      <SelectInput
        field={makeSelectProps({ onChange, value: "a" })}
        spec={mockSpec}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("disables when disabled", () => {
    render(
      <SelectInput
        field={makeSelectProps({ disabled: true })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});

// ============================================================================
// MultiSelectInput
// ============================================================================
describe("MultiSelectInput", () => {
  const options = [
    { value: "a", label: "Option A" },
    { value: "b", label: "Option B" },
  ];

  function makeMultiSelectProps(
    overrides: Record<string, unknown> = {},
  ): MultiSelectFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "multiselect",
      value: [],
      onChange: vi.fn(),
      options,
      ...overrides,
    } as unknown as MultiSelectFieldProps;
  }

  it("renders checkboxes for each option", () => {
    render(
      <MultiSelectInput
        field={makeMultiSelectProps()}
        spec={mockSpec}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
  });

  it("toggles value in array on click", () => {
    const onChange = vi.fn();
    render(
      <MultiSelectInput
        field={makeMultiSelectProps({ onChange })}
        spec={mockSpec}
      />,
    );
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(onChange).toHaveBeenCalledWith(["a"]);
  });

  it("removes value from array when unchecking", () => {
    const onChange = vi.fn();
    render(
      <MultiSelectInput
        field={makeMultiSelectProps({ value: ["a", "b"], onChange })}
        spec={mockSpec}
      />,
    );
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("renders fieldset with legend", () => {
    const { container } = render(
      <MultiSelectInput
        field={makeMultiSelectProps()}
        spec={mockSpec}
      />,
    );
    expect(container.querySelector("fieldset")).toBeTruthy();
    expect(container.querySelector("legend")).toBeTruthy();
  });
});

// ============================================================================
// ComputedDisplay
// ============================================================================
describe("ComputedDisplay", () => {
  function makeComputedProps(
    overrides: Record<string, unknown> = {},
  ): ComputedFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "computed",
      value: 42,
      expression: "data.a + data.b",
      ...overrides,
    } as unknown as ComputedFieldProps;
  }

  it("renders computed value", () => {
    render(
      <ComputedDisplay field={makeComputedProps()} spec={mockSpec} />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders em-dash for null", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: null })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("\u2014")).toBeInTheDocument();
  });

  it("renders JSON for objects", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: { a: 1 } })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
  });

  it("formats value with currency format", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: 1234.56, format: "currency" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
  });

  it("formats value with percent format", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: 0.5, format: "percent" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("formats value with decimal format", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: 99.999, format: "decimal(2)" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("100.00")).toBeInTheDocument();
  });

  it("still shows em-dash for null even with format", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: null, format: "currency" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("\u2014")).toBeInTheDocument();
  });

  it("still shows em-dash for undefined even with format", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: undefined, format: "currency" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("\u2014")).toBeInTheDocument();
  });

  it("renders plain string without format", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: 42 })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("formats zero with currency (does not show em-dash)", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: 0, format: "currency" })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("formats boolean without format as string", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({ value: false })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("formats currency with locale/currency from formatOptions", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({
          value: 25444.40,
          format: "currency",
          formatOptions: { locale: "sv-SE", currency: "SEK" },
        })}
        spec={mockSpec}
      />,
    );
    const text = screen.getByText((content) =>
      content.includes("25") && content.includes("444") && content.includes("kr"),
    );
    expect(text).toBeInTheDocument();
  });

  it("formats currency with EUR locale from formatOptions", () => {
    render(
      <ComputedDisplay
        field={makeComputedProps({
          value: 1000,
          format: "currency",
          formatOptions: { locale: "de-DE", currency: "EUR" },
        })}
        spec={mockSpec}
      />,
    );
    const text = screen.getByText((content) =>
      content.includes("1.000") && content.includes("€"),
    );
    expect(text).toBeInTheDocument();
  });
});

// ============================================================================
// DisplayField
// ============================================================================
describe("DisplayField", () => {
  function makeDisplayProps(
    overrides: Record<string, unknown> = {},
  ): DisplayFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "display",
      content: "Hello world",
      ...overrides,
    } as unknown as DisplayFieldProps;
  }

  it("renders content text", () => {
    render(
      <DisplayField field={makeDisplayProps()} spec={mockSpec} />,
    );
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders sourceValue when present", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: "Dynamic value",
          content: "Fallback",
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("Dynamic value")).toBeInTheDocument();
  });

  it("formats sourceValue with currency format", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: 1234.56,
          format: "currency",
          content: "Fallback",
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
  });

  it("formats sourceValue with percent format", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: 0.75,
          format: "percent",
          content: "Fallback",
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("formats sourceValue with decimal format", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: 123.456,
          format: "decimal(1)",
          content: "Fallback",
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("123.5")).toBeInTheDocument();
  });

  it("shows em-dash for null sourceValue with format", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: null,
          format: "currency",
          content: "Fallback",
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("\u2014")).toBeInTheDocument();
  });

  it("shows em-dash for undefined sourceValue with format", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: undefined,
          format: "currency",
        })}
        spec={mockSpec}
      />,
    );
    // sourceValue is undefined → falls through to content
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("falls back to string for non-numeric sourceValue with currency format", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: "not a number",
          format: "currency",
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("not a number")).toBeInTheDocument();
  });

  it("formats sourceValue without format as plain string", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: 42,
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("formats zero sourceValue with currency (does not skip rendering)", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: 0,
          format: "currency",
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("formats currency with locale/currency from formatOptions", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: 209550,
          format: "currency",
          formatOptions: { locale: "sv-SE", currency: "SEK" },
        })}
        spec={mockSpec}
      />,
    );
    const text = screen.getByText((content) =>
      content.includes("209") && content.includes("550") && content.includes("kr"),
    );
    expect(text).toBeInTheDocument();
  });

  it("formats currency with EUR locale", () => {
    render(
      <DisplayField
        field={makeDisplayProps({
          sourceValue: 1234.56,
          format: "currency",
          formatOptions: { locale: "de-DE", currency: "EUR" },
        })}
        spec={mockSpec}
      />,
    );
    const text = screen.getByText((content) =>
      content.includes("1.234,56") || (content.includes("1234") && content.includes("€")),
    );
    expect(text).toBeInTheDocument();
  });
});

// ============================================================================
// MatrixField
// ============================================================================
describe("MatrixField", () => {
  function makeMatrixProps(
    overrides: Record<string, unknown> = {},
  ): MatrixFieldProps {
    return {
      ...makeBaseProps(),
      fieldType: "matrix",
      value: null,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      rows: [
        { id: "row1", label: "Row 1", visible: true },
        { id: "row2", label: "Row 2", visible: true },
      ],
      columns: [
        { value: "col1", label: "Col 1" },
        { value: "col2", label: "Col 2" },
      ],
      multiSelect: false,
      ...overrides,
    } as unknown as MatrixFieldProps;
  }

  it("renders a table", () => {
    render(<MatrixField field={makeMatrixProps()} spec={mockSpec} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<MatrixField field={makeMatrixProps()} spec={mockSpec} />);
    expect(screen.getByText("Col 1")).toBeInTheDocument();
    expect(screen.getByText("Col 2")).toBeInTheDocument();
  });

  it("renders row headers", () => {
    render(<MatrixField field={makeMatrixProps()} spec={mockSpec} />);
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.getByText("Row 2")).toBeInTheDocument();
  });

  it("renders radio buttons for single select", () => {
    render(<MatrixField field={makeMatrixProps()} spec={mockSpec} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4); // 2 rows × 2 columns
  });

  it("calls onChange when radio selected", () => {
    const onChange = vi.fn();
    render(
      <MatrixField
        field={makeMatrixProps({ onChange })}
        spec={mockSpec}
      />,
    );
    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(onChange).toHaveBeenCalledWith({ row1: "col1" });
  });

  it("renders checkboxes for multi-select", () => {
    render(
      <MatrixField
        field={makeMatrixProps({ multiSelect: true })}
        spec={mockSpec}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
  });

  it("filters invisible rows", () => {
    render(
      <MatrixField
        field={makeMatrixProps({
          rows: [
            { id: "row1", label: "Row 1", visible: true },
            { id: "row2", label: "Row 2", visible: false },
          ],
        })}
        spec={mockSpec}
      />,
    );
    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.queryByText("Row 2")).not.toBeInTheDocument();
  });
});

// ============================================================================
// FallbackField
// ============================================================================
describe("FallbackField", () => {
  it("renders a text input", () => {
    const field = {
      ...makeBaseProps(),
      fieldType: "unknown",
      value: "test",
      onChange: vi.fn(),
      field: { type: "custom-type", label: "Custom" },
    };
    render(
      <FallbackField field={field as never} spec={mockSpec} />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
