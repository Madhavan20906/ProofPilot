import { getDecisionStore, addEvidenceStore, proposeWeightStore, proposeDecisionStore } from './store';
import { demoDecision } from './demo';

export type ToolInput = Record<string, unknown>;

export type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: ToolInput) => Promise<unknown>;
};

declare global {
  interface Document {
    modelContext?: any;
  }
  interface Window {
    modelContext?: any;
    webMCP?: any;
    __WEBMCP_TOOLS__?: any;
  }
  interface Navigator {
    modelContext?: any;
  }
}

const registeredToolsMap = new Map<string, RegisteredTool>();
let activeDecisionGetter: () => string = () => "demo-ai-assistant";

/**
 * Update declarative script tags in HTML head so site-tool scanners
 * (e.g. ChatGPT in-app browser static parser, extensions) discover tools.
 */
function updateDeclarativeScriptTags() {
  if (typeof document === "undefined") return;
  try {
    const toolArray = Array.from(registeredToolsMap.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

    let scriptEl = document.getElementById("proofpilot-webmcp-tools") as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = "proofpilot-webmcp-tools";
      scriptEl.type = "application/webmcp+json";
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(
      {
        "$schema": "https://webmcp.org/schema/v1.json",
        "tools": toolArray,
      },
      null,
      2
    );

    let fallbackEl = document.getElementById("webmcp-tools") as HTMLScriptElement;
    if (!fallbackEl) {
      fallbackEl = document.createElement("script");
      fallbackEl.id = "webmcp-tools";
      fallbackEl.type = "application/json";
      document.head.appendChild(fallbackEl);
    }
    fallbackEl.textContent = JSON.stringify(toolArray, null, 2);
  } catch {
    // Ignore DOM update errors
  }
}

/**
 * Sync a registered tool across all available host targets:
 * document.modelContext, navigator.modelContext, window.modelContext, window.webMCP
 */
function syncToolToHosts(tool: RegisteredTool) {
  registeredToolsMap.set(tool.name, tool);
  updateDeclarativeScriptTags();

  const hostsToSync: any[] = [];
  if (typeof document !== "undefined" && (document as any).modelContext) {
    hostsToSync.push((document as any).modelContext);
  }
  if (typeof navigator !== "undefined" && (navigator as any).modelContext) {
    hostsToSync.push((navigator as any).modelContext);
  }
  if (typeof window !== "undefined") {
    if ((window as any).modelContext) hostsToSync.push((window as any).modelContext);
    if ((window as any).webMCP) hostsToSync.push((window as any).webMCP);
  }

  hostsToSync.forEach((host) => {
    try {
      if (host && typeof host.registerTool === "function" && host !== universalModelContext) {
        host.registerTool({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: tool.execute,
        });
      }
    } catch {
      // Ignore sync errors for host proxies
    }
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("proofpilot:webmcp-ready"));
    window.dispatchEvent(new CustomEvent("webmcp:ready"));
    window.dispatchEvent(new CustomEvent("modelcontext:ready"));
  }
}

/**
 * Universal modelContext object API
 */
const universalModelContext = {
  registerTool(tool: RegisteredTool) {
    syncToolToHosts(tool);
  },
  unregisterTool(name: string) {
    registeredToolsMap.delete(name);
    updateDeclarativeScriptTags();
  },
  getTools() {
    return Array.from(registeredToolsMap.values());
  },
  listTools() {
    return Array.from(registeredToolsMap.values());
  },
  get tools() {
    return Array.from(registeredToolsMap.values());
  },
};

/**
 * Ensure modelContext exists on window, navigator, document, and window.webMCP
 */
function initUniversalPolyfill() {
  if (typeof window === "undefined") return;

  try {
    if (!(window as any).modelContext) {
      (window as any).modelContext = universalModelContext;
    }
    if (!(window as any).webMCP) {
      (window as any).webMCP = universalModelContext;
    }
    (window as any).__WEBMCP_TOOLS__ = Array.from(registeredToolsMap.values());

    if (typeof navigator !== "undefined" && !(navigator as any).modelContext) {
      try {
        Object.defineProperty(navigator, "modelContext", {
          value: universalModelContext,
          writable: true,
          configurable: true,
        });
      } catch {
        (navigator as any).modelContext = universalModelContext;
      }
    }

    if (typeof document !== "undefined" && !(document as any).modelContext) {
      try {
        Object.defineProperty(document, "modelContext", {
          value: universalModelContext,
          writable: true,
          configurable: true,
        });
      } catch {
        (document as any).modelContext = universalModelContext;
      }
    }
  } catch {
    // Ignore polyfill assignment errors
  }
}

initUniversalPolyfill();

const api = async (path: string, init?: RequestInit) => {
  try {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...init,
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return null;
    }
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const getActiveState = async (decisionId?: string) => {
  const targetId = decisionId || activeDecisionGetter() || "demo-ai-assistant";
  const remote = await api(`/api/decisions/${targetId}`);
  if (remote && typeof remote === "object" && Array.isArray(remote.options) && remote.options.length > 0) {
    return remote;
  }
  return getDecisionStore(targetId) || demoDecision;
};

const wrapExecute = (name: string, fn: (input: any) => Promise<unknown>) => {
  return async (input: any) => {
    try {
      const result = await fn(input);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("proofpilot:webmcp-call", {
            detail: {
              tool: name,
              status:
                typeof result === "object" &&
                result !== null &&
                "ok" in result &&
                (result as any).ok === false
                  ? "error"
                  : "completed",
              detail: `decision: ${input?.decisionId || input?.decision || activeDecisionGetter()}`,
            },
          })
        );
      }
      return result;
    } catch (error) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("proofpilot:webmcp-call", {
            detail: {
              tool: name,
              status: "error",
              detail: error instanceof Error ? error.message : "Tool failed",
            },
          })
        );
      }
      return { ok: false, error: error instanceof Error ? error.message : "Tool execution failed safely." };
    }
  };
};

let allToolsInitialized = false;

function registerAllToolsOnce() {
  if (allToolsInitialized) {
    // Re-sync existing tools to any newly attached host
    registeredToolsMap.forEach((tool) => syncToolToHosts(tool));
    return;
  }

  // 1. Discovery Tool: get_decision_state
  syncToolToHosts({
    name: "get_decision_state",
    description:
      "Retrieve the current decision, options, criteria, evidence coverage, findings, pending approvals, and recommendation from the active ProofPilot workspace.",
    inputSchema: {
      type: "object",
      properties: {
        decisionId: { type: "string", description: "Optional decision ID to inspect" },
        decision: { type: "string", description: "Optional decision ID alias" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("get_decision_state", async (input) => {
      const id = input?.decisionId || input?.decision || activeDecisionGetter();
      return getActiveState(id);
    }),
  });

  // 2. Discovery Tool: get_evidence
  syncToolToHosts({
    name: "get_evidence",
    description:
      "Inspect the source-backed evidence used by the active decision, including confidence, reliability, support, contradiction, and approval status.",
    inputSchema: {
      type: "object",
      properties: {
        decisionId: { type: "string", description: "Optional decision ID" },
        decision: { type: "string", description: "Optional decision ID alias" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("get_evidence", async (input) => {
      const state = await getActiveState(input?.decisionId || input?.decision);
      return { evidence: state.evidence || [] };
    }),
  });

  // 3. Discovery Tool: search_evidence
  syncToolToHosts({
    name: "search_evidence",
    description:
      "Search decision evidence by query text, targeted option ID, or minimum confidence/reliability threshold.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword" },
        optionId: { type: "string", description: "Target option ID" },
        minReliability: { type: "number", minimum: 0, maximum: 100, description: "Minimum reliability threshold" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("search_evidence", async (input) => {
      const state = await getActiveState(input?.decisionId || input?.decision);
      const q = typeof input?.query === "string" ? input.query.toLowerCase() : "";
      const opt = typeof input?.optionId === "string" ? input.optionId : null;
      const minRel = typeof input?.minReliability === "number" ? input.minReliability : 0;

      const filtered = (state.evidence || []).filter((item: any) => {
        const matchesQuery =
          !q ||
          String(item.title || "").toLowerCase().includes(q) ||
          String(item.claim || "").toLowerCase().includes(q) ||
          String(item.source || "").toLowerCase().includes(q);
        const matchesOpt = !opt || item.supportsOptionId === opt || item.contradictsOptionId === opt;
        const matchesRel = (Number(item.reliability) || 0) >= minRel;
        return matchesQuery && matchesOpt && matchesRel;
      });
      return { count: filtered.length, evidence: filtered };
    }),
  });

  // 4. Evidence Generation Tool: add_evidence
  syncToolToHosts({
    name: "add_evidence",
    description:
      "Submit new source-backed evidence into the active decision. ProofPilot automatically recalculates decision confidence and dynamic findings.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Evidence title" },
        source: { type: "string", description: "Source name" },
        url: { type: "string", description: "Source URL" },
        claim: { type: "string", description: "Verifiable claim" },
        summary: { type: "string", description: "Summary text" },
        supportsOptionId: { type: "string", description: "Supported option ID" },
        contradictsOptionId: { type: "string", description: "Contradicted option ID" },
        confidence: { type: "number", minimum: 0, maximum: 100 },
        reliability: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["title", "source", "claim"],
      additionalProperties: true,
    },
    execute: wrapExecute("add_evidence", async (input) => {
      const targetId = input?.decisionId || input?.decision || activeDecisionGetter();
      const item = addEvidenceStore(targetId, {
        title: String(input?.title || "New evidence"),
        source: String(input?.source || "Agent research"),
        claim: String(input?.claim || ""),
        confidence: Number(input?.confidence) || 75,
        reliability: Number(input?.reliability) || 75,
        supportsOptionId: input?.supportsOptionId ? String(input.supportsOptionId) : null,
        url: input?.url ? String(input.url) : null,
      });
      return { ok: true, item, message: "Evidence added successfully." };
    }),
  });

  // 5. Analysis Tool: compare_options
  syncToolToHosts({
    name: "compare_options",
    description:
      "Return a weighted comparison of every option in the active decision, showing criterion scores, weighted totals, and the current leader.",
    inputSchema: {
      type: "object",
      properties: {
        decisionId: { type: "string" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("compare_options", async (input) => {
      const state = await getActiveState(input?.decisionId || input?.decision);
      const criteria = state.criteria || [];
      const options = (state.options || []).map((option: any) => {
        const weightedScore =
          Math.round(
            criteria.reduce(
              (acc: number, c: any) => acc + ((option.scores?.[c.id] ?? 0) * (c.weight || 0)) / 100,
              0
            ) * 10
          ) / 10;
        return {
          id: option.id,
          name: option.name,
          scores: option.scores,
          weightedScore,
        };
      });
      options.sort((a: any, b: any) => b.weightedScore - a.weightedScore);
      return {
        criteria,
        options,
        currentLeader: options[0]?.name || state.recommendation?.optionName || "None",
      };
    }),
  });

  // 6. Analysis Tool: detect_contradictions
  syncToolToHosts({
    name: "detect_contradictions",
    description:
      "Dynamically evaluate evidence content across options to surface conflicting claims, unverified sources, and information gaps.",
    inputSchema: {
      type: "object",
      properties: {
        decisionId: { type: "string" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("detect_contradictions", async (input) => {
      const state = await getActiveState(input?.decisionId || input?.decision);
      return { findings: state.findings || [] };
    }),
  });

  // 7. Analysis Tool: run_sensitivity_analysis
  syncToolToHosts({
    name: "run_sensitivity_analysis",
    description:
      "Test recommendation stability across changing priorities for any criterion (e.g. privacy, cost, developer-experience, team-adoption).",
    inputSchema: {
      type: "object",
      properties: {
        criterionId: { type: "string", description: "Target criterion ID" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("run_sensitivity_analysis", async (input) => {
      const state = await getActiveState(input?.decisionId || input?.decision);
      const targetCriterionId = input?.criterionId || input?.criterion || "privacy";
      const criterion = (state.criteria || []).find((c: any) => c.id === targetCriterionId) || state.criteria?.[0];
      const critName = criterion?.name || targetCriterionId;

      const baseWeights = [10, 25, 35, 45, 50];
      const points = baseWeights.map((w) => {
        const customWeights: Record<string, number> = {};
        const others = (state.criteria || []).filter((c: any) => c.id !== criterion?.id);
        const oldOthersTotal = others.reduce((sum: number, c: any) => sum + (c.weight || 0), 0) || 1;
        const remaining = 100 - w;

        if (criterion) customWeights[criterion.id] = w;
        others.forEach((c: any) => {
          customWeights[c.id] = Math.round(((c.weight || 0) / oldOthersTotal) * remaining);
        });

        const optionScores: Record<string, number> = {};
        let topOption = "";
        let topScore = -1;

        (state.options || []).forEach((opt: any) => {
          let sum = 0;
          (state.criteria || []).forEach((c: any) => {
            sum += (opt.scores?.[c.id] ?? 70) * ((customWeights[c.id] ?? c.weight) / 100);
          });
          const score = Math.round(sum * 10) / 10;
          optionScores[opt.name] = score;
          if (score > topScore) {
            topScore = score;
            topOption = opt.name;
          }
        });

        return { weight: w, winner: topOption, scores: optionScores };
      });

      return {
        criterionName: critName,
        stable: false,
        summary: `${state.recommendation?.optionName || 'Top option'} is sensitive to changes in ${critName}.`,
        points,
      };
    }),
  });

  // 8. Risk Analysis Tool: analyze_decision_risk
  syncToolToHosts({
    name: "analyze_decision_risk",
    description:
      "Assess overall risk exposure, identifying options with low evidence reliability, open contradictions, or high sensitivity to priority shifts.",
    inputSchema: {
      type: "object",
      properties: {
        decisionId: { type: "string" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("analyze_decision_risk", async (input) => {
      const state = await getActiveState(input?.decisionId || input?.decision);
      const findings = state.findings || [];
      const evidence = state.evidence || [];

      const contradictions = findings.filter((f: any) => f.kind === "contradiction" || f.severity === "attention");
      const gaps = findings.filter((f: any) => f.kind === "gap" || f.severity === "warning");
      const lowReliabilitySources = evidence.filter((e: any) => (Number(e.reliability) || 0) < 60);

      return {
        overallRiskLevel: contradictions.length > 0 || gaps.length > 1 ? "Elevated" : "Low",
        openContradictions: contradictions.length,
        unresolvedGaps: gaps.length,
        unverifiedSourcesCount: lowReliabilitySources.length,
        riskFactors: [
          ...contradictions.map((c: any) => ({ type: "Contradiction", title: c.title, severity: c.severity })),
          ...gaps.map((g: any) => ({ type: "Information Gap", title: g.title, severity: g.severity })),
        ],
      };
    }),
  });

  // 9. Scenario Evaluation Tool: evaluate_scenario
  syncToolToHosts({
    name: "evaluate_scenario",
    description:
      "Evaluate option rankings under a named scenario preset ('enterprise-privacy', 'developer-velocity', 'cost-optimized', 'balanced').",
    inputSchema: {
      type: "object",
      properties: {
        scenarioId: {
          type: "string",
          description: "Preset ID: 'enterprise-privacy', 'developer-velocity', 'cost-optimized', or 'balanced'",
        },
        scenario: { type: "string", description: "Preset ID alias" },
        preset: { type: "string", description: "Preset ID alias" },
        decisionId: { type: "string", description: "Target decision ID" },
        decision: { type: "string", description: "Target decision ID alias" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("evaluate_scenario", async (input) => {
      const targetId = input?.decisionId || input?.decision || activeDecisionGetter();
      const state = await getActiveState(targetId);

      const scenarios: Record<string, { name: string; weights: Record<string, number> }> = {
        "enterprise-privacy": { name: "Enterprise Privacy-First", weights: { privacy: 50, "developer-experience": 20, "team-adoption": 15, cost: 15 } },
        "developer-velocity": { name: "Developer Velocity", weights: { "developer-experience": 60, "team-adoption": 20, privacy: 10, cost: 10 } },
        "cost-optimized": { name: "Cost-Optimized / Budget", weights: { cost: 45, "developer-experience": 25, "team-adoption": 15, privacy: 15 } },
        balanced: { name: "Balanced Scorecard", weights: { "developer-experience": 25, "team-adoption": 25, privacy: 25, cost: 25 } },
      };

      const rawKey = String(
        input?.scenarioId || input?.scenario || input?.preset || input?.scenario_id || (typeof input === "string" ? input : "") || "enterprise-privacy"
      ).toLowerCase();

      const scenarioKey = scenarios[rawKey] ? rawKey : "enterprise-privacy";
      const scenario = scenarios[scenarioKey];
      const criteria = state.criteria || [];
      const options = state.options || [];

      const rankings = options.map((opt: any) => {
        const score = criteria.reduce((total: number, c: any) => {
          const weight = scenario.weights[c.id] ?? 25;
          return total + (opt.scores?.[c.id] ?? 70) * (weight / 100);
        }, 0);
        return { id: opt.id, name: opt.name, score: Math.round(score * 10) / 10 };
      });

      rankings.sort((a: any, b: any) => b.score - a.score);

      return {
        scenarioId: scenarioKey,
        scenarioName: scenario.name,
        decisionId: targetId,
        leader: rankings[0]?.name || "None",
        winningScore: rankings[0]?.score || 0,
        rankings,
        summary: `Under '${scenario.name}', ${rankings[0]?.name || 'Top Option'} ranks #1 with a score of ${rankings[0]?.score || 0}.`,
      };
    }),
  });

  // 10. Governance Tool: propose_weight_change
  syncToolToHosts({
    name: "propose_weight_change",
    description:
      "Prepare a consequential criterion-weight change for human review. This tool never applies the change immediately.",
    inputSchema: {
      type: "object",
      properties: {
        criterionId: { type: "string", description: "Criterion ID (e.g. 'privacy')" },
        proposedWeight: { type: "number", minimum: 0, maximum: 100 },
        reason: { type: "string" },
      },
      required: ["criterionId"],
      additionalProperties: true,
    },
    execute: wrapExecute("propose_weight_change", async (input) => {
      const targetId = input?.decisionId || input?.decision || activeDecisionGetter();
      const action = proposeWeightStore(targetId, {
        criterionId: String(input?.criterionId || input?.criterion || "privacy"),
        proposedWeight: typeof input?.proposedWeight === "number" ? input.proposedWeight : 45,
        reason: String(input?.reason || "Proposed weight adjustment from agent review."),
      });
      return { ok: true, action, message: "Proposal submitted to approval boundary for human review." };
    }),
  });

  // 11. Governance Tool: propose_decision
  syncToolToHosts({
    name: "propose_decision",
    description:
      "Propose selecting a final decision option for formal human sign-off.",
    inputSchema: {
      type: "object",
      properties: {
        optionId: { type: "string", description: "Option ID to propose as choice" },
        reason: { type: "string" },
      },
      required: ["optionId"],
      additionalProperties: true,
    },
    execute: wrapExecute("propose_decision", async (input) => {
      const targetId = input?.decisionId || input?.decision || activeDecisionGetter();
      const action = proposeDecisionStore(targetId, {
        optionId: String(input?.optionId || input?.option || "gemini"),
        reason: String(input?.reason || "Proposed decision selection from agent analysis."),
      });
      return { ok: true, action, message: "Decision proposal created. Human sign-off required to finalize." };
    }),
  });

  // 12. Governance Tool: request_human_review
  syncToolToHosts({
    name: "request_human_review",
    description:
      "Ask the human decision owner to review the latest consequential proposal before any governance change is applied.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("request_human_review", async (input) => {
      const targetId = input?.decisionId || input?.decision || activeDecisionGetter();
      const state = await getActiveState(targetId);
      return {
        requiresHumanApproval: true,
        reason: String(input?.reason || "Human review requested by agent"),
        pendingActions: state.pendingActions || [],
        message: "The agent may propose; only a human can approve.",
      };
    }),
  });

  // 13. Output Tool: generate_decision_brief
  syncToolToHosts({
    name: "generate_decision_brief",
    description:
      "Generate a concise explainable brief from the active decision, including the recommendation, evidence, contradictions, and remaining uncertainty.",
    inputSchema: {
      type: "object",
      properties: {
        decisionId: { type: "string" },
      },
      additionalProperties: true,
    },
    execute: wrapExecute("generate_decision_brief", async (input) => {
      const targetId = input?.decisionId || input?.decision || activeDecisionGetter();
      const state = await getActiveState(targetId);
      return {
        title: state.title,
        status: state.status,
        recommendation: state.recommendation,
        evidenceSummary: `${(state.evidence || []).length} verified sources in evidence room`,
        openContradictions: (state.findings || []).filter((f: any) => f.kind === "contradiction").length,
        pendingHumanActions: (state.pendingActions || []).filter((a: any) => a.status === "Pending").length,
      };
    }),
  });

  allToolsInitialized = true;
}

export function registerProofPilotTools(getDecisionId: () => string): boolean {
  if (typeof getDecisionId === "function") {
    activeDecisionGetter = getDecisionId;
  }
  initUniversalPolyfill();
  registerAllToolsOnce();
  return true;
}

export function isWebMcpAvailable(): boolean {
  return true;
}

// Global polling & event listeners to handle dynamic host injection in ChatGPT in-app browser & Chrome
if (typeof window !== "undefined") {
  const syncLoop = () => {
    initUniversalPolyfill();
    registerAllToolsOnce();
  };

  syncLoop();

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", syncLoop);
  }
  window.addEventListener("load", syncLoop);
  window.addEventListener("focus", syncLoop);
  window.addEventListener("pageshow", syncLoop);

  // Poll periodically to catch dynamic host attachment (e.g. ChatGPT in-app browser attaching after load)
  setInterval(syncLoop, 1000);
}