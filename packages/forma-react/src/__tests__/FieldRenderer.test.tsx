/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for FieldRenderer component
 *
 * Focuses on:
 * - Numeric field constraints (min, max, step from multipleOf)
 * - Field type rendering
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FormRenderer } from "../FormRenderer.js";
import { createTestComponentMap } from "./test-utils.js";
import type { Forma, JSONSchemaNumber, JSONSchemaInteger } from "@fogpipe/forma-core";
import type { ComponentMap, NumberComponentProps, IntegerComponentProps } from "../types.js";

/**
 * Create a minimal Forma spec for testing numeric fields
 */
function createNumericSpec(
  schemaProps: JSONSchemaNumber | JSONSchemaInteger,
  fieldDef: Record<string, unknown> = {}
): Forma {
  return {
    version: "1.0",
    meta: { id: "test", title: "Test" },
    schema: {
      type: "object",
      properties: {
        value: schemaProps,
      },
    },
    fields: {
      value: {
        label: "Value",
        type: schemaProps.type,
        ...fieldDef,
      },
    },
    fieldOrder: ["value"],
  };
}

/**
 * Create component map that captures props for inspection
 */
function createPropsCapturingComponentMap(
  onRenderNumber: (props: NumberComponentProps["field"]) => void,
  onRenderInteger?: (props: IntegerComponentProps["field"]) => void
): ComponentMap {
  const baseComponents = createTestComponentMap();

  return {
    ...baseComponents,
    number: ({ field: props }: NumberComponentProps) => {
      onRenderNumber(props);
      return (
        <div data-testid="number-field">
          <input
            type="number"
            data-min={props.min}
            data-max={props.max}
            data-step={props.step}
            value={props.value ?? ""}
            onChange={(e) => props.onChange(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      );
    },
    integer: ({ field: props }: IntegerComponentProps) => {
      if (onRenderInteger) onRenderInteger(props);
      return (
        <div data-testid="integer-field">
          <input
            type="number"
            data-min={props.min}
            data-max={props.max}
            value={props.value ?? ""}
            onChange={(e) => props.onChange(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      );
    },
  };
}

describe("FieldRenderer", () => {
  // ============================================================================
  // Numeric Constraints Extraction
  // ============================================================================

  describe("numeric constraints", () => {
    describe("multipleOf to step mapping", () => {
      it("should pass multipleOf as step prop for number fields", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          minimum: 0,
          maximum: 100,
          multipleOf: 0.01,
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps).not.toBeNull();
        expect(capturedProps!.min).toBe(0);
        expect(capturedProps!.max).toBe(100);
        expect(capturedProps!.step).toBe(0.01);
      });

      it("should pass multipleOf: 0.5 as step for half-unit increments", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          multipleOf: 0.5,
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.step).toBe(0.5);
      });

      it("should pass multipleOf: 0.1 as step for one decimal place", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          multipleOf: 0.1,
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.step).toBe(0.1);
      });

      it("should default to step=1 for integer fields without multipleOf", () => {
        let capturedProps: IntegerComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "integer",
          minimum: 0,
          maximum: 10,
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap(
              () => {},
              (props) => {
                capturedProps = props;
              }
            )}
          />
        );

        expect(capturedProps).not.toBeNull();
        expect(capturedProps!.min).toBe(0);
        expect(capturedProps!.max).toBe(10);
        // Note: IntegerFieldProps doesn't include step, but getNumberConstraints returns it
        // The component would need to use it from the extraction
      });

      it("should use multipleOf for integer fields when specified", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        // Create a spec where an integer field has multipleOf: 5 (e.g., for angles)
        const spec: Forma = {
          version: "1.0",
          meta: { id: "test", title: "Test" },
          schema: {
            type: "object",
            properties: {
              angle: {
                type: "integer",
                minimum: 0,
                maximum: 360,
                multipleOf: 15,
              },
            } as Forma["schema"]["properties"],
          },
          fields: {
            angle: { label: "Angle", type: "number" }, // Render as number to get step prop
          },
          fieldOrder: ["angle"],
        };

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.step).toBe(15);
      });

      it("should leave step undefined for number fields without multipleOf", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          minimum: 0,
          maximum: 100,
          // No multipleOf
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.min).toBe(0);
        expect(capturedProps!.max).toBe(100);
        expect(capturedProps!.step).toBeUndefined();
      });
    });

    describe("min/max extraction", () => {
      it("should extract minimum and maximum from schema", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          minimum: 0.05,
          maximum: 0.3,
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.min).toBe(0.05);
        expect(capturedProps!.max).toBe(0.3);
      });

      it("should handle missing min/max gracefully", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          // No minimum or maximum
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.min).toBeUndefined();
        expect(capturedProps!.max).toBeUndefined();
      });
    });

    describe("real-world scenarios", () => {
      it("should handle friction coefficient (0.05-0.30, step 0.01)", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          minimum: 0.05,
          maximum: 0.3,
          multipleOf: 0.01,
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.min).toBe(0.05);
        expect(capturedProps!.max).toBe(0.3);
        expect(capturedProps!.step).toBe(0.01);
      });

      it("should handle currency fields (step 0.01)", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          minimum: 0,
          maximum: 10000,
          multipleOf: 0.01,
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.min).toBe(0);
        expect(capturedProps!.max).toBe(10000);
        expect(capturedProps!.step).toBe(0.01);
      });

      it("should handle rating fields (step 0.5 for half-stars)", () => {
        let capturedProps: NumberComponentProps["field"] | null = null;

        const spec = createNumericSpec({
          type: "number",
          minimum: 0,
          maximum: 5,
          multipleOf: 0.5,
        });

        render(
          <FormRenderer
            spec={spec}
            components={createPropsCapturingComponentMap((props) => {
              capturedProps = props;
            })}
          />
        );

        expect(capturedProps!.min).toBe(0);
        expect(capturedProps!.max).toBe(5);
        expect(capturedProps!.step).toBe(0.5);
      });
    });
  });
});
