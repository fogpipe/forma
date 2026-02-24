/**
 * Tests for useForma hook
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForma } from "../useForma.js";
import { createTestSpec } from "./test-utils.js";

describe("useForma", () => {
  // ============================================================================
  // Initialization
  // ============================================================================

  describe("initialization", () => {
    it("should initialize with empty data when no initialData provided", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          age: { type: "number" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data).toEqual({});
      expect(result.current.isSubmitted).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isDirty).toBe(false);
    });

    it("should initialize with provided initialData", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          age: { type: "number" },
        },
      });

      const initialData = { name: "John", age: 25 };
      const { result } = renderHook(() => useForma({ spec, initialData }));

      expect(result.current.data).toEqual(initialData);
      expect(result.current.isDirty).toBe(false);
    });

    it("should initialize with defaultValue from field definitions", () => {
      const spec = createTestSpec({
        fields: {
          country: {
            type: "select",
            defaultValue: "us",
            options: [
              { value: "us", label: "US" },
              { value: "ca", label: "CA" },
            ],
          },
          age: { type: "number", defaultValue: 25 },
          name: { type: "text" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data.country).toBe("us");
      expect(result.current.data.age).toBe(25);
      expect(result.current.data.name).toBeUndefined();
    });

    it("should let initialData override defaultValue", () => {
      const spec = createTestSpec({
        fields: {
          country: {
            type: "select",
            defaultValue: "us",
            options: [
              { value: "us", label: "US" },
              { value: "ca", label: "CA" },
            ],
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { country: "ca" } }),
      );

      expect(result.current.data.country).toBe("ca");
    });

    it("should let defaultValue=true override implicit boolean false", () => {
      const spec = createTestSpec({
        fields: {
          agree: { type: "boolean", defaultValue: true },
          optIn: { type: "boolean" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data.agree).toBe(true);
      expect(result.current.data.optIn).toBe(false);
    });

    it("should apply defaultValue for number and string fields", () => {
      const spec = createTestSpec({
        fields: {
          quantity: { type: "integer", defaultValue: 5 },
          price: { type: "number", defaultValue: 9.99 },
          notes: { type: "textarea", defaultValue: "N/A" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data.quantity).toBe(5);
      expect(result.current.data.price).toBe(9.99);
      expect(result.current.data.notes).toBe("N/A");
    });

    it("should not apply defaultValue for display fields in data", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", defaultValue: "John" },
          header: { type: "display", content: "Header" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data.name).toBe("John");
      // display fields don't produce data entries
      expect(result.current.data.header).toBeUndefined();
    });

    it("should preserve defaultValue after resetForm", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", defaultValue: "Default" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data.name).toBe("Default");

      act(() => {
        result.current.setFieldValue("name", "Changed");
      });
      expect(result.current.data.name).toBe("Changed");

      act(() => {
        result.current.resetForm();
      });
      expect(result.current.data.name).toBe("Default");
    });

    it("should apply defaultValue for multiselect as array", () => {
      const spec = createTestSpec({
        fields: {
          tags: {
            type: "multiselect",
            defaultValue: ["a", "b"],
            options: [
              { value: "a", label: "A" },
              { value: "b", label: "B" },
              { value: "c", label: "C" },
            ],
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data.tags).toEqual(["a", "b"]);
    });

    it("should merge referenceData from options with spec", () => {
      const spec = createTestSpec({
        fields: { value: { type: "number" } },
        referenceData: { existing: { a: 1 } },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          referenceData: { added: { b: 2 } },
        }),
      );

      expect(result.current.spec.referenceData).toEqual({
        existing: { a: 1 },
        added: { b: 2 },
      });
    });
  });

  // ============================================================================
  // Field Values
  // ============================================================================

  describe("field values", () => {
    it("should update field value with setFieldValue", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        result.current.setFieldValue("name", "Alice");
      });

      expect(result.current.data.name).toBe("Alice");
      expect(result.current.isDirty).toBe(true);
    });

    it("should update multiple values with setValues", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          age: { type: "number" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        result.current.setValues({ name: "Bob", age: 30 });
      });

      expect(result.current.data).toEqual({ name: "Bob", age: 30 });
    });

    it("should handle nested field paths", () => {
      const spec = createTestSpec({
        fields: { "address.city": { type: "text" } },
      });

      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        result.current.setFieldValue("address.city", "New York");
      });

      expect(result.current.data).toEqual({
        address: { city: "New York" },
      });
    });

    it("should handle array index paths", () => {
      const spec = createTestSpec({
        fields: {
          items: { type: "array" },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { items: [{ name: "A" }] } }),
      );

      act(() => {
        result.current.setFieldValue("items[0].name", "B");
      });

      expect(result.current.data.items).toEqual([{ name: "B" }]);
    });

    it("should mark field as touched with setFieldTouched", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.getFieldProps("name").touched).toBe(false);

      act(() => {
        result.current.setFieldTouched("name", true);
      });

      expect(result.current.getFieldProps("name").touched).toBe(true);
    });
  });

  // ============================================================================
  // getFieldProps
  // ============================================================================

  describe("getFieldProps", () => {
    it("should return correct field props for text field", () => {
      const spec = createTestSpec({
        fields: {
          name: {
            type: "text",
            label: "Full Name",
            description: "Enter your name",
            placeholder: "John Doe",
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "Test" } }),
      );

      const props = result.current.getFieldProps("name");

      expect(props.name).toBe("name");
      expect(props.value).toBe("Test");
      expect(props.type).toBe("text");
      expect(props.label).toBe("Full Name");
      expect(props.description).toBe("Enter your name");
      expect(props.placeholder).toBe("John Doe");
      expect(props.visible).toBe(true);
      expect(props.enabled).toBe(true);
      expect(props.required).toBe(false);
      expect(props.touched).toBe(false);
      expect(props.errors).toEqual([]);
      expect(typeof props.onChange).toBe("function");
      expect(typeof props.onBlur).toBe("function");
    });

    it("should infer field type from schema", () => {
      const spec = createTestSpec({
        fields: {
          email: { type: "email" },
          age: { type: "number" },
          isActive: { type: "boolean" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.getFieldProps("email").type).toBe("email");
      expect(result.current.getFieldProps("age").type).toBe("number");
      expect(result.current.getFieldProps("isActive").type).toBe("boolean");
    });

    it("should provide stable handler references (memoization)", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result, rerender } = renderHook(() => useForma({ spec }));

      const firstOnChange = result.current.getFieldProps("name").onChange;
      const firstOnBlur = result.current.getFieldProps("name").onBlur;

      // Force rerender
      rerender();

      const secondOnChange = result.current.getFieldProps("name").onChange;
      const secondOnBlur = result.current.getFieldProps("name").onBlur;

      // Handlers should be same references
      expect(firstOnChange).toBe(secondOnChange);
      expect(firstOnBlur).toBe(secondOnBlur);
    });

    it("should update value when onChange is called", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        result.current.getFieldProps("name").onChange("New Value");
      });

      expect(result.current.data.name).toBe("New Value");
    });

    it("should mark field touched when onBlur is called", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        result.current.getFieldProps("name").onBlur();
      });

      expect(result.current.getFieldProps("name").touched).toBe(true);
    });
  });

  // ============================================================================
  // getSelectFieldProps
  // ============================================================================

  describe("getSelectFieldProps", () => {
    it("should return options for select field", () => {
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

      const { result } = renderHook(() => useForma({ spec }));

      const props = result.current.getSelectFieldProps("country");

      expect(props.type).toBe("select");
      expect(props.options).toEqual([
        { value: "us", label: "United States" },
        { value: "ca", label: "Canada" },
      ]);
    });

    it("should return array value for multiselect", () => {
      const spec = createTestSpec({
        fields: {
          tags: { type: "multiselect" },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { tags: ["a", "b"] } }),
      );

      const props = result.current.getSelectFieldProps("tags");

      expect(props.type).toBe("multiselect");
      expect(props.value).toEqual(["a", "b"]);
    });
  });

  // ============================================================================
  // FEEL Expressions - Visibility
  // ============================================================================

  describe("visibility expressions", () => {
    it("should evaluate visibleWhen expression", () => {
      const spec = createTestSpec({
        fields: {
          hasLicense: { type: "boolean" },
          licenseNumber: {
            type: "text",
            visibleWhen: "hasLicense = true",
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { hasLicense: false } }),
      );

      // Initially hidden
      expect(result.current.getFieldProps("licenseNumber").visible).toBe(false);

      // Show when condition is met
      act(() => {
        result.current.setFieldValue("hasLicense", true);
      });

      expect(result.current.getFieldProps("licenseNumber").visible).toBe(true);
    });

    it("should use visibility map correctly", () => {
      const spec = createTestSpec({
        fields: {
          age: { type: "number" },
          canDrive: {
            type: "boolean",
            visibleWhen: "age >= 16",
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { age: 14 } }),
      );

      expect(result.current.visibility.canDrive).toBe(false);

      act(() => {
        result.current.setFieldValue("age", 18);
      });

      expect(result.current.visibility.canDrive).toBe(true);
    });
  });

  // ============================================================================
  // FEEL Expressions - Required
  // ============================================================================

  describe("required expressions", () => {
    it("should evaluate requiredWhen expression", () => {
      const spec = createTestSpec({
        fields: {
          employmentStatus: { type: "select" },
          employerName: {
            type: "text",
            requiredWhen: 'employmentStatus = "employed"',
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { employmentStatus: "unemployed" } }),
      );

      expect(result.current.getFieldProps("employerName").required).toBe(false);

      act(() => {
        result.current.setFieldValue("employmentStatus", "employed");
      });

      expect(result.current.getFieldProps("employerName").required).toBe(true);
    });
  });

  // ============================================================================
  // FEEL Expressions - Enabled
  // ============================================================================

  describe("enabled expressions", () => {
    it("should evaluate enabledWhen expression", () => {
      const spec = createTestSpec({
        fields: {
          isEditable: { type: "boolean" },
          notes: {
            type: "textarea",
            enabledWhen: "isEditable = true",
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { isEditable: false } }),
      );

      expect(result.current.getFieldProps("notes").enabled).toBe(false);

      act(() => {
        result.current.setFieldValue("isEditable", true);
      });

      expect(result.current.getFieldProps("notes").enabled).toBe(true);
    });
  });

  // ============================================================================
  // Computed Fields
  // ============================================================================

  describe("computed fields", () => {
    it("should calculate computed values from expressions", () => {
      const spec = createTestSpec({
        fields: {
          quantity: { type: "number" },
          price: { type: "number" },
        },
        computed: {
          total: { expression: "quantity * price" },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { quantity: 5, price: 10 } }),
      );

      expect(result.current.computed.total).toBe(50);
    });

    it("should update computed values when dependencies change", () => {
      const spec = createTestSpec({
        fields: {
          a: { type: "number" },
          b: { type: "number" },
        },
        computed: {
          sum: { expression: "a + b" },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { a: 1, b: 2 } }),
      );

      expect(result.current.computed.sum).toBe(3);

      act(() => {
        result.current.setFieldValue("a", 10);
      });

      expect(result.current.computed.sum).toBe(12);
    });
  });

  // ============================================================================
  // Validation
  // ============================================================================

  describe("validation", () => {
    it("should validate required fields from schema", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", required: true },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Initially no errors shown (not touched)
      expect(result.current.getFieldProps("name").errors).toEqual([]);

      // After submit, errors should show
      act(() => {
        result.current.submitForm();
      });

      expect(result.current.isSubmitted).toBe(true);
      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.length).toBeGreaterThan(0);
    });

    it("should not show errors for untouched fields (validateOn: blur)", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", required: true },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, validateOn: "blur" }),
      );

      // Errors exist but not shown
      expect(result.current.isValid).toBe(false);
      expect(result.current.getFieldProps("name").errors).toEqual([]);
    });

    it("should show errors immediately when validateOn: change", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", required: true },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, validateOn: "change" }),
      );

      // Errors shown immediately
      expect(
        result.current.getFieldProps("name").errors.length,
      ).toBeGreaterThan(0);
    });

    it("should validate custom validation rules", () => {
      const spec = createTestSpec({
        fields: {
          age: {
            type: "number",
            validations: [
              { rule: "value >= 18", message: "Must be 18 or older" },
            ],
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { age: 16 } }),
      );

      // Touch the field to show errors
      act(() => {
        result.current.setFieldTouched("age", true);
      });

      const errors = result.current.getFieldProps("age").errors;
      expect(errors.some((e) => e.message === "Must be 18 or older")).toBe(
        true,
      );
    });

    it("should clear isSubmitted when data changes", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        result.current.submitForm();
      });

      expect(result.current.isSubmitted).toBe(true);

      act(() => {
        result.current.setFieldValue("name", "new value");
      });

      expect(result.current.isSubmitted).toBe(false);
    });

    describe("validation debouncing", () => {
      it("should debounce validation updates when validationDebounceMs is set", async () => {
        vi.useFakeTimers();

        const spec = createTestSpec({
          fields: {
            name: { type: "text", required: true },
          },
        });

        const { result } = renderHook(() =>
          useForma({ spec, validationDebounceMs: 100 }),
        );

        // Initially invalid (required field empty)
        expect(result.current.isValid).toBe(false);

        // Fill the field - validation should be debounced
        act(() => {
          result.current.setFieldValue("name", "John");
        });

        // Immediately after change, debounced validation still shows old state
        // (depending on implementation, this might already be updated)

        // Fast-forward past debounce timeout
        await act(async () => {
          vi.advanceTimersByTime(150);
        });

        // Now validation should reflect the new state
        expect(result.current.isValid).toBe(true);

        vi.useRealTimers();
      });

      it("should use immediate validation on submit even when debouncing", async () => {
        vi.useFakeTimers();

        const onSubmit = vi.fn();
        const spec = createTestSpec({
          fields: {
            name: { type: "text", required: true },
          },
        });

        const { result } = renderHook(() =>
          useForma({ spec, validationDebounceMs: 500, onSubmit }),
        );

        // Fill the field
        act(() => {
          result.current.setFieldValue("name", "John");
        });

        // Submit immediately without waiting for debounce
        await act(async () => {
          await result.current.submitForm();
        });

        // onSubmit should be called because immediate validation passes
        expect(onSubmit).toHaveBeenCalledWith({ name: "John" });

        vi.useRealTimers();
      });

      it("should not call onSubmit when immediate validation fails", async () => {
        const onSubmit = vi.fn();
        const spec = createTestSpec({
          fields: {
            name: { type: "text", required: true },
          },
        });

        const { result } = renderHook(() =>
          useForma({ spec, validationDebounceMs: 100, onSubmit }),
        );

        // Submit without filling required field
        await act(async () => {
          await result.current.submitForm();
        });

        // onSubmit should NOT be called
        expect(onSubmit).not.toHaveBeenCalled();
      });

      it("should work without debouncing (validationDebounceMs: 0)", () => {
        const spec = createTestSpec({
          fields: {
            name: { type: "text", required: true },
          },
        });

        const { result } = renderHook(() =>
          useForma({ spec, validationDebounceMs: 0 }),
        );

        expect(result.current.isValid).toBe(false);

        act(() => {
          result.current.setFieldValue("name", "John");
        });

        // Validation should update immediately
        expect(result.current.isValid).toBe(true);
      });
    });
  });

  // ============================================================================
  // Array Fields
  // ============================================================================

  describe("array fields", () => {
    it("should provide array helpers via getArrayHelpers", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { items: [] } }),
      );

      const helpers = result.current.getArrayHelpers("items");

      expect(helpers.items).toEqual([]);
      expect(typeof helpers.push).toBe("function");
      expect(typeof helpers.remove).toBe("function");
      expect(typeof helpers.move).toBe("function");
      expect(typeof helpers.swap).toBe("function");
      expect(typeof helpers.insert).toBe("function");
      expect(typeof helpers.getItemFieldProps).toBe("function");
    });

    it("should add item with push", () => {
      const spec = createTestSpec({
        fields: { items: { type: "array" } },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { items: [] } }),
      );

      act(() => {
        result.current.getArrayHelpers("items").push({ name: "New" });
      });

      expect(result.current.data.items).toEqual([{ name: "New" }]);
    });

    it("should remove item at index", () => {
      const spec = createTestSpec({
        fields: { items: { type: "array" } },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: { items: [{ name: "A" }, { name: "B" }, { name: "C" }] },
        }),
      );

      act(() => {
        result.current.getArrayHelpers("items").remove(1);
      });

      expect(result.current.data.items).toEqual([{ name: "A" }, { name: "C" }]);
    });

    it("should move item from one index to another", () => {
      const spec = createTestSpec({
        fields: { items: { type: "array" } },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: { items: [{ name: "A" }, { name: "B" }, { name: "C" }] },
        }),
      );

      act(() => {
        result.current.getArrayHelpers("items").move(0, 2);
      });

      expect(result.current.data.items).toEqual([
        { name: "B" },
        { name: "C" },
        { name: "A" },
      ]);
    });

    it("should swap items at two indices", () => {
      const spec = createTestSpec({
        fields: { items: { type: "array" } },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: { items: [{ name: "A" }, { name: "B" }] },
        }),
      );

      act(() => {
        result.current.getArrayHelpers("items").swap(0, 1);
      });

      expect(result.current.data.items).toEqual([{ name: "B" }, { name: "A" }]);
    });

    it("should insert item at specific index", () => {
      const spec = createTestSpec({
        fields: { items: { type: "array" } },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: { items: [{ name: "A" }, { name: "C" }] },
        }),
      );

      act(() => {
        result.current.getArrayHelpers("items").insert(1, { name: "B" });
      });

      expect(result.current.data.items).toEqual([
        { name: "A" },
        { name: "B" },
        { name: "C" },
      ]);
    });

    it("should respect minItems constraint", () => {
      const spec = createTestSpec({
        fields: {
          items: { type: "array", minItems: 1 },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: { items: [{ name: "Only" }] },
        }),
      );

      const helpers = result.current.getArrayHelpers("items");
      expect(helpers.canRemove).toBe(false);

      // Try to remove - should not work
      act(() => {
        helpers.remove(0);
      });

      // Item should still be there
      expect(result.current.data.items).toEqual([{ name: "Only" }]);
    });

    it("should respect maxItems constraint", () => {
      const spec = createTestSpec({
        fields: {
          items: { type: "array", maxItems: 2 },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: { items: [{ name: "A" }, { name: "B" }] },
        }),
      );

      const helpers = result.current.getArrayHelpers("items");
      expect(helpers.canAdd).toBe(false);

      // Try to add - should not work
      act(() => {
        helpers.push({ name: "C" });
      });

      // Should still have only 2 items
      expect((result.current.data.items as unknown[]).length).toBe(2);
    });

    it("should get item field props", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            itemFields: {
              name: { type: "text", label: "Item Name" },
            },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: { items: [{ name: "Test Item" }] },
        }),
      );

      const itemProps = result.current
        .getArrayHelpers("items")
        .getItemFieldProps(0, "name");

      expect(itemProps.name).toBe("items[0].name");
      expect(itemProps.value).toBe("Test Item");
      expect(itemProps.label).toBe("Item Name");
      expect(itemProps.type).toBe("text");
    });
  });

  // ============================================================================
  // Wizard / Multi-page Forms
  // ============================================================================

  describe("wizard", () => {
    it("should return null when no pages defined", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.wizard).toBeNull();
    });

    it("should provide page state when pages defined", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          email: { type: "email" },
        },
        pages: [
          { id: "page1", title: "Step 1", fields: ["name"] },
          { id: "page2", title: "Step 2", fields: ["email"] },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.wizard).not.toBeNull();
      expect(result.current.wizard?.pages.length).toBe(2);
      expect(result.current.wizard?.currentPageIndex).toBe(0);
      expect(result.current.wizard?.currentPage?.id).toBe("page1");
    });

    it("should navigate to next page", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          email: { type: "email" },
        },
        pages: [
          { id: "page1", title: "Step 1", fields: ["name"] },
          { id: "page2", title: "Step 2", fields: ["email"] },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        result.current.wizard?.nextPage();
      });

      expect(result.current.wizard?.currentPageIndex).toBe(1);
      expect(result.current.wizard?.currentPage?.id).toBe("page2");
    });

    it("should navigate to previous page", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          email: { type: "email" },
        },
        pages: [
          { id: "page1", title: "Step 1", fields: ["name"] },
          { id: "page2", title: "Step 2", fields: ["email"] },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        result.current.wizard?.goToPage(1);
      });

      act(() => {
        result.current.wizard?.previousPage();
      });

      expect(result.current.wizard?.currentPageIndex).toBe(0);
    });

    it("should track hasNextPage and hasPreviousPage", () => {
      const spec = createTestSpec({
        fields: {
          a: { type: "text" },
          b: { type: "text" },
          c: { type: "text" },
        },
        pages: [
          { id: "p1", title: "Page 1", fields: ["a"] },
          { id: "p2", title: "Page 2", fields: ["b"] },
          { id: "p3", title: "Page 3", fields: ["c"] },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      // First page
      expect(result.current.wizard?.hasPreviousPage).toBe(false);
      expect(result.current.wizard?.hasNextPage).toBe(true);
      expect(result.current.wizard?.isLastPage).toBe(false);

      // Go to middle page
      act(() => {
        result.current.wizard?.goToPage(1);
      });

      expect(result.current.wizard?.hasPreviousPage).toBe(true);
      expect(result.current.wizard?.hasNextPage).toBe(true);

      // Go to last page
      act(() => {
        result.current.wizard?.goToPage(2);
      });

      expect(result.current.wizard?.hasPreviousPage).toBe(true);
      expect(result.current.wizard?.hasNextPage).toBe(false);
      expect(result.current.wizard?.isLastPage).toBe(true);
    });

    it("should evaluate page visibility", () => {
      const spec = createTestSpec({
        fields: {
          showPage2: { type: "boolean" },
          field1: { type: "text" },
          field2: { type: "text" },
        },
        pages: [
          { id: "page1", title: "Step 1", fields: ["showPage2", "field1"] },
          {
            id: "page2",
            title: "Step 2",
            fields: ["field2"],
            visibleWhen: "showPage2 = true",
          },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { showPage2: false } }),
      );

      // Page 2 should be hidden
      const page2 = result.current.wizard?.pages.find((p) => p.id === "page2");
      expect(page2?.visible).toBe(false);

      // Show page 2
      act(() => {
        result.current.setFieldValue("showPage2", true);
      });

      const page2After = result.current.wizard?.pages.find(
        (p) => p.id === "page2",
      );
      expect(page2After?.visible).toBe(true);
    });

    // Note: Comprehensive canProceed tests are in canProceed.test.ts
  });

  // ============================================================================
  // Form Actions
  // ============================================================================

  describe("form actions", () => {
    it("should call onSubmit with data when form is valid", async () => {
      const onSubmit = vi.fn();
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "Test" }, onSubmit }),
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onSubmit).toHaveBeenCalledWith({ name: "Test" });
    });

    it("should not call onSubmit when form is invalid", async () => {
      const onSubmit = vi.fn();
      const spec = createTestSpec({
        fields: { name: { type: "text", required: true } },
      });

      const { result } = renderHook(() => useForma({ spec, onSubmit }));

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onSubmit).not.toHaveBeenCalled();
      expect(result.current.isSubmitted).toBe(true);
    });

    it("should track isSubmitting state during async submit", async () => {
      const onSubmit = vi.fn(
        (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "Test" }, onSubmit }),
      );

      let submitPromise: Promise<void>;
      act(() => {
        submitPromise = result.current.submitForm();
      });

      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it("should reset form to initial state", () => {
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "Original" } }),
      );

      act(() => {
        result.current.setFieldValue("name", "Changed");
        result.current.setFieldTouched("name", true);
      });

      expect(result.current.data.name).toBe("Changed");
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.data.name).toBe("Original");
      expect(result.current.isDirty).toBe(false);
      expect(result.current.getFieldProps("name").touched).toBe(false);
    });

    it("should call onChange callback when data changes", () => {
      const onChange = vi.fn();
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      const { result } = renderHook(() => useForma({ spec, onChange }));

      act(() => {
        result.current.setFieldValue("name", "New Value");
      });

      expect(onChange).toHaveBeenCalledWith(
        { name: "New Value" },
        expect.any(Object), // computed values
      );
    });

    it("should not call onChange on initial render", () => {
      const onChange = vi.fn();
      const spec = createTestSpec({
        fields: { name: { type: "text" } },
      });

      renderHook(() =>
        useForma({ spec, initialData: { name: "Initial" }, onChange }),
      );

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Boolean Field Handling
  // ============================================================================

  describe("boolean field handling", () => {
    it("should auto-initialize boolean fields to false", () => {
      const spec = createTestSpec({
        fields: {
          acceptTerms: { type: "boolean" },
          name: { type: "text" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data.acceptTerms).toBe(false);
      expect(result.current.data.name).toBeUndefined();
    });

    it("should respect explicit initialData for booleans", () => {
      const spec = createTestSpec({
        fields: { acceptTerms: { type: "boolean" } },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { acceptTerms: true } }),
      );

      expect(result.current.data.acceptTerms).toBe(true);
    });

    it("should set showRequiredIndicator=false for required boolean fields without validation (binary question)", () => {
      // Binary question pattern: "Do you smoke?" - false is a valid answer
      const spec = createTestSpec({
        fields: {
          isSmoker: { type: "boolean", label: "Do you smoke?", required: true },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));
      const props = result.current.getFieldProps("isSmoker");

      expect(props.required).toBe(true);
      expect(props.showRequiredIndicator).toBe(false); // No asterisk for binary questions
    });

    it("should set showRequiredIndicator=true for required boolean fields with validation (consent pattern)", () => {
      // Consent pattern: "I accept terms" - must explicitly check the box
      const spec = createTestSpec({
        fields: {
          acceptTerms: {
            type: "boolean",
            label: "I accept the terms",
            required: true,
            validations: [
              { rule: "value = true", message: "You must accept the terms" },
            ],
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));
      const props = result.current.getFieldProps("acceptTerms");

      expect(props.required).toBe(true);
      expect(props.showRequiredIndicator).toBe(true); // Show asterisk for consent checkboxes
    });

    it("should set showRequiredIndicator=true for required non-boolean fields", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", required: true },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));
      const props = result.current.getFieldProps("name");

      expect(props.required).toBe(true);
      expect(props.showRequiredIndicator).toBe(true);
    });

    it("should set showRequiredIndicator=false for non-required fields", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));
      const props = result.current.getFieldProps("name");

      expect(props.required).toBe(false);
      expect(props.showRequiredIndicator).toBe(false);
    });

    it("should initialize multiple boolean fields to false", () => {
      const spec = createTestSpec({
        fields: {
          hasInsurance: { type: "boolean" },
          isSmoker: { type: "boolean" },
          hasAllergies: { type: "boolean" },
          name: { type: "text" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.data.hasInsurance).toBe(false);
      expect(result.current.data.isSmoker).toBe(false);
      expect(result.current.data.hasAllergies).toBe(false);
      expect(result.current.data.name).toBeUndefined();
    });

    it("should pass validation for required boolean field with false value", () => {
      const spec = createTestSpec({
        fields: {
          acceptTerms: { type: "boolean", required: true },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Boolean field is auto-initialized to false
      expect(result.current.data.acceptTerms).toBe(false);

      // Form should be valid since false is a valid present value
      expect(result.current.isValid).toBe(true);
    });
  });

  // ============================================================================
  // validateForm and validateField
  // ============================================================================

  describe("validateForm and validateField", () => {
    it("should return validation result from validateForm", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", required: true },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      const validation = result.current.validateForm();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should return field errors from validateField", () => {
      const spec = createTestSpec({
        fields: {
          age: {
            type: "number",
            validations: [{ rule: "value >= 0", message: "Must be positive" }],
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { age: -5 } }),
      );

      const fieldErrors = result.current.validateField("age");

      expect(fieldErrors.some((e) => e.message === "Must be positive")).toBe(
        true,
      );
    });
  });

  // ============================================================================
  // Stale Closure Regression Tests
  // ============================================================================
  // These tests verify that field handlers don't capture stale state,
  // which can cause data loss when editing multiple fields in sequence.

  describe("stale closure regression", () => {
    it("should preserve root field changes when editing array item fields", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          items: {
            type: "array",
            itemFields: { title: { type: "text" } },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "", items: [{ title: "" }] } }),
      );

      // Edit root field
      act(() => {
        result.current.setFieldValue("name", "John");
      });
      expect(result.current.data.name).toBe("John");

      // Get array helpers and edit item field
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        const itemProps = helpers.getItemFieldProps(0, "title");
        itemProps.onChange("First Item");
      });

      // Both values should be preserved
      expect(result.current.data.name).toBe("John");
      expect(
        (result.current.data.items as Array<{ title: string }>)[0].title,
      ).toBe("First Item");
    });

    it("should preserve array item changes when editing root fields", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          items: {
            type: "array",
            itemFields: { title: { type: "text" } },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "", items: [{ title: "" }] } }),
      );

      // Edit array item field first
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        const itemProps = helpers.getItemFieldProps(0, "title");
        itemProps.onChange("First Item");
      });
      expect(
        (result.current.data.items as Array<{ title: string }>)[0].title,
      ).toBe("First Item");

      // Now edit root field
      act(() => {
        result.current.setFieldValue("name", "John");
      });

      // Both values should be preserved
      expect(result.current.data.name).toBe("John");
      expect(
        (result.current.data.items as Array<{ title: string }>)[0].title,
      ).toBe("First Item");
    });

    it("should preserve data when alternating between root and array item edits", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text" },
          email: { type: "email" },
          items: {
            type: "array",
            itemFields: {
              title: { type: "text" },
              value: { type: "number" },
            },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: {
            name: "",
            email: "",
            items: [
              { title: "", value: null },
              { title: "", value: null },
            ],
          },
        }),
      );

      // Sequence of edits alternating between root and array fields
      act(() => {
        result.current.setFieldValue("name", "Alice");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "title").onChange("Item 1");
      });

      act(() => {
        result.current.setFieldValue("email", "alice@example.com");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(1, "title").onChange("Item 2");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "value").onChange(100);
      });

      // All values should be preserved
      const data = result.current.data;
      expect(data.name).toBe("Alice");
      expect(data.email).toBe("alice@example.com");
      expect(
        (data.items as Array<{ title: string; value: number }>)[0].title,
      ).toBe("Item 1");
      expect(
        (data.items as Array<{ title: string; value: number }>)[0].value,
      ).toBe(100);
      expect(
        (data.items as Array<{ title: string; value: number }>)[1].title,
      ).toBe("Item 2");
    });

    it("should preserve item data when adding new items", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { items: [] } }),
      );

      // Add first item
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.push({ name: "" });
      });

      // Edit first item
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("First");
      });
      expect(
        (result.current.data.items as Array<{ name: string }>)[0].name,
      ).toBe("First");

      // Add second item - first item should keep its value
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.push({ name: "" });
      });

      expect(
        (result.current.data.items as Array<{ name: string }>)[0].name,
      ).toBe("First");
      expect(
        (result.current.data.items as Array<{ name: string }>).length,
      ).toBe(2);

      // Edit second item - first item should still keep its value
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(1, "name").onChange("Second");
      });

      expect(
        (result.current.data.items as Array<{ name: string }>)[0].name,
      ).toBe("First");
      expect(
        (result.current.data.items as Array<{ name: string }>)[1].name,
      ).toBe("Second");
    });

    it("should preserve data when editing different array items in sequence", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: {
            items: [{ name: "" }, { name: "" }, { name: "" }],
          },
        }),
      );

      // Edit items in sequence: 0, 2, 1, 0 again
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("First");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(2, "name").onChange("Third");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(1, "name").onChange("Second");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("First Updated");
      });

      const items = result.current.data.items as Array<{ name: string }>;
      expect(items[0].name).toBe("First Updated");
      expect(items[1].name).toBe("Second");
      expect(items[2].name).toBe("Third");
    });

    it("should preserve data when removing items and editing others", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: {
            items: [{ name: "First" }, { name: "Second" }, { name: "Third" }],
          },
        }),
      );

      // Remove middle item
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.remove(1);
      });

      // Edit remaining items
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("First Updated");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(1, "name").onChange("Third Updated");
      });

      const items = result.current.data.items as Array<{ name: string }>;
      expect(items.length).toBe(2);
      expect(items[0].name).toBe("First Updated");
      expect(items[1].name).toBe("Third Updated");
    });

    it("should handle rapid sequential edits to the same field", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { items: [{ name: "" }] } }),
      );

      // Rapidly edit the same field multiple times
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("a");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("ab");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("abc");
      });

      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("abcd");
      });

      expect(
        (result.current.data.items as Array<{ name: string }>)[0].name,
      ).toBe("abcd");
    });

    it("should preserve multiple root fields when editing array items", () => {
      const spec = createTestSpec({
        fields: {
          firstName: { type: "text" },
          lastName: { type: "text" },
          email: { type: "email" },
          items: {
            type: "array",
            itemFields: { name: { type: "text" } },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            items: [{ name: "" }],
          },
        }),
      );

      // Edit array item
      act(() => {
        const helpers = result.current.getArrayHelpers("items");
        helpers.getItemFieldProps(0, "name").onChange("Item Name");
      });

      // All root fields should be preserved
      expect(result.current.data.firstName).toBe("John");
      expect(result.current.data.lastName).toBe("Doe");
      expect(result.current.data.email).toBe("john@example.com");
      expect(
        (result.current.data.items as Array<{ name: string }>)[0].name,
      ).toBe("Item Name");
    });
  });
});
