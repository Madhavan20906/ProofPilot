import type {
  ActivityEntry,
  DecisionState,
  DecisionSummary,
  Evidence,
  Finding,
  PendingAction,
  SensitivityAnalysis,
} from '@workspace/api-client-react';
import { demoActivity, demoDecision, DEMO_ID, demoSensitivity } from './demo';

const STORAGE_KEY = 'proofpilot_decisions_v1';
const ACTIVITY_KEY = 'proofpilot_activity_v1';

function calculateRecommendation(
  options: DecisionState['options'],
  criteria: DecisionState['criteria'],
  evidence: DecisionState['evidence']
) {
  if (!options.length || !criteria.length) {
    return {
      optionId: options[0]?.id ?? 'none',
      optionName: options[0]?.name ?? 'None',
      score: 0,
      evidenceConfidence: 80,
      why: ['Initial recommendation pending evaluation.'],
      whatCouldChange: 'Add criteria and evidence to update recommendation.',
    };
  }

  const totalWeight = criteria.reduce((acc, c) => acc + (c.weight || 0), 0) || 100;

  const scoredOptions = options.map((opt) => {
    let weightedSum = 0;
    criteria.forEach((c) => {
      const rawScore = opt.scores?.[c.id] ?? 70;
      weightedSum += rawScore * (c.weight / totalWeight);
    });
    return { ...opt, finalScore: Math.round(weightedSum * 10) / 10 };
  });

  scoredOptions.sort((a, b) => b.finalScore - a.finalScore);
  const winner = scoredOptions[0];

  const avgConfidence = evidence.length
    ? Math.round(evidence.reduce((acc, e) => acc + (e.confidence || 75), 0) / evidence.length)
    : 82;

  const topCriterion = [...criteria].sort((a, b) => b.weight - a.weight)[0];

  return {
    optionId: winner.id,
    optionName: winner.name,
    score: winner.finalScore,
    evidenceConfidence: avgConfidence,
    why: [
      `Leads on weighted score (${winner.finalScore}) across current criteria priorities.`,
      `Strong alignment with highest-weighted priority: ${topCriterion?.name ?? 'core criteria'} (${topCriterion?.weight ?? 0}% weight).`,
      `Supported by ${evidence.length} evidence sources in the decision room.`,
    ],
    whatCouldChange: `Material changes to ${topCriterion?.name ?? 'top priority'} weight or new contradictory evidence could alter this recommendation.`,
  };
}

export function getLocalDecisions(): DecisionState[] {
  if (typeof window === 'undefined') return [demoDecision];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([demoDecision]));
      return [demoDecision];
    }
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([demoDecision]));
      return [demoDecision];
    }
    return items;
  } catch {
    return [demoDecision];
  }
}

export function saveLocalDecisions(items: DecisionState[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function getLocalActivities(decisionId: string): ActivityEntry[] {
  if (typeof window === 'undefined') return demoActivity;
  try {
    const raw = localStorage.getItem(`${ACTIVITY_KEY}_${decisionId}`);
    if (!raw) return decisionId === DEMO_ID ? demoActivity : [];
    return JSON.parse(raw);
  } catch {
    return decisionId === DEMO_ID ? demoActivity : [];
  }
}

export function addLocalActivity(decisionId: string, entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  const current = getLocalActivities(decisionId);
  const newEntry: ActivityEntry = {
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newEntry, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${ACTIVITY_KEY}_${decisionId}`, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

export function listDecisionSummariesStore(): DecisionSummary[] {
  const items = getLocalDecisions();
  return items.map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    recommendation: d.recommendation?.optionName ?? 'In evaluation',
    confidence: d.recommendation?.evidenceConfidence ?? 80,
    updatedAt: d.updatedAt,
  }));
}

export function getDecisionStore(id: string): DecisionState {
  const items = getLocalDecisions();
  const found = items.find((item) => item.id === id);
  if (found) return found;

  if (id === DEMO_ID) return demoDecision;

  return {
    ...demoDecision,
    id,
    title: `Decision Workspace (${id.slice(0, 6)})`,
  };
}

export function createDecisionStore(data: { title: string; description: string; owner?: string }): DecisionState {
  const items = getLocalDecisions();
  const newId = `dec-${Date.now()}`;
  const newDecision: DecisionState = {
    id: newId,
    title: data.title,
    description: data.description,
    owner: data.owner || 'Madhavan',
    status: 'in_review',
    updatedAt: new Date().toISOString(),
    options: [...demoDecision.options],
    criteria: [...demoDecision.criteria],
    evidence: [],
    findings: [
      {
        id: `finding-${Date.now()}`,
        kind: 'signal',
        title: 'Workspace initialized',
        detail: 'New decision created. Ready for evidence and priority weighting.',
        severity: 'positive',
        evidenceIds: [],
      },
    ],
    recommendation: calculateRecommendation(demoDecision.options, demoDecision.criteria, []),
    pendingActions: [],
  };

  const updated = [newDecision, ...items];
  saveLocalDecisions(updated);
  addLocalActivity(newId, {
    actor: data.owner || 'Madhavan',
    action: 'Opened workspace',
    detail: `Created new decision workspace for "${data.title}"`,
  });

  return newDecision;
}

export function updateDecisionStore(id: string, patch: Partial<DecisionState> & { criteriaWeights?: Record<string, number> }): DecisionState {
  const items = getLocalDecisions();
  const index = items.findIndex((d) => d.id === id);
  const current = index >= 0 ? items[index] : getDecisionStore(id);

  let updatedCriteria = current.criteria;
  if (patch.criteriaWeights) {
    updatedCriteria = current.criteria.map((c) => ({
      ...c,
      weight: patch.criteriaWeights?.[c.id] ?? c.weight,
    }));
  }

  const updatedOptions = patch.options ?? current.options;
  const updatedEvidence = patch.evidence ?? current.evidence;

  const newRec = calculateRecommendation(updatedOptions, updatedCriteria, updatedEvidence);

  const updatedDecision: DecisionState = {
    ...current,
    ...patch,
    criteria: updatedCriteria,
    recommendation: newRec,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    items[index] = updatedDecision;
  } else {
    items.unshift(updatedDecision);
  }
  saveLocalDecisions(items);

  if (patch.criteriaWeights) {
    addLocalActivity(id, {
      actor: 'Madhavan',
      action: 'Updated criteria priorities',
      detail: `Adjusted weights. New top recommendation: ${newRec.optionName} (${newRec.score})`,
    });
  }

  return updatedDecision;
}

export function addEvidenceStore(
  id: string,
  evidenceData: {
    title: string;
    source: string;
    claim: string;
    confidence?: number;
    reliability?: number;
    supportsOptionId?: string | null;
    sourceType?: string;
    url?: string | null;
  }
): Evidence {
  const decision = getDecisionStore(id);
  const newEv: Evidence = {
    title: evidenceData.title,
    source: evidenceData.source,
    claim: evidenceData.claim,
    summary: evidenceData.claim,
    sourceType: evidenceData.sourceType ?? 'internal research',
    supportsOptionId: evidenceData.supportsOptionId ?? null,
    contradictsOptionId: null,
    confidence: evidenceData.confidence ?? 75,
    reliability: evidenceData.reliability ?? 75,
    url: evidenceData.url ?? null,
    id: `ev-${Date.now()}`,
    addedBy: 'Madhavan',
    status: 'verified',
  };

  const updatedEvidence = [newEv, ...decision.evidence];
  const updatedRec = calculateRecommendation(decision.options, decision.criteria, updatedEvidence);

  const updatedDecision: DecisionState = {
    ...decision,
    evidence: updatedEvidence,
    recommendation: updatedRec,
    updatedAt: new Date().toISOString(),
  };

  const items = getLocalDecisions();
  const index = items.findIndex((d) => d.id === id);
  if (index >= 0) items[index] = updatedDecision;
  else items.unshift(updatedDecision);
  saveLocalDecisions(items);

  addLocalActivity(id, {
    actor: 'Madhavan',
    action: 'Added evidence',
    detail: `${newEv.title} · ${newEv.source}`,
  });

  return newEv;
}

export function proposeWeightStore(id: string, data: { criterionId: string; proposedWeight: number; reason: string }): PendingAction {
  const decision = getDecisionStore(id);
  const currentCriterion = decision.criteria.find((c) => c.id === data.criterionId);
  const otherCriteria = decision.criteria.filter((c) => c.id !== data.criterionId);

  const currentWeights: Record<string, number> = {};
  decision.criteria.forEach((c) => { currentWeights[c.id] = c.weight; });

  const remaining = 100 - data.proposedWeight;
  const oldOthersTotal = otherCriteria.reduce((sum, c) => sum + c.weight, 0) || 1;

  const proposedWeights: Record<string, number> = { [data.criterionId]: data.proposedWeight };
  otherCriteria.forEach((c) => {
    proposedWeights[c.id] = Math.round((c.weight / oldOthersTotal) * remaining);
  });

  const newAction: PendingAction = {
    id: `action-${Date.now()}`,
    type: 'weight_change',
    title: `Raise ${currentCriterion?.name ?? data.criterionId} weight to ${data.proposedWeight}%`,
    reason: data.reason,
    status: 'pending',
    proposedAt: new Date().toISOString(),
    currentWeights,
    proposedWeights,
  };

  const updatedDecision: DecisionState = {
    ...decision,
    pendingActions: [newAction, ...decision.pendingActions],
    updatedAt: new Date().toISOString(),
  };

  const items = getLocalDecisions();
  const index = items.findIndex((d) => d.id === id);
  if (index >= 0) items[index] = updatedDecision;
  else items.unshift(updatedDecision);
  saveLocalDecisions(items);

  addLocalActivity(id, {
    actor: 'ProofPilot agent',
    action: 'Proposed weight change',
    detail: `${newAction.title} · awaiting human approval`,
  });

  return newAction;
}

export function resolveActionStore(id: string, actionId: string, resolution: 'approved' | 'rejected'): DecisionState {
  const decision = getDecisionStore(id);
  const action = decision.pendingActions.find((a) => a.id === actionId);

  const updatedActions = decision.pendingActions.map((a) =>
    a.id === actionId ? { ...a, status: resolution } : a
  );

  let updatedCriteria = decision.criteria;
  let updatedStatus = decision.status;

  const isDecisionProposal = action?.type === 'decision_proposal' || Boolean(action?.proposedOptionId);

  if (resolution === 'approved') {
    if (action?.proposedWeights) {
      const proposedWeights = action.proposedWeights;
      updatedCriteria = decision.criteria.map((c) => ({
        ...c,
        weight: proposedWeights[c.id] ?? c.weight,
      }));
    } else if (isDecisionProposal) {
      updatedStatus = 'Decided';
    }
  }

  let updatedRec = calculateRecommendation(decision.options, updatedCriteria, decision.evidence);

  if (resolution === 'approved' && isDecisionProposal) {
    const targetOptionId = action?.proposedOptionId || decision.options.find((o) => action?.title.includes(o.name))?.id;
    const targetOption = decision.options.find((o) => o.id === targetOptionId);
    if (targetOption) {
      const optionScore = Math.round(
        updatedCriteria.reduce((acc, c) => acc + (targetOption.scores?.[c.id] ?? 70) * (c.weight / 100), 0) * 10
      ) / 10;
      updatedRec = {
        ...updatedRec,
        optionId: targetOption.id,
        optionName: targetOption.name,
        score: optionScore,
        why: [
          `Formally committed as final decision choice following human sign-off.`,
          `${targetOption.name} was approved over competing options by human decision owner.`,
          ...updatedRec.why.filter((w) => !w.startsWith('Formally committed')),
        ],
      };
    }
  }

  const updatedDecision: DecisionState = {
    ...decision,
    criteria: updatedCriteria,
    status: updatedStatus,
    recommendation: updatedRec,
    pendingActions: updatedActions,
    updatedAt: new Date().toISOString(),
  };

  const items = getLocalDecisions();
  const index = items.findIndex((d) => d.id === id);
  if (index >= 0) items[index] = updatedDecision;
  else items.unshift(updatedDecision);
  saveLocalDecisions(items);

  addLocalActivity(id, {
    actor: 'Madhavan',
    action: resolution === 'approved' ? 'Approved proposal' : 'Rejected proposal',
    detail: action?.title ?? 'Proposal resolution',
  });

  return updatedDecision;
}

export function proposeDecisionStore(id: string, data: { optionId: string; reason: string }): PendingAction {
  const decision = getDecisionStore(id);
  const option = decision.options.find((o) => o.id === data.optionId);
  const newAction: PendingAction = {
    id: `action-${Date.now()}`,
    type: 'decision_proposal',
    title: `Select ${option?.name ?? data.optionId} as final decision choice`,
    reason: data.reason,
    status: 'pending',
    proposedAt: new Date().toISOString(),
    proposedOptionId: data.optionId,
  };

  const updatedDecision: DecisionState = {
    ...decision,
    pendingActions: [newAction, ...decision.pendingActions],
    updatedAt: new Date().toISOString(),
  };

  const items = getLocalDecisions();
  const index = items.findIndex((d) => d.id === id);
  if (index >= 0) items[index] = updatedDecision;
  else items.unshift(updatedDecision);
  saveLocalDecisions(items);

  addLocalActivity(id, {
    actor: 'ProofPilot agent',
    action: 'Proposed decision selection',
    detail: `${newAction.title} · awaiting human sign-off`,
  });

  return newAction;
}

export function updateAssumptionsStore(id: string, assumptions: any[]): DecisionState {
  const decision = getDecisionStore(id);
  const updatedDecision: DecisionState = {
    ...decision,
    assumptions,
    updatedAt: new Date().toISOString(),
  };

  const items = getLocalDecisions();
  const index = items.findIndex((d) => d.id === id);
  if (index >= 0) items[index] = updatedDecision;
  else items.unshift(updatedDecision);
  saveLocalDecisions(items);

  addLocalActivity(id, {
    actor: 'Madhavan',
    action: 'Updated assumptions register',
    detail: `${assumptions.length} active decision assumptions saved.`,
  });

  return updatedDecision;
}

export function generateSensitivityStore(id: string, criterionId = 'privacy'): SensitivityAnalysis {
  const decision = getDecisionStore(id);
  const criterion = decision.criteria.find((c) => c.id === criterionId) ?? decision.criteria[0];
  const critName = criterion?.name ?? 'Primary criterion';

  const basePoints = [10, 25, 35, 45, 50];
  const points = basePoints.map((weight) => {
    const customWeights: Record<string, number> = {};
    const otherCriteria = decision.criteria.filter((c) => c.id !== (criterion?.id ?? ''));
    const oldOthersTotal = otherCriteria.reduce((sum, c) => sum + c.weight, 0) || 1;
    const remaining = 100 - weight;

    if (criterion) customWeights[criterion.id] = weight;
    otherCriteria.forEach((c) => {
      customWeights[c.id] = Math.round((c.weight / oldOthersTotal) * remaining);
    });

    const tempRec = calculateRecommendation(decision.options, decision.criteria.map((c) => ({ ...c, weight: customWeights[c.id] ?? c.weight })), decision.evidence);
    const optionScores: Record<string, number> = {};
    decision.options.forEach((opt) => {
      let sum = 0;
      decision.criteria.forEach((c) => {
        sum += (opt.scores?.[c.id] ?? 70) * ((customWeights[c.id] ?? c.weight) / 100);
      });
      optionScores[opt.name] = Math.round(sum * 10) / 10;
    });

    return {
      weight,
      winner: tempRec.optionName,
      scores: optionScores,
    };
  });

  return {
    criterionName: critName,
    stable: false,
    summary: `${decision.recommendation.optionName} is recommended at current weights. Adjusting ${critName} alters option ranking.`,
    points,
  };
}
