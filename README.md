# ProofPilot

**Decisions you can interrogate.**

ProofPilot is a human-agent decision workspace for choices that are too consequential to leave to a single model output. A human sets priorities. An agent investigates, scores, and proposes — live, through WebMCP tools registered directly on the page. Evidence and uncertainty stay visible the whole time. And anything that would actually change the outcome — a weight change, a final pick — stops at a human approval boundary before it takes effect.

It is not another chat-with-your-data tool. It is what a decision looks like when an agent can act on the page but cannot decide unilaterally on your behalf.

---

## The problem

Enterprise teams making high-stakes calls — which vendor, which tool, which architecture — don't actually want an AI's opinion. They want the *reasoning* made inspectable: what evidence supports it, what it contradicts, how stable the recommendation is if priorities shift, and who signed off on the parts that mattered. Most "AI assistant" tooling collapses all of that into a single confident answer and hides the work. ProofPilot keeps the work visible and puts a human hand on the parts that carry consequence.

## Why this needed WebMCP specifically

Before WebMCP, giving an agent this kind of access meant one of two bad options: a custom backend API only your own chat client could call, or letting a browser-automation agent click around your UI and hope it doesn't fat-finger an approval. WebMCP lets ProofPilot expose its actual domain logic — read the decision state, search evidence, run a sensitivity sweep, propose a weight change — as typed tools any WebMCP-aware agent host can discover and call, on the same page a human is looking at, in the same session, under the same trust boundary. The agent and the human are working the same object at the same time, not through two disconnected surfaces.

That's also why the tool catalog is split into tiers instead of being one flat list of 13 functions. **Discovery and Analysis tools execute freely** — an agent can read state, search evidence, run what-if scenarios, and detect contradictions without asking permission, because none of that changes anything. **Governance tools never execute directly** — `propose_weight_change` and `propose_decision` can only ever *prepare* a proposal; the actual mutation happens only after a human clicks Approve in the UI. This maps WebMCP's tool-calling model onto an actual authority boundary, not just a feature list.

## What becomes possible that wasn't before

- An agent can genuinely *investigate* a decision — pull evidence, cross-check claims, run sensitivity analysis across weight ranges — without a human relaying screenshots back and forth.
- A human can see, in real time, exactly which tool the agent just called, with what input, and what it returned — because the Developer view surfaces live WebMCP call traces, not a black box.
- Consequential change is structurally incapable of happening silently. A proposed weight change or final pick sits as a visible, rejectable card until a human resolves it — this is enforced in the tool's `requiresHumanApproval` execution path, not just implied by the UI.

---

## How it works

1. **Set priorities.** Weight the criteria that matter (developer experience, privacy, cost, adoption) for your decision.
2. **Ask the agent to investigate.** Through any WebMCP-aware host (ChatGPT's in-app browser, WebMCP-enabled Chrome), the agent calls `get_decision_state`, `get_evidence`, `search_evidence`, `detect_contradictions`, `run_sensitivity_analysis` — all read-only, all executing live.
3. **Agent proposes, not decides.** If the agent thinks priorities should shift or a source needs adding, it calls a Governance tool, which produces a pending proposal — it cannot apply the change itself.
4. **Human approves or rejects.** One click. The workspace recalculates in real time, and the resolution — who, what, when — is written to an append-only audit trail.
5. **Generate the brief.** `generate_decision_brief` compiles the live state — options evaluated, key evidence, remaining uncertainty, who approved what — into an executive-ready summary.

---

## WebMCP Tool Catalog (13 tools, 4 tiers)

| Tier | Tool | What it does |
|---|---|---|
| Discovery | `get_decision_state` | Reads active options, criteria weights, findings, current leader |
| Discovery | `get_evidence` | Inspects source claims, confidence %, reliability %, verification status |
| Discovery | `search_evidence` | Filters evidence by keyword or supported option |
| Evidence | `add_evidence` | Submits a new source-backed claim and recalculates findings |
| Analysis | `compare_options` | Deterministic weighted scoring across all options |
| Analysis | `detect_contradictions` | Surfaces conflicting claims and evidence gaps |
| Analysis | `run_sensitivity_analysis` | Tests recommendation stability across weight ranges |
| Analysis | `analyze_decision_risk` | Computes risk level, unverified-source count, risk factors |
| Analysis | `evaluate_scenario` | Ranks options under presets (Enterprise Privacy, Cost-Optimized, etc.) |
| Governance | `propose_weight_change` | Prepares a weight change for human approval — **cannot self-apply** |
| Governance | `propose_decision` | Proposes a final pick for human sign-off — **cannot self-apply** |
| Governance | `request_human_review` | Explicitly pauses the workflow at the approval boundary |
| Output | `generate_decision_brief` | Compiles live state into an explainable executive brief |

Registered via the standard pattern on `document.modelContext` / `navigator.modelContext`:

```ts
document.modelContext.registerTool({
  name: "propose_weight_change",
  description: "Prepares a criteria weight change for human approval. Does not auto-apply.",
  inputSchema: { /* ... */ },
  execute: async (input) => { /* returns a pending proposal, never mutates state directly */ },
});
