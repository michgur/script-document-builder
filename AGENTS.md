# Brief: Call Script Editor

## What we are building

We build AI phone agents. This project is a document-first script editor so non-technical users can author call scripts directly (Google Docs/Notion mental model), without editing JSON.

The editor should feel like writing a document, with progressive disclosure for advanced logic.

## Product principles

- The document is the config.
- Keyboard-first, continuous editing flow.
- Keep simple steps lightweight.
- Reveal advanced structure only when needed.

## Current implementation focus (active)

Source of truth: `docs/core-ux.md` and `docs/editor-core-v2-spec.md`.

Current priority is **core editor foundation**, not feature completeness:

1. Enter / Backspace / Delete semantics
2. Slash command rewrite (structural insertion)
3. Clean, extensible `Editor` + `Step` core architecture

Defer for later:

- Full/final data model
- Rich node-specific features (collect/action/handoff details)
- Cross-step selection snapping
- Advanced branching and deep nesting

## Naming (v2)

- `Editor`
- `step_title`
- `composer`

Use these names consistently in code and docs.

## Script schema (high-level)

Top-level script sections:

- `info`
- `tone`
- `context`
- `knowledge`
- `outcomes`
- `steps`

Core step types (product-level):

- `say`
- `collect`
- `branch`
- `action`
- `handoff`

Common step properties:

- `name`
- `type`
- `say` (optional)
- `instruction` (optional)
- `only_if` (optional)
- `outcome` (optional)

Note: exact model and routing details are evolving; prioritize editor interaction quality first.

## Reference material

- Keyboard behavior deep dive: `docs/core-ux.md`
- Rewrite plan: `docs/editor-core-rewrite-plan.md`
- Step 1 implementation spec: `docs/editor-core-v2-spec.md`
- Example client script docs: `scripts-mds/`
