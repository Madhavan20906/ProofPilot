# ProofPilot

**Decisions you can interrogate.**

ProofPilot is a human-agent decision workspace for choices that are too consequential to leave to a single model output. A human sets priorities. An agent investigates, scores, and proposes — live, through WebMCP tools registered directly on the page. Evidence and uncertainty stay visible the whole time. And anything that would actually change the outcome — a weight change, a final pick — stops at a human approval boundary before it takes effect.

It is not another chat-with-your-data tool. It is what a decision looks like when an agent can act on the page but cannot decide unilaterally on your behalf.

---

## The problem

Enterprise teams making high-stakes calls — which vendor, which tool, which architecture — don't actually want an AI's opinion. They want the *reasoning* made inspectable: what evidence supports it, what it contradicts, how stable the recommendation is if priorities shift, and who signed off on the parts that mattered. Most "AI assistant" tooling collapses all of that into a single confident answer and hides the work. ProofPilot keeps the work visible and puts a human hand on the parts that carry consequence.

## Why this needed WebMCP specifically

Before WebMCP, giving an agent this kind of access meant one of two bad options: a custom backend API only your own chat client could call, or letting a browser-automation agent click around your UI and hope it doesn't fat-finger an approval. WebMCP lets ProofPilot expose its actual domain logic — read the decision state, search evidence, run a sensitivity sweep, propose a weight change — as typed tools any WebMCP-aware agent host can discover and call, on the same page a human is looking at, in the same session, under the same trust boundary. The agent and the human are working the same object at the same time, not through two disconnected surfaces.

That's also why the tool catalog is split into tiers instead of being one flat list of 13 functions. **Discovery and Analysis tools execute freely** — an agent can read state, search evidence, run what-if scenarios, and detect contradictions without asking permission, because none of that changes anything. **Governance tools never apply consequential changes directly** — `propose_weight_change` and `propose_decision` prepare pending proposals; the actual mutation happens only through the human approval flow.

This maps WebMCP's tool-calling model onto an actual authority boundary, not just a feature list.

## What becomes possible that wasn't before

* An agent can genuinely *investigate* a decision — pull evidence, cross-check claims, run sensitivity analysis across weight ranges — without a human relaying screenshots back and forth.
* A human can see, in real time, exactly which tool the agent just called, with what input, and what it returned — because the Developer view surfaces live WebMCP call traces, not a black box.
* Consequential change cannot be silently applied by the agent. A proposed weight change or final pick sits as a visible, rejectable proposal until a human resolves it.

---

## How it works

1. **Set priorities.** Weight the criteria that matter (developer experience, privacy, cost, adoption) for your decision.
2. **Ask the agent to investigate.** Through a WebMCP-aware host such as ChatGPT's in-app browser or WebMCP-enabled Chrome, the agent calls `get_decision_state`, `get_evidence`, `search_evidence`, `detect_contradictions`, and `run_sensitivity_analysis`.
3. **Agent proposes, not decides.** If the agent thinks priorities should shift or a source needs adding, it calls a Governance tool, which produces a pending proposal — it cannot apply the consequential change itself.
4. **Human approves or rejects.** One click. The workspace recalculates in real time, and the resolution — who, what, when — is written to an append-only audit trail.
5. **Generate the brief.** `generate_decision_brief` compiles the live state — options evaluated, key evidence, remaining uncertainty, and decision actions — into an executive-ready summary.

---

## WebMCP Tool Catalog (13 tools, 4 tiers)

| Tier       | Tool                       | What it does                                                              |
| ---------- | -------------------------- | ------------------------------------------------------------------------- |
| Discovery  | `get_decision_state`       | Reads active options, criteria weights, findings, current leader          |
| Discovery  | `get_evidence`             | Inspects source claims, confidence %, reliability %, verification status  |
| Discovery  | `search_evidence`          | Filters evidence by keyword or supported option                           |
| Evidence   | `add_evidence`             | Submits a new source-backed claim and recalculates findings               |
| Analysis   | `compare_options`          | Deterministic weighted scoring across all options                         |
| Analysis   | `detect_contradictions`    | Surfaces conflicting claims and evidence gaps                             |
| Analysis   | `run_sensitivity_analysis` | Tests recommendation stability across weight ranges                       |
| Analysis   | `analyze_decision_risk`    | Computes risk level, unverified-source count, risk factors                |
| Analysis   | `evaluate_scenario`        | Ranks options under presets such as Enterprise Privacy and Cost-Optimized |
| Governance | `propose_weight_change`    | Prepares a weight change for human approval — cannot self-apply           |
| Governance | `propose_decision`         | Proposes a final pick for human sign-off — cannot self-apply              |
| Governance | `request_human_review`     | Explicitly pauses the workflow at the approval boundary                   |
| Output     | `generate_decision_brief`  | Compiles live state into an explainable executive brief                   |

Registered through the WebMCP model context API:

```ts
document.modelContext.registerTool({
  name: "propose_weight_change",
  description: "Prepares a criteria weight change for human approval. Does not auto-apply.",
  inputSchema: { /* ... */ },
  execute: async (input) => {
    /* returns a pending proposal */
  },
});
```

ProofPilot uses the native `document.modelContext` WebMCP path when available, with compatible host handling for environments that expose the model context API differently.

See `artifacts/proofpilot/src/lib/webmcp.ts` for all 13 registrations.

---

## Architecture

```text
 [ Human ] ──( priorities & approvals )──┐
                                          ▼
 [ WebMCP Host / Agent ] ──( 13 tools )──► [ ProofPilot Workspace ]
                                                    │
                                                    ▼
                                          [ Express API Server ]
                                                    │
                                                    ▼
                                          [ Decision Engine ]
                                (weighted scoring · sensitivity sweeps
                                 · contradiction detection · scenarios)
                                                    │
                                                    ▼
                                            [ PostgreSQL ]
```

**Frontend:** React 18, Vite, Tailwind, Wouter, TanStack Query.
**Backend:** Express, TypeScript, Zod, Vitest.
**Engine:** Deterministic multi-criteria decision analysis — scores, confidence, and risk are computed by the scoring engine, not asserted by a model.

---

## Try it live

**Live demo:** https://proofpilot-kappa.vercel.app

### How WebMCP Works in ChatGPT Desktop In-App Browser

ProofPilot is built natively for WebMCP host environments like the **ChatGPT Desktop App's in-app browser**:

1. **Open the Live Demo:** Navigate to `https://proofpilot-kappa.vercel.app` inside the ChatGPT desktop app browser.
2. **Automatic Tool Discovery:** As the page loads, ProofPilot automatically registers all 13 tools on `document.modelContext`. ChatGPT's agent host detects the available tool catalog across all 4 tiers (Discovery, Analysis, Governance, Output).
3. **Interact via Natural Language:** Prompt the ChatGPT agent directly in your chat:
   * *"Inspect the active decision state and summarize the evidence."* — ChatGPT invokes `get_decision_state` and `get_evidence`.
   * *"Detect contradictions and evidence gaps in this decision."* — ChatGPT invokes `detect_contradictions`.
   * *"Propose raising the Privacy & Control weight to 45%."* — ChatGPT invokes `propose_weight_change`.
4. **Observe Real-Time Functioning & Logs:**
   * **In ChatGPT Chat UI:** ChatGPT displays tool-execution badges (e.g., `Used tool propose_weight_change`).
   * **On the Live Webpage:** The page state updates dynamically (e.g., a glowing **Pending Proposal** card appears for human approval).
   * **In ProofPilot Developer Trace (`/developer`):** Open the `/developer` route inside the page to inspect real-time JSON traces of ChatGPT's tool invocations.

### How WebMCP Works in Google Chrome (149+)

1. Enable `chrome://flags/#enable-webmcp-testing` in Google Chrome 149+ and restart browser.
2. Open `https://proofpilot-kappa.vercel.app`.
3. Interact via WebMCP extensions/hosts or inspect registered tools via DevTools Console (`document.modelContext.getTools()`) or the `/developer` tab.

---

## How to Access Logs & Inspect WebMCP Execution Results

If you want to view, inspect, and verify the live logs and functioning results of ProofPilot's WebMCP tools during agent execution or manual testing, there are three primary observation channels:

### 1. Browser Developer Console (`F12` / `Ctrl+Shift+I`)
Open your browser's Developer Tools (`F12` or `Right-Click -> Inspect -> Console tab`) to view live execution logs and manually run any tool directly:
* **List all registered WebMCP tools:**
  ```javascript
  console.log(window.__WEBMCP_TOOLS__);
  // or via standard WebMCP modelContext API:
  console.log(document.modelContext.getTools());
  ```
* **Execute any tool manually & log its return result:**
  ```javascript
  const tools = document.modelContext.getTools();
  const getProposalTool = tools.find(t => t.name === 'propose_weight_change');
  const result = await getProposalTool.execute({ criterionId: 'privacy', proposedWeight: 45, reason: 'Manual Console Test' });
  console.log('Tool Result:', result);
  ```
* **Listen to real-time WebMCP execution events in console:**
  ```javascript
  window.addEventListener('proofpilot:webmcp-call', (event) => {
    console.log('[WebMCP Tool Call Log]:', event.detail);
  });
  ```

### 2. Built-in ProofPilot Developer Dashboard (`/developer` Route)
Navigate to the `/developer` page in the application UI (or click the **Developer** tab in the top navigation):
* **Live Call Trace Timeline:** Displays a real-time log of every WebMCP tool invocation, complete with timestamps, tool name, input arguments, execution status (`completed` or `error`), and returned payload.
* **Interactive Tool Registry:** Inspect all 13 registered tool schemas, descriptions, and parameter definitions directly in the UI.

### 3. Backend API & Server Terminal Logs
When running locally (`pnpm --filter @workspace/api-server dev`), the terminal window logs all HTTP REST calls made by WebMCP handlers and backend decision engine calculations (such as weighted scoring, sensitivity sweeps, and decision persistence).

---

### Functioning & Result Inspection by WebMCP Tool Category

ProofPilot organizes its 13 WebMCP tools into 4 distinct functional tiers. Here is how each category functions, how to test it, and what results to expect in your console and UI logs:

#### Category 1: Discovery & State Inspection Tools
* **Tools:** `get_decision_state`, `get_evidence`, `search_evidence`
* **Functioning:** Read-only retrieval of active decision choices, criteria weights, evidence coverage, source reliability, and top recommendations. Zero side effects.
* **How to Test in Console:**
  ```javascript
  await document.modelContext.getTools().find(t => t.name === 'get_decision_state').execute({});
  ```
* **Expected Log Result:** Returns complete workspace state JSON containing options, criteria weights, evidence sources, findings, and `recommendation` object (e.g. `{ optionName: "Gemini 1.5 Pro", score: 84.2 }`).

#### Category 2: Evidence & Analysis Tools
* **Tools:** `add_evidence`, `compare_options`, `detect_contradictions`, `run_sensitivity_analysis`, `analyze_decision_risk`, `evaluate_scenario`
* **Functioning:** Evaluates evidence claims, detects conflicting sources, computes overall decision risk, executes sensitivity sweeps across priority weight ranges, and benchmarks options under preset scenarios (`enterprise-privacy`, `cost-optimized`, etc.). Also allows agents to register new source evidence.
* **How to Test in Console:**
  ```javascript
  await document.modelContext.getTools().find(t => t.name === 'run_sensitivity_analysis').execute({ criterionId: 'privacy' });
  ```
* **Expected Log Result:**
  * **Sensitivity Analysis:** Returns a `points` array showing how recommendation winners shift across weight steps (10% to 50%).
  * **Risk Analysis:** Returns `overallRiskLevel` (`"Elevated"` or `"Low"`), count of unverified sources, and detailed risk factor items.
  * **Contradiction Detection:** Returns an array of conflicting evidence claims and information gaps.

#### Category 3: Governance Tools (Human-in-the-Loop)
* **Tools:** `propose_weight_change`, `propose_decision`, `request_human_review`
* **Functioning:** Handles all consequential actions. **Crucially, these tools NEVER mutate active decision state directly.** They create pending proposal objects that stop at the human approval boundary.
* **How to Test in Console:**
  ```javascript
  await document.modelContext.getTools().find(t => t.name === 'propose_weight_change').execute({ criterionId: 'privacy', proposedWeight: 45, reason: 'Security requirement' });
  ```
* **Expected Log Result & UI Behavior:**
  * **Log Output:** Returns `{ ok: true, action: { id, title: "Raise Privacy & Control to 45%", status: "Pending" } }`.
  * **UI Result:** A glowing **Pending Proposal Card** immediately appears in the workspace UI with **Approve** and **Reject** buttons.
  * **Governance Check:** Active decision state remains unchanged until a human clicks **Approve**.

#### Category 4: Output & Executive Brief Tools
* **Tools:** `generate_decision_brief`
* **Functioning:** Compiles live workspace state, evidence coverage, open contradictions, and pending proposals into an executive-ready report summary.
* **How to Test in Console:**
  ```javascript
  await document.modelContext.getTools().find(t => t.name === 'generate_decision_brief').execute({});
  ```
* **Expected Log Result:** Returns an executive brief JSON object with `title`, `recommendation`, `evidenceSummary`, `openContradictions`, and `pendingHumanActions`.

---

## Running locally

For development and local testing:

```bash
git clone https://github.com/Madhavan20906/ProofPilot.git
cd ProofPilot
cp .env.example .env
pnpm install

# frontend
pnpm --filter @workspace/proofpilot dev

# API server (separate terminal)
pnpm --filter @workspace/api-server dev
```

Run the test suite:

```bash
pnpm test
```

> The deployed URL above is the reference environment — production runs frontend and API together as a single Vercel deployment (`api/index.ts`), which local development does not replicate exactly.

---

## Security & governance principles

1. **Human-in-the-loop boundary.** Consequential actions — weight edits and final picks — are represented as pending proposals and require explicit human approval before the active decision state changes.
2. **Deterministic computation.** Scores, confidence, and risk come from the scoring engine, not from unvalidated model output.
3. **Audit trail.** Evidence additions, priority edits, and proposal resolutions are timestamped and attributed to an actor — human or agent.
4. **Agent authority is bounded.** WebMCP gives the agent useful decision capabilities without granting it unilateral authority over consequential state changes.

---

## Repository structure

* `artifacts/proofpilot/src/` — React workspace, landing page, developer trace view, WebMCP tool registry (`src/lib/webmcp.ts`)
* `artifacts/api-server/src/lib/decision-engine.ts` — scoring, sensitivity sweeps, contradiction detection, scenario engine
* `artifacts/api-server/src/lib/__tests__/decision-engine.test.ts` — automated test suite
* `artifacts/api-server/src/routes/decisions.ts` — REST API
* `api/index.ts` — production Vercel API entry point

---

## License

ProofPilot is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
