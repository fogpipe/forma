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
  describe("boolean field null checks", () => {
    it("should treat undefined boolean as not matching '= true'", () => {
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

      // Field is undefined initially
      expect(result.current.data.accepted).toBeUndefined();

      // The visibility expression "accepted = true" evaluates to null when accepted is undefined
      // forma-core converts this null to false, so the field is hidden
      // This happens to be the "correct" behavior by accident
      expect(result.current.visibility.details).toBe(false);

      // When user explicitly sets to true, field becomes visible
      act(() => {
        result.current.setFieldValue("accepted", true);
      });
      expect(result.current.visibility.details).toBe(true);
    });

    it("should treat undefined boolean as not matching '= false'", () => {
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

      // Field is undefined initially
      expect(result.current.data.signingOnBehalf).toBeUndefined();

      // The visibility expression "signingOnBehalf = false" evaluates to null when undefined
      // This means the field is hidden even though the user hasn't made a choice yet
      // This is problematic - the field should arguably be visible until the user chooses "true"
      expect(result.current.visibility.participantName).toBe(false);

      // Only becomes visible when explicitly set to false
      act(() => {
        result.current.setFieldValue("signingOnBehalf", false);
      });
      expect(result.current.visibility.participantName).toBe(true);
    });

    it("should demonstrate the != null pattern also returns null on undefined", () => {
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

      // When accepted is undefined, "accepted != null" in FEEL returns null (not true or false)
      // This is because FEEL's null comparison semantics are different from JavaScript
      // The computed value becomes null, which may cause downstream issues
      expect(result.current.data.accepted).toBeUndefined();

      // Note: computed values that are null may show as null or undefined
      // depending on how forma-core handles them
      const hasAnsweredValue = result.current.computed?.hasAnswered;
      // This documents the actual behavior - it may be null instead of false
      expect(hasAnsweredValue === null || hasAnsweredValue === false).toBe(true);
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
      expect(computed?.hasAge === null || computed?.hasAge === false).toBe(true);
      expect(computed?.canProceed === null || computed?.canProceed === false).toBe(true);

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
          // Safer pattern: explicitly check for both true and false
          hasAnswered: {
            expression: "accepted = true or accepted = false",
          },
        },
      });

      const { result } = renderHook(() => useForma({ spec }));

      // When undefined: (undefined = true) or (undefined = false)
      // → null or null → null (FEEL or short-circuits on null)
      // This pattern may not actually help with FEEL's null semantics
      expect(result.current.data.accepted).toBeUndefined();

      // Set to true
      act(() => {
        result.current.setFieldValue("accepted", true);
      });
      expect(result.current.computed?.hasAnswered).toBe(true);

      // Set to false
      act(() => {
        result.current.setFieldValue("accepted", false);
      });
      expect(result.current.computed?.hasAnswered).toBe(true);
    });
  });
});

describe("page navigation with conditional visibility", () => {
  it("should handle complex eligibility determination pattern", () => {
    // This test reproduces the diabetes trial enrollment pattern
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
        // Check if all inclusion answered
        allInclusionAnswered: {
          expression: "ageOk != null and diagnosisOk != null",
        },
        // Check if all exclusion answered
        allExclusionAnswered: {
          expression: "pregnant != null and allergy != null",
        },
        // Eligibility determined when all criteria answered
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
        { id: "inclusion", title: "Inclusion Criteria", fields: ["ageOk", "diagnosisOk"] },
        { id: "exclusion", title: "Exclusion Criteria", fields: ["pregnant", "allergy"] },
        {
          id: "consent",
          title: "Consent",
          fields: ["consent"],
          visibleWhen: "computed.eligible = true",
        },
      ],
    });

    const { result } = renderHook(() => useForma({ spec }));

    // Initially, all computed values are null due to undefined fields
    const wizard = result.current.wizard;
    expect(wizard?.pages[0].visible).toBe(true); // Inclusion always visible
    expect(wizard?.pages[1].visible).toBe(true); // Exclusion always visible
    expect(wizard?.pages[2].visible).toBe(false); // Consent hidden (computed.eligible is null)

    // Fill inclusion criteria (both true)
    act(() => {
      result.current.setFieldValue("ageOk", true);
      result.current.setFieldValue("diagnosisOk", true);
    });

    // Still not eligible - exclusion not answered yet
    expect(result.current.wizard?.pages[2].visible).toBe(false);

    // Fill exclusion criteria (both false - no exclusions met)
    act(() => {
      result.current.setFieldValue("pregnant", false);
      result.current.setFieldValue("allergy", false);
    });

    // Now eligible - consent page should be visible
    expect(result.current.computed?.eligibilityDetermined).toBe(true);
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
          expression: "(ageOk = true or ageOk = false) and (pregnant = true or pregnant = false)",
        },
        eligible: {
          expression: "computed.eligibilityDetermined = true and ageOk = true and pregnant = false",
        },
        ineligible: {
          expression: "computed.eligibilityDetermined = true and (ageOk = false or pregnant = true)",
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
