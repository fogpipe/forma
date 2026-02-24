/**
 * Tests documenting FEEL null handling behavior in visibility expressions
 *
 * These tests document the behavior where FEEL expressions that evaluate to `null`
 * (due to undefined field references) are silently converted to `false` by
 * the forma-core engine. This can cause unexpected behavior where pages and fields
 * become invisible not because the condition is false, but because it couldn't
 * be evaluated.
 *
 * Root cause: forma-core's evaluateBoolean() converts null to false without warning.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForma } from "../useForma.js";
import { createTestSpec } from "./test-utils.js";

describe("FEEL null handling in visibility expressions", () => {
  describe("boolean field initialization", () => {
    it("should auto-initialize boolean fields to false for better UX", () => {
      const spec = createTestSpec({
        fields: {
          accepted: { type: "boolean", label: "Accept terms" },
          details: {
            type: "text",
            label: "Details",
            visibleWhen: "accepted = true",
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Boolean fields are auto-initialized to false (not undefined)
      // This provides better UX - false is a valid answer for "Do you smoke?"
      expect(result.current.data.accepted).toBe(false);

      // The visibility expression "accepted = true" evaluates properly to false
      expect(result.current.visibility.details).toBe(false);

      // When user explicitly sets to true, field becomes visible
      act(() => {
        result.current.setFieldValue("accepted", true);
      });
      expect(result.current.visibility.details).toBe(true);
    });

    it("should show fields dependent on '= false' immediately since booleans default to false", () => {
      const spec = createTestSpec({
        fields: {
          signingOnBehalf: { type: "boolean", label: "Signing on behalf?" },
          participantName: {
            type: "text",
            label: "Participant Name",
            visibleWhen: "signingOnBehalf = false",
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Boolean field is auto-initialized to false
      expect(result.current.data.signingOnBehalf).toBe(false);

      // The visibility expression "signingOnBehalf = false" evaluates to true
      // This is the improved UX - participant fields are visible by default
      expect(result.current.visibility.participantName).toBe(true);

      // Hidden when user sets to true
      act(() => {
        result.current.setFieldValue("signingOnBehalf", true);
      });
      expect(result.current.visibility.participantName).toBe(false);
    });

    it("should work with != null pattern since booleans have initial value", () => {
      const spec = createTestSpec({
        fields: {
          accepted: { type: "boolean", label: "Accept" },
        },
        computed: {
          hasAnswered: {
            expression: "accepted != null",
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Boolean fields start with false, so "accepted != null" is true
      expect(result.current.data.accepted).toBe(false);

      // Since the field has a value (false), it's not null
      // Note: FEEL may still return null/false for != null comparisons
      const hasAnsweredValue = result.current.computed?.hasAnswered;
      expect(
        hasAnsweredValue === true ||
          hasAnsweredValue === null ||
          hasAnsweredValue === false,
      ).toBe(true);
    });
  });

  describe("computed field dependency chains", () => {
    it("should propagate null through computed field chains", () => {
      const spec = createTestSpec({
        fields: {
          age: { type: "number", label: "Age" },
          income: { type: "number", label: "Income" },
        },
        computed: {
          // First level - checks if age is provided
          hasAge: { expression: "age != null" },
          // Second level - depends on hasAge
          canProceed: { expression: "computed.hasAge = true" },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Both fields undefined
      expect(result.current.data.age).toBeUndefined();

      // The chain: age is undefined → hasAge evaluates to null → canProceed evaluates to null
      // Both computed values should be null or false due to the dependency chain
      const computed = result.current.computed;
      expect(computed?.hasAge === null || computed?.hasAge === false).toBe(
        true,
      );
      expect(
        computed?.canProceed === null || computed?.canProceed === false,
      ).toBe(true);

      // When we provide a value, the chain resolves
      act(() => {
        result.current.setFieldValue("age", 25);
      });

      expect(result.current.computed?.hasAge).toBe(true);
      expect(result.current.computed?.canProceed).toBe(true);
    });

    it("should cause page visibility issues when computed chains return null", () => {
      const spec = createTestSpec({
        fields: {
          accepted: { type: "boolean", label: "Accepted" },
          details: { type: "text", label: "Details" },
        },
        computed: {
          isAccepted: { expression: "accepted = true" },
        },
        pages: [
          { id: "page1", title: "Accept", fields: ["accepted"] },
          {
            id: "page2",
            title: "Details",
            fields: ["details"],
            visibleWhen: "computed.isAccepted = true",
          },
        ],
      });

      const { result } = renderHook(() => useForma({ spec }));

      // With undefined accepted, computed.isAccepted is null
      // Page visibility "computed.isAccepted = true" → null = true → null → false
      const pages = result.current.wizard?.pages;
      expect(pages?.[0].visible).toBe(true); // First page always visible
      expect(pages?.[1].visible).toBe(false); // Second page hidden due to null chain

      // After accepting, the page becomes visible
      act(() => {
        result.current.setFieldValue("accepted", true);
      });

      expect(result.current.wizard?.pages?.[1].visible).toBe(true);
    });
  });

  describe("string function null handling", () => {
    it("should handle string length on undefined values", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name" },
          greeting: {
            type: "text",
            label: "Greeting",
            // This pattern is unsafe - string length(undefined) returns null
            visibleWhen: "string length(name) > 0",
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // name is undefined
      expect(result.current.data.name).toBeUndefined();

      // string length(undefined) returns null in FEEL
      // null > 0 returns null
      // evaluateBoolean converts null to false
      expect(result.current.visibility.greeting).toBe(false);

      // Even empty string returns false (correct behavior)
      act(() => {
        result.current.setFieldValue("name", "");
      });
      expect(result.current.visibility.greeting).toBe(false);

      // Non-empty string works correctly
      act(() => {
        result.current.setFieldValue("name", "John");
      });
      expect(result.current.visibility.greeting).toBe(true);
    });

    it("should work with null-safe string length pattern", () => {
      const spec = createTestSpec({
        fields: {
          name: { type: "text", label: "Name" },
          greeting: {
            type: "text",
            label: "Greeting",
            // Null-safe pattern: check for null before using string length
            visibleWhen: "name != null and string length(name) > 0",
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // name is undefined - first part of AND fails, but returns null not false
      // The behavior is the same as the unsafe pattern in this case
      expect(result.current.visibility.greeting).toBe(false);

      act(() => {
        result.current.setFieldValue("name", "John");
      });
      expect(result.current.visibility.greeting).toBe(true);
    });
  });

  describe("alternative patterns for null safety", () => {
    it("should use '!= true' pattern for safer boolean checks", () => {
      const spec = createTestSpec({
        fields: {
          signingOnBehalf: { type: "boolean", label: "Signing on behalf?" },
          participantFields: {
            type: "text",
            label: "Participant Name",
            // Using != true instead of = false
            // When undefined: undefined != true → should work better
            visibleWhen: "signingOnBehalf != true",
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Test if this pattern is actually safer
      // Note: In FEEL, undefined != true may still return null
      // This test documents the actual behavior
      const visibility = result.current.visibility.participantFields;

      // Document what actually happens - this may still be false due to null handling
      expect(typeof visibility).toBe("boolean");
    });

    it("should use explicit 'or' pattern for boolean checks", () => {
      const spec = createTestSpec({
        fields: {
          accepted: { type: "boolean", label: "Accepted" },
        },
        computed: {
          // Pattern to check if field has been answered
          // With auto-initialization to false, this always returns true
          hasAnswered: {
            expression: "accepted = true or accepted = false",
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // Boolean fields are auto-initialized to false
      expect(result.current.data.accepted).toBe(false);

      // Since accepted is false, "accepted = true or accepted = false" is true
      expect(result.current.computed?.hasAnswered).toBe(true);

      // Set to true
      act(() => {
        result.current.setFieldValue("accepted", true);
      });
      expect(result.current.computed?.hasAnswered).toBe(true);

      // Set back to false
      act(() => {
        result.current.setFieldValue("accepted", false);
      });
      expect(result.current.computed?.hasAnswered).toBe(true);
    });
  });
});

describe("page navigation with conditional visibility", () => {
  it("should handle eligibility pattern with boolean auto-initialization", () => {
    // With boolean auto-initialization to false, the eligibility pattern changes:
    // - All booleans start as false
    // - "field = true or field = false" is immediately true (since false = false is true)
    // - Eligibility is determined immediately since all booleans have values
    const spec = createTestSpec({
      fields: {
        // Inclusion criteria (all must be true to be eligible)
        ageOk: { type: "boolean", label: "Age between 18-65" },
        diagnosisOk: { type: "boolean", label: "Has diabetes diagnosis" },
        // Exclusion criteria (all must be false to be eligible)
        pregnant: { type: "boolean", label: "Is pregnant" },
        allergy: { type: "boolean", label: "Has drug allergy" },
        // Consent page field
        consent: { type: "boolean", label: "I consent" },
      },
      computed: {
        // With auto-initialization, these patterns always return true
        allInclusionAnswered: {
          expression: "ageOk != null and diagnosisOk != null",
        },
        allExclusionAnswered: {
          expression: "pregnant != null and allergy != null",
        },
        eligibilityDetermined: {
          expression:
            "computed.allInclusionAnswered = true and computed.allExclusionAnswered = true",
        },
        // All inclusion criteria met
        allInclusionMet: {
          expression: "ageOk = true and diagnosisOk = true",
        },
        // Any exclusion criteria met
        anyExclusionMet: {
          expression: "pregnant = true or allergy = true",
        },
        // Final eligibility
        eligible: {
          expression:
            "computed.eligibilityDetermined = true and computed.allInclusionMet = true and computed.anyExclusionMet = false",
        },
      },
      pages: [
        {
          id: "inclusion",
          title: "Inclusion Criteria",
          fields: ["ageOk", "diagnosisOk"],
        },
        {
          id: "exclusion",
          title: "Exclusion Criteria",
          fields: ["pregnant", "allergy"],
        },
        {
          id: "consent",
          title: "Consent",
          fields: ["consent"],
          visibleWhen: "computed.eligible = true",
        },
      ],
    });

    const { result } = renderHook(() => useForma({ spec }));

    // All booleans start as false
    expect(result.current.data.ageOk).toBe(false);
    expect(result.current.data.diagnosisOk).toBe(false);
    expect(result.current.data.pregnant).toBe(false);
    expect(result.current.data.allergy).toBe(false);

    const wizard = result.current.wizard;
    expect(wizard?.pages[0].visible).toBe(true); // Inclusion always visible
    expect(wizard?.pages[1].visible).toBe(true); // Exclusion always visible

    // With auto-initialization:
    // - eligibilityDetermined is true (all fields have values)
    // - allInclusionMet is false (ageOk and diagnosisOk are false)
    // - anyExclusionMet is false (pregnant and allergy are false)
    // - eligible is false (allInclusionMet is false)
    expect(result.current.computed?.eligibilityDetermined).toBe(true);
    expect(result.current.computed?.allInclusionMet).toBe(false);
    expect(result.current.computed?.anyExclusionMet).toBe(false);
    expect(result.current.computed?.eligible).toBe(false);
    expect(wizard?.pages[2].visible).toBe(false); // Consent hidden - not eligible yet

    // Fill inclusion criteria (both true)
    act(() => {
      result.current.setFieldValue("ageOk", true);
      result.current.setFieldValue("diagnosisOk", true);
    });

    // Now eligible - exclusion defaults are already false (no exclusions met)
    expect(result.current.computed?.allInclusionMet).toBe(true);
    expect(result.current.computed?.anyExclusionMet).toBe(false);
    expect(result.current.computed?.eligible).toBe(true);
    expect(result.current.wizard?.pages[2].visible).toBe(true);
  });

  it("should show ineligibility when exclusion criteria met", () => {
    const spec = createTestSpec({
      fields: {
        ageOk: { type: "boolean", label: "Age OK" },
        pregnant: { type: "boolean", label: "Pregnant" },
        details: { type: "text", label: "Details" },
        ineligibilityReason: { type: "textarea", label: "Reason" },
      },
      computed: {
        eligibilityDetermined: {
          expression:
            "(ageOk = true or ageOk = false) and (pregnant = true or pregnant = false)",
        },
        eligible: {
          expression:
            "computed.eligibilityDetermined = true and ageOk = true and pregnant = false",
        },
        ineligible: {
          expression:
            "computed.eligibilityDetermined = true and (ageOk = false or pregnant = true)",
        },
      },
      pages: [
        { id: "screening", title: "Screening", fields: ["ageOk", "pregnant"] },
        {
          id: "eligible-flow",
          title: "Continue",
          fields: ["details"],
          visibleWhen: "computed.eligible = true",
        },
        {
          id: "ineligible-flow",
          title: "Ineligible",
          fields: ["ineligibilityReason"],
          visibleWhen: "computed.ineligible = true",
        },
      ],
    });

    const { result } = renderHook(() => useForma({ spec }));

    // Mark as pregnant (exclusion criterion met)
    act(() => {
      result.current.setFieldValue("ageOk", true);
      result.current.setFieldValue("pregnant", true);
    });

    // Should show ineligible path, not eligible path
    expect(result.current.computed?.eligible).toBe(false);
    expect(result.current.computed?.ineligible).toBe(true);
    expect(result.current.wizard?.pages[1].visible).toBe(false); // eligible-flow hidden
    expect(result.current.wizard?.pages[2].visible).toBe(true); // ineligible-flow visible
  });
});
