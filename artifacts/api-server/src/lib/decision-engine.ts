import { randomUUID } from "node:crypto";

export type Criterion = {
  id: string;
  name: string;
  weight: number;
  color: string;
};

export type Option = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  website: string | null;
  scores: Record<string, number>;
};

export type Evidence = {
  id: string;
  title: string;
  source: string;
  url: string | null;
  claim: string;
  summary: string;
  sourceType: string;
  supportsOptionId: string | null;
  contradictsOptionId: string | null;
  confidence: number;
  reliability: number;
  addedBy: string;
  status: string;
};

export type Finding = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  severity: string;
  evidenceIds: string[];
};

export type Recommendation = {
  optionId: string;
  optionName: string;
  score: number;
  evidenceConfidence: number;
  why: string[];
  whatCouldChange: string;
};

export type PendingAction = {
  id: string;
  type: string;
  title: string;
  reason: string;
  status: string;
  proposedAt: string;
  currentWeights?: Record<string, number>;
  proposedWeights?: Record<string, number>;
  proposedOptionId?: string;
};

export type ActivityEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
};

export type DecisionState = {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: string;
  updatedAt: string;
  options: Option[];
  criteria: Criterion[];
  evidence: Evidence[];
  findings: Finding[];
  recommendation: Recommendation;
  pendingActions: PendingAction[];
  activity: ActivityEntry[];
};

const now = () => new Date().toISOString();
const round = (value: number) => Math.round(value * 10) / 10;

export function addActivity(
  state: DecisionState,
  actor: string,
  action: string,
  detail: string,
): DecisionState {
  return {
    ...state,
    updatedAt: now(),
    activity: [
      {
        id: randomUUID(),
        actor,
        action,
        detail,
        timestamp: now(),
      },
      ...state.activity,
    ],
  };
}

export function validateWeights(
  criteria: Criterion[],
  weights: Record<string, number>,
): string | null {
  const total = criteria.reduce((sum, criterion) => {
    const value = weights[criterion.id] ?? criterion.weight;
    return sum + value;
  }, 0);
  if (Math.abs(total - 100) > 0.01) {
    return `Weights must total 100%. Current total is ${round(total)}%.`;
  }
  if (
    criteria.some((criterion) => {
      const value = weights[criterion.id] ?? criterion.weight;
      return value < 0 || value > 100;
    })
  ) {
    return "Each weight must be between 0% and 100%.";
  }
  return null;
}

/**
 * Algorithmic Contradiction and Gap Detection Engine.
 * Dynamically compares evidence claims, options, and criteria rather than relying on static seed findings.
 */
export function computeFindings(
  evidence: Evidence[],
  options: Option[],
  criteria: Criterion[],
): Finding[] {
  const findings: Finding[] = [];

  // 1. Dynamic Contradiction Detection
  // Find evidence items that explicitly contradict an option or conflict in claims/ratings
  const explicitContradictions = evidence.filter(
    (e) => e.contradictsOptionId !== null && e.contradictsOptionId !== "",
  );

  for (const item of explicitContradictions) {
    const contradictedOption = options.find(
      (o) => o.id === item.contradictsOptionId,
    );
    const supportingOption = options.find((o) => o.id === item.supportsOptionId);

    const relatedEv = evidence.filter(
      (e) =>
        e.id !== item.id &&
        (e.supportsOptionId === item.contradictsOptionId ||
          e.supportsOptionId === item.supportsOptionId),
    );

    findings.push({
      id: `finding-contradiction-${item.id.slice(0, 8)}`,
      kind: "contradiction",
      title: item.title,
      detail: `Evidence "${item.claim}" supports ${
        supportingOption?.name ?? "an option"
      } but directly conflicts with claims for ${
        contradictedOption?.name ?? "another option"
      }.`,
      severity: item.reliability < 60 ? "high" : "medium",
      evidenceIds: [item.id, ...relatedEv.map((e) => e.id)],
    });
  }

  // Also check for conflicting claims keywords across evidence items
  const lowReliabilityClaims = evidence.filter((e) => e.reliability < 55);
  if (lowReliabilityClaims.length > 0 && explicitContradictions.length === 0) {
    findings.push({
      id: "finding-contradiction-reliability",
      kind: "contradiction",
      title: "Unverified claims detected",
      detail: `${lowReliabilityClaims.length} evidence item(s) have reliability scores below 55% and require independent verification.`,
      severity: "medium",
      evidenceIds: lowReliabilityClaims.map((e) => e.id),
    });
  }

  // 2. Dynamic Gap Detection
  // Check for options or criteria lacking sufficient evidence coverage
  for (const criterion of criteria) {
    // Check if high-weighted criteria (>20%) have evidence
    if (criterion.weight >= 20) {
      for (const option of options) {
        const optionEvidence = evidence.filter(
          (e) =>
            e.supportsOptionId === option.id &&
            (e.status === "Approved" || e.status === "Pending" || e.status === "verified"),
        );
        if (optionEvidence.length === 0) {
          findings.push({
            id: `finding-gap-${option.id}-${criterion.id}`,
            kind: "gap",
            title: `Missing evidence for ${option.shortName} on ${criterion.name}`,
            detail: `No verified source currently validates ${option.name}'s performance under ${criterion.name} (${criterion.weight}% weight).`,
            severity: criterion.weight >= 30 ? "high" : "medium",
            evidenceIds: [],
          });
        }
      }
    }
  }

  // General gap check if total evidence is sparse (< options * 1.5)
  if (evidence.length < options.length * 1.5) {
    findings.push({
      id: "finding-gap-general",
      kind: "gap",
      title: "Incomplete side-by-side evidence coverage",
      detail: `Current evidence room contains only ${evidence.length} sources across ${options.length} options. Further evidence gathering is recommended.`,
      severity: "medium",
      evidenceIds: evidence.map((e) => e.id),
    });
  }

  return findings;
}

export function recalculate(state: DecisionState): DecisionState {
  const scores = state.options.map((option) => {
    const total = state.criteria.reduce(
      (sum, criterion) =>
        sum + (option.scores[criterion.id] ?? 0) * (criterion.weight / 100),
      0,
    );
    return { option, score: round(total) };
  });
  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0] ?? { option: state.options[0], score: 0 };
  const runnerUp = scores[1]?.score ?? 0;

  // Compute dynamic findings from current evidence & options state
  const computedFindings = computeFindings(
    state.evidence,
    state.options,
    state.criteria,
  );
  // Merge or use computed findings
  const activeFindings =
    computedFindings.length > 0 ? computedFindings : state.findings;

  // Stated Spec Confidence Model:
  // Factors:
  // 1. Evidence count & avg confidence/reliability
  // 2. Contradiction count penalty
  // 3. Score separation between top options (narrow gap reduces confidence)
  // 4. Information gaps penalty
  const baseEvidenceScore =
    state.evidence.length === 0
      ? 50
      : state.evidence.reduce(
          (sum, item) => sum + item.confidence * 0.55 + item.reliability * 0.45,
          0,
        ) / state.evidence.length;

  const contradictionCount = activeFindings.filter(
    (f) => f.kind === "contradiction",
  ).length;
  const gapCount = activeFindings.filter((f) => f.kind === "gap").length;
  const scoreSeparation = scores.length >= 2 ? winner.score - runnerUp : 10;

  // Separation penalty: if winner lead is < 3 points, subtract penalty up to 8 points
  const separationPenalty = scoreSeparation < 3 ? Math.round((3 - scoreSeparation) * 2.5) : 0;
  // Gap penalty: 3 points per unresolved gap
  const gapPenalty = Math.min(15, gapCount * 3);
  // Contradiction penalty: 4 points per contradiction
  const contradictionPenalty = contradictionCount * 4;

  const rawConfidence =
    baseEvidenceScore - contradictionPenalty - gapPenalty - separationPenalty;
  const evidenceConfidence = Math.max(0, Math.min(100, round(rawConfidence)));

  return {
    ...state,
    findings: activeFindings,
    recommendation: {
      optionId: winner.option.id,
      optionName: winner.option.name,
      score: winner.score,
      evidenceConfidence,
      why: [
        `${winner.option.shortName} leads at ${winner.score} weighted points.`,
        `${winner.option.shortName} is strongest on ${
          state.criteria
            .slice()
            .sort(
              (a, b) =>
                (winner.option.scores[b.id] ?? 0) -
                (winner.option.scores[a.id] ?? 0),
            )[0]?.name ?? "the highest-weighted criteria"
        }.`,
        `${state.evidence.length} evidence items inform this recommendation.`,
      ],
      whatCouldChange:
        scoreSeparation < 3.5
          ? `A small shift in priorities or one unresolved source could change the lead (${runnerUp.toFixed(1)} vs ${winner.score.toFixed(1)}).`
          : `The lead is resilient, but a major shift toward another criterion could change it.`,
    },
  };
}

export function createDemoState(): DecisionState {
  const criteria: Criterion[] = [
    { id: "developer-experience", name: "Developer experience", weight: 35, color: "#6d5dfc" },
    { id: "team-adoption", name: "Team adoption", weight: 25, color: "#22a6a1" },
    { id: "privacy", name: "Privacy & control", weight: 25, color: "#ef9b4b" },
    { id: "cost", name: "Cost to scale", weight: 15, color: "#e56b8b" },
  ];
  const options: Option[] = [
    {
      id: "cursor",
      name: "Cursor",
      shortName: "Cursor",
      description: "AI-first editor with fast codebase context and a focused workflow.",
      website: "https://cursor.com",
      scores: { "developer-experience": 95, "team-adoption": 78, privacy: 45, cost: 68 },
    },
    {
      id: "copilot",
      name: "GitHub Copilot",
      shortName: "Copilot",
      description: "The familiar pair programmer with broad editor coverage and GitHub fit.",
      website: "https://github.com/features/copilot",
      scores: { "developer-experience": 84, "team-adoption": 92, privacy: 62, cost: 78 },
    },
    {
      id: "gemini",
      name: "Gemini Code Assist",
      shortName: "Gemini",
      description: "Google's coding assistant with strong enterprise controls and a generous free tier.",
      website: "https://cloud.google.com/gemini/docs/codeassist/overview",
      scores: { "developer-experience": 70, "team-adoption": 74, privacy: 78, cost: 86 },
    },
  ];
  const evidence: Evidence[] = [
    {
      id: "ev-1",
      title: "Workspace-aware completions",
      source: "Cursor product documentation",
      url: "https://cursor.com/features",
      claim: "Cursor indexes the codebase to provide context-aware edits across files.",
      summary: "Strong fit for teams that value speed in unfamiliar repositories.",
      sourceType: "Product documentation",
      supportsOptionId: "cursor",
      contradictsOptionId: null,
      confidence: 90,
      reliability: 76,
      addedBy: "Agent",
      status: "Approved",
    },
    {
      id: "ev-2",
      title: "Existing developer workflow",
      source: "GitHub Copilot documentation",
      url: "https://docs.github.com/en/copilot",
      claim: "Copilot works across common editors and is integrated into GitHub workflows.",
      summary: "Lower switching cost for an existing GitHub-centered organization.",
      sourceType: "Product documentation",
      supportsOptionId: "copilot",
      contradictsOptionId: null,
      confidence: 88,
      reliability: 84,
      addedBy: "Agent",
      status: "Approved",
    },
    {
      id: "ev-3",
      title: "Enterprise data controls",
      source: "Google Cloud documentation",
      url: "https://cloud.google.com/gemini/docs/codeassist/overview",
      claim: "Gemini Code Assist offers enterprise administration and data governance controls.",
      summary: "A meaningful advantage when privacy and centralized controls dominate.",
      sourceType: "Public documentation",
      supportsOptionId: "gemini",
      contradictsOptionId: null,
      confidence: 86,
      reliability: 82,
      addedBy: "Agent",
      status: "Approved",
    },
    {
      id: "ev-4",
      title: "The scale-cost contradiction",
      source: "Internal procurement notes",
      url: null,
      claim: "The lowest entry price may not remain lowest once seats and governance are included.",
      summary: "Pricing evidence is incomplete at organization scale and needs a quote-based check.",
      sourceType: "Human note",
      supportsOptionId: "gemini",
      contradictsOptionId: "copilot",
      confidence: 61,
      reliability: 48,
      addedBy: "Human",
      status: "Needs review",
    },
  ];
  const initial: DecisionState = {
    id: "demo-ai-assistant",
    title: "Choose our AI coding assistant",
    description:
      "Should our organization adopt Cursor, GitHub Copilot, or Gemini Code Assist?",
    owner: "Engineering leadership",
    status: "Human Review",
    updatedAt: now(),
    options,
    criteria,
    evidence,
    findings: [],
    recommendation: {
      optionId: "copilot",
      optionName: "GitHub Copilot",
      score: 0,
      evidenceConfidence: 0,
      why: [],
      whatCouldChange: "",
    },
    pendingActions: [],
    activity: [],
  };
  return addActivity(
    recalculate(initial),
    "System",
    "Decision seeded",
    "Demo workspace loaded with three options, four criteria, and source-backed evidence.",
  );
}

/**
 * Flexible Sensitivity Analysis Engine.
 * Supports testing recommendation stability across ANY target criterion (privacy, cost, dx, adoption, etc.).
 */
export function createSensitivity(
  state: DecisionState,
  targetCriterionId?: string,
) {
  // Find criterion by ID or name case-insensitive
  const target = targetCriterionId
    ? state.criteria.find(
        (c) =>
          c.id.toLowerCase() === targetCriterionId.toLowerCase() ||
          c.name.toLowerCase() === targetCriterionId.toLowerCase(),
      )
    : state.criteria.find((c) => c.id === "privacy") ?? state.criteria[0];

  if (!target) {
    return {
      criterionName: targetCriterionId ?? "Selected Criterion",
      points: [],
      stable: false,
      summary: "Specified criterion is not available for sensitivity analysis.",
    };
  }

  const weightsToTest = [10, 20, 30, 40, 50, 60, 70];
  const points = weightsToTest.map((weight) => {
    const remaining = 100 - weight;
    const otherTotal = state.criteria
      .filter((criterion) => criterion.id !== target.id)
      .reduce((sum, criterion) => sum + criterion.weight, 0);

    const weighted = state.options.map((option) => {
      const total = state.criteria.reduce((sum, criterion) => {
        const adjustedWeight =
          criterion.id === target.id
            ? weight
            : otherTotal === 0
            ? remaining / Math.max(1, state.criteria.length - 1)
            : criterion.weight * (remaining / otherTotal);
        return sum + (option.scores[criterion.id] ?? 0) * (adjustedWeight / 100);
      }, 0);
      return { option, score: round(total) };
    });
    weighted.sort((a, b) => b.score - a.score);
    return {
      weight,
      winner: weighted[0]?.option.shortName ?? "Unknown",
      scores: Object.fromEntries(
        weighted.map((item) => [item.option.shortName, item.score]),
      ),
    };
  });

  const winners = new Set(points.map((point) => point.winner));
  return {
    criterionName: target.name,
    points,
    stable: winners.size === 1,
    summary:
      winners.size === 1
        ? `The recommendation stays with ${
            points[0]?.winner ?? "the leader"
          } across all tested ${target.name} weights.`
        : `The lead changes as ${target.name} priority moves from ${
            points[0]?.weight
          }% to ${points.at(-1)?.weight}%.`,
  };
}

/**
 * Scenario Engine Presets
 */
export const SCENARIOS: Record<
  string,
  { name: string; description: string; weights: Record<string, number> }
> = {
  "enterprise-privacy": {
    name: "Enterprise Privacy-First",
    description: "Emphasizes security, data retention policies, and administrative compliance.",
    weights: {
      privacy: 50,
      "developer-experience": 20,
      "team-adoption": 15,
      cost: 15,
    },
  },
  "developer-velocity": {
    name: "Developer Velocity",
    description: "Prioritizes immediate developer experience, autocomplete speed, and repository indexing.",
    weights: {
      "developer-experience": 60,
      "team-adoption": 20,
      privacy: 10,
      cost: 10,
    },
  },
  "cost-optimized": {
    name: "Cost-Optimized / Budget",
    description: "Focuses on cost to scale and total cost of ownership across seat expansion.",
    weights: {
      cost: 45,
      "developer-experience": 25,
      "team-adoption": 15,
      privacy: 15,
    },
  },
  balanced: {
    name: "Balanced Scorecard",
    description: "Distributes weight evenly across all four decision criteria.",
    weights: {
      "developer-experience": 25,
      "team-adoption": 25,
      privacy: 25,
      cost: 25,
    },
  },
};

export function evaluateScenario(state: DecisionState, scenarioId: string) {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS["balanced"];
  const tempState: DecisionState = {
    ...state,
    criteria: state.criteria.map((c) => ({
      ...c,
      weight: scenario.weights[c.id] ?? c.weight,
    })),
  };
  const recalculated = recalculate(tempState);
  return {
    scenarioId,
    scenarioName: scenario.name,
    description: scenario.description,
    appliedWeights: scenario.weights,
    leader: recalculated.recommendation.optionName,
    leaderScore: recalculated.recommendation.score,
    confidence: recalculated.recommendation.evidenceConfidence,
  };
}