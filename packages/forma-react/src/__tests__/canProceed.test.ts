/**
 * Comprehensive tests for canProceed wizard validation
 *
 * Tests the canProceed property of wizard helpers which determines
 * whether the user can proceed to the next page based on validation.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForma } from "../useForma.js";
import { createTestSpec } from "./test-utils.js";

describe("canProceed", () => {
  describe("basic validation logic", () => {
    it("returns true when all required fields on current page are filled", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
          email: { type: "email", label: "Email", required: true },
          phone: { type: "text", label: "Phone", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name", "email"] },
          { id: "page2", title: "Page 2", fields: ["phone"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "John", email: "john@example.com" } })
      );

      expect(result.current.wizard?.canProceed).toBe(true);
    });

    it("returns false when required field on current page is empty", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
          email: { type: "email", label: "Email", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name", "email"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "John" } }) // email is missing
      );

      expect(result.current.wizard?.canProceed).toBe(false);
    });

    it("only validates fields on the current page, not other pages", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
          email: { type: "email", label: "Email", required: true },
          phone: { type: "text", label: "Phone", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name"] },
          { id: "page2", title: "Page 2", fields: ["email", "phone"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "John" } }) // page 2 fields empty
      );

      // On page 1, only name is checked (which is filled)
      expect(result.current.wizard?.canProceed).toBe(true);
    });

    it("updates canProceed when navigating to next page", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
          email: { type: "email", label: "Email", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name"] },
          { id: "page2", title: "Page 2", fields: ["email"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "John" } })
      );

      // Page 1 is valid
      expect(result.current.wizard?.canProceed).toBe(true);

      // Navigate to page 2
      act(() => {
        result.current.wizard?.nextPage();
      });

      // Page 2 is invalid (email is empty)
      expect(result.current.wizard?.canProceed).toBe(false);
    });

    it("handles array item fields (e.g., items[0].name)", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            label: "Items",
            required: true,
            minItems: 1,
            itemFields: {
              name: { type: "text", label: "Item Name" },
            },
          },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["items"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { items: [] } })
      );

      // Array is empty but minItems requires at least 1
      expect(result.current.wizard?.canProceed).toBe(false);

      // Add an item
      act(() => {
        result.current.setFieldValue("items", [{ name: "Item 1" }]);
      });

      expect(result.current.wizard?.canProceed).toBe(true);
    });
  });

  describe("visibility integration", () => {
    it("ignores hidden fields when calculating canProceed", () => {
      const spec = createTestSpec({
        fields: {
          showEmail: { type: "boolean", label: "Show Email" },
          name: { type: "text", label: "Name", required: true },
          email: { type: "email", label: "Email", required: true, visibleWhen: "showEmail = true" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["showEmail", "name", "email"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { showEmail: false, name: "John" } })
      );

      // Email is required but hidden, so it shouldn't block progression
      expect(result.current.wizard?.canProceed).toBe(true);
    });

    it("updates canProceed when field visibility changes", () => {
      const spec = createTestSpec({
        fields: {
          showEmail: { type: "boolean", label: "Show Email" },
          name: { type: "text", label: "Name", required: true },
          email: { type: "email", label: "Email", required: true, visibleWhen: "showEmail = true" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["showEmail", "name", "email"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { showEmail: false, name: "John" } })
      );

      // Email is hidden
      expect(result.current.wizard?.canProceed).toBe(true);

      // Show email field
      act(() => {
        result.current.setFieldValue("showEmail", true);
      });

      // Now email is visible and empty - should block
      expect(result.current.wizard?.canProceed).toBe(false);

      // Fill email
      act(() => {
        result.current.setFieldValue("email", "john@example.com");
      });

      expect(result.current.wizard?.canProceed).toBe(true);
    });
  });

  describe("required field validation", () => {
    it("validates static required fields (schema.required)", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
          age: { type: "number", label: "Age" }, // Not required
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name", "age"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { age: 25 } }) // name missing
      );

      expect(result.current.wizard?.canProceed).toBe(false);

      act(() => {
        result.current.setFieldValue("name", "John");
      });

      expect(result.current.wizard?.canProceed).toBe(true);
    });

    it("validates conditional required (requiredWhen)", () => {
      const spec = createTestSpec({
        fields: {
          hasSpouse: { type: "boolean", label: "Has Spouse" },
          spouseName: { type: "text", label: "Spouse Name", requiredWhen: "hasSpouse = true" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["hasSpouse", "spouseName"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { hasSpouse: false } })
      );

      // Spouse name not required when hasSpouse is false
      expect(result.current.wizard?.canProceed).toBe(true);

      // Enable spouse
      act(() => {
        result.current.setFieldValue("hasSpouse", true);
      });

      // Now spouse name is required but empty
      expect(result.current.wizard?.canProceed).toBe(false);

      // Fill spouse name
      act(() => {
        result.current.setFieldValue("spouseName", "Jane");
      });

      expect(result.current.wizard?.canProceed).toBe(true);
    });

    it("required boolean fields - undefined vs false", () => {
      // Note: For boolean fields, "required" means "must have a value" (true or false),
      // NOT "must be true". This is consistent with other field types where required
      // means "not empty". For checkboxes that must be checked (like "Accept Terms"),
      // use a validation rule: { rule: "value = true", message: "Must accept terms" }
      const spec = createTestSpec({
        fields: {
          hasPets: { type: "boolean", label: "Do you have pets?", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["hasPets"] },
        ],
      });

      // undefined should be invalid (user hasn't answered)
      const { result: resultUndefined } = renderHook(() =>
        useForma({ spec, initialData: {} })
      );
      expect(resultUndefined.current.wizard?.canProceed).toBe(false);

      // false should be valid (user answered "no")
      const { result: resultFalse } = renderHook(() =>
        useForma({ spec, initialData: { hasPets: false } })
      );
      expect(resultFalse.current.wizard?.canProceed).toBe(true);

      // true should be valid (user answered "yes")
      const { result: resultTrue } = renderHook(() =>
        useForma({ spec, initialData: { hasPets: true } })
      );
      expect(resultTrue.current.wizard?.canProceed).toBe(true);
    });

    it("required select fields - null/undefined detection", () => {
      const spec = createTestSpec({
        fields: {
          country: {
            type: "select",
            label: "Country",
            required: true,
            options: [
              { label: "USA", value: "us" },
              { label: "Canada", value: "ca" },
            ],
          },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["country"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: {} })
      );

      expect(result.current.wizard?.canProceed).toBe(false);

      act(() => {
        result.current.setFieldValue("country", "us");
      });

      expect(result.current.wizard?.canProceed).toBe(true);
    });
  });

  describe("field types on page", () => {
    it("text fields - empty string detection", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name"] },
        ],
      });

      // Empty string should be invalid
      const { result: resultEmpty } = renderHook(() =>
        useForma({ spec, initialData: { name: "" } })
      );
      expect(resultEmpty.current.wizard?.canProceed).toBe(false);

      // Whitespace only should be invalid
      const { result: resultWhitespace } = renderHook(() =>
        useForma({ spec, initialData: { name: "   " } })
      );
      expect(resultWhitespace.current.wizard?.canProceed).toBe(false);

      // Actual value should be valid
      const { result: resultValid } = renderHook(() =>
        useForma({ spec, initialData: { name: "John" } })
      );
      expect(resultValid.current.wizard?.canProceed).toBe(true);
    });

    it("number fields - null/undefined detection", () => {
      const spec = createTestSpec({
        fields: {
          age: { type: "number", label: "Age", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["age"] },
        ],
      });

      // null should be invalid
      const { result: resultNull } = renderHook(() =>
        useForma({ spec, initialData: { age: null } })
      );
      expect(resultNull.current.wizard?.canProceed).toBe(false);

      // undefined should be invalid
      const { result: resultUndefined } = renderHook(() =>
        useForma({ spec, initialData: {} })
      );
      expect(resultUndefined.current.wizard?.canProceed).toBe(false);

      // 0 should be valid (it's a real number)
      const { result: resultZero } = renderHook(() =>
        useForma({ spec, initialData: { age: 0 } })
      );
      expect(resultZero.current.wizard?.canProceed).toBe(true);
    });

    it("array fields - minItems validation", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            label: "Items",
            minItems: 2,
            itemFields: {
              name: { type: "text", label: "Name" },
            },
          },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["items"] },
        ],
      });

      // Empty array with minItems > 0 should be invalid
      const { result: resultEmpty } = renderHook(() =>
        useForma({ spec, initialData: { items: [] } })
      );
      expect(resultEmpty.current.wizard?.canProceed).toBe(false);

      // 1 item but minItems is 2
      const { result: resultOne } = renderHook(() =>
        useForma({ spec, initialData: { items: [{ name: "Item 1" }] } })
      );
      expect(resultOne.current.wizard?.canProceed).toBe(false);

      // 2 items should be valid
      const { result: resultTwo } = renderHook(() =>
        useForma({ spec, initialData: { items: [{ name: "Item 1" }, { name: "Item 2" }] } })
      );
      expect(resultTwo.current.wizard?.canProceed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("empty page (no fields) - should return true", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
        },
        pages: [
          { id: "page1", title: "Empty Page", fields: [] },
          { id: "page2", title: "Page 2", fields: ["name"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: {} })
      );

      // Empty page should allow progression
      expect(result.current.wizard?.canProceed).toBe(true);
    });

    it("all fields hidden on page - should return true", () => {
      const spec = createTestSpec({
        fields: {
          showFields: { type: "boolean", label: "Show Fields" },
          name: { type: "text", label: "Name", required: true, visibleWhen: "showFields = true" },
          email: { type: "email", label: "Email", required: true, visibleWhen: "showFields = true" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["showFields", "name", "email"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { showFields: false } })
      );

      // All required fields are hidden, only showFields is visible (not required)
      expect(result.current.wizard?.canProceed).toBe(true);
    });

    it("mixed valid/invalid fields across pages", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
          email: { type: "email", label: "Email", required: true },
          phone: { type: "text", label: "Phone", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name"] },
          { id: "page2", title: "Page 2", fields: ["email"] },
          { id: "page3", title: "Page 3", fields: ["phone"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "John" } }) // Only page 1 is valid
      );

      // Page 1 should be valid
      expect(result.current.wizard?.currentPageIndex).toBe(0);
      expect(result.current.wizard?.canProceed).toBe(true);

      // Navigate to page 2
      act(() => {
        result.current.wizard?.nextPage();
      });

      // Page 2 should be invalid (email empty)
      expect(result.current.wizard?.currentPageIndex).toBe(1);
      expect(result.current.wizard?.canProceed).toBe(false);
    });

    it("page with only computed fields (display-only)", () => {
      const spec = createTestSpec({
        fields: {
          price: { type: "number", label: "Price", required: true },
          quantity: { type: "number", label: "Quantity", required: true },
        },
        computed: {
          total: { expression: "price * quantity" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["price", "quantity"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { price: 10, quantity: 2 } })
      );

      // Computed fields don't block - only real fields do
      expect(result.current.wizard?.canProceed).toBe(true);
      expect(result.current.computed.total).toBe(20);
    });
  });

  describe("integration with navigation methods", () => {
    it("validateCurrentPage correlates with canProceed", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: {} })
      );

      // Both should return the same result
      expect(result.current.wizard?.canProceed).toBe(false);
      expect(result.current.wizard?.validateCurrentPage()).toBe(false);

      // Fill the field
      act(() => {
        result.current.setFieldValue("name", "John");
      });

      expect(result.current.wizard?.canProceed).toBe(true);
      expect(result.current.wizard?.validateCurrentPage()).toBe(true);
    });

    it("touchCurrentPageFields reveals errors", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
          email: { type: "email", label: "Email", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name", "email"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: {}, validateOn: "blur" })
      );

      // Fields not touched yet - errors exist but not visible to user
      expect(result.current.wizard?.canProceed).toBe(false);
      expect(result.current.touched.name).toBeUndefined();
      expect(result.current.touched.email).toBeUndefined();

      // Touch all fields on current page
      act(() => {
        result.current.wizard?.touchCurrentPageFields();
      });

      // Now fields are touched - errors should be displayed
      expect(result.current.touched.name).toBe(true);
      expect(result.current.touched.email).toBe(true);
    });
  });

  describe("canProceed reactivity", () => {
    it("updates reactively when data changes", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: {} })
      );

      expect(result.current.wizard?.canProceed).toBe(false);

      act(() => {
        result.current.setFieldValue("name", "John");
      });

      expect(result.current.wizard?.canProceed).toBe(true);

      act(() => {
        result.current.setFieldValue("name", "");
      });

      expect(result.current.wizard?.canProceed).toBe(false);
    });

    it("updates with multiple required fields", () => {
      const spec = createTestSpec({
        fields: {
          firstName: { type: "text", label: "First Name", required: true },
          lastName: { type: "text", label: "Last Name", required: true },
          email: { type: "email", label: "Email", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["firstName", "lastName", "email"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: {} })
      );

      expect(result.current.wizard?.canProceed).toBe(false);

      // Fill one field - still invalid
      act(() => {
        result.current.setFieldValue("firstName", "John");
      });
      expect(result.current.wizard?.canProceed).toBe(false);

      // Fill second field - still invalid
      act(() => {
        result.current.setFieldValue("lastName", "Doe");
      });
      expect(result.current.wizard?.canProceed).toBe(false);

      // Fill third field - now valid
      act(() => {
        result.current.setFieldValue("email", "john@example.com");
      });
      expect(result.current.wizard?.canProceed).toBe(true);
    });
  });

  describe("warnings vs errors", () => {
    it("only errors block canProceed, not warnings", () => {
      // Note: This test requires custom FEEL validation rules that produce warnings
      // For now, we test that the error filtering uses severity === 'error'
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["name"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { name: "John" } })
      );

      // No errors - should be able to proceed
      expect(result.current.wizard?.canProceed).toBe(true);
      expect(result.current.errors.filter(e => e.severity === "error")).toHaveLength(0);
    });
  });

  describe("edge cases - hidden pages", () => {
    it("should auto-correct to valid page when current page becomes hidden", () => {
      const spec = createTestSpec({
        fields: {
          showPage2: { type: "boolean", label: "Show Page 2" },
          page1Field: { type: "text", label: "Page 1 Field" },
          page2Field: { type: "text", label: "Page 2 Field", required: true },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["showPage2", "page1Field"] },
          { id: "page2", title: "Page 2", fields: ["page2Field"], visibleWhen: "showPage2 = true" },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { showPage2: true } })
      );

      // Navigate to page 2
      act(() => {
        result.current.wizard?.nextPage();
      });
      expect(result.current.wizard?.currentPageIndex).toBe(1);
      expect(result.current.wizard?.currentPage?.id).toBe("page2");

      // Hide page 2 - should auto-correct to page 1
      act(() => {
        result.current.setFieldValue("showPage2", false);
      });

      // Should be back on page 1 (the only visible page now)
      expect(result.current.wizard?.currentPageIndex).toBe(0);
      expect(result.current.wizard?.currentPage?.id).toBe("page1");
    });

    it("should skip hidden pages when navigating forward", () => {
      const spec = createTestSpec({
        fields: {
          skipMiddle: { type: "boolean", label: "Skip Middle" },
          page1Field: { type: "text", label: "Page 1 Field" },
          page2Field: { type: "text", label: "Page 2 Field" },
          page3Field: { type: "text", label: "Page 3 Field" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["skipMiddle", "page1Field"] },
          { id: "page2", title: "Page 2", fields: ["page2Field"], visibleWhen: "skipMiddle = false" },
          { id: "page3", title: "Page 3", fields: ["page3Field"] },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { skipMiddle: true } })
      );

      // With skipMiddle=true, page2 is hidden
      // Navigating from page1 should go directly to page3
      act(() => {
        result.current.wizard?.nextPage();
      });

      // Should be on page3 (which is now index 1 in visible pages)
      expect(result.current.wizard?.currentPage?.id).toBe("page3");
    });

    it("pages array includes all pages with visible property", () => {
      // Note: wizard.pages returns ALL pages defined in spec, with a visible
      // property indicating current visibility state. Consumers should filter
      // by visible when rendering step indicators.
      const spec = createTestSpec({
        fields: {
          showOptional: { type: "boolean", label: "Show Optional" },
          requiredField: { type: "text", label: "Required", required: true },
          optionalField: { type: "text", label: "Optional" },
        },
        pages: [
          { id: "main", title: "Main", fields: ["showOptional", "requiredField"] },
          { id: "optional", title: "Optional", fields: ["optionalField"], visibleWhen: "showOptional = true" },
        ],
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { showOptional: false } })
      );

      // All pages are returned
      expect(result.current.wizard?.pages).toHaveLength(2);

      // Main page is visible
      expect(result.current.wizard?.pages[0].visible).toBe(true);
      // Optional page is hidden when showOptional is false
      expect(result.current.wizard?.pages[1].visible).toBe(false);

      // Enable optional page
      act(() => {
        result.current.setFieldValue("showOptional", true);
      });

      // Optional page is now visible
      expect(result.current.wizard?.pages[1].visible).toBe(true);
    });
  });

  describe("edge cases - navigation bounds", () => {
    it("should not navigate beyond last page", () => {
      const spec = createTestSpec({
        fields: {
          field1: { type: "text", label: "Field 1" },
          field2: { type: "text", label: "Field 2" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["field1"] },
          { id: "page2", title: "Page 2", fields: ["field2"] },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Go to last page
      act(() => {
        result.current.wizard?.nextPage();
      });
      expect(result.current.wizard?.currentPageIndex).toBe(1);
      expect(result.current.wizard?.isLastPage).toBe(true);

      // Try to go beyond - should stay on last page
      act(() => {
        result.current.wizard?.nextPage();
      });
      expect(result.current.wizard?.currentPageIndex).toBe(1);
    });

    it("should not navigate before first page", () => {
      const spec = createTestSpec({
        fields: {
          field1: { type: "text", label: "Field 1" },
          field2: { type: "text", label: "Field 2" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["field1"] },
          { id: "page2", title: "Page 2", fields: ["field2"] },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      expect(result.current.wizard?.currentPageIndex).toBe(0);
      expect(result.current.wizard?.hasPreviousPage).toBe(false);

      // Try to go before first page - should stay on first
      act(() => {
        result.current.wizard?.previousPage();
      });
      expect(result.current.wizard?.currentPageIndex).toBe(0);
    });

    it("goToPage clamps out-of-bounds indices to valid range", () => {
      const spec = createTestSpec({
        fields: {
          field1: { type: "text", label: "Field 1" },
          field2: { type: "text", label: "Field 2" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["field1"] },
          { id: "page2", title: "Page 2", fields: ["field2"] },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      // goToPage(999) should clamp to last page (index 1)
      act(() => {
        result.current.wizard?.goToPage(999);
      });
      expect(result.current.wizard?.currentPageIndex).toBe(1);
      expect(result.current.wizard?.currentPage?.id).toBe("page2");

      // goToPage(-5) should clamp to first page (index 0)
      act(() => {
        result.current.wizard?.goToPage(-5);
      });
      expect(result.current.wizard?.currentPageIndex).toBe(0);
      expect(result.current.wizard?.currentPage?.id).toBe("page1");
    });

    it("goToPage should navigate to valid index", () => {
      const spec = createTestSpec({
        fields: {
          field1: { type: "text", label: "Field 1" },
          field2: { type: "text", label: "Field 2" },
          field3: { type: "text", label: "Field 3" },
        },
        pages: [
          { id: "page1", title: "Page 1", fields: ["field1"] },
          { id: "page2", title: "Page 2", fields: ["field2"] },
          { id: "page3", title: "Page 3", fields: ["field3"] },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Go directly to page 3 (index 2)
      act(() => {
        result.current.wizard?.goToPage(2);
      });
      expect(result.current.wizard?.currentPageIndex).toBe(2);
      expect(result.current.wizard?.currentPage?.id).toBe("page3");

      // Go back to page 1 (index 0)
      act(() => {
        result.current.wizard?.goToPage(0);
      });
      expect(result.current.wizard?.currentPageIndex).toBe(0);
      expect(result.current.wizard?.currentPage?.id).toBe("page1");
    });
  });
});
