/**
 * Integration tests for option visibility filtering
 *
 * Tests that visibleWhen on SelectOption works correctly through
 * useForma and FieldRenderer.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForma } from "../useForma.js";
import { createTestSpec } from "./test-utils.js";

describe("Option Visibility", () => {
  // ============================================================================
  // getSelectFieldProps
  // ============================================================================

  describe("getSelectFieldProps option filtering", () => {
    it("should return all options when none have visibleWhen", () => {
      const spec = createTestSpec({
        fields: {
          department: {
            type: "select",
            options: [
              { value: "eng", label: "Engineering" },
              { value: "hr", label: "HR" },
              { value: "sales", label: "Sales" },
            ],
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));
      const props = result.current.getSelectFieldProps("department");

      expect(props.options).toHaveLength(3);
      expect(props.options.map((o) => o.value)).toEqual(["eng", "hr", "sales"]);
    });

    it("should filter options based on visibleWhen expressions", () => {
      const spec = createTestSpec({
        fields: {
          experienceYears: { type: "number" },
          position: {
            type: "select",
            options: [
              { value: "intern", label: "Intern" },
              {
                value: "junior",
                label: "Junior Developer",
                visibleWhen: "experienceYears >= 1",
              },
              {
                value: "senior",
                label: "Senior Developer",
                visibleWhen: "experienceYears >= 5",
              },
              {
                value: "lead",
                label: "Tech Lead",
                visibleWhen: "experienceYears >= 8",
              },
            ],
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { experienceYears: 3 } }),
      );

      // With 3 years: intern, junior should be visible
      let props = result.current.getSelectFieldProps("position");
      expect(props.options.map((o) => o.value)).toEqual(["intern", "junior"]);

      // Change to 6 years: intern, junior, senior should be visible
      act(() => {
        result.current.setFieldValue("experienceYears", 6);
      });

      props = result.current.getSelectFieldProps("position");
      expect(props.options.map((o) => o.value)).toEqual([
        "intern",
        "junior",
        "senior",
      ]);

      // Change to 10 years: all should be visible
      act(() => {
        result.current.setFieldValue("experienceYears", 10);
      });

      props = result.current.getSelectFieldProps("position");
      expect(props.options.map((o) => o.value)).toEqual([
        "intern",
        "junior",
        "senior",
        "lead",
      ]);
    });

    it("should filter options based on another select field value", () => {
      const spec = createTestSpec({
        fields: {
          department: {
            type: "select",
            options: [
              { value: "eng", label: "Engineering" },
              { value: "hr", label: "HR" },
            ],
          },
          position: {
            type: "select",
            options: [
              {
                value: "dev_frontend",
                label: "Frontend Developer",
                visibleWhen: 'department = "eng"',
              },
              {
                value: "dev_backend",
                label: "Backend Developer",
                visibleWhen: 'department = "eng"',
              },
              {
                value: "recruiter",
                label: "Recruiter",
                visibleWhen: 'department = "hr"',
              },
              {
                value: "hr_manager",
                label: "HR Manager",
                visibleWhen: 'department = "hr"',
              },
            ],
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { department: "eng" } }),
      );

      // With Engineering selected
      let props = result.current.getSelectFieldProps("position");
      expect(props.options.map((o) => o.value)).toEqual([
        "dev_frontend",
        "dev_backend",
      ]);

      // Switch to HR
      act(() => {
        result.current.setFieldValue("department", "hr");
      });

      props = result.current.getSelectFieldProps("position");
      expect(props.options.map((o) => o.value)).toEqual([
        "recruiter",
        "hr_manager",
      ]);
    });

    it("should return empty options when all are hidden", () => {
      const spec = createTestSpec({
        fields: {
          isPremium: { type: "boolean" },
          premiumFeature: {
            type: "select",
            options: [
              {
                value: "feature_a",
                label: "Feature A",
                visibleWhen: "isPremium = true",
              },
              {
                value: "feature_b",
                label: "Feature B",
                visibleWhen: "isPremium = true",
              },
            ],
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { isPremium: false } }),
      );

      const props = result.current.getSelectFieldProps("premiumFeature");
      expect(props.options).toEqual([]);
    });

    it("should use computed values in visibleWhen expressions", () => {
      const spec = createTestSpec({
        fields: {
          quantity: { type: "number" },
          unitPrice: { type: "number" },
          shippingMethod: {
            type: "select",
            options: [
              { value: "standard", label: "Standard Shipping" },
              {
                value: "express",
                label: "Express Shipping",
                visibleWhen: "computed.orderTotal >= 50",
              },
              {
                value: "overnight",
                label: "Overnight Shipping",
                visibleWhen: "computed.orderTotal >= 100",
              },
            ],
          },
        },
        computed: {
          orderTotal: { expression: "quantity * unitPrice" },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { quantity: 2, unitPrice: 20 } }),
      );

      // Total = 40: only standard
      let props = result.current.getSelectFieldProps("shippingMethod");
      expect(props.options.map((o) => o.value)).toEqual(["standard"]);

      // Total = 60: standard and express
      act(() => {
        result.current.setFieldValue("quantity", 3);
      });

      props = result.current.getSelectFieldProps("shippingMethod");
      expect(props.options.map((o) => o.value)).toEqual([
        "standard",
        "express",
      ]);

      // Total = 120: all options
      act(() => {
        result.current.setFieldValue("unitPrice", 40);
      });

      props = result.current.getSelectFieldProps("shippingMethod");
      expect(props.options.map((o) => o.value)).toEqual([
        "standard",
        "express",
        "overnight",
      ]);
    });
  });

  // ============================================================================
  // Multiselect
  // ============================================================================

  describe("multiselect option filtering", () => {
    it("should filter multiselect options based on visibleWhen", () => {
      const spec = createTestSpec({
        fields: {
          accountType: {
            type: "select",
            options: [
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid" },
            ],
          },
          features: {
            type: "multiselect",
            options: [
              { value: "basic", label: "Basic Features" },
              {
                value: "advanced",
                label: "Advanced Features",
                visibleWhen: 'accountType = "paid"',
              },
              {
                value: "enterprise",
                label: "Enterprise Features",
                visibleWhen: 'accountType = "paid"',
              },
            ],
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { accountType: "free" } }),
      );

      // Free account: only basic
      let props = result.current.getSelectFieldProps("features");
      expect(props.options.map((o) => o.value)).toEqual(["basic"]);

      // Paid account: all features
      act(() => {
        result.current.setFieldValue("accountType", "paid");
      });

      props = result.current.getSelectFieldProps("features");
      expect(props.options.map((o) => o.value)).toEqual([
        "basic",
        "advanced",
        "enterprise",
      ]);
    });
  });

  // ============================================================================
  // Array item select fields
  // ============================================================================

  describe("array item select field filtering", () => {
    it("should filter options in array item select fields using item context", () => {
      const spec = createTestSpec({
        fields: {
          orderItems: {
            type: "array",
            itemFields: {
              category: {
                type: "select",
                options: [
                  { value: "electronics", label: "Electronics" },
                  { value: "clothing", label: "Clothing" },
                ],
              },
              addon: {
                type: "select",
                options: [
                  {
                    value: "warranty",
                    label: "Extended Warranty",
                    visibleWhen: 'item.category = "electronics"',
                  },
                  { value: "insurance", label: "Shipping Insurance" },
                  {
                    value: "giftWrap",
                    label: "Gift Wrap",
                    visibleWhen: 'item.category = "clothing"',
                  },
                ],
              },
            },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: {
            orderItems: [
              { category: "electronics", addon: null },
              { category: "clothing", addon: null },
            ],
          },
        }),
      );

      const helpers = result.current.getArrayHelpers("orderItems");

      // First item (electronics): warranty and insurance
      const item0Props = helpers.getItemFieldProps(0, "addon");
      expect(item0Props.options?.map((o) => o.value)).toEqual([
        "warranty",
        "insurance",
      ]);

      // Second item (clothing): insurance and giftWrap
      const item1Props = helpers.getItemFieldProps(1, "addon");
      expect(item1Props.options?.map((o) => o.value)).toEqual([
        "insurance",
        "giftWrap",
      ]);
    });

    it("should update array item options when item data changes", () => {
      const spec = createTestSpec({
        fields: {
          contacts: {
            type: "array",
            itemFields: {
              type: {
                type: "select",
                options: [
                  { value: "personal", label: "Personal" },
                  { value: "business", label: "Business" },
                ],
              },
              method: {
                type: "select",
                options: [
                  { value: "email", label: "Email" },
                  { value: "phone", label: "Phone" },
                  {
                    value: "fax",
                    label: "Fax",
                    visibleWhen: 'item.type = "business"',
                  },
                ],
              },
            },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: {
            contacts: [{ type: "personal", method: null }],
          },
        }),
      );

      // Initially personal: email and phone only
      let helpers = result.current.getArrayHelpers("contacts");
      let methodProps = helpers.getItemFieldProps(0, "method");
      expect(methodProps.options?.map((o) => o.value)).toEqual([
        "email",
        "phone",
      ]);

      // Change to business: fax becomes available
      act(() => {
        helpers.getItemFieldProps(0, "type").onChange("business");
      });

      helpers = result.current.getArrayHelpers("contacts");
      methodProps = helpers.getItemFieldProps(0, "method");
      expect(methodProps.options?.map((o) => o.value)).toEqual([
        "email",
        "phone",
        "fax",
      ]);
    });

    it("should use itemIndex in option visibleWhen expressions", () => {
      const spec = createTestSpec({
        fields: {
          teamMembers: {
            type: "array",
            itemFields: {
              role: {
                type: "select",
                options: [
                  { value: "member", label: "Team Member" },
                  {
                    value: "lead",
                    label: "Team Lead",
                    visibleWhen: "itemIndex = 0",
                  },
                ],
              },
            },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: {
            teamMembers: [{ role: null }, { role: null }, { role: null }],
          },
        }),
      );

      const helpers = result.current.getArrayHelpers("teamMembers");

      // First item: can be member or lead
      const item0Props = helpers.getItemFieldProps(0, "role");
      expect(item0Props.options?.map((o) => o.value)).toEqual([
        "member",
        "lead",
      ]);

      // Second item: can only be member
      const item1Props = helpers.getItemFieldProps(1, "role");
      expect(item1Props.options?.map((o) => o.value)).toEqual(["member"]);

      // Third item: can only be member
      const item2Props = helpers.getItemFieldProps(2, "role");
      expect(item2Props.options?.map((o) => o.value)).toEqual(["member"]);
    });

    it("should combine form data, computed values, and item context", () => {
      const spec = createTestSpec({
        fields: {
          isPremiumOrder: { type: "boolean" },
          lineItems: {
            type: "array",
            itemFields: {
              productType: {
                type: "select",
                options: [
                  { value: "standard", label: "Standard" },
                  { value: "premium", label: "Premium" },
                ],
              },
              shipping: {
                type: "select",
                options: [
                  { value: "standard", label: "Standard" },
                  {
                    value: "express",
                    label: "Express",
                    visibleWhen: "isPremiumOrder = true",
                  },
                  {
                    value: "priority",
                    label: "Priority",
                    visibleWhen:
                      'isPremiumOrder = true and item.productType = "premium"',
                  },
                ],
              },
            },
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({
          spec,
          initialData: {
            isPremiumOrder: false,
            lineItems: [
              { productType: "standard", shipping: null },
              { productType: "premium", shipping: null },
            ],
          },
        }),
      );

      let helpers = result.current.getArrayHelpers("lineItems");

      // Not premium order: only standard shipping for both
      expect(
        helpers.getItemFieldProps(0, "shipping").options?.map((o) => o.value),
      ).toEqual(["standard"]);
      expect(
        helpers.getItemFieldProps(1, "shipping").options?.map((o) => o.value),
      ).toEqual(["standard"]);

      // Upgrade to premium order
      act(() => {
        result.current.setFieldValue("isPremiumOrder", true);
      });

      helpers = result.current.getArrayHelpers("lineItems");

      // Standard product: standard and express
      expect(
        helpers.getItemFieldProps(0, "shipping").options?.map((o) => o.value),
      ).toEqual(["standard", "express"]);

      // Premium product: standard, express, and priority
      expect(
        helpers.getItemFieldProps(1, "shipping").options?.map((o) => o.value),
      ).toEqual(["standard", "express", "priority"]);
    });
  });

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe("edge cases", () => {
    it("should handle field without options gracefully", () => {
      const spec = createTestSpec({
        fields: {
          textField: { type: "text" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));
      const props = result.current.getSelectFieldProps("textField");

      expect(props.options).toEqual([]);
    });

    it("should handle invalid visibleWhen expressions gracefully", () => {
      const spec = createTestSpec({
        fields: {
          status: {
            type: "select",
            options: [
              { value: "valid", label: "Valid Option" },
              {
                value: "invalid",
                label: "Invalid",
                visibleWhen: "this is not valid FEEL syntax !!!",
              },
            ],
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));
      const props = result.current.getSelectFieldProps("status");

      // Invalid expression should hide the option (treated as false)
      expect(props.options.map((o) => o.value)).toEqual(["valid"]);
    });

    it("should preserve selected value when option becomes hidden", () => {
      const spec = createTestSpec({
        fields: {
          level: { type: "number" },
          feature: {
            type: "select",
            options: [
              { value: "basic", label: "Basic" },
              {
                value: "advanced",
                label: "Advanced",
                visibleWhen: "level >= 5",
              },
            ],
          },
        },
      });

      const { result } = renderHook(() =>
        useForma({ spec, initialData: { level: 5, feature: "advanced" } }),
      );

      // Initially advanced is selected and visible
      expect(result.current.data.feature).toBe("advanced");
      expect(
        result.current
          .getSelectFieldProps("feature")
          .options.map((o) => o.value),
      ).toEqual(["basic", "advanced"]);

      // Reduce level - advanced option becomes hidden but value is preserved
      act(() => {
        result.current.setFieldValue("level", 3);
      });

      // Value is preserved (validation would catch this if needed)
      expect(result.current.data.feature).toBe("advanced");
      // But option is no longer visible
      expect(
        result.current
          .getSelectFieldProps("feature")
          .options.map((o) => o.value),
      ).toEqual(["basic"]);
    });
  });
});
