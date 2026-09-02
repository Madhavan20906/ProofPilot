import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { getListDecisionsQueryKey, useCreateDecision, useListDecisions, useUpdateDecision } from '@workspace/api-client-react';
import { ArrowUpRight, Check, CircleDot, Plus, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { demoSummary, DEMO_ID } from '@/lib/demo';
import { ProofPilotShell, SectionEyebrow } from '@/components/proofpilot-shell';
import { cn } from '@/lib/utils';

import { createDecisionStore, listDecisionSummariesStore, updateDecisionStore } from '@/lib/store';

export default function DecisionsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const list = useListDecisions({ query: { queryKey: getListDecisionsQueryKey(), staleTime: 30000 } });
  const create = useCreateDecision();
  const update = useUpdateDecision();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', description: '', owner: 'Madhavan' });
  const [localItems, setLocalItems] = useState(listDecisionSummariesStore());

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setOpen(true);
  }, []);

  const rawItems = Array.isArray(list.data)
    ? list.data
    : Array.isArray((list.data as any)?.decisions)
    ? (list.data as any).decisions
    : Array.isArray((list.data as any)?.data)
    ? (list.data as any).data
    : [];

  const itemsToUse = rawItems.length ? rawItems : localItems;
  const summaries = itemsToUse.filter((item: any) => item && item.title && item.title.toLowerCase().includes(search.toLowerCase()));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate(
      { data: { ...form } },
      {
        onSuccess: (decision) => {
          setOpen(false);
          toast({ title: 'Decision workspace created', description: 'Opening the new workspace now.' });
          setLocation(`/decisions/${decision.id}`);
        },
        onError: () => {
          const created = createDecisionStore(form);
          setLocalItems(listDecisionSummariesStore());
          setOpen(false);
          toast({ title: 'Decision workspace created', description: 'Opening the new workspace now.' });
          setLocation(`/decisions/${created.id}`);
        },
      }
    );
  };

  const archive = (id: string) =>
    update.mutate(
      { decisionId: id, data: { status: 'archived' } },
      {
        onSuccess: () => {
          list.refetch();
          setLocalItems(listDecisionSummariesStore());
          toast({ title: 'Decision archived' });
        },
        onError: () => {
          updateDecisionStore(id, { status: 'archived' });
          setLocalItems(listDecisionSummariesStore());
          toast({ title: 'Decision archived' });
        },
      }
    );
  return <ProofPilotShell onNewDecision={() => setOpen(true)}><div className="paper-grid min-h-[calc(100dvh-76px)] px-5 py-8 md:px-10 md:py-11"><div className="mx-auto max-w-[1080px]"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><SectionEyebrow>Decision library</SectionEyebrow><h1 className="font-display text-[clamp(2.1rem,4vw,3.5rem)] font-semibold leading-none tracking-[-.055em]">Workspaces for the calls<br className="hidden sm:block" /> that carry weight.</h1><p className="mt-4 max-w-[560px] text-[13px] leading-6 text-muted-foreground">Every recommendation keeps its trail: options, criteria, evidence, and the moment a human needs to decide.</p></div><button type="button" data-testid="button-new-decision" onClick={() => setOpen(true)} className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-[11px] font-bold text-primary-foreground transition hover:-translate-y-0.5"><Plus size={15} /> New decision</button></div><div className="mt-9 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground"><CircleDot size={13} className="text-[#b1832f]" /> {summaries.length} active workspace{summaries.length === 1 ? '' : 's'}</div><label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground"><Search size={14} /><input data-testid="input-search-decisions" value={search} onChange={event => setSearch(event.target.value)} placeholder="Filter decisions…" className="w-full bg-transparent outline-none placeholder:text-muted-foreground/55 sm:w-48" /></label></div><div className="mt-4 space-y-3">{summaries.map((item: any, index: number) => <article key={item.id} data-testid={`card-decision-${item.id}`} className="group flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c8b987] md:flex-row md:items-center md:justify-between md:p-6"><div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e9dcb8] font-mono text-[10px] font-semibold text-[#876921]">0{index + 1}</div><div><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e7f1ed] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.1em] text-[#32786e]">{item.status.replace('_', ' ')}</span><span className="font-mono text-[9px] text-muted-foreground">confidence {item.confidence}%</span></div><h2 className="font-display text-[19px] font-semibold tracking-[-.03em]">{item.title}</h2><p className="mt-1 text-[11px] text-muted-foreground">Recommendation: <strong className="text-foreground/75">{item.recommendation}</strong></p></div></div><div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4 md:border-0 md:pt-0"><span className="font-mono text-[10px] text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><div className="flex items-center gap-2"><Link href={`/brief/${item.id}`} data-testid={`link-brief-decision-${item.id}`} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[10px] font-bold text-muted-foreground transition hover:border-[#b1832f] hover:bg-[#f8f5ee] hover:text-foreground">Brief</Link><Link href={item.id === DEMO_ID ? '/' : `/decisions/${item.id}`} data-testid={`link-open-decision-${item.id}`} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[10px] font-bold transition hover:border-[#b1832f] hover:bg-[#fbf4df]">Open <ArrowUpRight size={13} /></Link>{item.id !== DEMO_ID && <button type="button" data-testid={`button-archive-${item.id}`} onClick={() => archive(item.id)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-[#f7e5e1] hover:text-[#ae4e43]"><X size={14} /></button>}</div></div></article>)}</div></div></div>{open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172238]/45 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"><div className="flex items-start justify-between border-b border-border p-5"><div><SectionEyebrow>New workspace</SectionEyebrow><h2 className="font-display text-xl font-semibold">What needs a clear call?</h2></div><button type="button" data-testid="button-close-create-decision" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X size={16} /></button></div><form onSubmit={submit} className="space-y-4 p-5"><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Decision title</span><input data-testid="input-decision-title" required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="e.g. Choose a customer data platform" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[12px] outline-none focus:border-[#b1832f] focus:ring-2 focus:ring-[#d9a441]/20" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Decision context</span><textarea data-testid="input-decision-description" required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="What is at stake, and who will use the outcome?" className="min-h-[90px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-[12px] outline-none focus:border-[#b1832f] focus:ring-2 focus:ring-[#d9a441]/20" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Owner</span><input data-testid="input-decision-owner" value={form.owner} onChange={event => setForm({ ...form, owner: event.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[12px] outline-none focus:border-[#b1832f] focus:ring-2 focus:ring-[#d9a441]/20" /></label><button type="submit" data-testid="button-submit-decision" disabled={create.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-[11px] font-bold text-primary-foreground disabled:opacity-60">{create.isPending ? 'Creating workspace…' : <><Check size={14} /> Create workspace</>}</button></form></div></div>}</ProofPilotShell>;
}