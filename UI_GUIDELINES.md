# Steps Editor UX Design

## Core Mental Model

The script reads like a screenplay. The dominant content is **what the agent says**. Everything else — field types, extraction rules, API config — is annotation on that conversation. The editor should feel like reading a conversation with structured annotations, not like configuring a form.

---

## 1. Block Anatomy

Every step is a block. Blocks share a common layout but adapt based on type.

### Universal Block Structure

```text
┌──────────────────────────────────────────────────────────┐
│ ⠿  💬 Say     greeting                          ⋯  ▸   │
│                                                          │
│   I'm an advisor with Care-In-Homes following up about   │
│   your request for senior care.                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **⠿** — drag handle (visible on hover)
- **Icon + Type chip** — color-coded, always visible, clickable to change type
- **Step name** — inline editable, muted text weight relative to the say text
- **⋯** — overflow menu (delete, duplicate, add only_if, set outcome)
- **▸** — expand/collapse toggle for secondary properties (hidden if none exist)
- **Say text** — the main body, full-width, looks like regular prose. This is the hero content

The say text should feel like typing in a doc. No label, no input border. Just text. Variable references like `{search_zip}` render as inline chips that are visually distinct (e.g., colored pill with the variable name).

---

## 2. Per-Type Block Design

### Say — The Baseline

The simplest block. Name + say text. No expandable properties (unless outcome or only_if are set). This is the "paragraph" of the editor.

```text
┌──────────────────────────────────────────────────────────┐
│ ⠿  💬 Say     greeting                              ⋯   │
│                                                          │
│   I'm an advisor with Care-In-Homes following up about   │
│   your request for senior care.                          │
└──────────────────────────────────────────────────────────┘
```

No expand toggle. What you see is what there is.

---

### Collect — Say + Capture

Looks like a say block with an **answer bar** beneath the say text. The answer bar shows what's being collected — making the "question → answer" structure visual.

```text
┌──────────────────────────────────────────────────────────┐
│ ⠿  📥 Collect     still looking for care         ⋯  ▸   │
│                                                          │
│   Are you still looking for care?                        │
│                                                          │
│   ┌ Answer ─────────────────────────────────────────┐    │
│   │  ● Yes / No                                     │    │
│   └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

The **answer bar** adapts to field type:

| Field type  | Answer bar shows                                                 |
| ----------- | ---------------------------------------------------------------- |
| `yes/no`    | `● Yes / No` — a simple label                                    |
| `text`      | `● Free text` — plus extraction hint if set                      |
| `number`    | `● Number` — plus extraction hint if set                         |
| `selection` | Pills for each choice: `Mother` `Father` `Spouse` `Self` `Other` |

For **selection**, the choices are visible inline as editable chips. You can click to edit, press tab to add another, press backspace on empty to remove. Feels like a tags input.

```text
│   ┌ Answer ─────────────────────────────────────────┐    │
│   │  Mother  Father  Spouse  Self  Other    + Add   │    │
│   └─────────────────────────────────────────────────┘    │
```

**Expanded state (▸ → ▾)** reveals secondary properties:

```text
│   ▾ More                                                 │
│   ┌──────────────────────────────────────────────────┐   │
│   │ Extraction   A 5-digit US zip code.              │   │
│   │ Instruction  (empty — click to add)              │   │
│   └──────────────────────────────────────────────────┘   │
```

Extraction and instruction only appear when relevant (extraction for text/number only). Empty fields show a ghost placeholder, not a visible empty input.

---

### Branch — The Fork

This is the hardest block. It needs to:

1. Show which field it's branching on
2. Show the branch paths clearly
3. Contain nested steps within each path
4. Handle deep nesting without drowning in indentation

**Design: Vertical lanes with a left rail**

```text
┌──────────────────────────────────────────────────────────┐
│ ⠿  🔀 Branch     route by interest               ⋯      │
│      on  still looking for care ▾                        │
│                                                          │
│   ┃ ▾ yes                                                │
│   ┃                                                      │
│   ┃   ┌──────────────────────────────────────────────┐   │
│   ┃   │ 📥 Collect   zip code              ⋯  ▸     │   │
│   ┃   │ Can you please share the zip code where you  │   │
│   ┃   │ need care?                                   │   │
│   ┃   │ ┌ Answer ─────────────────────────────┐      │   │
│   ┃   │ │ ● Free text                         │      │   │
│   ┃   │ └─────────────────────────────────────┘      │   │
│   ┃   └──────────────────────────────────────────────┘   │
│   ┃   ┌──────────────────────────────────────────────┐   │
│   ┃   │ 📥 Collect   care recipient         ⋯  ▸    │   │
│   ┃   │ Who is the care for?                         │   │
│   ┃   │ ┌ Answer ────────────────────────────┐       │   │
│   ┃   │ │ Mother Father Spouse Self Other    │       │   │
│   ┃   │ └────────────────────────────────────┘       │   │
│   ┃   └──────────────────────────────────────────────┘   │
│   ┃                                                      │
│   ┃   ... (more steps)                                   │
│   ┃                                                      │
│   ┃   + Add step                                         │
│   ┃                                                      │
│   ┃ ▾ no                                                 │
│   ┃                                                      │
│   ┃   ┌──────────────────────────────────────────────┐   │
│   ┃   │ 💬 Say   not interested              ⋯       │   │
│   ┃   │ Ok, thank you for your time...               │   │
│   ┃   └──────────────────────────────────────────────┘   │
│   ┃   ┌──────────────────────────────────────────────┐   │
│   ┃   │ 📞 Handoff   end call               ⋯       │   │
│   ┃   │ Hang up                                      │   │
│   ┃   └──────────────────────────────────────────────┘   │
│   ┃                                                      │
│   ┃   + Add step                                         │
│   ┃                                                      │
│   + Add branch path                                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Key design decisions:

- **Left rail** (`┃`) — a colored vertical line that visually groups each branch path's children. Each branch value gets its own rail color or matches the parent's palette. This replaces deep indentation with a thin persistent visual thread.
- **Branch path headers** ("yes", "no") — collapsible. Clicking collapses all children in that path. This is critical for long scripts — collapse the paths you're not working on.
- **"on" field selector** — a dropdown that shows all previously collected fields. This is how you wire the branch to a specific collect step.
- **"+ Add step"** — inside each branch path. You're always adding steps into a specific path.
- **"+ Add branch path"** — at the bottom, for adding new value matches.

---

### Deep Nesting: The Zoom Pattern

The Care-In-Homes script has 4 levels of nesting (branch → branch → branch → branch for the transfer cascade). Visually nesting all of that would create an unusable tunnel of indentation.

**Solution: 2-level visual nesting max, then zoom.**

- Levels 1–2 of nesting render inline with rails, exactly as shown above.
- At level 3+, the nested branch renders as a **collapsed summary card** with a "zoom in" affordance:

```text
│   ┃   ┌──────────────────────────────────────────────┐   │
│   ┃   │ 🔀 Branch   route transfer 1          ▸ Open │   │
│   ┃   │ on  offer transfer 1                         │   │
│   ┃   │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │   │
│   ┃   │ yes → 1 step (handoff)                       │   │
│   ┃   │ no  → 4 steps                                │   │
│   ┃   └──────────────────────────────────────────────┘   │
```

Clicking **"Open"** navigates into that branch as a focused view, with a **breadcrumb trail** at the top:

```text
  ◂ Steps  ▸  route by interest / yes  ▸  route transfer 1
  ─────────────────────────────────────────────────────────

  🔀 Branch   route transfer 1
     on  offer transfer 1

  ┃ ▾ yes
  ┃
  ┃   ┌────────────────────────────────────────────┐
  ┃   │ 📞 Handoff   transfer to partner 1    ⋯   │
  ┃   │ ...                                        │
  ┃   └────────────────────────────────────────────┘
  ┃
  ┃ ▾ no
  ┃
  ┃   ┌────────────────────────────────────────────┐
  ┃   │ 📥 Collect   offer transfer 2         ⋯   │
  ┃   │ The second option I have for you is        │
  ┃   │ {transfer_2_name}...                       │
  ┃   └────────────────────────────────────────────┘
  ┃   ┌────────────────────────────────────────────┐
  ┃   │ 🔀 Branch   route transfer 2      ▸ Open  │
  ┃   │ on  offer transfer 2                       │
  ┃   │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
  ┃   │ yes → 1 step (handoff)                     │
  ┃   │ no  → 3 steps                              │
  ┃   └────────────────────────────────────────────┘
```

This keeps the editor feeling spacious. You're never more than 2 rails deep visually. The breadcrumb gives you context and fast navigation. The collapsed summary cards tell you what's inside without showing it all.

---

### Action — API Call

The say text is primary (it's what the agent says while waiting). API config is entirely in the expanded section.

```text
┌──────────────────────────────────────────────────────────┐
│ ⠿  ⚡ Action     check for options                ⋯  ▸  │
│                                                          │
│   I'm going to go ahead and check for the best           │
│   matches for you.                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Expanded:**

```text
│   ▾ API Configuration                                    │
│   ┌──────────────────────────────────────────────────┐   │
│   │ URL       https://api.pipelinesuccess.com/...    │   │
│   │                                                  │   │
│   │ Send                                             │   │
│   │   contact_name  search_zip  care_recipient       │   │
│   │   type_of_services  care_service_timeline        │   │
│   │   financing_method  budget_for_care              │   │
│   │                                                  │   │
│   │ Receive                                          │   │
│   │   transfer_1_name   ← targets.0.company          │   │
│   │   transfer_1_phone  ← targets.0.phone_number     │   │
│   │   transfer_2_name   ← targets.1.company          │   │
│   │   ...                                            │   │
│   └──────────────────────────────────────────────────┘   │
```

"Send" shows collected variables as selectable chips (pick from a list of all collected fields above this step). "Receive" is a key-value mapping — variable name on the left, JSON path on the right.

---

### Handoff — End / Transfer

Clear visual finality. The block has a distinct treatment that signals "this path ends here."

```text
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ ⠿  📞 Handoff     end call - not interested       ⋯     │
│      Hang up                                             │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

The dashed border + muted background signals "terminal." The method renders as a prominent label. For transfers:

```text
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│ ⠿  📞 Handoff     transfer to partner 1      ⋯   ▸     │
│      Transfer → {transfer_1_phone}                       │
│                                                          │
│   It should take less than a minute to bring them on     │
│   the line.                                              │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Expanded** reveals hold messages:

```text
│   ▾ While waiting                                        │
│   ┌──────────────────────────────────────────────────┐   │
│   │ 1. They're great, I know they're helping a lot   │   │
│   │    of families!                                  │   │
│   │ 2. Sorry about the delay, I'm working to bring   │   │
│   │    them on the line.                             │   │
│   │ 3. Shouldn't take much longer, thanks for being  │   │
│   │    patient.                                      │   │
│   │ + Add message                                    │   │
│   └──────────────────────────────────────────────────┘   │
```

---

## 3. Annotations: only_if and outcome

These are cross-cutting concerns that can appear on any step type. They should be visible but not dominant.

### only_if — Conditional Badge

Renders as a small condition pill above the block's say text:

```text
┌──────────────────────────────────────────────────────────┐
│ ⠿  📥 Collect     zip code                       ⋯  ▸   │
│                                                          │
│   ⚙ only if  call_type is inbound                        │
│                                                          │
│   Can you please share the zip code where you need care? │
│   ┌ Answer ─────────────────────────────────────────┐    │
│   │ ● Free text                                     │    │
│   └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

The condition pill is clickable — opens an inline editor: `[variable dropdown] [is / is not / contains] [value]`. Added via the `⋯` overflow menu → "Add condition."

### outcome — Result Tag

Renders as a small tag at the bottom of the block:

```text
│   Ok, thank you for your time and please feel free       │
│   to call us in the future!                              │
│                                                          │
│   🏁 Outcome: no_longer_interested                       │
└──────────────────────────────────────────────────────────┘
```

The outcome value is a dropdown populated from the top-level outcomes list. Added via `⋯` → "Set outcome."

---

## 4. Adding and Reordering Steps

### Adding

A **ghost insertion line** appears between blocks on hover — a thin horizontal line with a `+` button at center:

```text
  ┌──────────────────────────┐
  │ 📥 Collect   zip code    │
  └──────────────────────────┘
          ── + ──               ← insertion point
  ┌──────────────────────────┐
  │ 📥 Collect   care recip. │
  └──────────────────────────┘
```

Clicking `+` opens a **small type picker** (not a full menu — just 5 options):

```text
  ┌─────────────────────────────┐
  │  💬 Say                     │
  │  📥 Collect                 │
  │  🔀 Branch                  │
  │  ⚡ Action                  │
  │  📞 Handoff                 │
  └─────────────────────────────┘
```

Selecting one inserts a new block of that type with the cursor focused on the step name field. Fast, no modal, no sidebar.

Additionally, support a **`/` command** when the cursor is in an empty block name or at the end of the list — type `/say`, `/collect`, etc. Power user shortcut, same as Notion.

### Reordering

- **Drag handle** (⠿) on each block for mouse users
- Steps can be dragged within their current scope (top-level or within a branch path)
- Dragging across scopes (e.g., from one branch path to another, or from a branch path to top-level) is allowed but shows a clear visual drop target
- Keyboard: select block → `Cmd+Shift+↑/↓` to move

---

## 5. Putting It All Together — The Care-In-Homes Flow

Here's how the full script would look at first load (branch paths collapsed by default except the first level):

```text
  ┌────────────────────────────────────────────────────┐
  │ 💬 Say     greeting                                │
  │ I'm an advisor with Care-In-Homes following up     │
  │ about your request for senior care.                │
  └────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────┐
  │ 📥 Collect     still looking for care              │
  │ Are you still looking for care?                    │
  │ ┌ Answer ──────────────────────────────────┐       │
  │ │ ● Yes / No                               │       │
  │ └──────────────────────────────────────────┘       │
  └────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────┐
  │ 🔀 Branch     route by interest                    │
  │    on  still looking for care                      │
  │                                                    │
  │ ┃ ▸ yes (11 steps)                                 │
  │ ┃ ▸ no (2 steps)                                   │
  │                                                    │
  └────────────────────────────────────────────────────┘
```

Expanding "yes" reveals its children inline. The reader scrolls through the conversation in reading order. Expanding "no" shows the short goodbye path. The editor stays clean and scannable.

---

## 6. Summary of Key Patterns

| Problem                                     | Solution                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| Five types, different complexity            | Shared block shell, type-specific inner content                        |
| Say text is the core content                | Hero treatment — largest, most prominent, no chrome                    |
| Collect fields need to show what's captured | Answer bar beneath say text, adapts to field_type                      |
| Branch nesting gets deep                    | 2-level inline nesting with rail lines; zoom + breadcrumbs at level 3+ |
| Advanced properties on most types           | Expand/collapse toggle; collapsed by default; empty fields hidden      |
| only_if and outcome are cross-cutting       | Lightweight inline annotations (pill + tag), added via overflow menu   |
| Adding steps must be fast                   | Hover insertion line with `+` → 5-option type picker; `/` commands     |
| Users need to see the flow at a glance      | Branch paths collapsible with step count summaries                     |
| Variable references in say text             | Inline chips (`{transfer_1_name}`) with autocomplete on `{` keystroke  |
