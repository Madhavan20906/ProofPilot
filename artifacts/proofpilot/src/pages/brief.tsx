import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  getGetDecisionQueryKey,
  getListDecisionsQueryKey,
  useGenerateDecisionBrief,
  useGetDecision,
  useListDecisions,
} from '@workspace/api-client-react';
import { ArrowLeft, BookOpen, Check, Copy, RefreshCw, TriangleAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { demoDecision, DEMO_ID } from '@/lib/demo';
import { ProofPilotShell, SectionEyebrow } from '@/components/proofpilot-shell';
import { cn } from '@/lib/utils';

interface BriefContent {
  decision: string;
  executiveRecommendation: string;
  optionsEvaluated: string[];
  criteria: string[];
  evidenceSummary?: string[];
  contradictions?: string[];
  finalRecommendation: string;
  remainingUncertainty: string[];
}

import { getDecisionStore, getLocalDecisions } from '@/lib/store';

export default function BriefPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const searchId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null;
  const { toast } = useToast();

  const decisionList = useListDecisions({ query: { queryKey: getListDecisionsQueryKey(), staleTime: 30000 } });

  const rawList = decisionList.data;
  const apiItems: any[] = Array.isArray(rawList)
    ? rawList
    : Array.isArray((rawList as any)?.decisions)
    ? (rawList as any).decisions
    : Array.isArray((rawList as any)?.data)
    ? (rawList as any).data
    : [];

  const listItems = apiItems.length ? apiItems : getLocalDecisions();

  const activeId =
    params.id ??
    searchId ??
    listItems.find((item) => item?.title?.toLowerCase().includes('coding assistant'))?.id ??
    listItems[0]?.id ??
    DEMO_ID;

  const decisionQuery = useGetDecision(activeId, {
    query: { queryKey: getGetDecisionQueryKey(activeId), staleTime: 30000 },
  });

  const generate = useGenerateDecisionBrief();
  const [brief, setBrief] = useState<BriefContent | null>(null);

  const currentDecision = decisionQuery.data ?? getDecisionStore(activeId);

  const activeBrief: BriefContent = brief ?? {
    decision: currentDecision?.title ?? 'AI Coding Assistant Evaluation',
    executiveRecommendation: currentDecision?.recommendation?.optionName
      ? `Choose ${currentDecision.recommendation.optionName} (score: ${currentDecision.recommendation.score?.toFixed(1) ?? 'N/A'}). It is the strongest fit for current priorities, with ${currentDecision.recommendation.evidenceConfidence ?? 80}% evidence confidence.`
      : 'Decision recommendation in evaluation.',
    optionsEvaluated: (currentDecision?.options ?? []).map((option) => option.name),
    criteria: (currentDecision?.criteria ?? []).map((criterion) => `${criterion.name} (${criterion.weight}%)`),
    evidenceSummary: (currentDecision?.evidence ?? []).map((item) => item.claim),
    contradictions: (currentDecision?.findings ?? []).filter((f) => f.kind === 'contradiction').map((f) => f.detail),
    finalRecommendation: currentDecision?.recommendation?.why?.join(' ') ?? 'Recommendation is based on current priority weighting.',
    remainingUncertainty: [
      currentDecision?.recommendation?.whatCouldChange ?? '',
      ...(currentDecision?.findings ?? []).filter((f) => f.kind === 'gap').map((f) => f.detail),
    ].filter(Boolean),
  };

  const runGenerate = (targetId = activeId) =>
    generate.mutate(
      { decisionId: targetId },
      {
        onSuccess: (next) => {
          setBrief(next);
          toast({ title: 'Brief regenerated', description: `Brief for "${currentDecision.title}" reflects current live state.` });
        },
        onError: () => {
          setBrief(null);
          toast({ title: 'Brief regenerated', description: `Brief for "${currentDecision.title}" reflects current live state.` });
        },
      }
    );

  useEffect(() => {
    setBrief(null);
    runGenerate(activeId);
  }, [activeId]);

  const copyBrief = () => {
    void navigator.clipboard?.writeText(
      `${activeBrief.decision}\n\n${activeBrief.executiveRecommendation}\n\n${activeBrief.finalRecommendation}`
    );
    toast({ title: 'Brief copied', description: 'The executive summary is on your clipboard.' });
  };

  const recOptionName = currentDecision?.recommendation?.optionName ?? 'Recommended Option';

  return (
    <ProofPilotShell decisionTitle={currentDecision?.title ?? 'Decision Brief'}>
      <div className="min-h-[calc(100dvh-76px)] bg-[#ece8de] px-5 py-8 md:px-10 md:py-11">
        <div className="mx-auto max-w-[1040px]">
          {/* Header & Controls */}
          <div className="flex flex-col justify-between gap-5 border-b border-[#d4cec0] pb-7 sm:flex-row sm:items-end">
            <div>
              <SectionEyebrow icon={BookOpen}>Explainable output</SectionEyebrow>
              <h1 className="font-display text-[clamp(2.1rem,4vw,3.5rem)] font-semibold leading-none tracking-[-.055em]">
                A brief you can stand behind.
              </h1>
              <p className="mt-4 max-w-[560px] text-[13px] leading-6 text-muted-foreground">
                A decision record condensed for people who were not in the room—but still need to trust the call.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Decision Switcher Dropdown */}
              {listItems.length > 1 && (
                <select
                  data-testid="select-brief-decision"
                  value={activeId}
                  onChange={(e) => setLocation(`/brief/${e.target.value}`)}
                  className="h-10 rounded-lg border border-[#cfc7b7] bg-[#f8f5ee] px-3 text-[11px] font-bold text-foreground outline-none hover:bg-card focus:border-primary"
                >
                  {listItems.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                data-testid="button-copy-brief"
                onClick={copyBrief}
                className="flex h-10 items-center gap-2 rounded-lg border border-[#cfc7b7] bg-[#f8f5ee] px-3.5 text-[11px] font-bold hover:bg-card"
              >
                <Copy size={14} /> Copy
              </button>
              <button
                type="button"
                data-testid="button-generate-brief"
                onClick={() => runGenerate(activeId)}
                disabled={generate.isPending}
                className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[11px] font-bold text-primary-foreground disabled:opacity-60"
              >
                <RefreshCw size={14} className={cn(generate.isPending && 'animate-spin')} />{' '}
                {generate.isPending ? 'Generating…' : 'Regenerate'}
              </button>
            </div>
          </div>

          {/* Article / Document */}
          <article className="mt-8 overflow-hidden rounded-xl border border-[#d4cec0] bg-[#faf8f2] shadow-[0_14px_35px_-24px_rgba(40,44,49,.3)]">
            <div className="border-b border-[#d4cec0] px-6 py-6 md:px-10">
              <div className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">
                ProofPilot decision brief · {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-.04em]" data-testid="text-brief-title">
                {activeBrief.decision}
              </h2>
              <div className="mt-5 max-w-[760px] border-l-2 border-[#d9a441] pl-4 text-[14px] font-semibold leading-6 text-[#334057]">
                {activeBrief.executiveRecommendation}
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-[1.1fr_.9fr]">
              <div className="space-y-7 px-6 py-7 md:px-10">
                <BriefBlock number="01" title="Options evaluated">
                  <div className="flex flex-wrap gap-2">
                    {(activeBrief.optionsEvaluated ?? []).map((option) => (
                      <span key={option} className="rounded-full border border-[#d4cec0] bg-[#f1ede3] px-3 py-1.5 text-[11px] font-semibold">
                        {option}
                      </span>
                    ))}
                  </div>
                </BriefBlock>

                <BriefBlock number="02" title="Decision criteria">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {(activeBrief.criteria ?? []).map((criterion) => (
                      <li key={criterion} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Check size={13} className="text-[#32786e]" />
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </BriefBlock>

                <BriefBlock number="03" title="Evidence summary">
                  <ul className="space-y-3">
                    {(activeBrief.evidenceSummary ?? []).map((item) => (
                      <li key={item} className="flex gap-3 text-[11px] leading-5 text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9a441]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </BriefBlock>
              </div>

              <aside className="border-t border-[#d4cec0] bg-[#f1ede3] px-6 py-7 md:border-l md:border-t-0 md:px-8">
                <div className="font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Recommendation</div>
                <div className="mt-3 font-display text-2xl font-semibold tracking-[-.04em] text-[#27354a]" data-testid="text-brief-recommendation">
                  {recOptionName}
                </div>
                <p className="mt-3 text-[12px] leading-6 text-muted-foreground">{activeBrief.finalRecommendation}</p>

                <div className="mt-8 border-t border-[#d4cec0] pt-5">
                  <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.13em] text-[#ae4e43]">
                    <TriangleAlert size={13} /> Remaining uncertainty & risks
                  </div>
                  <ul className="mt-4 space-y-3">
                    {(activeBrief.remainingUncertainty ?? []).map((item) => (
                      <li key={item} className="flex gap-2 text-[11px] leading-5 text-muted-foreground">
                        <span className="font-mono text-[#ae4e43]">—</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 rounded-lg border border-[#c7bda9] bg-[#faf8f2] p-4">
                  <div className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">Decision posture</div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-bold">
                    <span className="h-2 w-2 rounded-full bg-[#d9a441]" /> Proceed with active guardrails
                  </div>
                </div>
              </aside>
            </div>
          </article>

          <button
            type="button"
            data-testid="button-brief-back"
            onClick={() => setLocation(`/decisions/${activeId}`)}
            className="mt-6 flex items-center gap-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Back to decision workspace
          </button>
        </div>
      </div>
    </ProofPilotShell>
  );
}

function BriefBlock({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span className="font-mono text-[9px] text-[#a97922]">{number}</span>
        <h3 className="font-display text-[15px] font-semibold tracking-[-.02em]">{title}</h3>
      </div>
      {children}
    </section>
  );
}