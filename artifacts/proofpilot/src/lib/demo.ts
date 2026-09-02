import type {
  ActivityEntry,
  DecisionState,
  DecisionSummary,
  SensitivityAnalysis,
} from '@workspace/api-client-react';

export const DEMO_ID = 'demo-ai-assistant';

export const demoDecision: DecisionState = {
  id: DEMO_ID,
  title: 'Choose the next AI coding assistant',
  description: 'Select an AI coding companion for the engineering team. The choice balances developer experience with team adoption, enterprise privacy, and cost to scale.',
  owner: 'Madhavan',
  status: 'Human Review',
  updatedAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
  options: [
    {
      id: 'cursor',
      name: 'Cursor',
      shortName: 'Cursor',
      description: 'AI-first editor with fast codebase context and focused multi-file workflow.',
      website: 'https://cursor.com',
      scores: { 'developer-experience': 95, 'team-adoption': 78, privacy: 45, cost: 68 },
    },
    {
      id: 'copilot',
      name: 'GitHub Copilot',
      shortName: 'Copilot',
      description: 'The familiar pair programmer with broad editor coverage and GitHub integration.',
      website: 'https://github.com/features/copilot',
      scores: { 'developer-experience': 84, 'team-adoption': 92, privacy: 62, cost: 78 },
    },
    {
      id: 'gemini',
      name: 'Gemini Code Assist',
      shortName: 'Gemini',
      description: 'Google coding assistant with strong enterprise controls and generous tiering.',
      website: 'https://cloud.google.com/gemini/docs/codeassist/overview',
      scores: { 'developer-experience': 70, 'team-adoption': 74, privacy: 78, cost: 86 },
    },
  ],
  criteria: [
    { id: 'developer-experience', name: 'Developer experience', weight: 35, color: '#6d5dfc' },
    { id: 'team-adoption', name: 'Team adoption', weight: 25, color: '#22a6a1' },
    { id: 'privacy', name: 'Privacy & control', weight: 25, color: '#ef9b4b' },
    { id: 'cost', name: 'Cost to scale', weight: 15, color: '#e56b8b' },
  ],
  evidence: [
    {
      id: 'ev-1',
      title: 'Workspace-aware context indexing',
      source: 'Cursor product documentation',
      url: 'https://cursor.com/features',
      claim: 'Cursor indexes the codebase to provide context-aware edits across files.',
      summary: 'Strong fit for engineering teams that value speed in large repositories.',
      sourceType: 'Product documentation',
      supportsOptionId: 'cursor',
      contradictsOptionId: null,
      confidence: 90,
      reliability: 76,
      addedBy: 'ProofPilot agent',
      status: 'Approved',
    },
    {
      id: 'ev-2',
      title: 'Existing GitHub workflow fit',
      source: 'GitHub Copilot documentation',
      url: 'https://docs.github.com/en/copilot',
      claim: 'Copilot integrates seamlessly into existing GitHub pull request and IDE workflows.',
      summary: 'Lower adoption friction for GitHub-centered engineering orgs.',
      sourceType: 'Product documentation',
      supportsOptionId: 'copilot',
      contradictsOptionId: null,
      confidence: 88,
      reliability: 84,
      addedBy: 'ProofPilot agent',
      status: 'Approved',
    },
    {
      id: 'ev-3',
      title: 'Enterprise data & governance controls',
      source: 'Google Cloud documentation',
      url: 'https://cloud.google.com/gemini/docs/codeassist/overview',
      claim: 'Gemini Code Assist offers enterprise administration and data governance controls.',
      summary: 'Advantage when privacy and centralized controls dominate organizational criteria.',
      sourceType: 'Public documentation',
      supportsOptionId: 'gemini',
      contradictsOptionId: null,
      confidence: 86,
      reliability: 82,
      addedBy: 'ProofPilot agent',
      status: 'Approved',
    },
    {
      id: 'ev-4',
      title: 'Internal developer interviews on privacy',
      source: 'Internal procurement notes',
      url: null,
      claim: 'Five of eight tech leads requested strict zero data-retention guarantees.',
      summary: 'Internal qualitative research highlights privacy as a potential blocker.',
      sourceType: 'Internal research',
      supportsOptionId: 'gemini',
      contradictsOptionId: 'cursor',
      confidence: 75,
      reliability: 72,
      addedBy: 'Madhavan',
      status: 'Needs review',
    },
  ],
  findings: [
    {
      id: 'finding-1',
      kind: 'signal',
      title: 'GitHub Copilot leads on weighted scorecard',
      detail: 'Its 80.7 weighted score leads by combining strong developer experience (84) with high team adoption (92).',
      severity: 'positive',
      evidenceIds: ['ev-2'],
    },
    {
      id: 'finding-2',
      kind: 'tension',
      title: 'Recommendation is sensitive to Privacy & control',
      detail: 'If Privacy & control weight rises above 40%, Gemini Code Assist becomes the top-ranked option.',
      severity: 'attention',
      evidenceIds: ['ev-3', 'ev-4'],
    },
    {
      id: 'finding-3',
      kind: 'gap',
      title: 'Cost evidence requires enterprise seat quote',
      detail: 'List pricing is clear, but volume pricing at >50 seats needs vendor confirmation.',
      severity: 'warning',
      evidenceIds: [],
    },
  ],
  recommendation: {
    optionId: 'copilot',
    optionName: 'GitHub Copilot',
    score: 80.7,
    evidenceConfidence: 85,
    why: [
      'Leads at 80.7 weighted score across current criteria priorities.',
      'Strongest alignment with team adoption (92/100) and workflow fit.',
      'Supported by verified product documentation and internal trial data.',
    ],
    whatCouldChange: 'A shift in privacy requirements above 40% weight would make Gemini Code Assist the recommended choice.',
  },
  pendingActions: [
    {
      id: 'action-1',
      type: 'weight_change',
      title: 'Raise Privacy & control from 25% to 45%',
      reason: 'Enterprise data retention policies carry higher weight following security review.',
      status: 'Pending',
      proposedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      currentWeights: { 'developer-experience': 35, 'team-adoption': 25, privacy: 25, cost: 15 },
      proposedWeights: { 'developer-experience': 25, 'team-adoption': 15, privacy: 45, cost: 15 },
    },
  ],
  assumptions: [
    { id: 'asm-1', statement: 'Copilot data privacy policy covers enterprise repositories.', status: 'validated', owner: 'Madhavan' },
    { id: 'asm-2', statement: 'Gemini enterprise tier includes centralized data isolation.', status: 'unverified', owner: 'Madhavan' },
  ],
};

export const demoSummary: DecisionSummary = {
  id: DEMO_ID,
  title: demoDecision.title,
  status: demoDecision.status,
  recommendation: demoDecision.recommendation.optionName,
  confidence: demoDecision.recommendation.evidenceConfidence,
  updatedAt: demoDecision.updatedAt,
};

export const demoActivity: ActivityEntry[] = [
  { id: 'act-1', actor: 'ProofPilot agent', action: 'Flagged a sensitivity', detail: 'Recommendation changes if Privacy & control weight exceeds 40%.', timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString() },
  { id: 'act-2', actor: 'Madhavan', action: 'Added evidence', detail: 'Internal developer interviews on privacy · 8 tech leads', timestamp: new Date(Date.now() - 1000 * 60 * 19).toISOString() },
  { id: 'act-3', actor: 'ProofPilot agent', action: 'Proposed a weight change', detail: 'Raise Privacy & control from 25% to 45% · awaiting human approval', timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: 'act-4', actor: 'ProofPilot agent', action: 'Recalculated recommendation', detail: 'GitHub Copilot leads at 80.7 weighted score.', timestamp: new Date(Date.now() - 1000 * 60 * 34).toISOString() },
  { id: 'act-5', actor: 'Madhavan', action: 'Opened the workspace', detail: 'Review session started from Engineering decisions collection.', timestamp: new Date(Date.now() - 1000 * 60 * 41).toISOString() },
];

export const demoSensitivity: SensitivityAnalysis = {
  criterionName: 'Privacy & control',
  stable: false,
  summary: 'GitHub Copilot is recommended at current weights. Gemini Code Assist takes the lead when Privacy & control becomes the dominant priority.',
  points: [
    { weight: 10, winner: 'GitHub Copilot', scores: { Cursor: 79.2, 'GitHub Copilot': 82.7, 'Gemini Code Assist': 73.6 } },
    { weight: 25, winner: 'GitHub Copilot', scores: { Cursor: 74.1, 'GitHub Copilot': 79.6, 'Gemini Code Assist': 74.3 } },
    { weight: 35, winner: 'GitHub Copilot', scores: { Cursor: 70.7, 'GitHub Copilot': 77.5, 'Gemini Code Assist': 74.7 } },
    { weight: 45, winner: 'Gemini Code Assist', scores: { Cursor: 67.3, 'GitHub Copilot': 75.4, 'Gemini Code Assist': 75.2 } },
    { weight: 50, winner: 'Gemini Code Assist', scores: { Cursor: 65.6, 'GitHub Copilot': 74.4, 'Gemini Code Assist': 75.4 } },
  ],
};

export function formatRelative(date: string) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}