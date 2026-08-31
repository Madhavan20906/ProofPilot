---
name: WebMCP preview behavior
description: WebMCP registration depends on the host browser exposing document.modelContext.
---

The standard Replit preview browser may not expose WebMCP even when the app registers tools correctly. The product should label that state as unavailable or host-required, not as a connected agent session.

**Why:** Claiming the tools are live in an unsupported preview makes the trust boundary look like a mock and weakens the demo.

**How to apply:** Gate WebMCP status and live call claims on document.modelContext; keep the API and UI demo usable without a WebMCP host.