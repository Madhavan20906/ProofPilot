import { useLocation } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  GitBranch,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { ProofPilotShell, SectionEyebrow } from "@/components/proofpilot-shell";
import { isWebMcpAvailable } from "@/lib/webmcp";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <ProofPilotShell>
      <div className="min-h-[calc(100dvh-76px)] bg-[#1e293b] text-[#f8fafc]">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-[#334155] px-6 py-16 md:px-12 md:py-24">
          <div className="absolute right-[-100px] top-[-100px] h-[500px] w-[500px] rounded-full bg-[#d9a441]/10 blur-3xl pointer-events-none" />
          <div className="absolute left-[-100px] bottom-[-100px] h-[400px] w-[400px] rounded-full bg-[#38bdf8]/10 blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-[1120px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9a441]/40 bg-[#d9a441]/10 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-[#facc15]">
              <Sparkles size={13} /> Human-Agent Decision Intelligence Workspace
            </div>

            <h1 className="mt-6 max-w-[850px] font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.02] tracking-[-.05em] text-[#f8fafc]">
              Decisions you can <span className="text-[#facc15] underline decoration-[#d9a441]/50 underline-offset-8">interrogate</span>.
            </h1>

            <p className="mt-6 max-w-[720px] text-[15px] leading-8 text-[#94a3b8]">
              ProofPilot is the human-agent decision environment built for high-stakes enterprise choices where an answer alone is not enough. A human sets priorities, an agent investigates via WebMCP, uncertainty stays visible, and consequential actions stop for human approval.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                type="button"
                data-testid="button-launch-workspace"
                onClick={() => setLocation("/decisions/demo-ai-assistant")}
                className="flex items-center gap-2.5 rounded-xl bg-[#d9a441] px-6 py-3.5 font-display text-[14px] font-bold text-[#1e293b] shadow-lg shadow-[#d9a441]/20 transition hover:-translate-y-0.5 hover:bg-[#eab308]"
              >
                Launch Workspace Demo <ArrowRight size={16} />
              </button>

              <button
                type="button"
                data-testid="button-view-developer-tools"
                onClick={() => setLocation("/developer")}
                className="flex items-center gap-2 rounded-xl border border-[#475569] bg-[#334155]/60 px-5 py-3.5 font-mono text-[12px] font-semibold text-[#e2e8f0] transition hover:bg-[#334155]"
              >
                <Terminal size={15} className="text-[#38bdf8]" /> WebMCP Agent Tools
              </button>
            </div>

            {/* Architecture Highlights Banner */}
            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={Scale}
                title="Weighted Scoring Engine"
                description="Deterministic score calculation rebalanced instantly as priorities shift."
              />
              <FeatureCard
                icon={Zap}
                title="Dynamic Contradictions"
                description="Algorithmic comparison of evidence claims to surface conflicts & gaps."
              />
              <FeatureCard
                icon={LockKeyhole}
                title="Governance Boundary"
                description="Consequential proposals pause for explicit human review and approval."
              />
              <FeatureCard
                icon={Cpu}
                title="Native WebMCP Integration"
                description="13 browser-registered WebMCP tools for real-time agent interaction."
              />
            </div>
          </div>
        </section>

        {/* Core Thesis & How It Works */}
        <section className="border-b border-[#334155] bg-[#0f172a] px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto max-w-[1120px]">
            <SectionEyebrow icon={GitBranch}>Human + Agent Governance</SectionEyebrow>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-[-.03em] text-[#f8fafc]">
              How ProofPilot keeps humans in control
            </h2>

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <StepBox
                step="01"
                title="Human sets priorities"
                description="Assign relative weight percentages to Developer Experience, Team Adoption, Privacy & Control, or Cost to Scale."
              />
              <StepBox
                step="02"
                title="Agent investigates evidence"
                description="WebMCP tools scan public docs, enterprise policies, and pricing claims to calculate dynamic findings and confidence."
              />
              <StepBox
                step="03"
                title="Governance stop sign"
                description="The agent proposes weight updates or decision choices, but state-changing actions require human sign-off."
              />
            </div>
          </div>
        </section>

        {/* Live Demo Path Showcase */}
        <section className="px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto max-w-[1120px] rounded-2xl border border-[#334155] bg-[#0f172a]/80 p-8 md:p-12">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-[#facc15]">
                  Seeded Enterprise Demo Scenario
                </div>
                <h3 className="mt-2 font-display text-2xl font-bold text-[#f8fafc]">
                  Cursor vs GitHub Copilot vs Gemini Code Assist
                </h3>
                <p className="mt-2 max-w-[650px] text-[13px] leading-6 text-[#94a3b8]">
                  Interrogate real evidence, run sensitivity analysis across privacy and cost weights, review agent weight change proposals, and approve changes in real time.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLocation("/decisions/demo-ai-assistant")}
                className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-[#d9a441] px-6 py-3.5 font-display text-[13px] font-bold text-[#1e293b] transition hover:bg-[#eab308]"
              >
                Open Demo Workspace <ArrowRight size={15} />
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 border-t border-[#334155] pt-6 text-[12px] text-[#cbd5e1]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#38bdf8]" /> 13 WebMCP tools active
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#38bdf8]" /> Audit trail timeline
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#38bdf8]" /> Explainable decision brief
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProofPilotShell>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Scale;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[#334155] bg-[#0f172a]/60 p-5 transition hover:border-[#d9a441]/50">
      <Icon size={20} className="text-[#facc15]" />
      <h3 className="mt-3 font-display text-[15px] font-semibold text-[#f8fafc]">{title}</h3>
      <p className="mt-1.5 text-[11px] leading-5 text-[#94a3b8]">{description}</p>
    </div>
  );
}

function StepBox({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-xl border border-[#334155] bg-[#1e293b] p-6">
      <span className="font-mono text-[11px] font-bold text-[#facc15]">{step}</span>
      <h3 className="mt-2 font-display text-lg font-semibold text-[#f8fafc]">{title}</h3>
      <p className="mt-2 text-[12px] leading-6 text-[#94a3b8]">{description}</p>
    </div>
  );
}
