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
  description: 'Select a coding companion for the product engineering team. The choice needs to balance developer speed with code ownership, security, and long-term flexibility.',
  owner: 'Maya Chen',
  status: 'in_review',
  updatedAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
  options: [
    { id: 'cursor', name: 'Cursor', shortName: 'CUR', description: 'AI-first editor built on a familiar VS Code foundation.', website: 'cursor.com', scores: { velocity: 91, security: 74, ownership: 82, flexibility: 88 } },
    { id: 'copilot', name: 'GitHub Copilot', shortName: 'GHC', description: 'The embedded assistant with the broadest GitHub workflow fit.', website: 'github.com/features/copilot', scores: { velocity: 84, security: 81, ownership: 76, flexibility: 79 } },
    { id: 'continue', name: 'Continue', shortName: 'CON', description: 'Open-source assistant with model choice and local control.', website: 'continue.dev', scores: { velocity: 71, security: 89, ownership: 95, flexibility: 94 } },
  ],
  criteria: [
    { id: 'velocity', name: 'Developer velocity', weight: 35, color: '#d9a441' },
    { id: 'security', name: 'Security posture', weight: 28, color: '#3e8b83' },
    { id: 'ownership', name: 'Code ownership', weight: 22, color: '#7887b7' },
    { id: 'flexibility', name: 'Model flexibility', weight: 15, color: '#b87967' },
  ],
  evidence: [
    { id: 'ev-1', title: 'Independent benchmark: Cursor leads on edit acceptance', source: 'The Pragmatic Engineer', url: 'newsletter.pragmaticengineer.com', claim: 'Cursor users completed multi-file changes with fewer context switches in a 2024 field study.', summary: 'Strong directional signal for velocity, but the study used a small team sample.', sourceType: 'independent research', supportsOptionId: 'cursor', contradictsOptionId: null, confidence: 86, reliability: 78, addedBy: 'ProofPilot agent', status: 'verified' },
    { id: 'ev-2', title: 'Enterprise data controls updated', source: 'GitHub Trust Center', url: 'github.com/trust', claim: 'Copilot Business offers policy controls and data isolation for organizational deployments.', summary: 'Primary vendor documentation confirms controls; implementation still needs review.', sourceType: 'vendor documentation', supportsOptionId: 'copilot', contradictsOptionId: null, confidence: 91, reliability: 84, addedBy: 'ProofPilot agent', status: 'verified' },
    { id: 'ev-3', title: 'Local model support reduces lock-in', source: 'Continue documentation', url: 'docs.continue.dev', claim: 'Continue supports self-hosted and local models with open configuration.', summary: 'A credible ownership advantage, with a meaningful setup and maintenance tax.', sourceType: 'technical documentation', supportsOptionId: 'continue', contradictsOptionId: 'cursor', confidence: 94, reliability: 88, addedBy: 'ProofPilot agent', status: 'verified' },
    { id: 'ev-4', title: 'Editor adoption friction remains visible', source: 'Internal developer interviews', url: null, claim: 'Five of eight engineers found a second editor disruptive to their existing workflow.', summary: 'Internal qualitative evidence tempers the raw feature comparison.', sourceType: 'internal research', supportsOptionId: 'cursor', contradictsOptionId: 'continue', confidence: 72, reliability: 70, addedBy: 'Maya Chen', status: 'needs review' },
  ],
  findings: [
    { id: 'finding-1', kind: 'signal', title: 'Cursor has the clearest speed lead', detail: 'Its 91 velocity score is 7 points above the next option, supported by independent field evidence.', severity: 'positive', evidenceIds: ['ev-1'] },
    { id: 'finding-2', kind: 'tension', title: 'The recommendation is sensitive to ownership', detail: 'If code ownership rises above 34%, Continue becomes the likely winner.', severity: 'attention', evidenceIds: ['ev-3', 'ev-4'] },
    { id: 'finding-3', kind: 'gap', title: 'Security evidence is uneven', detail: 'Vendor claims are strong, but no comparable third-party review covers all three options.', severity: 'warning', evidenceIds: ['ev-2'] },
  ],
  recommendation: {
    optionId: 'cursor',
    optionName: 'Cursor',
    score: 84.4,
    evidenceConfidence: 82,
    why: ['Leads on developer velocity by a meaningful margin.', 'Keeps the team in a familiar VS Code-shaped environment.', 'Has enough flexibility to avoid a hard commitment today.'],
    whatCouldChange: 'A security review that materially downgrades Cursor, or a decision to prioritize code ownership above delivery speed, would change the recommendation.',
  },
  pendingActions: [
    { id: 'action-1', type: 'weight_change', title: 'Raise code ownership from 22% to 36%', reason: 'The team discussion emphasized long-term model independence more than the current criteria show.', status: 'pending', proposedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), currentWeights: { velocity: 35, security: 28, ownership: 22, flexibility: 15 }, proposedWeights: { velocity: 29, security: 25, ownership: 36, flexibility: 10 } },
  ],
};

export const demoSummary: DecisionSummary = {
  id: DEMO_ID, title: demoDecision.title, status: demoDecision.status, recommendation: demoDecision.recommendation.optionName, confidence: demoDecision.recommendation.evidenceConfidence, updatedAt: demoDecision.updatedAt,
};

export const demoActivity: ActivityEntry[] = [
  { id: 'act-1', actor: 'ProofPilot agent', action: 'Flagged a sensitivity', detail: 'Recommendation changes if code ownership weight exceeds 34%.', timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString() },
  { id: 'act-2', actor: 'Maya Chen', action: 'Added evidence', detail: 'Internal developer interviews · 8 participants', timestamp: new Date(Date.now() - 1000 * 60 * 19).toISOString() },
  { id: 'act-3', actor: 'ProofPilot agent', action: 'Proposed a weight change', detail: 'Raise code ownership from 22% to 36% · awaiting approval', timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: 'act-4', actor: 'ProofPilot agent', action: 'Recalculated recommendation', detail: 'Cursor remains the leading option at 84.4 weighted score.', timestamp: new Date(Date.now() - 1000 * 60 * 34).toISOString() },
  { id: 'act-5', actor: 'Maya Chen', action: 'Opened the workspace', detail: 'Review session started from the Engineering decisions collection.', timestamp: new Date(Date.now() - 1000 * 60 * 41).toISOString() },
];

export const demoSensitivity: SensitivityAnalysis = {
  criterionName: 'Code ownership',
  stable: false,
  summary: 'Cursor is the recommendation at current weights. Continue takes the lead when ownership becomes the dominant priority.',
  points: [
    { weight: 15, winner: 'Cursor', scores: { Cursor: 84.9, 'GitHub Copilot': 81.2, Continue: 77.7 } },
    { weight: 22, winner: 'Cursor', scores: { Cursor: 84.4, 'GitHub Copilot': 80.4, Continue: 78.8 } },
    { weight: 28, winner: 'Cursor', scores: { Cursor: 83.7, 'GitHub Copilot': 79.7, Continue: 80.2 } },
    { weight: 34, winner: 'Cursor', scores: { Cursor: 82.9, 'GitHub Copilot': 78.9, Continue: 81.9 } },
    { weight: 36, winner: 'Continue', scores: { Cursor: 82.3, 'GitHub Copilot': 78.3, Continue: 82.6 } },
    { weight: 45, winner: 'Continue', scores: { Cursor: 80.8, 'GitHub Copilot': 77.2, Continue: 84.4 } },
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