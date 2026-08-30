import { describe, expect, it } from "vitest";
import {
  createDemoState,
  recalculate,
  validateWeights,
  createSensitivity,
  evaluateScenario,
  computeFindings,
  addActivity,
  SCENARIOS,
} from "../decision-engine";

describe("Decision Engine Unit Tests", () => {
  describe("Weight Validation", () => {
    it("should accept valid weights totaling 100%", () => {
      const state = createDemoState();
      const validWeights = {
        "developer-experience": 35,
        "team-adoption": 25,
        privacy: 25,
        cost: 15,
      };
      expect(validateWeights(state.criteria, validWeights)).toBeNull();
    });

    it("should reject weights that do not sum to 100%", () => {
      const state = createDemoState();
      const invalidWeights = {
        "developer-experience": 30,
        "team-adoption": 20,
        privacy: 20,
        cost: 10,
      };
      const result = validateWeights(state.criteria, invalidWeights);
      expect(result).toContain("Weights must total 100%");
    });

    it("should reject negative weights or weights over 100%", () => {
      const state = createDemoState();
      const invalidWeights = {
        "developer-experience": -10,
        "team-adoption": 60,
        privacy: 30,
        cost: 20,
      };
      const result = validateWeights(state.criteria, invalidWeights);
      expect(result).toBe("Each weight must be between 0% and 100%.");
    });
  });

  describe("Dynamic Scoring Engine & Recalculation", () => {
    it("should calculate correct weighted totals and identify winning option", () => {
      const state = createDemoState();
      const recalculated = recalculate(state);

      expect(recalculated.recommendation).toBeDefined();
      expect(recalculated.recommendation.optionName).toBeTruthy();
      expect(recalculated.recommendation.score).toBeGreaterThan(0);
      expect(recalculated.recommendation.why.length).toBeGreaterThan(0);
    });

    it("should change the winning option when weights favor Privacy & Control", () => {
      const state = createDemoState();
      const privacyFirstState = {
        ...state,
        criteria: state.criteria.map((c) =>
          c.id === "privacy"
            ? { ...c, weight: 55 }
            : c.id === "developer-experience"
            ? { ...c, weight: 15 }
            : c.id === "team-adoption"
            ? { ...c, weight: 15 }
            : { ...c, weight: 15 },
        ),
      };
      const recalculated = recalculate(privacyFirstState);
      // Gemini Code Assist has highest privacy score (78)
      expect(recalculated.recommendation.optionName).toBe("Gemini Code Assist");
    });
  });

  describe("Dynamic Contradiction & Gap Detection Engine", () => {
    it("should dynamically detect contradiction findings from explicit contradictory evidence", () => {
      const state = createDemoState();
      const findings = computeFindings(state.evidence, state.options, state.criteria);

      const contradiction = findings.find((f) => f.kind === "contradiction");
      expect(contradiction).toBeDefined();
      expect(contradiction?.evidenceIds).toContain("ev-4");
    });

    it("should dynamically detect information gaps for criteria missing supporting evidence", () => {
      const state = createDemoState();
      // Remove all evidence
      const emptyEvidenceState = { ...state, evidence: [] };
      const findings = computeFindings([], emptyEvidenceState.options, emptyEvidenceState.criteria);

      const gapFindings = findings.filter((f) => f.kind === "gap");
      expect(gapFindings.length).toBeGreaterThan(0);
    });
  });

  describe("Confidence Calculation (Full Spec)", () => {
    it("should compute confidence taking evidence reliability, gaps, and score separation into account", () => {
      const state = createDemoState();
      const recalculated = recalculate(state);

      expect(recalculated.recommendation.evidenceConfidence).toBeGreaterThanOrEqual(0);
      expect(recalculated.recommendation.evidenceConfidence).toBeLessThanOrEqual(100);
    });
  });

  describe("Multi-Criterion Sensitivity Analysis", () => {
    it("should compute sensitivity sweep for default (privacy) criterion", () => {
      const state = createDemoState();
      const sensitivity = createSensitivity(state);

      expect(sensitivity.criterionName).toBe("Privacy & control");
      expect(sensitivity.points.length).toBe(7);
      expect(sensitivity.summary).toBeTruthy();
    });

    it("should compute sensitivity sweep for Cost to scale criterion", () => {
      const state = createDemoState();
      const sensitivity = createSensitivity(state, "cost");

      expect(sensitivity.criterionName).toBe("Cost to scale");
      expect(sensitivity.points.length).toBe(7);
      expect(typeof sensitivity.stable).toBe("boolean");
    });
  });

  describe("Scenario Engine", () => {
    it("should evaluate decision state under Enterprise Privacy-First scenario", () => {
      const state = createDemoState();
      const result = evaluateScenario(state, "enterprise-privacy");

      expect(result.scenarioName).toBe("Enterprise Privacy-First");
      expect(result.leader).toBe("Gemini Code Assist");
    });

    it("should evaluate decision state under Developer Velocity scenario", () => {
      const state = createDemoState();
      const result = evaluateScenario(state, "developer-velocity");

      expect(result.scenarioName).toBe("Developer Velocity");
      expect(result.leader).toBe("Cursor");
    });
  });

  describe("Audit Trail & Approval Boundary", () => {
    it("should prepend new activity entry cleanly", () => {
      const state = createDemoState();
      const updated = addActivity(state, "Human", "Priority Changed", "Set privacy to 40%");

      expect(updated.activity[0].actor).toBe("Human");
      expect(updated.activity[0].action).toBe("Priority Changed");
    });
  });
});
