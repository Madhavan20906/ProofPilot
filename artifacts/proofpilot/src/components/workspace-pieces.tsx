import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  FileSearch,
  Fingerprint,
  GitBranch,
  HelpCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DecisionState, Evidence, PendingAction, SensitivityAnalysis } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/demo';
import { updateAssumptionsStore } from '@/lib/store';

export function ScorePill({ value, emphasized = false }: { value: number; emphasized?: boolean }) {
  return <span className={cn('font-mono text-[11px] font-semibold', emphasized ? 'text-[#a97922]' : 'text-foreground/65')}>{value.toFixed(1)}</span>;
}

export function DecisionHero({ decision, onAnalyze, isAnalyzing }: { decision: DecisionState; onAnalyze: () => void; isAnalyzing: boolean }) {
  const recommendation = decision.recommendation;
  return (
    <section className="relative overflow-hidden border-b border-border bg-card px-5 py-8 md:px-10 md:py-11">
      <div className="absolute right-[-75px] top-[-130px] h-[330px] w-[330px] rounded-full border border-[#d9a441]/20" />
      <div className="absolute right-[-30px] top-[-85px] h-[230px] w-[230px] rounded-full border border-[#d9a441]/20" />
      <div className="relative max-w-[1120px]">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.12em]',
              decision.status === 'Decided' || decision.status === 'Finalized'
                ? 'border-[#32786e]/40 bg-[#e7f1ed] text-[#32786e]'
                : 'border-[#4e9b8f]/35 bg-[#4e9b8f]/10 text-[#32786e]'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', decision.status === 'Decided' || decision.status === 'Finalized' ? 'bg-[#32786e]' : 'bg-[#4e9b8f]')} />
            {decision.status === 'Decided' || decision.status === 'Finalized' ? 'Decided · Finalized' : 'In review'}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">updated {formatRelative(decision.updatedAt)}</span>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1fr_330px] lg:items-end">
          <div>
            <h1 data-testid="text-decision-title" className="max-w-[680px] font-display text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[.98] tracking-[-.055em] text-foreground">
              {decision.title}
            </h1>
            <p data-testid="text-decision-description" className="mt-5 max-w-[650px] text-[14px] leading-7 text-muted-foreground">
              {decision.description}
            </p>
            <div className="mt-6 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><UserRound size={14} /> {decision.owner ?? 'Unassigned'}</span>
              <span className="text-border">·</span>
              <span className="font-mono">ID {decision.id.slice(0, 18)}</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#d9a441]/40 bg-[#fbf4df] p-5 shadow-[0_12px_32px_-18px_rgba(121,83,17,.35)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[.18em] text-[#896724]">
                <Target size={13} /> Current recommendation
              </div>
              <span className="font-mono text-[10px] text-[#896724]/65">{recommendation.evidenceConfidence}% evidence confidence</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div data-testid="text-recommendation-option" className="font-display text-[27px] font-semibold tracking-[-.04em] text-[#27354a]">
                  {recommendation.optionName}
                </div>
                <div className="mt-1 text-[11px] text-[#896724]">weighted score {recommendation.score.toFixed(1)}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-[32px] font-semibold tracking-[-.06em] text-[#a97922]">
                  {recommendation.evidenceConfidence}<span className="text-[16px]">%</span>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[.1em] text-[#896724]/70">confidence</div>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e6d7ad]">
              <div className="h-full rounded-full bg-[#c79532]" style={{ width: `${recommendation.evidenceConfidence}%` }} />
            </div>
          </div>
        </div>
        <button
          type="button"
          data-testid="button-analyze-decision"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="mt-7 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[11px] font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60"
        >
          <ScanSearch size={15} /> {isAnalyzing ? 'Recalculating signals…' : 'Recalculate recommendation'} <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}

export function OptionMatrix({ decision }: { decision: DecisionState }) {
  const [selected, setSelected] = useState(decision.recommendation.optionId);
  useEffect(() => {
    setSelected(decision.recommendation.optionId);
  }, [decision.recommendation.optionId]);

  return (
    <section className="animate-rise-in border-b border-border bg-background px-5 py-8 md:px-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-[-.03em]">The choice, in view</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">Weighted against the priorities your team set.</p>
        </div>
        <span className="hidden font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground/60 md:block">01 / options</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {decision.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              type="button"
              key={option.id}
              data-testid={`button-option-${option.id}`}
              onClick={() => setSelected(option.id)}
              className={cn(
                'group relative text-left rounded-xl border p-4 transition duration-200',
                isSelected ? 'border-[#d1a145] bg-[#fbf4df] shadow-[0_9px_26px_-19px_rgba(121,83,17,.45)]' : 'border-border bg-card hover:-translate-y-0.5 hover:border-[#c8b987]'
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg font-mono text-[10px] font-semibold', isSelected ? 'bg-[#d9a441] text-[#26354b]' : 'bg-secondary text-muted-foreground')}>
                  {option.shortName}
                </span>
                <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border', isSelected ? 'border-[#b1832f] bg-[#d9a441] text-[#26354b]' : 'border-border text-transparent')}>
                  <Check size={12} strokeWidth={3} />
                </div>
              </div>
              <div className="mt-4 font-display text-[18px] font-semibold tracking-[-.03em]">{option.name}</div>
              <p className="mt-1 min-h-[36px] text-[11px] leading-5 text-muted-foreground">{option.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/70 pt-3">
                {decision.criteria.map((criterion) => (
                  <div key={criterion.id} className="flex items-center justify-between text-[10px]">
                    <span className="truncate text-muted-foreground">{criterion.name}</span>
                    <span className="font-mono font-semibold">{option.scores[criterion.id] ?? 0}</span>
                  </div>
                ))}
              </div>
              <div className={cn('absolute bottom-0 left-4 right-4 h-[2px] origin-left rounded-full transition-transform', isSelected ? 'scale-x-100 bg-[#d9a441]' : 'scale-x-0 bg-border group-hover:scale-x-100')} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ScenarioSelector({ onApplyScenario }: { onApplyScenario: (weights: Record<string, number>) => void }) {
  const scenarios = [
    {
      id: 'enterprise-privacy',
      name: 'Enterprise Privacy-First',
      weights: { privacy: 50, 'developer-experience': 20, 'team-adoption': 15, cost: 15 },
    },
    {
      id: 'developer-velocity',
      name: 'Developer Velocity',
      weights: { 'developer-experience': 60, 'team-adoption': 20, privacy: 10, cost: 10 },
    },
    {
      id: 'cost-optimized',
      name: 'Cost-Optimized',
      weights: { cost: 45, 'developer-experience': 25, 'team-adoption': 15, privacy: 15 },
    },
    {
      id: 'balanced',
      name: 'Balanced Scorecard',
      weights: { 'developer-experience': 25, 'team-adoption': 25, privacy: 25, cost: 25 },
    },
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
      <span className="font-mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">Scenario presets:</span>
      {scenarios.map((sc) => (
        <button
          key={sc.id}
          type="button"
          data-testid={`button-scenario-${sc.id}`}
          onClick={() => onApplyScenario(sc.weights)}
          className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-[10px] font-semibold text-foreground/80 hover:border-[#d9a441] hover:bg-[#fbf4df] hover:text-[#896724]"
        >
          {sc.name}
        </button>
      ))}
    </div>
  );
}

export function PriorityEditor({ decision, onCommit, isSaving }: { decision: DecisionState; onCommit: (weights: Record<string, number>) => void; isSaving: boolean }) {
  const initialWeights = Object.fromEntries(decision.criteria.map((criterion) => [criterion.id, criterion.weight]));
  const [weights, setWeights] = useState<Record<string, number>>(initialWeights);
  useEffect(() => setWeights(initialWeights), [decision.criteria]);
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);

  const updateWeight = (criterionId: string, nextValue: number) => {
    const others = decision.criteria.filter((criterion) => criterion.id !== criterionId);
    const otherTotal = others.reduce((sum, criterion) => sum + (weights[criterion.id] ?? criterion.weight), 0);
    const remaining = 100 - nextValue;
    const next = Object.fromEntries(
      decision.criteria.map((criterion) => {
        if (criterion.id === criterionId) return [criterion.id, nextValue];
        const current = weights[criterion.id] ?? criterion.weight;
        return [criterion.id, otherTotal === 0 ? remaining / Math.max(1, others.length) : Math.round((current / otherTotal) * remaining)];
      })
    );
    const roundedTotal = Object.values(next).reduce((sum, value) => sum + value, 0);
    const lastOther = others[others.length - 1];
    if (lastOther && lastOther.id && next[lastOther.id] !== undefined) {
      next[lastOther.id] += 100 - roundedTotal;
    }
    setWeights(next);
  };

  return (
    <section className="border-b border-border bg-card px-5 py-8 md:px-10">
      <div className="mx-auto max-w-[1120px] rounded-xl border border-border bg-background p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">
              <SlidersHorizontal size={13} className="text-[#b1832f]" /> Human priorities
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-[-.03em]">What matters most?</h2>
            <p className="mt-2 max-w-[560px] text-[11px] leading-5 text-muted-foreground">
              Move a priority slider or choose a scenario preset. ProofPilot rebalances to 100% and recalculates the recommendation.
            </p>
          </div>
          <div className={cn('rounded-lg px-3 py-2 font-mono text-[10px]', Math.abs(total - 100) < 0.01 ? 'bg-[#e7f1ed] text-[#32786e]' : 'bg-[#f7e5e1] text-[#ae4e43]')}>
            {Math.round(total)}% allocated
          </div>
        </div>

        <ScenarioSelector onApplyScenario={(presetWeights) => setWeights(presetWeights)} />

        <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
          {decision.criteria.map((criterion) => (
            <label key={criterion.id} className="block">
              <div className="mb-2 flex items-center justify-between gap-3 text-[11px]">
                <span className="font-semibold">{criterion.name}</span>
                <span className="font-mono text-muted-foreground">{weights[criterion.id] ?? criterion.weight}%</span>
              </div>
              <input
                aria-label={`${criterion.name} weight`}
                data-testid={`input-weight-${criterion.id}`}
                type="range"
                min="0"
                max="70"
                step="1"
                value={weights[criterion.id] ?? criterion.weight}
                onChange={(event) => updateWeight(criterion.id, Number(event.target.value))}
                className="w-full accent-[#b1832f]"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] text-muted-foreground">Human edits stay visible in the audit trail.</span>
          <button
            type="button"
            data-testid="button-save-priorities"
            disabled={isSaving || Math.abs(total - 100) > 0.01}
            onClick={() => onCommit(weights)}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[11px] font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isSaving ? 'Recalculating…' : <><Check size={14} /> Save priorities</>}
          </button>
        </div>
      </div>
    </section>
  );
}

export function WhyPanel({ decision }: { decision: DecisionState }) {
  const rec = decision.recommendation;

  const optionScores = (decision.options || [])
    .map((opt) => {
      const total = (decision.criteria || []).reduce(
        (sum, c) => sum + (opt.scores?.[c.id] ?? 0) * (c.weight / 100),
        0
      );
      return { ...opt, score: total };
    })
    .sort((a, b) => b.score - a.score);

  const topScore = optionScores[0]?.score ?? rec.score ?? 0;
  const runnerUpScore = optionScores[1]?.score ?? 0;
  const leadGap = Math.max(0, topScore - runnerUpScore);
  const confidence = rec.evidenceConfidence ?? 75;

  let stabilityLabel = 'moderate';
  let stableWidth = 50;
  let swingWidth = 25;
  let fragileWidth = 25;

  if (leadGap >= 6.5 && confidence >= 80) {
    stabilityLabel = 'high';
    stableWidth = Math.min(85, Math.round(65 + leadGap * 2));
    swingWidth = Math.round((100 - stableWidth) * 0.6);
    fragileWidth = 100 - stableWidth - swingWidth;
  } else if (leadGap < 3.5 || confidence < 65) {
    stabilityLabel = 'fragile';
    stableWidth = Math.max(15, Math.round(leadGap * 6));
    swingWidth = Math.round((100 - stableWidth) * 0.5);
    fragileWidth = 100 - stableWidth - swingWidth;
  } else {
    stabilityLabel = 'moderate';
    stableWidth = Math.round(40 + leadGap * 2.5);
    swingWidth = Math.round((100 - stableWidth) * 0.55);
    fragileWidth = 100 - stableWidth - swingWidth;
  }

  return (
    <section className="grid gap-5 border-b border-border bg-background px-5 py-8 md:px-10 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">02 / reasoning trace</div>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-[-.03em]">Why this recommendation?</h2>
          </div>
          <Sparkles size={19} className="text-[#b1832f]" />
        </div>
        <div className="space-y-0">
          {rec.why.map((reason, index) => (
            <div key={reason} className="flex gap-4 border-t border-border/70 py-4 first:border-0 first:pt-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9dcb8] font-mono text-[10px] font-semibold text-[#876921]">
                0{index + 1}
              </div>
              <p className="text-[12px] leading-6 text-foreground/75">{reason}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-[#eef4f0] p-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#32786e]">
            <Fingerprint size={13} /> Evidence confidence
          </div>
          <p className="text-[11px] leading-5 text-[#397269]">
            Confidence is based on source reliability, claim specificity, and agreement across evidence—not model certainty.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e1c98c] bg-[#fcf6e7] p-5 md:p-6">
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.17em] text-[#896724]">
          <AlertTriangle size={13} /> Boundary condition
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-[-.03em] text-[#27354a]">What could change it?</h2>
        <p className="mt-3 text-[12px] leading-6 text-[#725b2e]">{rec.whatCouldChange}</p>
        <div className="mt-6 border-t border-[#e4d3a5] pt-4">
          <div className="flex items-center justify-between text-[10px] font-semibold text-[#725b2e]">
            <span>Stability under current priorities</span>
            <span className="font-mono">{stabilityLabel}</span>
          </div>
          <div className="mt-3 flex h-2 gap-1">
            <span style={{ width: `${stableWidth}%` }} className="rounded-l bg-[#d9a441]" />
            <span style={{ width: `${swingWidth}%` }} className="bg-[#e2c984]" />
            <span style={{ width: `${fragileWidth}%` }} className="rounded-r bg-[#f0e6c9]" />
          </div>
          <div className="mt-3 flex justify-between font-mono text-[9px] text-[#896724]/70">
            <span>fragile</span>
            <span>stable</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EvidenceRail({
  decisionId,
  evidence,
  options,
  onRefresh,
}: {
  decisionId: string;
  evidence: Evidence[];
  options: DecisionState['options'];
  onRefresh: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (evidenceId: string, nextStatus: string) => {
    setUpdatingId(evidenceId);
    try {
      await fetch(`/api/decisions/${decisionId}/evidence/${evidenceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      onRefresh();
    } catch {
      // safe fallback
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="border-b border-border bg-card px-5 py-8 md:px-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">03 / source room</div>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-[-.03em]">Evidence that moves the call</h2>
        </div>
        <button
          type="button"
          data-testid="button-toggle-evidence"
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9a7224] hover:text-primary"
        >
          {showAll ? 'Show less' : `View all ${evidence.length}`}{' '}
          <ChevronRight size={14} className={cn('transition-transform', showAll && 'rotate-90')} />
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {evidence.slice(0, showAll ? evidence.length : 4).map((item) => {
          const supporting = options.find((opt) => opt.id === item.supportsOptionId);
          const isUpdating = updatingId === item.id;
          return (
            <article
              key={item.id}
              data-testid={`card-evidence-${item.id}`}
              className="group rounded-xl border border-border bg-background p-4 transition hover:border-[#c8b987]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md font-mono text-[10px] font-bold',
                      item.status === 'Approved'
                        ? 'bg-[#e7f1ed] text-[#32786e]'
                        : item.status === 'Rejected'
                        ? 'bg-[#f7e5e1] text-[#ae4e43]'
                        : 'bg-[#f7ead0] text-[#a97922]'
                    )}
                  >
                    <FileSearch size={14} />
                  </span>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{item.sourceType}</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-foreground/75">{item.source}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{item.confidence}% confidence</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase',
                      item.status === 'Approved'
                        ? 'bg-[#e7f1ed] text-[#32786e]'
                        : item.status === 'Rejected'
                        ? 'bg-[#f7e5e1] text-[#ae4e43]'
                        : 'bg-[#f7ead0] text-[#a97922]'
                    )}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              <h3 className="mt-4 text-[12px] font-bold leading-5">{item.title}</h3>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{item.summary}</p>

              {/* Status Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4e9b8f]" /> supports {supporting?.name ?? 'the decision'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid={`button-approve-evidence-${item.id}`}
                    disabled={isUpdating || item.status === 'Approved'}
                    onClick={() => handleStatusChange(item.id, 'Approved')}
                    className="rounded border border-[#32786e]/30 bg-[#e7f1ed] px-2 py-1 font-mono text-[9px] font-bold text-[#32786e] hover:bg-[#32786e] hover:text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    data-testid={`button-reject-evidence-${item.id}`}
                    disabled={isUpdating || item.status === 'Rejected'}
                    onClick={() => handleStatusChange(item.id, 'Rejected')}
                    className="rounded border border-[#ae4e43]/30 bg-[#f7e5e1] px-2 py-1 font-mono text-[9px] font-bold text-[#ae4e43] hover:bg-[#ae4e43] hover:text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    data-testid={`button-challenge-evidence-${item.id}`}
                    disabled={isUpdating || item.status === 'Needs review'}
                    onClick={() => handleStatusChange(item.id, 'Needs review')}
                    className="rounded border border-[#a97922]/30 bg-[#f7ead0] px-2 py-1 font-mono text-[9px] font-bold text-[#a97922] hover:bg-[#a97922] hover:text-white disabled:opacity-50"
                  >
                    Challenge
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function RiskAndAssumptionsPanel({
  decision,
  onRefresh,
  onOpenAddEvidence,
}: {
  decision: DecisionState;
  onRefresh?: () => void;
  onOpenAddEvidence?: () => void;
}) {
  const [tab, setTab] = useState<'risk' | 'assumptions' | 'challenge'>('risk');
  const [challengeActive, setChallengeActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newAssumptionTitle, setNewAssumptionTitle] = useState('');
  const [newAssumptionDetail, setNewAssumptionDetail] = useState('');
  const [showAddAssumption, setShowAddAssumption] = useState(false);

  const defaultAssumptions = [
    { id: 'asm-1', title: 'Developer velocity is top priority', verified: true, detail: 'Weighted at 35% by team consensus.', impact: 'High' },
    { id: 'asm-2', title: 'Public cloud AI endpoints permitted', verified: true, detail: 'Governance permits SOC2 Type II endpoints with zero retention.', impact: 'High' },
    { id: 'asm-3', title: 'Seat pricing scales linearly across 100+ seats', verified: false, detail: 'Enterprise tiers require custom quote verification.', impact: 'Medium' },
    { id: 'asm-4', title: 'Editor switching friction is manageable', verified: false, detail: 'Assumes 80%+ of engineering team willing to adopt Cursor/VS Code.', impact: 'Medium' },
  ];

  const getNormalizedAssumptions = (rawAssumptions?: any[]) => {
    if (rawAssumptions && rawAssumptions.length > 0) {
      return rawAssumptions.map((a: any) => ({
        id: a.id || `asm-${Math.random()}`,
        title: a.title || a.statement || 'Assumption',
        detail: a.detail || 'Context statement',
        verified: a.verified ?? (a.status === 'validated'),
        impact: a.impact || 'Medium',
      }));
    }
    return defaultAssumptions;
  };

  const [assumptions, setAssumptions] = useState(() => getNormalizedAssumptions(decision.assumptions));

  useEffect(() => {
    if (decision.assumptions && decision.assumptions.length > 0) {
      setAssumptions(getNormalizedAssumptions(decision.assumptions));
    }
  }, [decision.assumptions]);

  const saveAssumptions = async (nextAssumptions: typeof assumptions) => {
    setAssumptions(nextAssumptions);
    try {
      if (decision.id) {
        await fetch(`/api/decisions/${decision.id}/assumptions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assumptions: nextAssumptions }),
        });
      }
    } catch (_e) {
      // fallback to store
      updateAssumptionsStore(decision.id, nextAssumptions);
    }
    onRefresh?.();
  };

  const [handledChallenges, setHandledChallenges] = useState<Record<string, boolean>>({});

  const contradictions = decision.findings.filter((f) => f.kind === 'contradiction');
  const gaps = decision.findings.filter((f) => f.kind === 'gap');
  const lowReliabilitySources = decision.evidence.filter((e) => e.reliability < 60);

  const overallRiskLevel =
    contradictions.length > 0 || gaps.length > 1
      ? 'Elevated'
      : lowReliabilitySources.length > 0
      ? 'Moderate'
      : 'Low';

  const riskFactors = [
    ...contradictions.map((c) => ({
      id: c.id,
      type: 'Contradiction',
      title: c.title,
      detail: c.detail,
      severity: c.severity,
      badgeColor: 'bg-[#f7e5e1] text-[#ae4e43]',
    })),
    ...gaps.map((g) => ({
      id: g.id,
      type: 'Information Gap',
      title: g.title,
      detail: g.detail,
      severity: g.severity,
      badgeColor: 'bg-[#f7ead0] text-[#a97922]',
    })),
    ...lowReliabilitySources.map((e) => ({
      id: e.id,
      type: 'Unverified Source',
      title: `Low Reliability: ${e.title}`,
      detail: `Source "${e.source}" reliability is ${e.reliability}%. Claim: "${e.claim}"`,
      severity: e.reliability < 40 ? 'high' : 'medium',
      badgeColor: 'bg-[#f7ead0] text-[#a97922]',
    })),
  ];

  const runRiskAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      if (decision.id) {
        await fetch(`/api/decisions/${decision.id}/analyze`, { method: 'POST' }).catch(() => {});
      }
      onRefresh?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('proofpilot:webmcp-call', {
            detail: {
              tool: 'analyze_decision_risk',
              status: 'completed',
              detail: `overallRiskLevel: ${overallRiskLevel}, factors: ${riskFactors.length}`,
            },
          })
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleAssumption = (id: string) => {
    const next = assumptions.map((a) => (a.id === id ? { ...a, verified: !a.verified } : a));
    saveAssumptions(next);
  };

  const addAssumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssumptionTitle.trim()) return;
    const item = {
      id: `asm-${Date.now()}`,
      title: newAssumptionTitle.trim(),
      detail: newAssumptionDetail.trim() || 'Added by human decision owner.',
      verified: false,
      impact: 'Medium',
    };
    const next = [item, ...assumptions];
    setNewAssumptionTitle('');
    setNewAssumptionDetail('');
    setShowAddAssumption(false);
    await saveAssumptions(next);
  };

  const challenges = [
    {
      id: 'ch-1',
      title: 'Workflow Switching Friction',
      question: 'Have you factored in productivity loss for developers refusing to switch away from IntelliJ/PyCharm or JetBrains IDEs?',
      impact: 'High',
    },
    {
      id: 'ch-2',
      title: 'Vendor Data Telemetry & Compliance',
      question: 'What is the fallback posture if vendor terms change in Q3 regarding model training or telemetry logging?',
      impact: 'Critical',
    },
    {
      id: 'ch-3',
      title: 'Seat Expansion Cost Surge',
      question: 'Will seat costs scale beyond budget if user adoption exceeds 120 seats before annual renewal?',
      impact: 'Medium',
    },
  ];

  return (
    <section className="border-b border-border bg-background px-5 py-8 md:px-10">
      {/* Panel Header & Navigation Tabs */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">
            <ShieldAlert size={13} className="text-[#b1832f]" /> 04 / Governance & Risk
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-[-.03em]">Risk, Assumptions & Challenge Mode</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Surface governance vulnerabilities, test core assumptions, and challenge consensus recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              data-testid="button-tab-risk"
              onClick={() => setTab('risk')}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11px] font-semibold transition',
                tab === 'risk' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Risk Matrix ({riskFactors.length})
            </button>
            <button
              type="button"
              data-testid="button-tab-assumptions"
              onClick={() => setTab('assumptions')}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11px] font-semibold transition',
                tab === 'assumptions' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Assumptions ({assumptions.length})
            </button>
            <button
              type="button"
              data-testid="button-tab-challenge"
              onClick={() => setTab('challenge')}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11px] font-semibold transition',
                tab === 'challenge' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Red-Team Prompts {challengeActive && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#d9a441]" />}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: RISK MATRIX & FACTOR ANALYSIS */}
      {tab === 'risk' && (
        <div className="space-y-4">
          {/* Dynamic Risk Exposure Banner */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">Overall Risk Posture:</span>
                <span
                  data-testid="badge-overall-risk"
                  className={cn(
                    'rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase',
                    overallRiskLevel === 'Elevated'
                      ? 'bg-[#f7e5e1] text-[#ae4e43]'
                      : overallRiskLevel === 'Moderate'
                      ? 'bg-[#f7ead0] text-[#a97922]'
                      : 'bg-[#e7f1ed] text-[#32786e]'
                  )}
                >
                  {overallRiskLevel}
                </span>
              </div>
              <span className="hidden text-border sm:inline">|</span>
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span><strong>{contradictions.length}</strong> Contradictions</span>
                <span>•</span>
                <span><strong>{gaps.length}</strong> Information Gaps</span>
                <span>•</span>
                <span><strong>{lowReliabilitySources.length}</strong> Unverified Sources</span>
              </div>
            </div>

            <button
              type="button"
              data-testid="button-run-risk-analysis"
              onClick={runRiskAnalysis}
              disabled={isAnalyzing}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#b1832f]/40 bg-[#fbf4df] px-3 py-2 text-[11px] font-bold text-[#896724] hover:bg-[#f5e9cb] disabled:opacity-60"
            >
              <RefreshCw size={13} className={cn(isAnalyzing && 'animate-spin')} />
              {isAnalyzing ? 'Analyzing Risk…' : 'Run Risk Analysis'}
            </button>
          </div>

          {/* Dynamic Risk Factors Cards */}
          {riskFactors.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              <ShieldCheck size={28} className="mx-auto mb-2 text-[#32786e]" />
              <div className="text-[13px] font-bold text-foreground">No active risk factors identified</div>
              <p className="mt-1 text-[11px]">Evidence coverage is clear and no open contradictions exist.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {riskFactors.map((rf) => (
                <div key={rf.id} data-testid={`card-risk-${rf.id}`} className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition hover:border-[#c8b987]">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[.1em] text-muted-foreground">{rf.type}</span>
                      <span className={cn('rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase', rf.badgeColor)}>
                        {rf.severity}
                      </span>
                    </div>
                    <h3 className="mt-3 text-[13px] font-bold">{rf.title}</h3>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{rf.detail}</p>
                  </div>

                  <div className="mt-4 border-t border-border/60 pt-3">
                    <button
                      type="button"
                      data-testid={`button-mitigate-risk-${rf.id}`}
                      onClick={() => onOpenAddEvidence?.()}
                      className="flex items-center gap-1 font-mono text-[9px] font-bold text-[#b1832f] hover:underline"
                    >
                      Address risk with evidence <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSUMPTION REGISTER */}
      {tab === 'assumptions' && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-[12px] text-muted-foreground">
              Unverified assumptions introduce hidden decision risk. Toggle verification status or log new assumptions below.
            </p>
            <button
              type="button"
              data-testid="button-open-add-assumption"
              onClick={() => setShowAddAssumption(!showAddAssumption)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-bold transition hover:border-[#b1832f] hover:bg-[#fbf4df]"
            >
              <Plus size={14} className="text-[#b1832f]" /> {showAddAssumption ? 'Cancel' : 'Add Assumption'}
            </button>
          </div>

          {/* Form to add assumption */}
          {showAddAssumption && (
            <form onSubmit={addAssumption} className="space-y-3 rounded-xl border border-[#d9a441]/40 bg-[#fbf4df] p-4">
              <div className="font-mono text-[9px] uppercase tracking-[.15em] text-[#896724]">New Assumption Registration</div>
              <input
                data-testid="input-assumption-title"
                required
                type="text"
                value={newAssumptionTitle}
                onChange={(e) => setNewAssumptionTitle(e.target.value)}
                placeholder="e.g. SOC2 Type II compliance guarantees zero data retention"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[12px] outline-none focus:border-[#b1832f]"
              />
              <input
                data-testid="input-assumption-detail"
                type="text"
                value={newAssumptionDetail}
                onChange={(e) => setNewAssumptionDetail(e.target.value)}
                placeholder="Supporting context or rationale (optional)"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[12px] outline-none focus:border-[#b1832f]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  data-testid="button-submit-assumption"
                  className="rounded-lg bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground"
                >
                  Save Assumption
                </button>
              </div>
            </form>
          )}

          {/* Assumptions List */}
          <div className="space-y-2">
            {assumptions.map((asm) => (
              <div key={asm.id} data-testid={`card-assumption-${asm.id}`} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold">{asm.title}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">({asm.impact} Impact)</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{asm.detail}</div>
                </div>

                <button
                  type="button"
                  data-testid={`button-toggle-assumption-${asm.id}`}
                  onClick={() => toggleAssumption(asm.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[9px] font-bold transition',
                    asm.verified
                      ? 'bg-[#e7f1ed] text-[#32786e] hover:bg-[#d5e7e0]'
                      : 'bg-[#f7ead0] text-[#a97922] hover:bg-[#f2dfb8]'
                  )}
                >
                  {asm.verified ? <Check size={12} /> : null}
                  {asm.verified ? 'Verified Assumption' : 'Unverified — Click to Verify'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RED-TEAM REVIEW PROMPTS */}
      {tab === 'challenge' && (
        <div className="rounded-xl border border-[#d9a441]/40 bg-[#fbf4df] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-bold text-[#896724]">
              <Zap size={16} /> Red-Team Adversarial Review Prompts
            </div>
            <button
              type="button"
              data-testid="button-toggle-challenge"
              onClick={() => {
                const nextState = !challengeActive;
                setChallengeActive(nextState);
                if (nextState && typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('proofpilot:webmcp-call', {
                      detail: {
                        tool: 'detect_contradictions',
                        status: 'completed',
                        detail: 'evaluated 3 adversarial review prompts',
                      },
                    })
                  );
                }
              }}
              className="rounded-lg bg-[#27354a] px-3.5 py-2 text-[11px] font-bold text-white transition hover:bg-[#1b2738]"
            >
              {challengeActive ? 'Hide Red-Team Prompts' : 'View Red-Team Prompts'}
            </button>
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[#725b2e]">
            Structured adversarial review prompts to stress-test consensus options, challenge key assumptions, and surface hidden organizational risks before committing a final choice.
          </p>

          {challengeActive && (
            <div className="mt-5 space-y-3 border-t border-[#e4d3a5] pt-4">
              <div className="font-mono text-[9px] uppercase tracking-[.15em] text-[#896724]">Adversarial Stress Test Prompts</div>
              {challenges.map((ch) => {
                const isHandled = handledChallenges[ch.id];
                return (
                  <div key={ch.id} data-testid={`card-challenge-${ch.id}`} className="rounded-lg border border-[#e4d3a5] bg-[#fffcf5] p-3.5 text-[11px] text-[#27354a]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <HelpCircle size={15} className="mt-0.5 shrink-0 text-[#a97922]" />
                        <div>
                          <div className="font-bold text-[#27354a]">{ch.title} <span className="font-mono text-[9px] text-[#a97922]">({ch.impact} Impact)</span></div>
                          <p className="mt-1 text-[11px] leading-5 text-[#665026]">"{ch.question}"</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`button-address-challenge-${ch.id}`}
                          onClick={() => {
                            setHandledChallenges((prev) => ({ ...prev, [ch.id]: !prev[ch.id] }));
                          }}
                          className={cn(
                            'rounded px-2.5 py-1 font-mono text-[9px] font-bold transition',
                            isHandled ? 'bg-[#e7f1ed] text-[#32786e]' : 'bg-[#27354a] text-white hover:bg-[#1b2738]'
                          )}
                        >
                          {isHandled ? 'Handled' : 'Acknowledge Risk'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function FindingsPanel({
  findings,
  onOpenAddEvidence,
}: {
  findings: DecisionState['findings'];
  onOpenAddEvidence?: (initialTitle?: string) => void;
}) {
  const styles: Record<string, { icon: typeof Circle; className: string }> = {
    positive: { icon: Check, className: 'bg-[#e7f1ed] text-[#32786e]' },
    attention: { icon: AlertTriangle, className: 'bg-[#f7ead0] text-[#a97922]' },
    warning: { icon: ShieldAlert, className: 'bg-[#f7e5e1] text-[#ae4e43]' },
    high: { icon: ShieldAlert, className: 'bg-[#f7e5e1] text-[#ae4e43]' },
    medium: { icon: AlertTriangle, className: 'bg-[#f7ead0] text-[#a97922]' },
  };

  return (
    <section className="border-b border-border bg-background px-5 py-8 md:px-10">
      <div className="mb-5">
        <div className="font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">05 / findings & signals</div>
        <h2 className="mt-2 font-display text-xl font-semibold tracking-[-.03em]">Signals worth a human look</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {findings.map((finding) => {
          const style = styles[finding.severity] ?? styles.attention;
          const Icon = style.icon;
          return (
            <article key={finding.id} className="flex flex-col justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', style.className)}>
                  <Icon size={14} />
                </span>
                <h3 className="mt-4 text-[12px] font-bold">{finding.title}</h3>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{finding.detail}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="font-mono text-[9px] text-muted-foreground/70">
                  {finding.evidenceIds?.length ?? 0} linked source{finding.evidenceIds?.length === 1 ? '' : 's'}
                </span>
                {finding.kind === 'gap' && (
                  <button
                    type="button"
                    data-testid={`button-investigate-gap-${finding.id}`}
                    onClick={() => onOpenAddEvidence?.(finding.title)}
                    className="flex items-center gap-1 font-mono text-[9px] font-bold text-[#b1832f] hover:underline"
                  >
                    Investigate <ArrowRight size={10} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ApprovalBoundary({ action, onResolve, isPending }: { action?: PendingAction; onResolve: (resolution: 'approved' | 'rejected') => void; isPending: boolean }) {
  if (!action)
    return (
      <section className="mx-5 my-8 rounded-xl border border-[#4e9b8f]/30 bg-[#edf5f0] p-5 md:mx-10">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4e9b8f] text-card">
            <Check size={16} />
          </span>
          <div>
            <h2 className="text-[13px] font-bold text-[#32786e]">No approvals waiting</h2>
            <p className="mt-1 text-[11px] text-[#397269]">The agent is operating within the approved boundary.</p>
          </div>
        </div>
      </section>
    );

  const isWeightChange = action.type === 'weight_change' || (action.proposedWeights && Object.keys(action.proposedWeights).length > 0);
  const current = action.currentWeights ?? {};
  const proposed = action.proposedWeights ?? {};

  return (
    <section className="mx-5 my-8 overflow-hidden rounded-xl border border-[#b1832f]/50 bg-[#fbf4df] md:mx-10">
      <div className="flex flex-col gap-4 border-b border-[#e4d3a5] p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[.18em] text-[#a97922]">
            <LockKeyhole size={13} /> Human approval required
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-[-.03em] text-[#27354a]">{action.title}</h2>
          <p className="mt-2 max-w-[680px] text-[11px] leading-5 text-[#725b2e]">{action.reason}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[#e1c98c] bg-[#fff9ec] px-3 py-2 text-[10px] text-[#896724]">
          <Clock3 size={13} /> proposed {formatRelative(action.proposedAt)}
        </div>
      </div>
      {isWeightChange ? (
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center md:p-6">
          <WeightList label="Current weights" weights={current} tone="muted" />
          <div className="flex justify-center text-[#b1832f]">
            <ArrowRight size={18} />
          </div>
          <WeightList label="Agent proposal" weights={proposed} tone="accent" />
        </div>
      ) : (
        <div className="p-5 md:p-6">
          <div className="rounded-lg border border-[#e1c98c] bg-[#fff9ec] p-4 text-[12px] text-[#725b2e]">
            <strong>Proposal:</strong> {action.title}. Approve to commit this decision selection.
          </div>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-[#e4d3a5] bg-[#f8efd7] p-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          data-testid={`button-reject-action-${action.id}`}
          onClick={() => onResolve('rejected')}
          disabled={isPending}
          className="rounded-lg px-4 py-2.5 text-[11px] font-bold text-[#876921] transition hover:bg-[#f1e3bf] disabled:opacity-60"
        >
          Reject proposal
        </button>
        <button
          type="button"
          data-testid={`button-approve-action-${action.id}`}
          onClick={() => onResolve('approved')}
          disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#27354a] px-4 py-2.5 text-[11px] font-bold text-[#fcf6e7] transition hover:bg-[#1b2738] disabled:opacity-60"
        >
          <Check size={14} /> {isPending ? 'Recording decision…' : 'Approve change'}
        </button>
      </div>
    </section>
  );
}

function WeightList({ label, weights, tone }: { label: string; weights: Record<string, number>; tone: 'muted' | 'accent' }) {
  return (
    <div>
      <div className="mb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#896724]">{label}</div>
      <div className="space-y-2">
        {Object.entries(weights).map(([name, value]) => (
          <div key={name} className="flex items-center gap-3 text-[10px]">
            <span className="w-[76px] truncate text-[#725b2e]">{name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eadcb9]">
              <div className={cn('h-full rounded-full', tone === 'accent' ? 'bg-[#b1832f]' : 'bg-[#a79d82]')} style={{ width: `${value}%` }} />
            </div>
            <span className="w-7 text-right font-mono font-semibold text-[#725b2e]">{value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SensitivityCard({
  analysis,
  selectedCriterionId = 'privacy',
  onSelectCriterion,
}: {
  analysis?: SensitivityAnalysis;
  selectedCriterionId?: string;
  onSelectCriterion: (criterionId: string) => void;
}) {
  const [active, setActive] = useState(3);
  if (!analysis || !Array.isArray(analysis.points) || analysis.points.length === 0) {
    return <div className="h-56 animate-pulse rounded-xl bg-muted" />;
  }
  const point = analysis.points[active] ?? analysis.points[0] ?? { weight: 0, winner: 'N/A' };

  const criteriaList = [
    { id: 'privacy', label: 'Privacy & Control' },
    { id: 'cost', label: 'Cost to Scale' },
    { id: 'developer-experience', label: 'Developer Experience' },
    { id: 'team-adoption', label: 'Team Adoption' },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">
            <GitBranch size={13} className="text-[#b1832f]" /> Sensitivity check
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-[-.03em]">If priorities move</h2>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.1em]',
            analysis.stable ? 'bg-[#e7f1ed] text-[#32786e]' : 'bg-[#f7ead0] text-[#a97922]'
          )}
        >
          {analysis.stable ? 'stable' : 'watch'}
        </span>
      </div>

      {/* Multi-Criterion Selector Bar */}
      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-b border-border/60 py-2">
        {criteriaList.map((c) => (
          <button
            key={c.id}
            type="button"
            data-testid={`button-sensitivity-criterion-${c.id}`}
            onClick={() => onSelectCriterion(c.id)}
            className={cn(
              'rounded-md px-2.5 py-1 font-mono text-[10px] font-semibold transition',
              selectedCriterionId.toLowerCase() === c.id.toLowerCase()
                ? 'bg-[#d9a441] text-[#26354b]'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{analysis.summary}</p>
      <div className="mt-6">
        <div className="relative h-20 border-b border-l border-border/70">
          {analysis.points.map((item, index) => (
            <button
              key={`${item.weight}-${item.winner}`}
              type="button"
              data-testid={`button-sensitivity-${item.weight}`}
              onClick={() => setActive(index)}
              className="absolute bottom-0 -translate-x-1/2"
              style={{ left: `${(index / Math.max(1, analysis.points.length - 1)) * 100}%` }}
            >
              <span
                className={cn(
                  'block h-3 w-3 rounded-full border-2 border-card transition',
                  active === index ? 'scale-125 bg-[#d9a441] ring-2 ring-[#d9a441]/25' : 'bg-[#879991]'
                )}
              />
              <span className="mt-2 block font-mono text-[9px] text-muted-foreground">{item.weight}%</span>
            </button>
          ))}
          <div className="absolute bottom-[6px] left-0 right-0 -z-0 h-px bg-[#d9a441]/60" />
        </div>
        <div className="mt-6 flex items-center justify-between rounded-lg bg-muted p-3">
          <span className="text-[11px] text-muted-foreground">
            At <strong className="text-foreground">{point?.weight ?? 0}%</strong> {analysis.criterionName.toLowerCase()}, lead is
          </span>
          <span className="flex items-center gap-1.5 font-display text-[14px] font-semibold text-[#a97922]">
            {point?.winner ?? 'Unknown'} <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </section>
  );
}

export function LoadingWorkspace() {
  return (
    <div className="space-y-4 p-5 md:p-10">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="h-20 w-3/4 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f7e5e1] text-[#ae4e43]">
        <ShieldAlert size={22} />
      </div>
      <h2 className="mt-5 font-display text-xl font-semibold">The signal is out of reach</h2>
      <p className="mt-2 text-[12px] leading-5 text-muted-foreground">We couldn't load this decision. Nothing has been changed.</p>
      <button
        type="button"
        data-testid="button-retry-query"
        onClick={onRetry}
        className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-[11px] font-bold text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}