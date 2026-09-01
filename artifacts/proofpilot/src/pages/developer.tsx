import { useEffect, useState } from 'react';
import {
  Code2,
  Copy,
  ExternalLink,
  GitBranch,
  KeyRound,
  Layers3,
  Radio,
  ShieldCheck,
  TerminalSquare,
  Wrench,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProofPilotShell, SectionEyebrow } from '@/components/proofpilot-shell';
import { cn } from '@/lib/utils';
import { isWebMcpAvailable } from '@/lib/webmcp';

const tools = [
  { name: 'get_decision_state', description: 'Retrieve full active decision state.', category: 'Discovery', color: '#4e9b8f' },
  { name: 'get_evidence', description: 'Inspect evidence confidence, reliability, and status.', category: 'Discovery', color: '#4e9b8f' },
  { name: 'search_evidence', description: 'Search decision evidence by query or option.', category: 'Discovery', color: '#4e9b8f' },
  { name: 'add_evidence', description: 'Submit new source-backed evidence into decision.', category: 'Evidence', color: '#38bdf8' },
  { name: 'compare_options', description: 'Return weighted option scores and current leader.', category: 'Analysis', color: '#d9a441' },
  { name: 'detect_contradictions', description: 'Algorithmic comparison of evidence claims & gaps.', category: 'Analysis', color: '#d9a441' },
  { name: 'run_sensitivity_analysis', description: 'Test stability across changing criterion weights.', category: 'Analysis', color: '#d9a441' },
  { name: 'analyze_decision_risk', description: 'Assess overall risk exposure and unverified claims.', category: 'Analysis', color: '#d9a441' },
  { name: 'evaluate_scenario', description: 'Evaluate option rankings under named weight presets.', category: 'Analysis', color: '#d9a441' },
  { name: 'propose_weight_change', description: 'Prepare criteria weight change for human sign-off.', category: 'Governance', color: '#b87967' },
  { name: 'propose_decision', description: 'Propose final decision choice for human approval.', category: 'Governance', color: '#b87967' },
  { name: 'request_human_review', description: 'Pause consequential work at the human boundary.', category: 'Governance', color: '#b87967' },
  { name: 'generate_decision_brief', description: 'Compile current state into an explainable brief.', category: 'Output', color: '#7887b7' },
];

type Trace = {
  time: string;
  tool: string;
  detail: string;
  status: string;
};

export default function DeveloperPage() {
  const { toast } = useToast();
  const [selected, setSelected] = useState(tools[0].name);
  const [available, setAvailable] = useState(isWebMcpAvailable);
  const [callLog, setCallLog] = useState<Trace[]>([]);
  const selectedTool = tools.find((tool) => tool.name === selected) ?? tools[0];

  useEffect(() => {
    const syncStatus = () => setAvailable(isWebMcpAvailable());
    const onToolCall = (event: Event) => {
      const detail = (event as CustomEvent<{ tool: string; status: string; detail: string }>).detail;
      setCallLog((current) =>
        [
          {
            time: new Date().toLocaleTimeString([], { hour12: false }),
            tool: detail.tool,
            detail: detail.detail,
            status: detail.status === 'error' ? 'error' : 'completed',
          },
          ...current,
        ].slice(0, 10)
      );
    };
    window.addEventListener('proofpilot:webmcp-ready', syncStatus);
    window.addEventListener('proofpilot:webmcp-call', onToolCall);
    syncStatus();
    return () => {
      window.removeEventListener('proofpilot:webmcp-ready', syncStatus);
      window.removeEventListener('proofpilot:webmcp-call', onToolCall);
    };
  }, []);

  const copyTool = () => {
    void navigator.clipboard?.writeText(selectedTool.name);
    toast({ title: 'Tool name copied', description: 'Ready to paste into your WebMCP integration.' });
  };

  return (
    <ProofPilotShell>
      <div className="min-h-[calc(100dvh-76px)] bg-[#202d42] px-5 py-8 text-[#f4f0e6] md:px-10 md:py-11">
        <div className="mx-auto max-w-[1120px]">
          <div className="flex flex-col justify-between gap-5 border-b border-[#536078] pb-8 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-[#d9a441]">
                <TerminalSquare size={14} /> Agent interface
              </div>
              <h1 className="font-display text-[clamp(2.1rem,4vw,3.5rem)] font-semibold leading-none tracking-[-.055em]">
                WebMCP, with a stop sign.
              </h1>
              <p className="mt-4 max-w-[600px] text-[13px] leading-6 text-[#b6bdc8]">
                Discover the 13 tools available to your agent. Observe every call in real time. Consequential actions pause at the human boundary.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[#536078] bg-[#2b3951] px-3 py-2 font-mono text-[9px] uppercase tracking-[.14em] text-[#afbbc8]">
              <span className={cn('h-1.5 w-1.5 rounded-full', available ? 'signal-pulse bg-[#5cb7a9]' : 'bg-[#d9a441]')} />
              {available ? 'WebMCP ready' : 'WebMCP host required'}
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.05fr]">
            <section className="rounded-xl border border-[#536078] bg-[#26344b] p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <SectionEyebrow icon={Wrench}>Tool discovery</SectionEyebrow>
                  <h2 className="font-display text-xl font-semibold">Available tools ({tools.length})</h2>
                </div>
                <span className="font-mono text-[10px] text-[#8f9bad]">{available ? `${tools.length} registered` : 'host required'}</span>
              </div>
              <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
                {tools.map((tool) => (
                  <button
                    type="button"
                    key={tool.name}
                    data-testid={`button-tool-${tool.name}`}
                    onClick={() => setSelected(tool.name)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition',
                      selected === tool.name ? 'border-[#d9a441]/70 bg-[#344158]' : 'border-transparent hover:border-[#536078] hover:bg-[#2b3951]'
                    )}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${tool.color}22`, color: tool.color }}>
                      <Code2 size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-[#f4f0e6]">{tool.name}</span>
                        <span className="rounded-full bg-[#344158] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[.1em] text-[#aeb8c8]">{tool.category}</span>
                      </span>
                      <span className="mt-1 block text-[10px] leading-5 text-[#9eaabc]">{tool.description}</span>
                    </span>
                    <ExternalLink size={13} className="mt-1 shrink-0 text-[#778398]" />
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#536078] bg-[#26344b] p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <SectionEyebrow icon={Radio}>Selected tool</SectionEyebrow>
                  <h2 className="font-mono text-[17px] font-semibold">{selectedTool.name}</h2>
                </div>
                <button type="button" data-testid="button-copy-tool-name" onClick={copyTool} className="rounded-lg border border-[#536078] p-2 text-[#aeb8c8] hover:bg-[#344158]">
                  <Copy size={14} />
                </button>
              </div>
              <div className="rounded-lg border border-[#536078] bg-[#1f2a3d] p-4">
                <div className="mb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#8f9bad]">Schema / intent</div>
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-6 text-[#d4d9df]">{`{
  "tool": "${selectedTool.name}",
  "decisionId": "demo-ai-assistant",
  "category": "${selectedTool.category}",
  "requiresHumanApproval": ${selectedTool.category === 'Governance'},
  "status": "${available ? 'discoverable' : 'waiting_for_host'}"
}`}</pre>
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#b1832f]/40 bg-[#5b4b2d]/30 p-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#d9a441]" />
                <p className="text-[10px] leading-5 text-[#d7c9a5]">
                  <strong className="text-[#f0dc9b]">Boundary-aware:</strong> proposals can be prepared by the agent, but state-changing governance actions cannot execute without human resolution.
                </p>
              </div>
              <button
                type="button"
                data-testid="button-test-tool"
                onClick={() =>
                  toast({
                    title: available ? 'Tool discovery is live' : 'WebMCP host required',
                    description: available
                      ? `${selectedTool.name} is ready for your WebMCP host.`
                      : 'Open this workspace in a supported WebMCP browser to invoke tools.',
                  })
                }
                className="mt-5 flex items-center gap-2 rounded-lg bg-[#d9a441] px-3.5 py-2.5 text-[11px] font-bold text-[#202d42] transition hover:bg-[#e6bb63]"
              >
                <Zap size={14} /> Inspect capability
              </button>
            </section>
          </div>

          <section className="mt-5 rounded-xl border border-[#536078] bg-[#26344b]">
            <div className="flex flex-col justify-between gap-3 border-b border-[#536078] p-5 sm:flex-row sm:items-center md:px-6">
              <div>
                <SectionEyebrow icon={GitBranch}>Live trace</SectionEyebrow>
                <h2 className="font-display text-xl font-semibold">Tool call log</h2>
              </div>
              <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.14em] text-[#7fb5aa]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5cb7a9]" /> {available ? 'streaming' : 'waiting'}
              </span>
            </div>

            {callLog.length === 0 ? (
              <div className="p-8 text-center text-[12px] text-[#8f9bad]">
                No WebMCP tool calls recorded yet in this session. Interact with ProofPilot or invoke tools via your browser agent to stream live traces here.
              </div>
            ) : (
              <div className="divide-y divide-[#536078]">
                {callLog.map((trace, index) => (
                  <div key={`${trace.time}-${trace.tool}-${index}`} data-testid={`row-tool-trace-${index}`} className="grid gap-2 px-5 py-4 text-[10px] md:grid-cols-[80px_230px_1fr_auto] md:items-center md:px-6">
                    <span className="font-mono text-[#7f8da2]">{trace.time}</span>
                    <span className="flex items-center gap-2 font-mono font-semibold text-[#dce1e6]">
                      <span className={cn('h-1.5 w-1.5 rounded-full', trace.status === 'blocked' ? 'bg-[#d9a441]' : trace.status === 'error' ? 'bg-[#d96b6b]' : 'bg-[#5cb7a9]')} />
                      {trace.tool}
                    </span>
                    <span className="font-mono text-[#9daabc]">{trace.detail}</span>
                    <span className={cn('w-fit rounded-full px-2 py-1 font-mono text-[8px] uppercase tracking-[.1em]', trace.status === 'blocked' ? 'bg-[#5b4b2d] text-[#e5c674]' : trace.status === 'error' ? 'bg-[#d96b6b]/20 text-[#f0a5a5]' : 'bg-[#284b4a] text-[#8dd2c6]')}>
                      {trace.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoChip icon={Layers3} value="4" label="tool categories" />
            <InfoChip icon={KeyRound} value="1" label="approval boundary" />
            <InfoChip icon={ShieldCheck} value="100%" label="calls observable" />
          </div>
        </div>
      </div>
    </ProofPilotShell>
  );
}

function InfoChip({ icon: Icon, value, label }: { icon: typeof Layers3; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#536078] bg-[#26344b] p-3">
      <Icon size={16} className="text-[#d9a441]" />
      <div>
        <div className="font-display text-lg font-semibold">{value}</div>
        <div className="font-mono text-[9px] uppercase tracking-[.1em] text-[#8f9bad]">{label}</div>
      </div>
    </div>
  );
}