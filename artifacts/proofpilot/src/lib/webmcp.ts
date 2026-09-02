type ToolInput = Record<string, unknown>;

type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: ToolInput) => Promise<unknown>;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: RegisteredTool) => void;
    };
  }
}

const api = async (path: string, init?: RequestInit) => {
  try {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...init,
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return {
        ok: false,
        error: `API returned non-JSON response (${response.status} ${response.statusText})`,
        status: response.status,
      };
    }
    const payload: unknown = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        error:
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as any).error)
            : `The ProofPilot API returned HTTP ${response.status}.`,
        status: response.status,
      };
    }
    return payload;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to connect to ProofPilot API",
    };
  }
};

let activeDecisionGetter: () => string = () => "demo-ai-assistant";
let registered = false;

export function registerProofPilotTools(getDecisionId: () => string) {
  activeDecisionGetter = getDecisionId;
  if (typeof document === "undefined" || !document.modelContext) {
    return false;
  }
  if (registered) return true;

  const statePath = () => `/api/decisions/${activeDecisionGetter()}`;
  const register = (tool: RegisteredTool) =>
    document.modelContext?.registerTool({
      ...tool,
      execute: async (input) => {
        try {
          const result = await tool.execute(input);
          window.dispatchEvent(
            new CustomEvent("proofpilot:webmcp-call", {
              detail: {
                tool: tool.name,
                status:
                  typeof result === "object" &&
                  result !== null &&
                  "ok" in result &&
                  (result as any).ok === false
                    ? "error"
                    : "completed",
                detail: `decision: ${activeDecisionGetter()}`,
              },
            }),
          );
          return result;
        } catch (error) {
          window.dispatchEvent(
            new CustomEvent("proofpilot:webmcp-call", {
              detail: {
                tool: tool.name,
                status: "error",
                detail: error instanceof Error ? error.message : "Tool failed",
              },
            }),
          );
          return { ok: false, error: "Tool execution failed safely." };
        }
      },
    });

  // 1. Discovery Tool: get_decision_state
  register({
    name: "get_decision_state",
    description:
      "Retrieve the current decision, options, criteria, evidence coverage, findings, pending approvals, and recommendation from the active ProofPilot workspace.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => api(statePath()),
  });

  // 2. Discovery Tool: get_evidence
  register({
    name: "get_evidence",
    description:
      "Inspect the source-backed evidence used by the active decision, including confidence, reliability, support, contradiction, and approval status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => {
      const state = await api(statePath());
      return typeof state === "object" && state !== null && "evidence" in state
        ? { evidence: state.evidence }
        : state;
    },
  });

  // 3. Discovery Tool: search_evidence
  register({
    name: "search_evidence",
    description:
      "Search decision evidence by query text, targeted option ID, or minimum confidence/reliability threshold.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        optionId: { type: "string" },
        minReliability: { type: "number", minimum: 0, maximum: 100 },
      },
      additionalProperties: false,
    },
    execute: async (input) => {
      const state = (await api(statePath())) as { evidence?: Array<Record<string, unknown>> };
      if (!state || !Array.isArray(state.evidence)) return { evidence: [] };
      const q = typeof input.query === "string" ? input.query.toLowerCase() : "";
      const opt = typeof input.optionId === "string" ? input.optionId : null;
      const minRel = typeof input.minReliability === "number" ? input.minReliability : 0;

      const filtered = state.evidence.filter((item) => {
        const matchesQuery =
          !q ||
          String(item.title).toLowerCase().includes(q) ||
          String(item.claim).toLowerCase().includes(q) ||
          String(item.source).toLowerCase().includes(q);
        const matchesOpt =
          !opt || item.supportsOptionId === opt || item.contradictsOptionId === opt;
        const matchesRel = (Number(item.reliability) || 0) >= minRel;
        return matchesQuery && matchesOpt && matchesRel;
      });
      return { count: filtered.length, evidence: filtered };
    },
  });

  // 4. Evidence Generation Tool: add_evidence
  register({
    name: "add_evidence",
    description:
      "Submit new source-backed evidence into the active decision. ProofPilot automatically recalculates decision confidence and dynamic findings.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        source: { type: "string" },
        url: { type: "string" },
        claim: { type: "string" },
        summary: { type: "string" },
        supportsOptionId: { type: "string" },
        contradictsOptionId: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 100 },
        reliability: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["title", "source", "claim", "confidence", "reliability"],
      additionalProperties: false,
    },
    execute: async (input) =>
      api(`${statePath()}/evidence`, {
        method: "POST",
        body: JSON.stringify({ ...input, addedBy: "Agent", status: "Needs review" }),
      }),
  });

  // 5. Analysis Tool: compare_options
  register({
    name: "compare_options",
    description:
      "Return a weighted comparison of every option in the active decision, showing criterion scores, weighted totals, and the current leader.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => {
      const state = await api(statePath());
      if (typeof state !== "object" || state === null || !("options" in state)) return state;
      const typed = state as {
        options: Array<{ id: string; name: string; scores: Record<string, number> }>;
        criteria: Array<{ id: string; name: string; weight: number }>;
        recommendation: { optionName: string };
      };
      return {
        criteria: typed.criteria,
        options: typed.options.map((option) => ({
          name: option.name,
          scores: option.scores,
          weightedScore:
            Math.round(
              typed.criteria.reduce(
                (total, criterion) =>
                  total + ((option.scores[criterion.id] ?? 0) * criterion.weight) / 100,
                0,
              ) * 10,
            ) / 10,
        })),
        currentLeader: typed.recommendation.optionName,
      };
    },
  });

  // 6. Analysis Tool: detect_contradictions
  register({
    name: "detect_contradictions",
    description:
      "Dynamically evaluate evidence content across options to surface conflicting claims, unverified sources, and information gaps.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => {
      const state = await api(statePath());
      return typeof state === "object" && state !== null && "findings" in state
        ? { findings: state.findings }
        : state;
    },
  });

  // 7. Analysis Tool: run_sensitivity_analysis
  register({
    name: "run_sensitivity_analysis",
    description:
      "Test recommendation stability across changing priorities for any criterion (e.g. privacy, cost, developer-experience, team-adoption).",
    inputSchema: {
      type: "object",
      properties: {
        criterionId: { type: "string" },
      },
      additionalProperties: false,
    },
    execute: async (input) => {
      const param = typeof input?.criterionId === "string" ? `?criterionId=${encodeURIComponent(input.criterionId)}` : "";
      return api(`${statePath()}/sensitivity${param}`);
    },
  });

  // 8. Risk Analysis Tool: analyze_decision_risk
  register({
    name: "analyze_decision_risk",
    description:
      "Assess overall risk exposure, identifying options with low evidence reliability, open contradictions, or high sensitivity to priority shifts.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () => {
      const state = (await api(statePath())) as {
        options?: Array<{ id: string; name: string }>;
        findings?: Array<{ kind: string; title: string; severity: string }>;
        evidence?: Array<{ reliability: number; supportsOptionId: string }>;
      };
      if (!state || !Array.isArray(state.options)) return state;

      const contradictions = (state.findings ?? []).filter((f) => f.kind === "contradiction");
      const gaps = (state.findings ?? []).filter((f) => f.kind === "gap");
      const lowReliabilitySources = (state.evidence ?? []).filter((e) => e.reliability < 60);

      return {
        overallRiskLevel: contradictions.length > 0 || gaps.length > 1 ? "Elevated" : "Low",
        openContradictions: contradictions.length,
        unresolvedGaps: gaps.length,
        unverifiedSourcesCount: lowReliabilitySources.length,
        riskFactors: [
          ...contradictions.map((c) => ({ type: "Contradiction", title: c.title, severity: c.severity })),
          ...gaps.map((g) => ({ type: "Information Gap", title: g.title, severity: g.severity })),
        ],
      };
    },
  });

  // 9. Scenario Evaluation Tool: evaluate_scenario
  register({
    name: "evaluate_scenario",
    description:
      "Evaluate option rankings under a named scenario preset ('enterprise-privacy', 'developer-velocity', 'cost-optimized', 'balanced').",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: {
          type: "string",
          enum: ["enterprise-privacy", "developer-velocity", "cost-optimized", "balanced"],
        },
      },
      required: ["scenarioId"],
      additionalProperties: false,
    },
    execute: async (input) => {
      const state = (await api(statePath())) as {
        options: Array<{ id: string; name: string; shortName: string; scores: Record<string, number> }>;
        criteria: Array<{ id: string; name: string }>;
      };
      if (!state || !Array.isArray(state.options)) return state;

      const scenarios: Record<string, { name: string; weights: Record<string, number> }> = {
        "enterprise-privacy": { name: "Enterprise Privacy-First", weights: { privacy: 50, "developer-experience": 20, "team-adoption": 15, cost: 15 } },
        "developer-velocity": { name: "Developer Velocity", weights: { "developer-experience": 60, "team-adoption": 20, privacy: 10, cost: 10 } },
        "cost-optimized": { name: "Cost-Optimized / Budget", weights: { cost: 45, "developer-experience": 25, "team-adoption": 15, privacy: 15 } },
        balanced: { name: "Balanced Scorecard", weights: { "developer-experience": 25, "team-adoption": 25, privacy: 25, cost: 25 } },
      };

      const scenario = scenarios[String(input.scenarioId)] ?? scenarios.balanced;
      const rankings = state.options.map((opt) => {
        const score = state.criteria.reduce((total, c) => {
          const weight = scenario.weights[c.id] ?? 25;
          return total + (opt.scores[c.id] ?? 0) * (weight / 100);
        }, 0);
        return { name: opt.name, score: Math.round(score * 10) / 10 };
      });
      rankings.sort((a, b) => b.score - a.score);

      return {
        scenarioName: scenario.name,
        leader: rankings[0].name,
        winningScore: rankings[0].score,
        rankings,
      };
    },
  });

  // 10. Governance Tool: propose_weight_change
  register({
    name: "propose_weight_change",
    description:
      "Prepare a consequential criterion-weight change for human review. This tool never applies the change immediately.",
    inputSchema: {
      type: "object",
      properties: {
        criterionId: { type: "string" },
        proposedWeight: { type: "number", minimum: 0, maximum: 100 },
        reason: { type: "string" },
      },
      required: ["criterionId", "proposedWeight", "reason"],
      additionalProperties: false,
    },
    execute: async (input) =>
      api(`${statePath()}/actions/weight-proposal`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });

  // 11. Governance Tool: propose_decision
  register({
    name: "propose_decision",
    description:
      "Propose selecting a final decision option for formal human sign-off.",
    inputSchema: {
      type: "object",
      properties: {
        optionId: { type: "string" },
        reason: { type: "string" },
      },
      required: ["optionId", "reason"],
      additionalProperties: false,
    },
    execute: async (input) =>
      api(`${statePath()}/actions/decision-proposal`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });

  // 12. Governance Tool: request_human_review
  register({
    name: "request_human_review",
    description:
      "Ask the human decision owner to review the latest consequential proposal before any governance change is applied.",
    inputSchema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
      additionalProperties: false,
    },
    execute: async (input) => {
      const state = await api(statePath());
      if (typeof state !== "object" || state === null) return state;
      return {
        requiresHumanApproval: true,
        reason: input.reason,
        pendingActions: "pendingActions" in state ? state.pendingActions : [],
        message: "The agent may propose; only a human can approve.",
      };
    },
  });

  // 13. Output Tool: generate_decision_brief
  register({
    name: "generate_decision_brief",
    description:
      "Generate a concise explainable brief from the active decision, including the recommendation, evidence, contradictions, and remaining uncertainty.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: async () =>
      api(`${statePath()}/brief`, { method: "POST", body: JSON.stringify({}) }),
  });

  registered = true;
  window.dispatchEvent(new CustomEvent("proofpilot:webmcp-ready"));
  return true;
}

export function isWebMcpAvailable() {
  return typeof document !== "undefined" && Boolean(document.modelContext);
}