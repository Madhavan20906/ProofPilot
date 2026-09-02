import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, decisionsTable } from "@workspace/db";
import {
  AddEvidenceBody,
  CreateDecisionBody,
  CreateDecisionResponse,
  GetDecisionActivityResponse,
  GetDecisionResponse,
  GetSensitivityAnalysisResponse,
  ListDecisionsResponse,
  ProposeWeightChangeBody,
  ProposeWeightChangeResponse,
  ResolvePendingActionBody,
  ResolvePendingActionResponse,
  UpdateDecisionBody,
  UpdateDecisionResponse,
  GenerateDecisionBriefResponse,
} from "@workspace/api-zod";
import {
  addActivity,
  createDemoState,
  createSensitivity,
  recalculate,
  validateWeights,
  type DecisionState,
  type Evidence,
  type PendingAction,
} from "../lib/decision-engine";

const router: IRouter = Router();

const asState = (value: unknown): DecisionState => value as DecisionState;

const inMemoryStore = new Map<string, { id: string; title: string; description: string; state: unknown; createdAt: Date; updatedAt: Date }>();

async function findDecision(id: string) {
  try {
    const [row] = await db
      .select()
      .from(decisionsTable)
      .where(eq(decisionsTable.id, id))
      .limit(1);
    if (row) return row;
  } catch (_err) {
    // fallback to memory
  }
  return inMemoryStore.get(id);
}

async function saveState(id: string, state: DecisionState) {
  try {
    await db
      .update(decisionsTable)
      .set({
        state: state as unknown as Record<string, unknown>,
        updatedAt: new Date(state.updatedAt),
      })
      .where(eq(decisionsTable.id, id));
  } catch (_err) {
    // fallback
  }
  const existing = inMemoryStore.get(id);
  if (existing) {
    existing.state = state;
    existing.updatedAt = new Date(state.updatedAt);
  } else {
    inMemoryStore.set(id, {
      id,
      title: state.title,
      description: state.description,
      state: state as unknown as Record<string, unknown>,
      createdAt: new Date(),
      updatedAt: new Date(state.updatedAt),
    });
  }
}

async function ensureDemo() {
  const existing = await findDecision("demo-ai-assistant");
  if (existing) {
    const current = asState(existing.state);
    const gemini = (current?.options ?? []).find((option) => option.id === "gemini");
    if (
      (current?.activity ?? []).length <= 1 &&
      (current?.pendingActions ?? []).length === 0 &&
      gemini?.scores?.["developer-experience"] === 76
    ) {
      const fresh = createDemoState();
      try {
        const [updated] = await db
          .update(decisionsTable)
          .set({
            title: fresh.title,
            description: fresh.description,
            state: fresh as unknown as Record<string, unknown>,
            updatedAt: new Date(fresh.updatedAt),
          })
          .where(eq(decisionsTable.id, fresh.id))
          .returning();
        if (updated) return updated;
      } catch (_err) {
        // fallback
      }
      const record = {
        id: fresh.id,
        title: fresh.title,
        description: fresh.description,
        state: fresh as unknown as Record<string, unknown>,
        createdAt: new Date(),
        updatedAt: new Date(fresh.updatedAt),
      };
      inMemoryStore.set(fresh.id, record);
      return record;
    }
    return existing;
  }
  const state = createDemoState();
  const record = {
    id: state.id,
    title: state.title,
    description: state.description,
    state: state as unknown as Record<string, unknown>,
    createdAt: new Date(),
    updatedAt: new Date(state.updatedAt),
  };
  try {
    const [created] = await db
      .insert(decisionsTable)
      .values({
        id: state.id,
        title: state.title,
        description: state.description,
        state: state as unknown as Record<string, unknown>,
        createdAt: new Date(),
        updatedAt: new Date(state.updatedAt),
      })
      .returning();
    if (created) return created;
  } catch (_err) {
    // fallback
  }
  inMemoryStore.set(state.id, record);
  return record;
}

router.get("/decisions", async (_req, res): Promise<void> => {
  await ensureDemo();
  let rows: Array<{ id: string; title: string; description: string; state: unknown; createdAt: Date; updatedAt: Date }> = [];
  try {
    rows = await db
      .select()
      .from(decisionsTable)
      .orderBy(desc(decisionsTable.updatedAt));
  } catch (_err) {
    rows = Array.from(inMemoryStore.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  const summaries = rows.map((row) => {
    const state = asState(row.state);
    return {
      id: row.id,
      title: row.title,
      status: state.status,
      recommendation: state.recommendation.optionName,
      confidence: state.recommendation.evidenceConfidence,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
  res.json(ListDecisionsResponse.parse(summaries));
});

router.post("/decisions", async (req, res): Promise<void> => {
  const parsed = CreateDecisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message, code: "INVALID_INPUT" });
    return;
  }
  const state = createDemoState();
  const cleanState: DecisionState = {
    ...state,
    id: randomUUID(),
    title: parsed.data.title,
    description: parsed.data.description,
    owner: parsed.data.owner ?? "Decision owner",
    status: "Draft",
    options: [],
    criteria: [],
    evidence: [],
    findings: [],
    recommendation: {
      optionId: "",
      optionName: "Not yet recommended",
      score: 0,
      evidenceConfidence: 0,
      why: ["Add options and criteria to begin an investigation."],
      whatCouldChange: "The recommendation will appear once the decision has evidence.",
    },
    pendingActions: [],
    activity: [],
  };
  const withActivity = addActivity(
    cleanState,
    "Human",
    "Decision created",
    "A new decision workspace was created.",
  );
  await db.insert(decisionsTable).values({
    id: withActivity.id,
    title: withActivity.title,
    description: withActivity.description,
    state: withActivity as unknown as Record<string, unknown>,
    createdAt: new Date(),
    updatedAt: new Date(withActivity.updatedAt),
  });
  res.status(201).json(CreateDecisionResponse.parse(withActivity));
});

router.get("/decisions/:decisionId", async (req, res): Promise<void> => {
  const row = await findDecision(req.params.decisionId);
  if (!row) {
    res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
    return;
  }
  res.json(GetDecisionResponse.parse(asState(row.state)));
});

router.patch("/decisions/:decisionId", async (req, res): Promise<void> => {
  const parsed = UpdateDecisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message, code: "INVALID_INPUT" });
    return;
  }
  const row = await findDecision(req.params.decisionId);
  if (!row) {
    res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
    return;
  }
  let state = asState(row.state);
  if (parsed.data.criteriaWeights) {
    const validation = validateWeights(state.criteria, parsed.data.criteriaWeights);
    if (validation) {
      res.status(400).json({ error: validation, code: "INVALID_WEIGHTS" });
      return;
    }
    state = {
      ...state,
      criteria: state.criteria.map((criterion) => ({
        ...criterion,
        weight: parsed.data.criteriaWeights?.[criterion.id] ?? criterion.weight,
      })),
    };
  }
  if (parsed.data.title) state = { ...state, title: parsed.data.title };
  if (parsed.data.status) state = { ...state, status: parsed.data.status };
  state = recalculate(
    addActivity(
      state,
      "Human",
      "Priorities changed",
      "Human priorities changed. The recommendation was recalculated from the updated weights.",
    ),
  );
  await saveState(row.id, state);
  res.json(UpdateDecisionResponse.parse(state));
});

router.post("/decisions/:decisionId/analyze", async (req, res): Promise<void> => {
  const row = await findDecision(req.params.decisionId);
  if (!row) {
    res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
    return;
  }
  const state = recalculate(
    addActivity(
      asState(row.state),
      "Agent",
      "Analysis refreshed",
      "Scoring engine recalculated the recommendation against the current evidence and priorities.",
    ),
  );
  await saveState(row.id, state);
  res.json(GetDecisionResponse.parse(state));
});

router.post("/decisions/:decisionId/evidence", async (req, res): Promise<void> => {
  const parsed = AddEvidenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message, code: "INVALID_INPUT" });
    return;
  }
  const row = await findDecision(req.params.decisionId);
  if (!row) {
    res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
    return;
  }
  const data = parsed.data;
  const evidence: Evidence = {
    ...data,
    url: data.url ?? null,
    contradictsOptionId: data.contradictsOptionId ?? null,
    id: randomUUID(),
    sourceType: (data as { sourceType?: string }).sourceType ?? "Source note",
    addedBy: (data as { addedBy?: string }).addedBy ?? "Human",
    status: (data as { status?: string }).status ?? "Pending",
    summary: data.summary ?? "",
  };
  const updatedState = recalculate(
    addActivity(
      { ...asState(row.state), evidence: [evidence, ...asState(row.state).evidence] },
      evidence.addedBy,
      "Evidence added",
      `Added "${evidence.title}" for review.`,
    ),
  );
  await saveState(row.id, updatedState);
  res.status(201).json(evidence);
});

router.patch("/decisions/:decisionId/evidence/:evidenceId", async (req, res): Promise<void> => {
  const { status } = req.body as { status?: string };
  if (!status || !["Approved", "Rejected", "Challenged", "Needs review", "Pending"].includes(status)) {
    res.status(400).json({ error: "Invalid evidence status", code: "INVALID_STATUS" });
    return;
  }
  const row = await findDecision(req.params.decisionId);
  if (!row) {
    res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
    return;
  }
  const currentState = asState(row.state);
  const targetEv = currentState.evidence.find((e) => e.id === req.params.evidenceId);
  if (!targetEv) {
    res.status(404).json({ error: "Evidence not found", code: "NOT_FOUND" });
    return;
  }
  const updatedEvidence = currentState.evidence.map((e) =>
    e.id === req.params.evidenceId ? { ...e, status } : e,
  );
  const updatedState = recalculate(
    addActivity(
      { ...currentState, evidence: updatedEvidence },
      "Human",
      "Evidence status updated",
      `Changed "${targetEv.title}" status to ${status}.`,
    ),
  );
  await saveState(row.id, updatedState);
  res.json(updatedState);
});

router.get("/decisions/:decisionId/activity", async (req, res): Promise<void> => {
  const row = await findDecision(req.params.decisionId);
  if (!row) {
    res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
    return;
  }
  res.json(GetDecisionActivityResponse.parse(asState(row.state).activity));
});

router.get("/decisions/:decisionId/sensitivity", async (req, res): Promise<void> => {
  const row = await findDecision(req.params.decisionId);
  if (!row) {
    res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
    return;
  }
  const criterionId = req.query.criterionId as string | undefined;
  res.json(GetSensitivityAnalysisResponse.parse(createSensitivity(asState(row.state), criterionId)));
});

router.post(
  "/decisions/:decisionId/actions/weight-proposal",
  async (req, res): Promise<void> => {
    const parsed = ProposeWeightChangeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message, code: "INVALID_INPUT" });
      return;
    }
    const row = await findDecision(req.params.decisionId);
    if (!row) {
      res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
      return;
    }
    const state = asState(row.state);
    const criterion = state.criteria.find((item) => item.id === parsed.data.criterionId);
    if (!criterion) {
      res.status(400).json({ error: "Criterion not found", code: "INVALID_CRITERION" });
      return;
    }
    const currentWeights = Object.fromEntries(
      state.criteria.map((item) => [item.id, item.weight]),
    );
    const proposedWeights = { ...currentWeights, [criterion.id]: parsed.data.proposedWeight };
    const delta = parsed.data.proposedWeight - criterion.weight;
    const balancingCriterion = state.criteria.find(
      (item) => item.id !== criterion.id && item.weight - delta >= 0,
    );
    if (!balancingCriterion) {
      res.status(400).json({ error: "No safe criterion can absorb this change.", code: "INVALID_WEIGHTS" });
      return;
    }
    proposedWeights[balancingCriterion.id] = balancingCriterion.weight - delta;
    const validation = validateWeights(state.criteria, proposedWeights);
    if (validation) {
      res.status(400).json({ error: validation, code: "INVALID_WEIGHTS" });
      return;
    }
    const pending: PendingAction = {
      id: randomUUID(),
      type: "weight_change",
      title: `Change ${criterion.name} to ${parsed.data.proposedWeight}%`,
      reason: parsed.data.reason,
      status: "Pending",
      proposedAt: new Date().toISOString(),
      currentWeights,
      proposedWeights,
    };
    const next = addActivity(
      { ...state, pendingActions: [pending, ...state.pendingActions] },
      "Agent",
      "Approval requested",
      `The agent proposed changing ${criterion.name}. No change was applied.`,
    );
    await saveState(row.id, next);
    res.status(201).json(ProposeWeightChangeResponse.parse(pending));
  },
);

router.post(
  "/decisions/:decisionId/actions/decision-proposal",
  async (req, res): Promise<void> => {
    const { optionId, reason } = req.body as { optionId?: string; reason?: string };
    if (!optionId || !reason) {
      res.status(400).json({ error: "optionId and reason are required", code: "INVALID_INPUT" });
      return;
    }
    const row = await findDecision(req.params.decisionId);
    if (!row) {
      res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
      return;
    }
    const state = asState(row.state);
    const option = state.options.find((item) => item.id === optionId);
    if (!option) {
      res.status(400).json({ error: "Option not found", code: "INVALID_OPTION" });
      return;
    }
    const pending: PendingAction = {
      id: randomUUID(),
      type: "decision_proposal",
      title: `Select ${option.name} as final decision choice`,
      reason,
      status: "Pending",
      proposedAt: new Date().toISOString(),
    };
    const next = addActivity(
      { ...state, pendingActions: [pending, ...state.pendingActions] },
      "Agent",
      "Decision proposal submitted",
      `The agent proposed committing to ${option.name}. Awaiting human approval.`,
    );
    await saveState(row.id, next);
    res.status(201).json(pending);
  },
);

router.post(
  "/decisions/:decisionId/actions/:actionId/resolve",
  async (req, res): Promise<void> => {
    const parsed = ResolvePendingActionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message, code: "INVALID_INPUT" });
      return;
    }
    const row = await findDecision(req.params.decisionId);
    if (!row) {
      res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
      return;
    }
    const state = asState(row.state);
    const action = state.pendingActions.find((item) => item.id === req.params.actionId);
    if (!action) {
      res.status(404).json({ error: "Pending action not found", code: "NOT_FOUND" });
      return;
    }
    let next = state;
    if (parsed.data.resolution === "approved" && action.proposedWeights) {
      next = {
        ...state,
        criteria: state.criteria.map((criterion) => ({
          ...criterion,
          weight: action.proposedWeights?.[criterion.id] ?? criterion.weight,
        })),
      };
    }
    next = recalculate({
      ...addActivity(
        next,
        "Human",
        parsed.data.resolution === "approved" ? "Proposal approved" : "Proposal rejected",
        parsed.data.resolution === "approved"
          ? "Human approved the agent’s proposed priority change."
          : "Human rejected the proposed priority change. The previous priorities remain active.",
      ),
      pendingActions: next.pendingActions.map((item) =>
        item.id === action.id
          ? { ...item, status: parsed.data.resolution === "approved" ? "Approved" : "Rejected" }
          : item,
      ),
    });
    await saveState(row.id, next);
    res.json(ResolvePendingActionResponse.parse(next));
  },
);

router.post("/decisions/:decisionId/brief", async (req, res): Promise<void> => {
  const row = await findDecision(req.params.decisionId);
  if (!row) {
    res.status(404).json({ error: "Decision not found", code: "NOT_FOUND" });
    return;
  }
  const state = asState(row.state);
  const brief = {
    decision: state.description,
    executiveRecommendation: `Recommend ${state.recommendation.optionName} at ${state.recommendation.score} weighted points, with ${state.recommendation.evidenceConfidence}% evidence confidence.`,
    optionsEvaluated: state.options.map((option) => option.name),
    criteria: state.criteria.map((criterion) => `${criterion.name} (${criterion.weight}%)`),
    evidenceSummary: state.evidence.map((item) => item.claim),
    contradictions: state.findings
      .filter((finding) => finding.kind === "contradiction")
      .map((finding) => finding.detail),
    finalRecommendation: state.recommendation.why.join(" "),
    remainingUncertainty: [
      state.recommendation.whatCouldChange,
      ...state.findings.filter((finding) => finding.kind === "gap").map((finding) => finding.detail),
    ],
  };
  res.json(GenerateDecisionBriefResponse.parse(brief));
});

export default router;