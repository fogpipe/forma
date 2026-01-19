/**
 * Tests for the diabetes clinical trial enrollment form wizard flow
 *
 * This test suite documents expected wizard behavior for a complex multi-page
 * form with conditional page visibility based on computed eligibility fields.
 *
 * The form has:
 * - 10 pages with conditional visibility
 * - Complex computed field dependency chains for eligibility determination
 * - Conditional signature flows (participant vs LAR, optional witness)
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForma } from "../useForma.js";
import type { Forma } from "@fogpipe/forma-core";

// Simplified version of the diabetes trial spec for focused testing
function createDiabetesTrialSpec(): Forma {
  return {
    version: "1.0",
    meta: {
      id: "diabetes-trial-enrollment",
      title: "Diabetes Medication Clinical Trial Enrollment Form",
    },
    schema: {
      type: "object",
      properties: {
        // Study info (pre-filled)
        studyName: { type: "string" },
        protocolNumber: { type: "string" },
        // Participant info
        screeningId: { type: "string" },
        participantInitials: { type: "string" },
        dateOfBirth: { type: "string", format: "date" },
        // Inclusion criteria
        inclusionAge: { type: "boolean" },
        inclusionDiagnosis: { type: "boolean" },
        inclusionVisits: { type: "boolean" },
        inclusionConsent: { type: "boolean" },
        // Exclusion criteria
        exclusionPregnant: { type: "boolean" },
        exclusionAllergy: { type: "boolean" },
        exclusionRecentStudy: { type: "boolean" },
        exclusionKidney: { type: "boolean" },
        exclusionSglt2: { type: "boolean" },
        // Ineligibility
        ineligibilityReason: { type: "string" },
        ineligibilityNotes: { type: "string" },
        // Consents
        consentPurpose: { type: "boolean" },
        consentProcedures: { type: "boolean" },
        consentRisks: { type: "boolean" },
        consentBenefits: { type: "boolean" },
        consentVoluntary: { type: "boolean" },
        consentDataHandling: { type: "boolean" },
        // Optional consents
        optionalSamples: { type: "boolean" },
        optionalContact: { type: "boolean" },
        optionalGenetic: { type: "boolean" },
        // Signatures
        signingOnBehalf: { type: "boolean" },
        participantSignatureName: { type: "string" },
        participantSignatureDateTime: { type: "string" },
        larName: { type: "string" },
        larRelationship: { type: "string" },
        larSignatureDateTime: { type: "string" },
        researcherName: { type: "string" },
        researcherConfirm: { type: "boolean" },
        researcherSignatureDateTime: { type: "string" },
        witnessRequired: { type: "boolean" },
        witnessName: { type: "string" },
        witnessSignatureDateTime: { type: "string" },
        // Enrollment
        enrollmentDate: { type: "string" },
        randomizationNumber: { type: "string" },
        treatmentGroup: { type: "string" },
      },
    },
    fields: {
      studyName: { type: "text", label: "Study Name", enabledWhen: "false" },
      protocolNumber: { type: "text", label: "Protocol Number", enabledWhen: "false" },
      screeningId: { type: "text", label: "Screening ID" },
      participantInitials: { type: "text", label: "Participant Initials" },
      dateOfBirth: { type: "date", label: "Date of Birth" },
      inclusionAge: { type: "boolean", label: "Age between 18-65 years" },
      inclusionDiagnosis: { type: "boolean", label: "Confirmed Type 2 diabetes diagnosis" },
      inclusionVisits: { type: "boolean", label: "Willing to attend all study visits" },
      inclusionConsent: { type: "boolean", label: "Can give informed consent" },
      exclusionPregnant: { type: "boolean", label: "Pregnant or planning to become pregnant" },
      exclusionAllergy: { type: "boolean", label: "Allergy to metformin or similar drugs" },
      exclusionRecentStudy: { type: "boolean", label: "Participated in another drug study in last 30 days" },
      exclusionKidney: { type: "boolean", label: "History of severe kidney disease" },
      exclusionSglt2: { type: "boolean", label: "Currently taking SGLT2 inhibitors" },
      ineligibilityReason: { type: "textarea", label: "Ineligibility Reason", enabledWhen: "false" },
      ineligibilityNotes: { type: "textarea", label: "Additional Notes" },
      consentPurpose: { type: "boolean", label: "I have read and understand the study purpose" },
      consentProcedures: { type: "boolean", label: "I understand the procedures I will undergo" },
      consentRisks: { type: "boolean", label: "I understand the risks involved" },
      consentBenefits: { type: "boolean", label: "I understand the potential benefits" },
      consentVoluntary: { type: "boolean", label: "I understand participation is voluntary" },
      consentDataHandling: { type: "boolean", label: "I understand how my data will be handled" },
      optionalSamples: { type: "boolean", label: "I consent to storing blood samples" },
      optionalContact: { type: "boolean", label: "I consent to being contacted about other studies" },
      optionalGenetic: { type: "boolean", label: "I consent to genetic analysis" },
      signingOnBehalf: { type: "boolean", label: "Is someone signing on behalf of the participant?" },
      participantSignatureName: {
        type: "text",
        label: "Participant Signature Name",
        visibleWhen: "signingOnBehalf = false",
        requiredWhen: "signingOnBehalf = false",
      },
      participantSignatureDateTime: {
        type: "datetime",
        label: "Participant Signature Date and Time",
        visibleWhen: "signingOnBehalf = false",
        requiredWhen: "signingOnBehalf = false",
      },
      larName: {
        type: "text",
        label: "Legally Authorized Representative Name",
        visibleWhen: "signingOnBehalf = true",
        requiredWhen: "signingOnBehalf = true",
      },
      larRelationship: {
        type: "text",
        label: "Relationship to Participant",
        visibleWhen: "signingOnBehalf = true",
        requiredWhen: "signingOnBehalf = true",
      },
      larSignatureDateTime: {
        type: "datetime",
        label: "Representative Signature Date and Time",
        visibleWhen: "signingOnBehalf = true",
        requiredWhen: "signingOnBehalf = true",
      },
      researcherName: { type: "text", label: "Researcher Name" },
      researcherConfirm: { type: "boolean", label: "I confirm I have properly explained the study" },
      researcherSignatureDateTime: { type: "datetime", label: "Researcher Signature Date and Time" },
      witnessRequired: { type: "boolean", label: "Is a witness signature required?" },
      witnessName: {
        type: "text",
        label: "Witness Name",
        visibleWhen: "witnessRequired = true",
        requiredWhen: "witnessRequired = true",
      },
      witnessSignatureDateTime: {
        type: "datetime",
        label: "Witness Signature Date and Time",
        visibleWhen: "witnessRequired = true",
        requiredWhen: "witnessRequired = true",
      },
      enrollmentDate: { type: "date", label: "Enrollment Date" },
      randomizationNumber: { type: "text", label: "Randomization Number" },
      treatmentGroup: {
        type: "select",
        label: "Treatment Group",
        options: [
          { value: "group-a", label: "Group A - Active Treatment" },
          { value: "group-b", label: "Group B - Placebo" },
          { value: "group-c", label: "Group C - Active Comparator" },
        ],
      },
    },
    fieldOrder: [
      "studyName", "protocolNumber",
      "screeningId", "participantInitials", "dateOfBirth",
      "inclusionAge", "inclusionDiagnosis", "inclusionVisits", "inclusionConsent",
      "exclusionPregnant", "exclusionAllergy", "exclusionRecentStudy", "exclusionKidney", "exclusionSglt2",
      "ineligibilityReason", "ineligibilityNotes",
      "consentPurpose", "consentProcedures", "consentRisks", "consentBenefits", "consentVoluntary", "consentDataHandling",
      "optionalSamples", "optionalContact", "optionalGenetic",
      "signingOnBehalf", "participantSignatureName", "participantSignatureDateTime",
      "larName", "larRelationship", "larSignatureDateTime",
      "researcherName", "researcherConfirm", "researcherSignatureDateTime",
      "witnessRequired", "witnessName", "witnessSignatureDateTime",
      "enrollmentDate", "randomizationNumber", "treatmentGroup",
    ],
    computed: {
      // Inclusion checks
      allInclusionAnswered: {
        expression: "(inclusionAge = true or inclusionAge = false) and (inclusionDiagnosis = true or inclusionDiagnosis = false) and (inclusionVisits = true or inclusionVisits = false) and (inclusionConsent = true or inclusionConsent = false)",
      },
      allInclusionMet: {
        expression: "inclusionAge = true and inclusionDiagnosis = true and inclusionVisits = true and inclusionConsent = true",
      },
      // Exclusion checks
      allExclusionAnswered: {
        expression: "(exclusionPregnant = true or exclusionPregnant = false) and (exclusionAllergy = true or exclusionAllergy = false) and (exclusionRecentStudy = true or exclusionRecentStudy = false) and (exclusionKidney = true or exclusionKidney = false) and (exclusionSglt2 = true or exclusionSglt2 = false)",
      },
      anyExclusionMet: {
        expression: "exclusionPregnant = true or exclusionAllergy = true or exclusionRecentStudy = true or exclusionKidney = true or exclusionSglt2 = true",
      },
      // Eligibility determination
      eligibilityDetermined: {
        expression: "computed.allInclusionAnswered = true and computed.allExclusionAnswered = true",
      },
      eligible: {
        expression: "computed.eligibilityDetermined = true and computed.allInclusionMet = true and computed.anyExclusionMet = false",
      },
      ineligible: {
        expression: "computed.eligibilityDetermined = true and (computed.allInclusionMet = false or computed.anyExclusionMet = true)",
      },
      // Consent checks
      allMainConsentsSigned: {
        expression: "consentPurpose = true and consentProcedures = true and consentRisks = true and consentBenefits = true and consentVoluntary = true and consentDataHandling = true",
      },
      // Signature checks - using null-safe patterns
      hasParticipantSignature: {
        expression: "signingOnBehalf != true and participantSignatureName != null and participantSignatureDateTime != null",
      },
      hasLarSignature: {
        expression: "signingOnBehalf = true and larName != null and larRelationship != null and larSignatureDateTime != null",
      },
      hasValidSignature: {
        expression: "computed.hasParticipantSignature = true or computed.hasLarSignature = true",
      },
      hasResearcherSignature: {
        expression: "researcherName != null and researcherConfirm = true and researcherSignatureDateTime != null",
      },
      hasWitnessSignature: {
        expression: "witnessRequired != true or (witnessName != null and witnessSignatureDateTime != null)",
      },
      allSignaturesComplete: {
        expression: "computed.hasValidSignature = true and computed.hasResearcherSignature = true and computed.hasWitnessSignature = true",
      },
      // Final enrollment gate
      canEnroll: {
        expression: "computed.eligible = true and computed.allMainConsentsSigned = true and computed.allSignaturesComplete = true",
      },
    },
    pages: [
      {
        id: "study-information",
        title: "Study Information",
        fields: ["studyName", "protocolNumber"],
      },
      {
        id: "participant-information",
        title: "Participant Information",
        fields: ["screeningId", "participantInitials", "dateOfBirth"],
      },
      {
        id: "inclusion-criteria",
        title: "Eligibility Screening - Inclusion Criteria",
        fields: ["inclusionAge", "inclusionDiagnosis", "inclusionVisits", "inclusionConsent"],
      },
      {
        id: "exclusion-criteria",
        title: "Eligibility Screening - Exclusion Criteria",
        fields: ["exclusionPregnant", "exclusionAllergy", "exclusionRecentStudy", "exclusionKidney", "exclusionSglt2"],
      },
      {
        id: "ineligibility-documentation",
        title: "Ineligibility Documentation",
        fields: ["ineligibilityReason", "ineligibilityNotes"],
        visibleWhen: "computed.ineligible = true",
      },
      {
        id: "main-consents",
        title: "Informed Consent - Main Consents",
        fields: ["consentPurpose", "consentProcedures", "consentRisks", "consentBenefits", "consentVoluntary", "consentDataHandling"],
        visibleWhen: "computed.eligible = true",
      },
      {
        id: "optional-consents",
        title: "Optional Consents",
        fields: ["optionalSamples", "optionalContact", "optionalGenetic"],
        visibleWhen: "computed.eligible = true",
      },
      {
        id: "participant-signature",
        title: "Participant Signature",
        fields: ["signingOnBehalf", "participantSignatureName", "participantSignatureDateTime", "larName", "larRelationship", "larSignatureDateTime"],
        visibleWhen: "computed.eligible = true and computed.allMainConsentsSigned = true",
      },
      {
        id: "researcher-witness-signatures",
        title: "Researcher and Witness Signatures",
        fields: ["researcherName", "researcherConfirm", "researcherSignatureDateTime", "witnessRequired", "witnessName", "witnessSignatureDateTime"],
        visibleWhen: "computed.eligible = true and computed.allMainConsentsSigned = true and computed.hasValidSignature = true",
      },
      {
        id: "enrollment-details",
        title: "Enrollment Details",
        fields: ["enrollmentDate", "randomizationNumber", "treatmentGroup"],
        visibleWhen: "computed.canEnroll = true",
      },
    ],
  };
}

describe("diabetes trial enrollment wizard", () => {
  describe("initial page visibility", () => {
    it("should show first 4 pages unconditionally", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      const pages = result.current.wizard?.pages;
      expect(pages).toHaveLength(10);

      // First 4 pages always visible
      expect(pages?.[0].id).toBe("study-information");
      expect(pages?.[0].visible).toBe(true);

      expect(pages?.[1].id).toBe("participant-information");
      expect(pages?.[1].visible).toBe(true);

      expect(pages?.[2].id).toBe("inclusion-criteria");
      expect(pages?.[2].visible).toBe(true);

      expect(pages?.[3].id).toBe("exclusion-criteria");
      expect(pages?.[3].visible).toBe(true);
    });

    it("should show conditional pages based on auto-initialized boolean state", () => {
      // With boolean auto-initialization to false:
      // - All inclusion criteria (booleans) start as false → allInclusionMet = false
      // - All exclusion criteria (booleans) start as false → anyExclusionMet = false
      // - eligibilityDetermined = true (all fields have values)
      // - ineligible = true (eligibilityDetermined AND NOT allInclusionMet)
      // - eligible = false (allInclusionMet is false)
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      const pages = result.current.wizard?.pages;

      // Ineligibility page is now visible (ineligible = true due to false inclusion criteria)
      expect(pages?.[4].id).toBe("ineligibility-documentation");
      expect(pages?.[4].visible).toBe(true); // Changed: now visible

      // Eligible-flow pages still hidden (eligible = false)
      expect(pages?.[5].id).toBe("main-consents");
      expect(pages?.[5].visible).toBe(false);

      expect(pages?.[6].id).toBe("optional-consents");
      expect(pages?.[6].visible).toBe(false);

      expect(pages?.[7].id).toBe("participant-signature");
      expect(pages?.[7].visible).toBe(false);

      expect(pages?.[8].id).toBe("researcher-witness-signatures");
      expect(pages?.[8].visible).toBe(false);

      expect(pages?.[9].id).toBe("enrollment-details");
      expect(pages?.[9].visible).toBe(false);
    });
  });

  describe("eligibility determination", () => {
    it("should determine eligibility immediately with auto-initialized booleans", () => {
      // With boolean auto-initialization, all criteria have values from the start,
      // so eligibilityDetermined is true immediately.
      // The user flow is now:
      // 1. Initially ineligible (all inclusion criteria are false)
      // 2. User must explicitly set inclusion criteria to true to become eligible
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      // Immediately determined (all booleans have values due to auto-init)
      expect(result.current.computed?.eligibilityDetermined).toBe(true);

      // Initially ineligible (all inclusion criteria are false)
      expect(result.current.computed?.eligible).toBe(false);
      expect(result.current.computed?.ineligible).toBe(true);

      // Fill inclusion criteria
      act(() => {
        result.current.setFieldValue("inclusionAge", true);
        result.current.setFieldValue("inclusionDiagnosis", true);
        result.current.setFieldValue("inclusionVisits", true);
        result.current.setFieldValue("inclusionConsent", true);
      });

      // Still determined, now eligible (exclusions already false via auto-init)
      expect(result.current.computed?.eligibilityDetermined).toBe(true);
      expect(result.current.computed?.eligible).toBe(true);
      expect(result.current.computed?.ineligible).toBe(false);
    });

    it("should mark eligible when all inclusion met and no exclusion met", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      // Fill all criteria - eligible scenario
      act(() => {
        // All inclusion = true
        result.current.setFieldValue("inclusionAge", true);
        result.current.setFieldValue("inclusionDiagnosis", true);
        result.current.setFieldValue("inclusionVisits", true);
        result.current.setFieldValue("inclusionConsent", true);
        // All exclusion = false
        result.current.setFieldValue("exclusionPregnant", false);
        result.current.setFieldValue("exclusionAllergy", false);
        result.current.setFieldValue("exclusionRecentStudy", false);
        result.current.setFieldValue("exclusionKidney", false);
        result.current.setFieldValue("exclusionSglt2", false);
      });

      expect(result.current.computed?.eligible).toBe(true);
      expect(result.current.computed?.ineligible).toBe(false);
    });

    it("should mark ineligible when any inclusion criterion is false", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        // One inclusion = false
        result.current.setFieldValue("inclusionAge", false);
        result.current.setFieldValue("inclusionDiagnosis", true);
        result.current.setFieldValue("inclusionVisits", true);
        result.current.setFieldValue("inclusionConsent", true);
        // All exclusion = false
        result.current.setFieldValue("exclusionPregnant", false);
        result.current.setFieldValue("exclusionAllergy", false);
        result.current.setFieldValue("exclusionRecentStudy", false);
        result.current.setFieldValue("exclusionKidney", false);
        result.current.setFieldValue("exclusionSglt2", false);
      });

      expect(result.current.computed?.eligible).toBe(false);
      expect(result.current.computed?.ineligible).toBe(true);
    });

    it("should mark ineligible when any exclusion criterion is true", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        // All inclusion = true
        result.current.setFieldValue("inclusionAge", true);
        result.current.setFieldValue("inclusionDiagnosis", true);
        result.current.setFieldValue("inclusionVisits", true);
        result.current.setFieldValue("inclusionConsent", true);
        // One exclusion = true (pregnant)
        result.current.setFieldValue("exclusionPregnant", true);
        result.current.setFieldValue("exclusionAllergy", false);
        result.current.setFieldValue("exclusionRecentStudy", false);
        result.current.setFieldValue("exclusionKidney", false);
        result.current.setFieldValue("exclusionSglt2", false);
      });

      expect(result.current.computed?.eligible).toBe(false);
      expect(result.current.computed?.ineligible).toBe(true);
    });
  });

  describe("eligible flow - page visibility", () => {
    function setupEligibleParticipant(setFieldValue: (field: string, value: unknown) => void) {
      // All inclusion = true
      setFieldValue("inclusionAge", true);
      setFieldValue("inclusionDiagnosis", true);
      setFieldValue("inclusionVisits", true);
      setFieldValue("inclusionConsent", true);
      // All exclusion = false
      setFieldValue("exclusionPregnant", false);
      setFieldValue("exclusionAllergy", false);
      setFieldValue("exclusionRecentStudy", false);
      setFieldValue("exclusionKidney", false);
      setFieldValue("exclusionSglt2", false);
    }

    it("should show consent pages after eligibility confirmed", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupEligibleParticipant(result.current.setFieldValue);
      });

      const pages = result.current.wizard?.pages;
      expect(pages?.[5].id).toBe("main-consents");
      expect(pages?.[5].visible).toBe(true);

      expect(pages?.[6].id).toBe("optional-consents");
      expect(pages?.[6].visible).toBe(true);
    });

    it("should show participant signature page after consents signed", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupEligibleParticipant(result.current.setFieldValue);
      });

      // Signature page not yet visible
      expect(result.current.wizard?.pages?.[7].visible).toBe(false);

      // Sign all main consents
      act(() => {
        result.current.setFieldValue("consentPurpose", true);
        result.current.setFieldValue("consentProcedures", true);
        result.current.setFieldValue("consentRisks", true);
        result.current.setFieldValue("consentBenefits", true);
        result.current.setFieldValue("consentVoluntary", true);
        result.current.setFieldValue("consentDataHandling", true);
      });

      expect(result.current.computed?.allMainConsentsSigned).toBe(true);
      expect(result.current.wizard?.pages?.[7].visible).toBe(true);
    });

    it("should show researcher signature page after valid participant signature", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupEligibleParticipant(result.current.setFieldValue);
        // Sign consents
        result.current.setFieldValue("consentPurpose", true);
        result.current.setFieldValue("consentProcedures", true);
        result.current.setFieldValue("consentRisks", true);
        result.current.setFieldValue("consentBenefits", true);
        result.current.setFieldValue("consentVoluntary", true);
        result.current.setFieldValue("consentDataHandling", true);
      });

      // Researcher signature page not yet visible
      expect(result.current.wizard?.pages?.[8].visible).toBe(false);

      // Provide participant signature (not signing on behalf)
      act(() => {
        result.current.setFieldValue("signingOnBehalf", false);
        result.current.setFieldValue("participantSignatureName", "John Doe");
        result.current.setFieldValue("participantSignatureDateTime", "2024-01-15T10:00:00");
      });

      expect(result.current.computed?.hasValidSignature).toBe(true);
      expect(result.current.wizard?.pages?.[8].visible).toBe(true);
    });

    it("should show enrollment page only after all signatures complete", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupEligibleParticipant(result.current.setFieldValue);
        // Sign consents
        result.current.setFieldValue("consentPurpose", true);
        result.current.setFieldValue("consentProcedures", true);
        result.current.setFieldValue("consentRisks", true);
        result.current.setFieldValue("consentBenefits", true);
        result.current.setFieldValue("consentVoluntary", true);
        result.current.setFieldValue("consentDataHandling", true);
        // Participant signature
        result.current.setFieldValue("signingOnBehalf", false);
        result.current.setFieldValue("participantSignatureName", "John Doe");
        result.current.setFieldValue("participantSignatureDateTime", "2024-01-15T10:00:00");
      });

      // Enrollment page not yet visible
      expect(result.current.wizard?.pages?.[9].visible).toBe(false);

      // Add researcher signature
      act(() => {
        result.current.setFieldValue("researcherName", "Dr. Smith");
        result.current.setFieldValue("researcherConfirm", true);
        result.current.setFieldValue("researcherSignatureDateTime", "2024-01-15T10:30:00");
        result.current.setFieldValue("witnessRequired", false);
      });

      expect(result.current.computed?.canEnroll).toBe(true);
      expect(result.current.wizard?.pages?.[9].visible).toBe(true);
    });
  });

  describe("ineligible flow - page visibility", () => {
    it("should show ineligibility documentation when participant is ineligible", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        // One inclusion = false (not eligible)
        result.current.setFieldValue("inclusionAge", false);
        result.current.setFieldValue("inclusionDiagnosis", true);
        result.current.setFieldValue("inclusionVisits", true);
        result.current.setFieldValue("inclusionConsent", true);
        // All exclusion answered
        result.current.setFieldValue("exclusionPregnant", false);
        result.current.setFieldValue("exclusionAllergy", false);
        result.current.setFieldValue("exclusionRecentStudy", false);
        result.current.setFieldValue("exclusionKidney", false);
        result.current.setFieldValue("exclusionSglt2", false);
      });

      const pages = result.current.wizard?.pages;

      // Ineligibility page visible
      expect(pages?.[4].id).toBe("ineligibility-documentation");
      expect(pages?.[4].visible).toBe(true);

      // Consent pages hidden
      expect(pages?.[5].visible).toBe(false);
      expect(pages?.[6].visible).toBe(false);
    });

    it("should hide eligible-only pages when ineligible", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        // All inclusion = true
        result.current.setFieldValue("inclusionAge", true);
        result.current.setFieldValue("inclusionDiagnosis", true);
        result.current.setFieldValue("inclusionVisits", true);
        result.current.setFieldValue("inclusionConsent", true);
        // One exclusion = true (pregnant - ineligible)
        result.current.setFieldValue("exclusionPregnant", true);
        result.current.setFieldValue("exclusionAllergy", false);
        result.current.setFieldValue("exclusionRecentStudy", false);
        result.current.setFieldValue("exclusionKidney", false);
        result.current.setFieldValue("exclusionSglt2", false);
      });

      const pages = result.current.wizard?.pages;

      // Ineligibility visible
      expect(pages?.[4].visible).toBe(true);

      // All eligible-only pages hidden
      expect(pages?.[5].visible).toBe(false); // main-consents
      expect(pages?.[6].visible).toBe(false); // optional-consents
      expect(pages?.[7].visible).toBe(false); // participant-signature
      expect(pages?.[8].visible).toBe(false); // researcher-witness-signatures
      expect(pages?.[9].visible).toBe(false); // enrollment-details
    });
  });

  describe("signature flow variations", () => {
    function setupReadyForSignature(setFieldValue: (field: string, value: unknown) => void) {
      // Eligible
      setFieldValue("inclusionAge", true);
      setFieldValue("inclusionDiagnosis", true);
      setFieldValue("inclusionVisits", true);
      setFieldValue("inclusionConsent", true);
      setFieldValue("exclusionPregnant", false);
      setFieldValue("exclusionAllergy", false);
      setFieldValue("exclusionRecentStudy", false);
      setFieldValue("exclusionKidney", false);
      setFieldValue("exclusionSglt2", false);
      // Consents signed
      setFieldValue("consentPurpose", true);
      setFieldValue("consentProcedures", true);
      setFieldValue("consentRisks", true);
      setFieldValue("consentBenefits", true);
      setFieldValue("consentVoluntary", true);
      setFieldValue("consentDataHandling", true);
    }

    it("should show participant fields when not signing on behalf", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupReadyForSignature(result.current.setFieldValue);
        result.current.setFieldValue("signingOnBehalf", false);
      });

      // Participant fields visible
      expect(result.current.visibility.participantSignatureName).toBe(true);
      expect(result.current.visibility.participantSignatureDateTime).toBe(true);

      // LAR fields hidden
      expect(result.current.visibility.larName).toBe(false);
      expect(result.current.visibility.larRelationship).toBe(false);
      expect(result.current.visibility.larSignatureDateTime).toBe(false);
    });

    it("should show LAR fields when signing on behalf", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupReadyForSignature(result.current.setFieldValue);
        result.current.setFieldValue("signingOnBehalf", true);
      });

      // LAR fields visible
      expect(result.current.visibility.larName).toBe(true);
      expect(result.current.visibility.larRelationship).toBe(true);
      expect(result.current.visibility.larSignatureDateTime).toBe(true);

      // Participant fields hidden
      expect(result.current.visibility.participantSignatureName).toBe(false);
      expect(result.current.visibility.participantSignatureDateTime).toBe(false);
    });

    it("should show witness fields when witness required", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupReadyForSignature(result.current.setFieldValue);
        result.current.setFieldValue("witnessRequired", true);
      });

      expect(result.current.visibility.witnessName).toBe(true);
      expect(result.current.visibility.witnessSignatureDateTime).toBe(true);
    });

    it("should hide witness fields when witness not required", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupReadyForSignature(result.current.setFieldValue);
        result.current.setFieldValue("witnessRequired", false);
      });

      expect(result.current.visibility.witnessName).toBe(false);
      expect(result.current.visibility.witnessSignatureDateTime).toBe(false);
    });

    it("should accept LAR signature as valid signature", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      act(() => {
        setupReadyForSignature(result.current.setFieldValue);
        result.current.setFieldValue("signingOnBehalf", true);
        result.current.setFieldValue("larName", "Jane Doe");
        result.current.setFieldValue("larRelationship", "Spouse");
        result.current.setFieldValue("larSignatureDateTime", "2024-01-15T10:00:00");
      });

      expect(result.current.computed?.hasLarSignature).toBe(true);
      expect(result.current.computed?.hasValidSignature).toBe(true);
    });
  });

  describe("wizard navigation", () => {
    it("should navigate through visible pages correctly", () => {
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      // Start on page 0
      expect(result.current.wizard?.currentPageIndex).toBe(0);
      expect(result.current.wizard?.currentPage?.id).toBe("study-information");

      // Navigate forward
      act(() => {
        result.current.wizard?.nextPage();
      });
      expect(result.current.wizard?.currentPageIndex).toBe(1);
      expect(result.current.wizard?.currentPage?.id).toBe("participant-information");

      // Continue to inclusion
      act(() => {
        result.current.wizard?.nextPage();
      });
      expect(result.current.wizard?.currentPage?.id).toBe("inclusion-criteria");

      // Continue to exclusion
      act(() => {
        result.current.wizard?.nextPage();
      });
      expect(result.current.wizard?.currentPage?.id).toBe("exclusion-criteria");
    });

    it("should skip hidden pages during navigation", () => {
      // With auto-initialization, booleans default to false:
      // - eligibilityDetermined = true (all fields have values)
      // - ineligible = true (inclusion criteria all false)
      // So the ineligibility-documentation page is visible
      const spec = createDiabetesTrialSpec();
      const { result } = renderHook(() => useForma({ spec }));

      // Go to exclusion page (index 3)
      act(() => {
        result.current.wizard?.goToPage(3);
      });
      expect(result.current.wizard?.currentPage?.id).toBe("exclusion-criteria");

      // With auto-initialized booleans, visible pages are:
      // study-info (0), participant-info (1), inclusion (2), exclusion (3), ineligibility-documentation (4)
      // Pages 5-9 are for eligible flow and still hidden
      const visiblePages = result.current.wizard?.pages.filter(p => p.visible);
      expect(visiblePages?.length).toBe(5);

      // Not on last visible page anymore (ineligibility page is visible)
      expect(result.current.wizard?.isLastPage).toBe(false);

      // Navigate to last visible page
      act(() => {
        result.current.wizard?.goToPage(4);
      });
      expect(result.current.wizard?.currentPage?.id).toBe("ineligibility-documentation");
      expect(result.current.wizard?.isLastPage).toBe(true);
    });
  });
});
