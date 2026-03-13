/**
 * Tests for matrix field type - validation and visibility
 */

import { describe, it, expect } from "vitest";
import { validate } from "../engine/validate.js";
import { getVisibility } from "../engine/visibility.js";
import type { Forma, MatrixFieldDefinition } from "../types.js";
import { isMatrixField, isDataField } from "../types.js";

/**
 * Helper to create a minimal Forma spec with a matrix field
 */
function createMatrixSpec(options: {
  fieldDef?: Partial<MatrixFieldDefinition>;
  schemaProperties?: Record<string, unknown>;
  required?: string[];
  data?: Record<string, unknown>;
}): Forma {
  const {
    fieldDef = {},
    schemaProperties,
    required = [],
  } = options;

  const matrixField: MatrixFieldDefinition = {
    type: "matrix",
    label: "Service Rating",
    rows: [
      { id: "speed", label: "Speed" },
      { id: "quality", label: "Quality" },
      { id: "support", label: "Support" },
    ],
    columns: [
      { value: 1, label: "Poor" },
      { value: 2, label: "Fair" },
      { value: 3, label: "Good" },
      { value: 4, label: "Very Good" },
      { value: 5, label: "Excellent" },
    ],
    ...fieldDef,
  };

  const schema = schemaProperties ?? {
    service_rating: {
      type: "object",
      properties: {
        speed: { type: "integer", enum: [1, 2, 3, 4, 5] },
        quality: { type: "integer", enum: [1, 2, 3, 4, 5] },
        support: { type: "integer", enum: [1, 2, 3, 4, 5] },
      },
      required: ["speed", "quality", "support"],
    },
  };

  return {
    version: "1.0",
    meta: { id: "test", title: "Test" },
    schema: {
      type: "object",
      properties: schema as Forma["schema"]["properties"],
      required: required.length > 0 ? required : undefined,
    },
    fields: {
      service_rating: matrixField,
    } as Forma["fields"],
    fieldOrder: ["service_rating"],
  };
}

// ============================================================================
// Type Guards
// ============================================================================

describe("type guards", () => {
  it("isMatrixField should return true for matrix fields", () => {
    const field: MatrixFieldDefinition = {
      type: "matrix",
      rows: [{ id: "a", label: "A" }],
      columns: [{ value: 1, label: "1" }],
    };
    expect(isMatrixField(field)).toBe(true);
  });

  it("isMatrixField should return false for non-matrix fields", () => {
    expect(isMatrixField({ type: "text" })).toBe(false);
    expect(isMatrixField({ type: "select" })).toBe(false);
    expect(isMatrixField({ type: "array" })).toBe(false);
  });

  it("isDataField should return true for matrix fields", () => {
    const field: MatrixFieldDefinition = {
      type: "matrix",
      rows: [{ id: "a", label: "A" }],
      columns: [{ value: 1, label: "1" }],
    };
    expect(isDataField(field)).toBe(true);
  });
});

// ============================================================================
// Validation
// ============================================================================

describe("matrix validation", () => {
  describe("valid data", () => {
    it("should pass with valid numeric column values", () => {
      const spec = createMatrixSpec({});
      const data = {
        service_rating: { speed: 4, quality: 5, support: 3 },
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass with valid string column values", () => {
      const spec = createMatrixSpec({
        fieldDef: {
          columns: [
            { value: "agree", label: "Agree" },
            { value: "disagree", label: "Disagree" },
          ],
        },
        schemaProperties: {
          service_rating: {
            type: "object",
            properties: {
              speed: { type: "string", enum: ["agree", "disagree"] },
              quality: { type: "string", enum: ["agree", "disagree"] },
              support: { type: "string", enum: ["agree", "disagree"] },
            },
          },
        },
      });
      const data = {
        service_rating: { speed: "agree", quality: "disagree", support: "agree" },
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(true);
    });

    it("should pass with partial answers when not required", () => {
      const spec = createMatrixSpec({});
      const data = {
        service_rating: { speed: 4 },
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(true);
    });

    it("should pass with null value when not required", () => {
      const spec = createMatrixSpec({});
      const result = validate({ service_rating: null }, spec);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid data", () => {
    it("should fail with invalid column values", () => {
      const spec = createMatrixSpec({});
      const data = {
        service_rating: { speed: 99, quality: 5, support: 3 },
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("service_rating.speed");
    });

    it("should fail when required and empty", () => {
      const spec = createMatrixSpec({ required: ["service_rating"] });
      const result = validate({}, spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "service_rating")).toBe(true);
    });

    it("should fail when required and not all visible rows answered", () => {
      const spec = createMatrixSpec({ required: ["service_rating"] });
      const data = {
        service_rating: { speed: 4 }, // quality and support missing
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe("service_rating.quality");
      expect(result.errors[1].field).toBe("service_rating.support");
    });

    it("should pass when required and all visible rows answered", () => {
      const spec = createMatrixSpec({ required: ["service_rating"] });
      const data = {
        service_rating: { speed: 4, quality: 5, support: 3 },
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(true);
    });
  });

  describe("multi-select mode", () => {
    it("should pass with array values in multi-select mode", () => {
      const spec = createMatrixSpec({
        fieldDef: {
          multiSelect: true,
          columns: [
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced", label: "Advanced" },
          ],
        },
        schemaProperties: {
          service_rating: {
            type: "object",
            properties: {
              speed: {
                type: "array",
                items: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
              },
              quality: {
                type: "array",
                items: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
              },
              support: {
                type: "array",
                items: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
              },
            },
          },
        },
      });
      const data = {
        service_rating: {
          speed: ["beginner", "intermediate"],
          quality: ["advanced"],
          support: [],
        },
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(true);
    });

    it("should fail with invalid values in multi-select array", () => {
      const spec = createMatrixSpec({
        fieldDef: {
          multiSelect: true,
          columns: [
            { value: "beginner", label: "Beginner" },
            { value: "advanced", label: "Advanced" },
          ],
        },
        schemaProperties: {
          service_rating: {
            type: "object",
            properties: {
              speed: {
                type: "array",
                items: { type: "string", enum: ["beginner", "advanced"] },
              },
              quality: {
                type: "array",
                items: { type: "string", enum: ["beginner", "advanced"] },
              },
              support: {
                type: "array",
                items: { type: "string", enum: ["beginner", "advanced"] },
              },
            },
          },
        },
      });
      const data = {
        service_rating: {
          speed: ["beginner", "INVALID"],
          quality: ["advanced"],
          support: [],
        },
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("service_rating.speed");
    });

    it("should fail when multi-select row has non-array value", () => {
      const spec = createMatrixSpec({
        fieldDef: {
          multiSelect: true,
          columns: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
        schemaProperties: {
          service_rating: {
            type: "object",
            properties: {
              speed: { type: "array", items: { type: "string" } },
              quality: { type: "array", items: { type: "string" } },
              support: { type: "array", items: { type: "string" } },
            },
          },
        },
      });
      const data = {
        service_rating: {
          speed: "a", // should be array
          quality: ["a"],
          support: ["b"],
        },
      };
      const result = validate(data, spec);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe("service_rating.speed");
      expect(result.errors[0].message).toContain("list");
    });
  });
});

// ============================================================================
// Visibility
// ============================================================================

describe("matrix visibility", () => {
  it("should compute visibility for all matrix rows", () => {
    const spec = createMatrixSpec({});
    const visibility = getVisibility({}, spec);
    expect(visibility["service_rating"]).toBe(true);
    expect(visibility["service_rating.speed"]).toBe(true);
    expect(visibility["service_rating.quality"]).toBe(true);
    expect(visibility["service_rating.support"]).toBe(true);
  });

  it("should hide matrix field when visibleWhen evaluates to false", () => {
    const spec = createMatrixSpec({
      fieldDef: { visibleWhen: "show_rating = true" },
    });
    const visibility = getVisibility({ show_rating: false }, spec);
    expect(visibility["service_rating"]).toBe(false);
    // Row visibility should not be computed for hidden fields
    expect(visibility["service_rating.speed"]).toBeUndefined();
  });

  it("should hide individual rows with visibleWhen", () => {
    const spec = createMatrixSpec({
      fieldDef: {
        rows: [
          { id: "speed", label: "Speed" },
          { id: "quality", label: "Quality", visibleWhen: "show_quality = true" },
          { id: "support", label: "Support" },
        ],
      },
    });

    const visibilityHidden = getVisibility({ show_quality: false }, spec);
    expect(visibilityHidden["service_rating.speed"]).toBe(true);
    expect(visibilityHidden["service_rating.quality"]).toBe(false);
    expect(visibilityHidden["service_rating.support"]).toBe(true);

    const visibilityShown = getVisibility({ show_quality: true }, spec);
    expect(visibilityShown["service_rating.quality"]).toBe(true);
  });

  it("should skip hidden rows during validation", () => {
    const spec = createMatrixSpec({
      fieldDef: {
        rows: [
          { id: "speed", label: "Speed" },
          { id: "quality", label: "Quality", visibleWhen: "show_quality = true" },
          { id: "support", label: "Support" },
        ],
      },
    });
    // quality row is hidden but has an invalid value — should NOT produce error
    const data = {
      service_rating: { speed: 4, quality: 99, support: 3 },
    };
    const result = validate(data, spec, { onlyVisible: true });
    expect(result.valid).toBe(true);
  });
});
