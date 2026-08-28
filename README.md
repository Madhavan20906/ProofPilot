# ProofPilot

**Decisions you can interrogate.**

ProofPilot is a human-agent decision intelligence workspace built for high-stakes choices where an answer alone is not enough. A human sets priorities, an agent investigates through WebMCP, evidence and uncertainty stay visible, and consequential changes stop for explicit human approval.

---

## 🚀 Judge & Evaluator Quickstart

### 1. Run Automated Unit Tests
Verify decision scoring, weight normalization, dynamic contradiction detection, and scenario evaluation:
```bash
pnpm test
```

### 2. Run the Full Application Locally
```bash
pnpm install
pnpm dev
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🛠️ Step-by-Step Guide: How to Test WebMCP Integration

ProofPilot registers **13 native WebMCP tools** directly onto `window.navigator.modelContext` / `document.modelContext`.

### Browser Prerequisite & Setup
1. **Supported Browser**: Use Google Chrome (128+) or Microsoft Edge with WebMCP enabled.
2. **Enable WebMCP Flag** (if testing native browser agent capability):
   - Navigate to `chrome://flags`
   - Search for `#enable-model-context-protocol` or WebMCP experimental features and set to **Enabled**.
   - Alternatively, open the **Developer Page** (`/developer`) inside ProofPilot to inspect the live WebMCP registration status and tools catalog.

### Exact Interactive Agent Test Workflow for Judges

Follow this step-by-step sequence to test human-agent decision governance:

1. **Step 1: Launch Workspace**
   - Open `/decisions/demo-ai-assistant` or click **Launch Workspace Demo** from `/`.
   - Observe initial leader: **GitHub Copilot** with an **82% evidence confidence**.

2. **Step 2: Ask Agent to Discover Decision & Evidence State**
   - **Agent Prompt**: *"Inspect the active decision state and summarize the evidence."*
   - **WebMCP Tool Invoked**: `get_decision_state` and `get_evidence`
   - **Result**: Returns options (Cursor, GitHub Copilot, Gemini Code Assist), criteria weights, and linked evidence items.

3. **Step 3: Run Dynamic Contradiction & Gap Detection**
   - **Agent Prompt**: *"Detect contradictions and evidence gaps in our AI assistant decision."*
   - **WebMCP Tool Invoked**: `detect_contradictions`
   - **Result**: Algorithmic scan surfaces pricing contradictions and missing security audit evidence.

4. **Step 4: Evaluate Weight Scenarios & Sensitivity**
   - **Agent Prompt**: *"Evaluate the decision under an Enterprise Privacy-First scenario."*
   - **WebMCP Tool Invoked**: `evaluate_scenario` or `run_sensitivity_analysis`
   - **Result**: Demonstrates crossover where Gemini Code Assist leads when privacy weight is raised above 35%.

5. **Step 5: Test Governance Approval Boundary (The Stop Sign)**
   - **Agent Prompt**: *"Propose updating the Privacy & Control weight to 45%."*
   - **WebMCP Tool Invoked**: `propose_weight_change`
   - **Result**: The agent **cannot** directly mutate active weights. Instead, a **Pending Proposal** card appears in the UI with an **Approve** and **Reject** button.

6. **Step 6: Human Approval & Real-Time Recalculation**
   - Click **Approve change** on the yellow Approval Boundary card.
   - Watch the workspace recalculate in real time: **Gemini Code Assist** takes the lead, confidence updates, and audit trail logs the human approval.

7. **Step 7: Generate Executive Decision Brief**
   - Navigate to `/brief` or issue **Agent Prompt**: *"Generate an explainable decision brief."*
   - **WebMCP Tool Invoked**: `generate_decision_brief`
   - **Result**: Compiles an executive brief detailing options evaluated, key evidence, remaining uncertainty, and posture.

---

## 🧰 WebMCP Tool Catalog (13 Registered Tools)

| Category | Tool Name | Description & Intent |
| --- | --- | --- |
| **Discovery** | `get_decision_state` | Reads active decision options, criteria weights, findings, and current leader. |
| **Discovery** | `get_evidence` | Inspects source claims, confidence %, reliability %, and verification status. |
| **Discovery** | `search_evidence` | Filters evidence items by keyword query or supported option ID. |
| **Evidence** | `add_evidence` | Submits new source-backed evidence claim to recalculate findings. |
| **Analysis** | `compare_options` | Computes deterministic weighted scores for all options. |
| **Analysis** | `detect_contradictions` | Algorithmically compares evidence text to surface conflicts & missing gaps. |
| **Analysis** | `run_sensitivity_analysis` | Tests recommendation stability across weight ranges for any criterion. |
| **Analysis** | `analyze_decision_risk` | Computes risk level, unverified sources count, and risk factors. |
| **Analysis** | `evaluate_scenario` | Ranks options under standard presets ("Enterprise Privacy", "Cost-Optimized", etc.). |
| **Governance** | `propose_weight_change` | Prepares criteria weight change for human approval (does not auto-apply). |
| **Governance** | `propose_decision` | Proposes final decision choice for human sign-off. |
| **Governance** | `request_human_review` | Pauses consequential workflow at the human approval boundary. |
| **Output** | `generate_decision_brief` | Compiles live decision state into an explainable executive brief. |

---

## 🏗️ Architecture & Technical Stack

```text
  [ Human User ] ──( Priorities & Approvals )──┐
                                              ▼
[ WebMCP Host / Agent ] ──( 13 WebMCP Tools )──► [ ProofPilot Workspace ]
                                                      │
                                                      ▼
                                            [ Express API Server ]
                                                      │
                                                      ▼
                                           [ Decision Engine ]
                                  ( Scoring · Sensitivity · Contradictions )
                                                      │
                                                      ▼
                                             [ PostgreSQL / DB ]
```

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Wouter Routing, TanStack Query.
- **Backend**: Express, TypeScript, Zod Validation, Vitest.
- **Engine**: Deterministic multi-criteria decision analysis (MCDA), dynamic evidence claim analysis, scenario reweighting.

---

## 📁 Repository Structure

- `artifacts/proofpilot/src/` — React decision workspace, landing page, developer tools log, decision brief, and WebMCP tool registry (`src/lib/webmcp.ts`)
- `artifacts/api-server/src/lib/decision-engine.ts` — Core computational engine (scoring, sensitivity sweeps, dynamic contradiction & gap detection, scenario engine)
- `artifacts/api-server/src/lib/decision-engine.test.ts` — Comprehensive Vitest automated test suite
- `artifacts/api-server/src/routes/decisions.ts` — Express REST API endpoints

---

## 🔐 Security & Governance Principles

1. **Human-in-the-Loop Boundary**: Consequential actions (weight edits, final option choices) require explicit human sign-off.
2. **Deterministic Computation**: Scores and confidence values are computed deterministically by the scoring engine rather than unvalidated model output.
3. **Audit Trail**: Every evidence addition, priority edit, and proposal resolution is logged with timestamps and actor roles.

---

## 📄 License

MIT. See [LICENSE](./LICENSE).