import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  getGetDecisionQueryKey,
  getGetSensitivityAnalysisQueryKey,
  getListDecisionsQueryKey,
  useAddEvidence,
  useAnalyzeDecision,
  useGetDecision,
  useGetSensitivityAnalysis,
  useListDecisions,
  useProposeWeightChange,
  useResolvePendingAction,
  useUpdateDecision,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, FilePlus2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { demoDecision, demoSensitivity, DEMO_ID } from '@/lib/demo';
import { registerProofPilotTools } from '@/lib/webmcp';
import { ProofPilotShell, SectionEyebrow } from '@/components/proofpilot-shell';
import {
  ApprovalBoundary,
  DecisionHero,
  EvidenceRail,
  FindingsPanel,
  LoadingWorkspace,
  OptionMatrix,
  PriorityEditor,
  RiskAndAssumptionsPanel,
  SensitivityCard,
  WhyPanel,
  ErrorState,
} from '@/components/workspace-pieces';

export default function WorkspacePage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const decisionList = useListDecisions({ query: { queryKey: getListDecisionsQueryKey(), staleTime: 30000 } });
  const rawList = decisionList.data;
  const listItems: any[] = Array.isArray(rawList)
    ? rawList
    : Array.isArray((rawList as any)?.decisions)
    ? (rawList as any).decisions
    : Array.isArray((rawList as any)?.data)
    ? (rawList as any).data
    : [];

  const activeId =
    params.id ??
    listItems.find((item) => item?.title?.toLowerCase().includes('coding assistant'))?.id ??
    listItems[0]?.id ??
    DEMO_ID;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState(demoDecision);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedCriterionId, setSelectedCriterionId] = useState('privacy');
  const [evidenceForm, setEvidenceForm] = useState({
    title: '',
    source: '',
    claim: '',
    confidence: '75',
    reliability: '75',
    supportsOptionId: demoDecision.options[0].id,
  });

  const detail = useGetDecision(activeId, {
    query: { queryKey: getGetDecisionQueryKey(activeId), staleTime: 30000 },
  });
  const sensitivity = useGetSensitivityAnalysis(activeId, {
    query: { queryKey: getGetSensitivityAnalysisQueryKey(activeId), staleTime: 30000 },
  });

  const analyze = useAnalyzeDecision();
  const addEvidence = useAddEvidence();
  const proposeWeight = useProposeWeightChange();
  const resolveAction = useResolvePendingAction();
  const updateDecision = useUpdateDecision();

  useEffect(() => {
    if (detail.data) {
      setDecision({
        ...demoDecision,
        ...detail.data,
        options: Array.isArray(detail.data.options) && detail.data.options.length > 0 ? detail.data.options : demoDecision.options,
        criteria: Array.isArray(detail.data.criteria) && detail.data.criteria.length > 0 ? detail.data.criteria : demoDecision.criteria,
        evidence: Array.isArray(detail.data.evidence) ? detail.data.evidence : [],
        findings: Array.isArray(detail.data.findings) ? detail.data.findings : [],
        pendingActions: Array.isArray(detail.data.pendingActions) ? detail.data.pendingActions : [],
      });
    }
    registerProofPilotTools(() => activeId);
  }, [activeId, detail.data]);

  const runAnalyze = () =>
    analyze.mutate(
      { decisionId: activeId },
      {
        onSuccess: (next) => {
          setDecision(next);
          queryClient.setQueryData(getGetDecisionQueryKey(activeId), next);
          toast({
            title: 'Recommendation recalculated',
            description: 'The reasoning trace now reflects the latest evidence.',
          });
        },
        onError: () =>
          toast({
            title: 'Could not recalculate',
            description: 'The current view is unchanged.',
            variant: 'destructive',
          }),
      }
    );

  const savePriorities = (criteriaWeights: Record<string, number>) =>
    updateDecision.mutate(
      { decisionId: activeId, data: { criteriaWeights } },
      {
        onSuccess: (next) => {
          setDecision(next);
          queryClient.setQueryData(getGetDecisionQueryKey(activeId), next);
          queryClient.invalidateQueries({ queryKey: getListDecisionsQueryKey() });
          toast({
            title: 'Human priorities saved',
            description: 'The recommendation changed because your priorities changed.',
          });
        },
        onError: () =>
          toast({
            title: 'Priorities were not saved',
            description: 'Weights must total 100%.',
            variant: 'destructive',
          }),
      }
    );

  const resolve = (resolution: 'approved' | 'rejected') => {
    const action = (decision?.pendingActions ?? []).find((item) => item?.status?.toLowerCase() === 'pending');
    if (!action) return;
    resolveAction.mutate(
      { decisionId: activeId, actionId: action.id, data: { resolution } },
      {
        onSuccess: (next) => {
          setDecision(next);
          queryClient.setQueryData(getGetDecisionQueryKey(activeId), next);
          toast({
            title: resolution === 'approved' ? 'Proposal approved' : 'Proposal rejected',
            description: resolution === 'approved' ? 'The criteria weights are now active.' : 'The agent will keep the current weights.',
          });
        },
        onError: () =>
          toast({
            title: 'Approval could not be recorded',
            description: 'Try again in a moment.',
            variant: 'destructive',
          }),
      }
    );
  };

  const proposeOwnership = () =>
    proposeWeight.mutate(
      {
        decisionId: activeId,
        data: {
          criterionId: 'privacy',
          proposedWeight: 45,
          reason: 'Privacy and control should carry more weight after the team review.',
        },
      },
      {
        onSuccess: (action) => {
          setDecision((prev) => ({ ...prev, pendingActions: [action, ...(prev?.pendingActions ?? [])] }));
          toast({
            title: 'Proposal sent to approval boundary',
            description: 'A human decision is required before the weights change.',
          });
        },
        onError: () =>
          toast({
            title: 'Could not create proposal',
            description: 'The current criteria remain unchanged.',
            variant: 'destructive',
          }),
      }
    );

  const submitEvidence = (event: React.FormEvent) => {
    event.preventDefault();
    addEvidence.mutate(
      {
        decisionId: activeId,
        data: {
          title: evidenceForm.title,
          source: evidenceForm.source,
          claim: evidenceForm.claim,
          confidence: Number(evidenceForm.confidence),
          reliability: Number(evidenceForm.reliability),
          supportsOptionId: evidenceForm.supportsOptionId,
          url: null,
        },
      },
      {
        onSuccess: (item) => {
          setDecision((prev) => ({ ...prev, evidence: [item, ...(prev?.evidence ?? [])] }));
          setEvidenceOpen(false);
          setEvidenceForm({
            title: '',
            source: '',
            claim: '',
            confidence: '75',
            reliability: '75',
            supportsOptionId: demoDecision.options[0].id,
          });
          detail.refetch();
          toast({ title: 'Evidence added', description: 'The source is ready for the next analysis pass.' });
        },
        onError: () =>
          toast({ title: 'Evidence was not added', description: 'Check the fields and try again.', variant: 'destructive' }),
      }
    );
  };

  if (detail.isLoading && !detail.data)
    return (
      <ProofPilotShell>
        <LoadingWorkspace />
      </ProofPilotShell>
    );

  if (detail.isError && !detail.data)
    return (
      <ProofPilotShell>
        <ErrorState onRetry={() => detail.refetch()} />
      </ProofPilotShell>
    );

  return (
    <ProofPilotShell decisionTitle={decision.title}>
      <div className="animate-rise-in">
        <DecisionHero decision={decision} onAnalyze={runAnalyze} isAnalyzing={analyze.isPending} />
        <OptionMatrix decision={decision} />
        <PriorityEditor decision={decision} onCommit={savePriorities} isSaving={updateDecision.isPending} />
        <WhyPanel decision={decision} />
        <EvidenceRail
          decisionId={activeId}
          evidence={decision?.evidence ?? []}
          options={decision?.options ?? []}
          onRefresh={() => detail.refetch()}
        />
        <FindingsPanel findings={decision?.findings ?? []} />
        <RiskAndAssumptionsPanel
          decision={decision}
          onRefresh={() => detail.refetch()}
          onOpenAddEvidence={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
        />

        <div className="grid gap-5 border-b border-border bg-background px-5 py-8 md:px-10 lg:grid-cols-[1.05fr_.95fr]">
          <SensitivityCard
            analysis={sensitivity.data ?? demoSensitivity}
            selectedCriterionId={selectedCriterionId}
            onSelectCriterion={(cid) => {
              setSelectedCriterionId(cid);
              sensitivity.refetch();
            }}
          />
          <div className="rounded-xl border border-border bg-card p-5 md:p-6">
            <SectionEyebrow icon={FilePlus2}>Keep the record honest</SectionEyebrow>
            <h2 className="font-display text-xl font-semibold tracking-[-.03em]">Add source-backed evidence</h2>
            <p className="mt-2 max-w-[410px] text-[11px] leading-5 text-muted-foreground">
              Human context belongs alongside agent research. Add an interview, benchmark, or constraint to the evidence room.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="button-add-evidence"
                onClick={() => setEvidenceOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-[11px] font-bold transition hover:border-[#b1832f] hover:bg-[#fbf4df]"
              >
                <Plus size={14} className="text-[#b1832f]" /> Add evidence
              </button>
              <button
                type="button"
                data-testid="button-propose-ownership"
                onClick={proposeOwnership}
                disabled={proposeWeight.isPending}
                className="flex items-center gap-2 rounded-lg border border-[#e1c98c] bg-[#fbf4df] px-3.5 py-2.5 text-[11px] font-bold text-[#896724] transition hover:bg-[#f5e9cb] disabled:opacity-60"
              >
                {proposeWeight.isPending ? 'Sending proposal…' : 'Propose 45% privacy weight'}
              </button>
            </div>
          </div>
        </div>

        <ApprovalBoundary
          action={decision.pendingActions.find((item) => item.status === 'pending')}
          onResolve={resolve}
          isPending={resolveAction.isPending}
        />

        <div className="flex flex-col gap-3 border-t border-border px-5 py-7 text-[10px] text-muted-foreground md:flex-row md:items-center md:justify-between md:px-10">
          <span className="font-mono uppercase tracking-[.12em]">ProofPilot / judgment, not autopilot</span>
          <button
            type="button"
            data-testid="button-open-activity"
            onClick={() => setLocation('/activity')}
            className="flex items-center gap-1.5 font-semibold text-foreground hover:text-[#a97922]"
          >
            Review full audit trail <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {evidenceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172238]/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">New evidence</div>
                <h2 className="mt-2 font-display text-xl font-semibold">Put a fact on the table</h2>
              </div>
              <button
                type="button"
                data-testid="button-close-evidence"
                onClick={() => setEvidenceOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitEvidence} className="space-y-4 p-5">
              <Field
                label="Evidence title"
                value={evidenceForm.title}
                onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })}
                placeholder="e.g. Security review notes"
                required
              />
              <Field
                label="Source"
                value={evidenceForm.source}
                onChange={(value) => setEvidenceForm({ ...evidenceForm, source: value })}
                placeholder="Who or where did this come from?"
                required
              />
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Claim</span>
                <textarea
                  data-testid="input-evidence-claim"
                  required
                  value={evidenceForm.claim}
                  onChange={(event) => setEvidenceForm({ ...evidenceForm, claim: event.target.value })}
                  placeholder="Write the specific, verifiable claim…"
                  className="min-h-[76px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-[12px] outline-none transition placeholder:text-muted-foreground/60 focus:border-[#b1832f] focus:ring-2 focus:ring-[#d9a441]/20"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Confidence (0–100)"
                  type="number"
                  value={evidenceForm.confidence}
                  onChange={(value) => setEvidenceForm({ ...evidenceForm, confidence: value })}
                  required
                />
                <Field
                  label="Reliability (0–100)"
                  type="number"
                  value={evidenceForm.reliability}
                  onChange={(value) => setEvidenceForm({ ...evidenceForm, reliability: value })}
                  required
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Supports</span>
                <select
                  data-testid="input-evidence-supports"
                  value={evidenceForm.supportsOptionId}
                  onChange={(event) => setEvidenceForm({ ...evidenceForm, supportsOptionId: event.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[12px] outline-none focus:border-[#b1832f]"
                >
                  {(decision?.options ?? []).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                data-testid="button-submit-evidence"
                disabled={addEvidence.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-[11px] font-bold text-primary-foreground disabled:opacity-60"
              >
                {addEvidence.isPending ? 'Adding to source room…' : <><Check size={14} /> Add evidence</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </ProofPilotShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</span>
      <input
        data-testid={`input-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[12px] outline-none transition placeholder:text-muted-foreground/60 focus:border-[#b1832f] focus:ring-2 focus:ring-[#d9a441]/20"
      />
    </label>
  );
}