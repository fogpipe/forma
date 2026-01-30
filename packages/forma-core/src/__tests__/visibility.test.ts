/**
 * Tests for visibility engine - option visibility
 */

import { describe, it, expect } from "vitest";
import { getOptionsVisibility, getVisibleOptions } from "../engine/visibility.js";
import type { Forma, SelectOption } from "../types.js";

/**
 * Helper to create a minimal Forma spec for testing
 */
function createTestSpec(options: {
  fields?: Record<string, unknown>;
  computed?: Record<string, { expression: string }>;
  referenceData?: Record<string, unknown>;
} = {}): Forma {
  const { fields = {}, computed, referenceData } = options;

  // Build fieldOrder from fields keys
  const fieldOrder = Object.keys(fields);

  return {
    version: "1.0",
    meta: { id: "test", title: "Test" },
    schema: {
      type: "object",
      properties: {},
    },
    fields: fields as Forma["fields"],
    fieldOrder,
    computed,
    referenceData,
  };
}

// ============================================================================
// getOptionsVisibility (Batch Computation)
// ============================================================================

describe("getOptionsVisibility", () => {
  describe("top-level select fields", () => {
    it("should compute visible options for all select fields", () => {
      const spec = createTestSpec({
        fields: {
          department: {
            type: "select",
            options: [
              { value: "eng", label: "Engineering" },
              { value: "hr", label: "HR" },
            ],
          },
          level: {
            type: "select",
            options: [
              { value: "junior", label: "Junior" },
              { value: "senior", label: "Senior", visibleWhen: "experience >= 5" },
            ],
          },
        },
      });

      const result = getOptionsVisibility({ experience: 3 }, spec);

      // Department has all options (no visibleWhen)
      expect(result["department"]).toHaveLength(2);

      // Level only shows junior (senior requires experience >= 5)
      expect(result["level"]).toHaveLength(1);
      expect(result["level"][0].value).toBe("junior");
    });

    it("should not include fields without options", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name" },
          department: {
            type: "select",
            options: [{ value: "eng", label: "Engineering" }],
          },
        },
      });

      const result = getOptionsVisibility({}, spec);

      expect(result["name"]).toBeUndefined();
      expect(result["department"]).toBeDefined();
    });

    it("should filter options based on form data", () => {
      const spec = createTestSpec({
        fields: {
          position: {
            type: "select",
            options: [
              { value: "dev_fe", label: "Frontend Dev", visibleWhen: 'department = "eng"' },
              { value: "dev_be", label: "Backend Dev", visibleWhen: 'department = "eng"' },
              { value: "recruiter", label: "Recruiter", visibleWhen: 'department = "hr"' },
            ],
          },
        },
      });

      // Engineering department
      const engResult = getOptionsVisibility({ department: "eng" }, spec);
      expect(engResult["position"].map(o => o.value)).toEqual(["dev_fe", "dev_be"]);

      // HR department
      const hrResult = getOptionsVisibility({ department: "hr" }, spec);
      expect(hrResult["position"].map(o => o.value)).toEqual(["recruiter"]);
    });

    it("should use computed values in expressions", () => {
      const spec = createTestSpec({
        fields: {
          shipping: {
            type: "select",
            options: [
              { value: "standard", label: "Standard" },
              { value: "express", label: "Express", visibleWhen: "computed.total >= 50" },
            ],
          },
        },
        computed: {
          total: { expression: "quantity * price" },
        },
      });

      // Total = 40, only standard
      const lowResult = getOptionsVisibility({ quantity: 2, price: 20 }, spec);
      expect(lowResult["shipping"].map(o => o.value)).toEqual(["standard"]);

      // Total = 100, both options
      const highResult = getOptionsVisibility({ quantity: 5, price: 20 }, spec);
      expect(highResult["shipping"].map(o => o.value)).toEqual(["standard", "express"]);
    });

    it("should accept pre-computed values", () => {
      const spec = createTestSpec({
        fields: {
          tier: {
            type: "select",
            options: [
              { value: "basic", label: "Basic" },
              { value: "premium", label: "Premium", visibleWhen: "computed.score >= 100" },
            ],
          },
        },
      });

      const result = getOptionsVisibility({}, spec, { computed: { score: 150 } });
      expect(result["tier"].map(o => o.value)).toEqual(["basic", "premium"]);
    });
  });

  describe("array item select fields", () => {
    it("should compute options for each array item", () => {
      const spec = createTestSpec({
        fields: {
          items: {
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
                  { value: "warranty", label: "Warranty", visibleWhen: 'item.category = "electronics"' },
                  { value: "gift_wrap", label: "Gift Wrap", visibleWhen: 'item.category = "clothing"' },
                  { value: "insurance", label: "Insurance" },
                ],
              },
            },
          },
        },
      });

      const data = {
        items: [
          { category: "electronics" },
          { category: "clothing" },
        ],
      };

      const result = getOptionsVisibility(data, spec);

      // First item (electronics): warranty + insurance
      expect(result["items[0].addon"].map(o => o.value)).toEqual(["warranty", "insurance"]);

      // Second item (clothing): gift_wrap + insurance
      expect(result["items[1].addon"].map(o => o.value)).toEqual(["gift_wrap", "insurance"]);

      // Category field has all options (no visibleWhen)
      expect(result["items[0].category"]).toHaveLength(2);
      expect(result["items[1].category"]).toHaveLength(2);
    });

    it("should use itemIndex in expressions", () => {
      const spec = createTestSpec({
        fields: {
          members: {
            type: "array",
            itemFields: {
              role: {
                type: "select",
                options: [
                  { value: "member", label: "Member" },
                  { value: "lead", label: "Team Lead", visibleWhen: "itemIndex = 0" },
                ],
              },
            },
          },
        },
      });

      const data = {
        members: [{}, {}, {}],
      };

      const result = getOptionsVisibility(data, spec);

      // First item can be lead
      expect(result["members[0].role"].map(o => o.value)).toEqual(["member", "lead"]);

      // Other items can only be member
      expect(result["members[1].role"].map(o => o.value)).toEqual(["member"]);
      expect(result["members[2].role"].map(o => o.value)).toEqual(["member"]);
    });

    it("should combine form data with item context", () => {
      const spec = createTestSpec({
        fields: {
          isPremium: { type: "boolean" },
          orders: {
            type: "array",
            itemFields: {
              shipping: {
                type: "select",
                options: [
                  { value: "standard", label: "Standard" },
                  { value: "express", label: "Express", visibleWhen: "isPremium = true" },
                  { value: "priority", label: "Priority", visibleWhen: 'isPremium = true and item.value > 100' },
                ],
              },
            },
          },
        },
      });

      // Not premium
      const basicResult = getOptionsVisibility({
        isPremium: false,
        orders: [{ value: 50 }, { value: 200 }],
      }, spec);

      expect(basicResult["orders[0].shipping"].map(o => o.value)).toEqual(["standard"]);
      expect(basicResult["orders[1].shipping"].map(o => o.value)).toEqual(["standard"]);

      // Premium with different order values
      const premiumResult = getOptionsVisibility({
        isPremium: true,
        orders: [{ value: 50 }, { value: 200 }],
      }, spec);

      // Low value order: standard + express
      expect(premiumResult["orders[0].shipping"].map(o => o.value)).toEqual(["standard", "express"]);

      // High value order: standard + express + priority
      expect(premiumResult["orders[1].shipping"].map(o => o.value)).toEqual(["standard", "express", "priority"]);
    });

    it("should handle empty arrays", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            itemFields: {
              type: {
                type: "select",
                options: [{ value: "a", label: "A" }],
              },
            },
          },
        },
      });

      const result = getOptionsVisibility({ items: [] }, spec);

      // No item paths should exist
      expect(Object.keys(result).filter(k => k.startsWith("items["))).toHaveLength(0);
    });

    it("should handle missing array data", () => {
      const spec = createTestSpec({
        fields: {
          items: {
            type: "array",
            itemFields: {
              type: {
                type: "select",
                options: [{ value: "a", label: "A" }],
              },
            },
          },
        },
      });

      const result = getOptionsVisibility({}, spec);

      // No item paths should exist
      expect(Object.keys(result).filter(k => k.startsWith("items["))).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("should hide options with invalid FEEL expressions", () => {
      const spec = createTestSpec({
        fields: {
          status: {
            type: "select",
            options: [
              { value: "valid", label: "Valid" },
              { value: "invalid", label: "Invalid", visibleWhen: "not valid FEEL !!!" },
            ],
          },
        },
      });

      const result = getOptionsVisibility({}, spec);

      expect(result["status"].map(o => o.value)).toEqual(["valid"]);
    });
  });

  describe("reference data", () => {
    it("should access reference data in expressions", () => {
      const spec = createTestSpec({
        fields: {
          plan: {
            type: "select",
            options: [
              { value: "basic", label: "Basic" },
              { value: "enterprise", label: "Enterprise", visibleWhen: "ref.features.enterpriseEnabled = true" },
            ],
          },
        },
        referenceData: {
          features: { enterpriseEnabled: true },
        },
      });

      const result = getOptionsVisibility({}, spec);

      expect(result["plan"].map(o => o.value)).toEqual(["basic", "enterprise"]);
    });
  });
});

// ============================================================================
// getVisibleOptions (Individual Computation - Utility)
// ============================================================================

describe("getVisibleOptions", () => {
  describe("basic filtering", () => {
    it("should return all options when none have visibleWhen", () => {
      const options: SelectOption[] = [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
      ];
      const spec = createTestSpec();

      const result = getVisibleOptions(options, {}, spec);

      expect(result).toEqual(options);
    });

    it("should filter options based on visibleWhen", () => {
      const options: SelectOption[] = [
        { value: "always", label: "Always" },
        { value: "conditional", label: "Conditional", visibleWhen: "show = true" },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, { show: false }, spec).map(o => o.value))
        .toEqual(["always"]);

      expect(getVisibleOptions(options, { show: true }, spec).map(o => o.value))
        .toEqual(["always", "conditional"]);
    });

    it("should return empty array for undefined/empty options", () => {
      const spec = createTestSpec();

      expect(getVisibleOptions(undefined, {}, spec)).toEqual([]);
      expect(getVisibleOptions([], {}, spec)).toEqual([]);
    });

    it("should return empty array when all options hidden", () => {
      const options: SelectOption[] = [
        { value: "a", label: "A", visibleWhen: "show = true" },
        { value: "b", label: "B", visibleWhen: "show = true" },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, { show: false }, spec)).toEqual([]);
    });
  });

  describe("with item context", () => {
    it("should use item data in expressions", () => {
      const options: SelectOption[] = [
        { value: "warranty", label: "Warranty", visibleWhen: 'item.type = "electronics"' },
        { value: "shipping", label: "Shipping" },
      ];
      const spec = createTestSpec();

      const electronicsResult = getVisibleOptions(options, {}, spec, {
        item: { type: "electronics" },
      });
      expect(electronicsResult.map(o => o.value)).toEqual(["warranty", "shipping"]);

      const otherResult = getVisibleOptions(options, {}, spec, {
        item: { type: "clothing" },
      });
      expect(otherResult.map(o => o.value)).toEqual(["shipping"]);
    });

    it("should use itemIndex in expressions", () => {
      const options: SelectOption[] = [
        { value: "lead", label: "Lead", visibleWhen: "itemIndex = 0" },
        { value: "member", label: "Member" },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, {}, spec, { itemIndex: 0, item: {} }).map(o => o.value))
        .toEqual(["lead", "member"]);

      expect(getVisibleOptions(options, {}, spec, { itemIndex: 1, item: {} }).map(o => o.value))
        .toEqual(["member"]);
    });
  });

  describe("expression types", () => {
    it("should evaluate numeric comparisons", () => {
      const options: SelectOption[] = [
        { value: "junior", label: "Junior", visibleWhen: "years < 3" },
        { value: "mid", label: "Mid", visibleWhen: "years >= 3 and years < 7" },
        { value: "senior", label: "Senior", visibleWhen: "years >= 7" },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, { years: 1 }, spec).map(o => o.value))
        .toEqual(["junior"]);

      expect(getVisibleOptions(options, { years: 5 }, spec).map(o => o.value))
        .toEqual(["mid"]);

      expect(getVisibleOptions(options, { years: 10 }, spec).map(o => o.value))
        .toEqual(["senior"]);
    });

    it("should evaluate string equality", () => {
      const options: SelectOption[] = [
        { value: "a", label: "A", visibleWhen: 'type = "alpha"' },
        { value: "b", label: "B", visibleWhen: 'type = "beta"' },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, { type: "alpha" }, spec).map(o => o.value))
        .toEqual(["a"]);
    });

    it("should evaluate boolean expressions", () => {
      const options: SelectOption[] = [
        { value: "premium", label: "Premium", visibleWhen: "isPremium = true" },
        { value: "basic", label: "Basic" },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, { isPremium: false }, spec).map(o => o.value))
        .toEqual(["basic"]);

      expect(getVisibleOptions(options, { isPremium: true }, spec).map(o => o.value))
        .toEqual(["premium", "basic"]);
    });
  });

  describe("edge cases", () => {
    it("should handle numeric option values", () => {
      const options: SelectOption[] = [
        { value: 1, label: "One" },
        { value: 2, label: "Two", visibleWhen: "level >= 2" },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, { level: 1 }, spec).map(o => o.value))
        .toEqual([1]);

      expect(getVisibleOptions(options, { level: 2 }, spec).map(o => o.value))
        .toEqual([1, 2]);
    });

    it("should preserve option order", () => {
      const options: SelectOption[] = [
        { value: "z", label: "Z", visibleWhen: "show = true" },
        { value: "a", label: "A", visibleWhen: "show = true" },
        { value: "m", label: "M", visibleWhen: "show = true" },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, { show: true }, spec).map(o => o.value))
        .toEqual(["z", "a", "m"]);
    });

    it("should hide options with invalid FEEL", () => {
      const options: SelectOption[] = [
        { value: "valid", label: "Valid" },
        { value: "invalid", label: "Invalid", visibleWhen: "this is broken !!!" },
      ];
      const spec = createTestSpec();

      expect(getVisibleOptions(options, {}, spec).map(o => o.value))
        .toEqual(["valid"]);
    });
  });
});
