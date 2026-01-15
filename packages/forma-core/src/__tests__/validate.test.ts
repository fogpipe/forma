/**
 * Tests for validation engine
 */

import { describe, it, expect } from "vitest";
import { validate } from "../engine/validate.js";
import type { Forma } from "../types.js";

/**
 * Helper to create a minimal Forma spec for testing
 */
function createTestSpec(options: {
  schemaProperties: Record<string, unknown>;
  fields?: Record<string, unknown>;
  required?: string[];
}): Forma {
  const { schemaProperties, fields = {}, required = [] } = options;

  // Build fields from schema if not provided
  const fieldDefs = Object.keys(schemaProperties).reduce(
    (acc, key) => {
      acc[key] = fields[key] || { label: key };
      return acc;
    },
    {} as Record<string, unknown>
  );

  return {
    version: "1.0",
    meta: { id: "test", title: "Test" },
    schema: {
      type: "object",
      properties: schemaProperties as Forma["schema"]["properties"],
      required: required.length > 0 ? required : undefined,
    },
    fields: fieldDefs as Forma["fields"],
    fieldOrder: Object.keys(schemaProperties),
  };
}

describe("validate", () => {
  // ============================================================================
  // multipleOf validation
  // ============================================================================

  describe("multipleOf", () => {
    it("should pass when value is a multiple of the constraint", () => {
      const spec = createTestSpec({
        schemaProperties: {
          amount: { type: "number", multipleOf: 0.01 },
        },
      });

      const result = validate({ amount: 10.25 }, spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when value is not a multiple of the constraint", () => {
      const spec = createTestSpec({
        schemaProperties: {
          amount: { type: "number", multipleOf: 0.01 },
        },
        fields: { amount: { label: "Amount" } },
      });

      const result = validate({ amount: 10.255 }, spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("amount");
      expect(result.errors[0].message).toBe("Amount must be a multiple of 0.01");
    });

    it("should handle multipleOf for integers", () => {
      const spec = createTestSpec({
        schemaProperties: {
          quantity: { type: "integer", multipleOf: 5 },
        },
        fields: { quantity: { label: "Quantity" } },
      });

      // Valid - multiple of 5
      expect(validate({ quantity: 15 }, spec).valid).toBe(true);
      expect(validate({ quantity: 100 }, spec).valid).toBe(true);

      // Invalid - not multiple of 5
      const result = validate({ quantity: 17 }, spec);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Quantity must be a multiple of 5");
    });

    it("should handle multipleOf: 0.5 for half-units", () => {
      const spec = createTestSpec({
        schemaProperties: {
          rating: { type: "number", multipleOf: 0.5 },
        },
      });

      // Valid half-units
      expect(validate({ rating: 3.5 }, spec).valid).toBe(true);
      expect(validate({ rating: 4.0 }, spec).valid).toBe(true);
      expect(validate({ rating: 0.5 }, spec).valid).toBe(true);

      // Invalid
      expect(validate({ rating: 3.3 }, spec).valid).toBe(false);
      expect(validate({ rating: 4.25 }, spec).valid).toBe(false);
    });

    it("should handle floating point precision correctly", () => {
      const spec = createTestSpec({
        schemaProperties: {
          value: { type: "number", multipleOf: 0.1 },
        },
      });

      // These should pass despite floating point precision issues
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(validate({ value: 0.3 }, spec).valid).toBe(true);
      expect(validate({ value: 0.7 }, spec).valid).toBe(true);
      expect(validate({ value: 1.1 }, spec).valid).toBe(true);
    });

    it("should pass validation when value is null/undefined (empty)", () => {
      const spec = createTestSpec({
        schemaProperties: {
          amount: { type: "number", multipleOf: 0.01 },
        },
      });

      // Empty values should not trigger multipleOf validation
      expect(validate({ amount: null }, spec).valid).toBe(true);
      expect(validate({ amount: undefined }, spec).valid).toBe(true);
      expect(validate({}, spec).valid).toBe(true);
    });

    it("should work with minimum and maximum constraints together", () => {
      const spec = createTestSpec({
        schemaProperties: {
          friction: {
            type: "number",
            minimum: 0.05,
            maximum: 0.3,
            multipleOf: 0.01,
          },
        },
        fields: { friction: { label: "Friction Coefficient" } },
      });

      // Valid - within range and correct precision
      expect(validate({ friction: 0.14 }, spec).valid).toBe(true);
      expect(validate({ friction: 0.05 }, spec).valid).toBe(true);
      expect(validate({ friction: 0.3 }, spec).valid).toBe(true);

      // Invalid - wrong precision
      const precisionResult = validate({ friction: 0.145 }, spec);
      expect(precisionResult.valid).toBe(false);
      expect(precisionResult.errors[0].message).toContain("multiple of 0.01");

      // Invalid - below minimum
      const minResult = validate({ friction: 0.01 }, spec);
      expect(minResult.valid).toBe(false);
      expect(minResult.errors[0].message).toContain("at least 0.05");

      // Invalid - above maximum
      const maxResult = validate({ friction: 0.5 }, spec);
      expect(maxResult.valid).toBe(false);
      expect(maxResult.errors[0].message).toContain("no more than 0.3");
    });

    it("should handle multipleOf: 1 for whole numbers", () => {
      const spec = createTestSpec({
        schemaProperties: {
          count: { type: "number", multipleOf: 1 },
        },
      });

      expect(validate({ count: 5 }, spec).valid).toBe(true);
      expect(validate({ count: 100 }, spec).valid).toBe(true);
      expect(validate({ count: 5.5 }, spec).valid).toBe(false);
    });

    it("should handle very small multipleOf values", () => {
      const spec = createTestSpec({
        schemaProperties: {
          precision: { type: "number", multipleOf: 0.001 },
        },
      });

      expect(validate({ precision: 1.234 }, spec).valid).toBe(true);
      expect(validate({ precision: 1.2345 }, spec).valid).toBe(false);
    });

    it("should handle large multipleOf values", () => {
      const spec = createTestSpec({
        schemaProperties: {
          angle: { type: "integer", multipleOf: 15 },
        },
      });

      expect(validate({ angle: 0 }, spec).valid).toBe(true);
      expect(validate({ angle: 15 }, spec).valid).toBe(true);
      expect(validate({ angle: 90 }, spec).valid).toBe(true);
      expect(validate({ angle: 360 }, spec).valid).toBe(true);
      expect(validate({ angle: 45 }, spec).valid).toBe(true);
      expect(validate({ angle: 17 }, spec).valid).toBe(false);
    });
  });

  // ============================================================================
  // Basic type validation (existing behavior)
  // ============================================================================

  describe("basic type validation", () => {
    it("should validate required fields", () => {
      const spec = createTestSpec({
        schemaProperties: {
          name: { type: "string" },
        },
        required: ["name"],
      });

      const result = validate({ name: "" }, spec);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("required");
    });

    it("should validate minimum for numbers", () => {
      const spec = createTestSpec({
        schemaProperties: {
          age: { type: "integer", minimum: 0 },
        },
        fields: { age: { label: "Age" } },
      });

      expect(validate({ age: 25 }, spec).valid).toBe(true);
      expect(validate({ age: 0 }, spec).valid).toBe(true);

      const result = validate({ age: -1 }, spec);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Age must be at least 0");
    });

    it("should validate maximum for numbers", () => {
      const spec = createTestSpec({
        schemaProperties: {
          percentage: { type: "number", maximum: 100 },
        },
        fields: { percentage: { label: "Percentage" } },
      });

      expect(validate({ percentage: 50 }, spec).valid).toBe(true);
      expect(validate({ percentage: 100 }, spec).valid).toBe(true);

      const result = validate({ percentage: 101 }, spec);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Percentage must be no more than 100");
    });

    it("should validate string minLength", () => {
      const spec = createTestSpec({
        schemaProperties: {
          name: { type: "string", minLength: 2 },
        },
        fields: { name: { label: "Name" } },
      });

      expect(validate({ name: "Jo" }, spec).valid).toBe(true);
      expect(validate({ name: "John" }, spec).valid).toBe(true);

      const result = validate({ name: "J" }, spec);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Name must be at least 2 characters");
    });
  });
});
