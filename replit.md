# ProofPilot

An evidence-backed decision workspace where humans set priorities, agents investigate through WebMCP, and consequential changes stay human-approved.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/proofpilot/src/` — React decision workspace, supporting pages, and WebMCP registration
- `artifacts/api-server/src/routes/decisions.ts` — validated decision API and persistence
- `artifacts/api-server/src/lib/decision-engine.ts` — scoring, confidence, demo seed, and stability calculations
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/decisions.ts` — persisted state schema

## Architecture decisions

- The demo uses a deterministic scoring engine so every agent result is inspectable and repeatable.
- Agent writes are represented as pending actions and only apply after a human resolution.
- The browser registers WebMCP tools only when `document.modelContext` is actually available; unsupported hosts are labeled honestly.
- The active demo is persisted in PostgreSQL as a JSONB decision state, keeping the first build compact while leaving room for normalized tables later.

## Product

ProofPilot lets teams compare options against weighted criteria, inspect source-backed evidence, surface contradictions and gaps, test recommendation stability, review agent proposals, and generate an explainable decision brief.

## User preferences

No additional preferences recorded.

## Gotchas

- Standard preview browsers may not expose WebMCP; the app must never show a connected state unless `document.modelContext` exists.
- Run API codegen after changing `lib/api-spec/openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
