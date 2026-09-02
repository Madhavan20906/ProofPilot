import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  getGetDecisionActivityQueryKey,
  getListDecisionsQueryKey,
  useGetDecisionActivity,
  useListDecisions,
} from '@workspace/api-client-react';
import { Activity as ActivityIcon, ArrowLeft, Bot, CheckCircle2, Filter, UserRound } from 'lucide-react';
import { demoActivity, demoDecision, DEMO_ID, formatDate, formatRelative } from '@/lib/demo';
import { ProofPilotShell, SectionEyebrow } from '@/components/proofpilot-shell';
import { cn } from '@/lib/utils';

export default function ActivityPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const searchId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null;

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
    searchId ??
    listItems.find((item) => item?.title?.toLowerCase().includes('coding assistant'))?.id ??
    listItems[0]?.id ??
    DEMO_ID;

  const activeDecisionTitle =
    listItems.find((item) => item?.id === activeId)?.title ?? demoDecision.title;

  const activityQuery = useGetDecisionActivity(activeId, {
    query: { queryKey: getGetDecisionActivityQueryKey(activeId), staleTime: 30000 },
  });

  const [filter, setFilter] = useState<'all' | 'agent' | 'human'>('all');

  const rawEntries = useMemo(() => {
    if (activityQuery.data && Array.isArray(activityQuery.data) && activityQuery.data.length > 0) {
      return activityQuery.data;
    }
    return demoActivity;
  }, [activityQuery.data]);

  const entries = useMemo(() => {
    if (filter === 'agent') {
      return rawEntries.filter((e) => e.actor.toLowerCase().includes('agent'));
    }
    if (filter === 'human') {
      return rawEntries.filter((e) => !e.actor.toLowerCase().includes('agent'));
    }
    return rawEntries;
  }, [rawEntries, filter]);

  return (
    <ProofPilotShell decisionTitle={activeDecisionTitle}>
      <div className="paper-grid min-h-[calc(100dvh-76px)] px-5 py-8 md:px-10 md:py-11">
        <div className="mx-auto max-w-[920px]">
          <div className="flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
            <div>
              <SectionEyebrow icon={ActivityIcon}>Human-agent audit</SectionEyebrow>
              <h1 className="font-display text-[clamp(2.1rem,4vw,3.5rem)] font-semibold leading-none tracking-[-.055em]">
                The trail stays visible.
              </h1>
              <p className="mt-4 max-w-[550px] text-[13px] leading-6 text-muted-foreground">
                A chronological record of what the agent investigated, what it proposed, and where a human made the call.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {listItems.length > 1 && (
                <select
                  data-testid="select-activity-decision"
                  value={activeId}
                  onChange={(e) => setLocation(`/activity/${e.target.value}`)}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-[11px] font-bold text-foreground outline-none hover:bg-accent"
                >
                  {listItems.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 text-[10px] font-mono uppercase tracking-[.1em] text-muted-foreground">
                <button
                  type="button"
                  data-testid="filter-all"
                  onClick={() => setFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors',
                    filter === 'all' ? 'bg-primary text-primary-foreground font-bold' : 'hover:text-foreground'
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  data-testid="filter-agent"
                  onClick={() => setFilter('agent')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors',
                    filter === 'agent' ? 'bg-primary text-primary-foreground font-bold' : 'hover:text-foreground'
                  )}
                >
                  Agent
                </button>
                <button
                  type="button"
                  data-testid="filter-human"
                  onClick={() => setFilter('human')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors',
                    filter === 'human' ? 'bg-primary text-primary-foreground font-bold' : 'hover:text-foreground'
                  )}
                >
                  Human
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-card p-5 md:p-7">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[.17em] text-muted-foreground">
                  Decision timeline
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold">{activeDecisionTitle}</h2>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{entries.length} events</span>
            </div>

            <div className="relative">
              {entries.length === 0 ? (
                <div className="py-12 text-center text-[12px] text-muted-foreground">
                  No activity entries match the selected filter.
                </div>
              ) : (
                entries.map((entry, index) => {
                  const isAgent = entry.actor.toLowerCase().includes('agent');
                  const isLast = index === entries.length - 1;
                  return (
                    <div key={entry.id} data-testid={`row-activity-${entry.id}`} className="relative flex gap-4 pb-8 last:pb-0">
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                        {isAgent ? (
                          <Bot size={14} className="text-[#a97922]" />
                        ) : (
                          <UserRound size={14} className="text-[#54728f]" />
                        )}
                      </div>
                      {!isLast && <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-border" />}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-bold">{entry.action}</span>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.1em]',
                                isAgent ? 'bg-[#f7ead0] text-[#a97922]' : 'bg-[#e8eef4] text-[#54728f]'
                              )}
                            >
                              {isAgent ? 'agent' : 'human'}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] text-muted-foreground">
                            {formatRelative(entry.timestamp)}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{entry.detail}</p>
                        <div className="mt-2 font-mono text-[9px] text-muted-foreground/60">
                          {entry.actor} · {formatDate(entry.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#4e9b8f]/25 bg-[#edf5f0] p-4">
            <CheckCircle2 size={17} className="shrink-0 text-[#32786e]" />
            <p className="text-[11px] leading-5 text-[#397269]">
              <strong>Audit integrity:</strong> each event is timestamped and tied to the active decision state. Agent work is observable; approval remains human.
            </p>
          </div>

          <button
            type="button"
            data-testid="button-back-workspace"
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