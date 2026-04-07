# Editor Core Rewrite Plan (v2)

## Context

We are building a document-first script editor for non-technical users (Notion/Docs mental model), not a form builder.

Current priority is to establish a strong, simple foundation for core editing behaviors before adding more node types.

Source of truth for interaction behavior: `docs/core-ux.md`.

## Scope for this phase

### In scope (rewrite now)

- `Editor` core orchestration (v2 core editor shell)
- `Step` behavior and structure
- Slash command system
- Keyboard semantics for Enter/Backspace/Delete

### Out of scope (defer)

- Final JSON/data model completeness
- Rich collect/branch/action/handoff semantics
- Cross-step selection snapping
- Advanced nesting and routing models

## Decision: Rewrite vs Incremental

- **Editor core:** partial rewrite (new behavior layer, keep Tiptap stack)
- **Step:** rewrite
- **Slash commands:** rewrite
- **Other block types:** defer and reattach later

Rationale: current behavior is coupled and ad hoc; a clean v2 core lowers future complexity and makes later node work additive.

## Implementation strategy

Use a strangler approach:

- Build `v2` in parallel with existing implementation
- Keep old POC available until v2 reaches core behavior parity
- Migrate consumers/node types incrementally

## Work plan

1. **Behavior spec extraction**
   - Convert `docs/core-ux.md` into a compact keyboard truth table.
   - Cover contexts: `step_title`, text block interior, text block boundary, structured line (empty/non-empty), composer.
   - Output: `docs/editor-core-v2-spec.md`.

2. **Define v2 primitives**
   - Minimal nodes for foundation: `step`, `step_title`, `say`, `composer`.
   - Define one generic structured-line contract for future blocks.
   - Enforce canonical order within a step.

3. **Implement composer/say intersection semantics**
   - New step initializes as `step_title` + `composer`.
   - `composer` smart mode: typing creates `say` above `composer` and inserts text.
   - `composer` dumb mode: structural-only (`/` and `Enter`), no plain text insertion.
   - `step_title` navigation targets `composer` when `say` is absent, otherwise `say`.

4. **Implement Enter semantics**
   - Text blocks: newline behavior.
   - Composer line: Enter creates new step below and focuses `step_title`.
   - Structured lines: use rule-based behavior from spec.

5. **Implement Backspace/Delete semantics**
   - Empty-item deletion + cursor relocation.
   - Prevent invalid merges across block types.
   - Preserve hard wall rules (e.g. non-deletable base say block if applicable).

6. **Rewrite Slash for structural insertion**
   - Trigger only on composer.
   - Show only valid options for current step state.
   - Insert blocks into canonical position; move cursor/focus deterministically.

7. **Add test coverage for behaviors**
   - Scenario tests for keyboard semantics (Enter/Backspace/Delete).
   - Scenario tests for composer mode transitions (smart <-> dumb).
   - Scenario tests for slash availability and insertion outcomes.
   - Focus on behavior-level tests, not styling.

8. **Parity review against `docs/core-ux.md`**
   - Run checklist and mark implemented/deferred items.
   - Confirm no regressions in continuous document feel.

9. **Prepare for incremental node migration**
   - Document extension points for collect/branch/condition/outcome.
   - Add short integration notes for adding a new structured line type.

## Deliverables

- `Editor` with core behavior parity for this phase
- Shared keyboard guard/helpers module
- New slash command module aligned with composer model
- Spec/checklist doc derived from `docs/core-ux.md`
- Behavior tests for key scenarios

## Acceptance criteria (phase complete)

- Enter/Backspace/Delete behavior matches the implemented subset of `docs/core-ux.md`.
- Slash commands are structural and composer-only.
- Step creation/deletion/navigation feels document-like and predictable.
- Core keyboard behavior is consistent and easy to extend with new structured line types.
- Existing POC remains available until migration decision is finalized.
