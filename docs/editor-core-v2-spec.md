# Editor Core v2 Spec (Step 1)

## Purpose

Define the behavioral contract for the editor core rewrite so implementation can start at Step 2 with minimal ambiguity.

Primary source: `docs/core-ux.md`.

This doc is intentionally implementation-ready and limited to current phase scope.

## Phase Scope

### In scope

- Core editor behavior for document-like keyboard editing
- Step structure and navigation semantics
- Enter / Backspace / Delete behavior contract
- Slash command behavior contract for structural insertion
- Naming and primitive definitions for v2

### Out of scope

- Final data model/schema completeness
- Final branching model and deep nesting
- Full collect/action/handoff feature set
- Cross-step selection snapping behavior

## Canonical Naming (v2)

- Editor entry component: `Editor`
- Step title node: `step_title`
- End-of-step insertion row: `composer`

Use these names consistently in code, docs, and tests.

## Mental Model

The script is one continuous document composed of steps.

Each step is rendered in canonical order and ends with a dedicated `composer` line.

The user should experience:

- Natural arrow key movement through visible content
- Predictable Enter behavior by context
- Safe, reversible deletion behavior
- Structural insertion from one predictable place (`composer`)

Additionally, early-step authoring should be frictionless:

- New step starts as `step_title` + `composer`.
- Typing in `composer` can bootstrap `say` automatically (before advanced nodes exist).

## Core Primitives (foundation only)

Minimum node concepts required in this phase:

- `step`
- `step_title`
- `say` (text block, created lazily)
- `composer`

Additional structured lines are deferred, but the keyboard behavior system should support adding them without redesign.

## Invariants

1. Every step must include exactly one `step_title`.
2. Every step must end with exactly one `composer`.
3. New step initial shape is `step_title + composer`.
4. `say` is optional at creation time and is added lazily from `composer` typing in smart mode.
5. Structural insertion (slash) is only valid on `composer`.
6. Step internal order is canonical (no arbitrary reordering in this phase).

## Composer-Say Intersection (resolved behavior)

`composer` has two modes, derived from step structure:

- `smart` mode: step has no custom nodes yet.
  - Typing plain text in `composer` creates `say` above `composer` and inserts the typed text into `say`.
  - `/` opens slash menu.
  - `Enter` creates a new step below.

- `dumb` mode: step has at least one custom node.
  - `composer` is structural-only.
  - `/` opens slash menu.
  - `Enter` creates a new step below.
  - Plain text typing in `composer` is not accepted.

`step_title` navigation for fresh steps:

- `Enter` and `ArrowDown` from `step_title` go to `composer` when `say` does not exist yet.
- If `say` exists, `step_title` navigation targets `say`.

## Keyboard Behavior Truth Table

The table below is the implementation contract for this phase.

### Enter

| Context                  | Condition            | Result                                        | Notes                                     |
| ------------------------ | -------------------- | --------------------------------------------- | ----------------------------------------- |
| `say` text block         | Cursor inside text   | Insert newline                                | Standard text editing                     |
| `step_title`             | `say` exists         | Move cursor to start of `say`                 | `step_title` acts like heading completion |
| `step_title`             | `say` does not exist | Move cursor to `composer`                     | Fresh-step navigation                     |
| `composer`               | Always               | Create new step below, focus new `step_title` | Primary "new paragraph/step" gesture      |
| Structured line (future) | Multi-row list line  | Create next row                               | Reserved for later node types             |
| Structured line (future) | Single-value line    | Move to next logical line                     | Reserved for later node types             |

### Text input

| Context    | Condition                           | Result                                                    | Notes                            |
| ---------- | ----------------------------------- | --------------------------------------------------------- | -------------------------------- |
| `composer` | `smart` mode + printable text input | Create `say` above `composer`, insert typed text in `say` | Bootstrap simple step authoring  |
| `composer` | `dumb` mode + printable text input  | No text insertion                                         | Composer remains structural-only |

### Backspace

| Context                  | Condition                                      | Result                                               | Notes                                                   |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `say` text block         | Normal text context                            | Standard backspace behavior                          | Text-local edit                                         |
| `say` text block         | At start of first char in `say`                | No structural delete                                 | Prevent accidental block removal via boundary backspace |
| `step_title`             | Empty title, step otherwise empty baseline     | Delete step, move cursor to previous step `composer` | If previous step exists                                 |
| `step_title`             | Non-empty title or step has meaningful content | No-op (structural)                                   | Prevent accidental destructive merge                    |
| `composer`               | Empty                                          | Move focus to previous logical line end              | Navigation behavior                                     |
| Structured line (future) | Empty line                                     | Delete line/block and relocate cursor                | Reserved for later node types                           |

### Delete (forward delete)

| Context                                     | Condition              | Result                  | Notes                                          |
| ------------------------------------------- | ---------------------- | ----------------------- | ---------------------------------------------- |
| Text block                                  | Normal text context    | Standard forward delete | Text-local edit                                |
| Block boundary across different block types | Cursor at boundary     | No-op structural merge  | Prevent invalid type merge                     |
| `composer` end of step                      | Forward into next step | No-op structural merge  | Cannot merge next step into current via Delete |

### Arrow keys

| Key        | Context           | Result                                                                   |
| ---------- | ----------------- | ------------------------------------------------------------------------ |
| Up/Down    | Inside text block | Move by visual line first; cross block boundary at edge                  |
| Left/Right | Within line       | Standard cursor movement; wraps at edges where supported by editor model |

Note: exact cross-node edge behavior should match achievable ProseMirror/Tiptap behavior while preserving document feel.

## Slash Command Contract (v2)

1. Trigger only on `composer`.
2. Do not hijack `/` inside text blocks.
3. Menu shows only valid insertions for current step state.
4. Selecting an item inserts block into canonical step position.
5. Focus moves to the inserted block's primary editable target.

For this phase, allowed items can be minimal, but architecture must support conditional visibility.

## Deletion Safety Rules

- Never merge across incompatible block types via Backspace/Delete.
- Never delete non-empty structural content from a single keypress unless explicitly defined by context rule.
- Empty-item deletion must always relocate cursor to a deterministic previous logical position.

## Open Questions / Explicit Assumptions

Assumptions for Step 2 implementation (can be revised later):

1. `composer` is a dedicated node/line (not simulated by an extra blank step).
2. Enter on `step_title` is navigation (to `say` if present, otherwise to `composer`), not newline-in-title.
3. `composer` mode (`smart`/`dumb`) is derived from current step content, not persisted as separate state.

Open questions to revisit after core behavior works:

1. Should there be one global slash menu model or per-step filtered providers?
2. Exact cursor landing position when previous step is absent on delete operations.

## Test Matrix (minimum for Step 2+)

Implement as behavior tests (not visual tests):

- Enter on `composer` creates exactly one new step below and focuses new `step_title`.
- Enter on `step_title` moves focus to `composer` when `say` is absent.
- Enter on `step_title` moves focus to `say` when `say` exists.
- Typing text in smart `composer` creates `say` and inserts the typed text.
- Typing text in dumb `composer` does not insert text.
- Backspace on empty deletable `step_title` removes step and relocates focus correctly.
- Backspace at start of `say` does not delete block.
- Slash menu appears on `composer` and not in `say` / `step_title`.
- Slash insertion places node in canonical location and focuses expected target.

## Step 2 Handoff

When starting Step 2 in a new chat, use this as the exact handoff context:

1. Implement `Editor` v2 core using this spec and `docs/core-ux.md`.
2. Keep old implementation available until parity checks pass.
3. Start with primitives (`step`, `step_title`, `say`, `composer`) and node-owned keyboard handlers with shared guards/helpers.
4. Do not expand scope into full data model or advanced block types.
