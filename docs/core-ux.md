# Deep Dive: Keyboard-Driven Editing Model

## The Cursor Model

The entire script is **one continuous document**. The cursor can be in any editable region, and arrow keys move through them all seamlessly — across blocks, across steps. No trapped focus, no tabbing between separate form fields.

Every editable spot is a **"line"** in the document. A line is either:

- **Text line**: a visual line within a text area (say, instruction). Behaves exactly like a line in Google Docs.
- **Structured line**: a single-line editable unit (field definition, branch, outcome, condition, step name). Has one or more inline segments you Tab between.

The document's line order for a fully loaded step:

```
step name
⚡ condition
"say text line 1"
"say text line 2"
"say text line 3"
🧠 instruction line 1
🧠 instruction line 2
📥 field 1
📥 field 2
🔗 webhook label
🏁 outcome
→ branch 1
→ branch 2
(empty line)
next step name
...
```

**Up/Down arrows**: move through this line sequence. Within a multi-line text block (say, instruction), Up/Down move between visual lines first. Only when you hit the top/bottom edge of the text block does the cursor jump to the previous/next block. This is exactly how a textarea inside a document works.

**Left/Right arrows**: move within a line. At the edges, they wrap to the end of the previous line / start of the next line. Again, just like Google Docs.

**Tab on structured lines**: moves between segments within that line. A branch line has two segments — description and target. A field line has name, type, and enum. Tab cycles through them. This is the one place Tab does something special, and it's intuitive because it mirrors how Tab works in a table row.

---

## Creating Content

### Enter in text blocks (say, instruction)

Creates a new line within the text block. Normal text editing. No surprises.

### Enter on the empty line at the end of a step

This is the **insertion point** — the blank line that sits between every two steps.

- **Just press Enter**: creates a new step below. Cursor lands in the new step's name. This is the "new paragraph" gesture.
- **Type `/`**: opens the block menu to add a block to the _current_ step above.

This is the only dual-purpose line in the system, and the distinction is physical: Enter = new step, `/` = add to current step. It maps to the mental model of "I'm at the end of a section — do I start a new section, or add more to this one?"

### Enter on structured lines

- **Branch line**: creates a new branch below. You're listing branches, Enter means "and another one."
- **Field line**: creates a new field below. Same logic.
- **Outcome, condition, webhook label**: Enter moves cursor to the next line below. These are single-value blocks, Enter means "done, move on."
- **Step name**: Enter moves cursor to the say text. "I've named it, now let me write the speech."

### The `/` menu

Available on the empty line at the end of a step. Shows only what's valid to add:

```
/ ────────────────────────
│ 🧠 Instructions         │  ← hidden if already exists
│ ⚡ Condition             │  ← hidden if already exists
│ 📥 Collect information   │  ← hidden if already exists
│ 🔗 Webhook              │  ← hidden if already exists
│ 🏁 Call outcome          │  ← hidden if already exists
│ → Add branch            │  ← always available
──────────────────────────
```

When selected, the block appears in its correct structural position within the step (condition goes to the top, branches go to the bottom, etc.) and the cursor jumps to it. The user doesn't need to think about ordering — the structure enforces it.

**What about adding blocks from the middle of a step?** Let's say the cursor is on the instruction text. Could the user type `/` here? I'd say no — `/` only works on the dedicated empty line. Reason: inside a text block, `/` is just a character. We don't want to hijack typing. The empty line at the end of each step is the consistent, predictable place for structural edits.

---

## Destroying Content

This is where it gets interesting. The principle: **Backspace on an empty thing deletes that thing and moves the cursor to the previous line.** Like deleting an empty line in a doc.

### Backspace in text blocks

Normal text editing. Backspace at position 0 of a line joins it with the previous line. Standard.

**Backspace at the very start of the say block**: nothing. Say can't be deleted. The cursor stays put. This is the one hard wall.

**Backspace at the very start of the instruction block, when it's empty**: deletes the instruction block. Cursor moves up to the end of the say text. This feels natural — you cleared out the instruction, then pressed backspace one more time to "collapse" the empty block. Just like backspacing an empty line in a doc.

**Backspace at the very start of the instruction block, when it has content**: cursor moves to the end of the say text. Content stays. Normal behavior — you're just navigating, not deleting. Same as Google Docs: backspace at position 0 of a non-empty paragraph with a different style above it just moves up.

Wait — actually that's a conflict. In Google Docs, backspace at position 0 of a paragraph _merges_ it with the previous paragraph. We don't want to merge instruction into say — they're different block types. So:

**Revised rule**: Backspace at position 0 of a non-empty block with a different type above it → **does nothing**. You can't merge across block types. You have to select and delete explicitly. This is a small deviation from pure Google Docs behavior, but it prevents accidental structural damage and is easy to understand: "these are different things, they don't merge."

### Backspace on structured lines

- **Empty branch line** → delete it, cursor moves to the previous branch or the block above.
- **Empty field line, and it's the last field** → delete the entire collect block, cursor moves to the previous block.
- **Empty field line, not the last** → delete it, cursor moves to the previous field.
- **Empty condition** → delete the condition block, cursor moves to step name.
- **Empty outcome** → delete the outcome block, cursor moves to the previous block.
- **Empty webhook label** → delete the webhook block, cursor moves to the previous block.

### Deleting a step

Backspace on an **empty step name** where the step has **only empty say text and nothing else** → delete the entire step. Cursor moves to the empty line of the previous step.

If the step has content, backspace on the step name does nothing. You'd use the `[···]` menu to delete a whole step with content. This prevents accidental destruction.

### Delete key (forward-delete)

Mirrors backspace logic but forward. Delete at the end of a text block when the next block is a different type → does nothing. Delete at the end of the last branch → nothing (can't merge the next step into this one).

---

## Selection and Clipboard

### Selection within a text block

Works exactly like Google Docs. Click and drag, Shift+arrows, Shift+Cmd+arrows for word/line selection. No surprises.

### Selection across blocks within a step

Shift+Down from the say text can extend selection into the instruction text, into fields, into branches. The selection highlight covers everything between anchor and focus.

**What does the selected content look like in the clipboard?**

This is a key decision. Two levels:

- **Internal clipboard** (copy-paste within the editor): preserves structure. If you select a branch and paste it, you get a branch. If you select two fields and paste them into another step's collect block, you get two fields.
- **External clipboard** (paste into/from external apps): plain text. Pasting from a Google Doc into the say block gives you text. Copying a step to paste into Slack gives you a readable text representation.

### Cross-step selection

Shift+Down from one step into the next selects entire steps. At this level, the unit of selection is the **whole step** — partial step selection across boundaries is weird and not useful. Once the selection crosses a step boundary, it snaps to full-step selection.

This enables: select three steps, Cmd+C, Cmd+V → duplicate three steps. Or Cmd+X to cut and rearrange.

---

## Rough Edges and Tricky Spots

### The "dead zone" between blocks

When the cursor moves from say to instruction, is there a moment where it's "between" them? No. The cursor goes from the last line of say to the first line of instruction. No dead zone. The visual gap between blocks is just visual — the cursor skips over it.

### Multi-line say that's really long

Some agents might have very long speech text. The say block becomes a tall text area. This is fine — it's just text in a doc. But we might want a subtle visual indicator of where the say block ends and the next block begins, especially when the user is scrolled into the middle of a long say text. A persistent small `"` gutter marker or a subtle left-border on the say region could help.

### Undo/Redo

Must be granular and span structural changes. Deleting a block and pressing Cmd+Z should restore it fully. This requires treating structural operations (add block, remove block, add branch) as undo-able actions alongside text edits. Non-trivial to implement but essential — users will absolutely Cmd+Z their way out of mistakes.

### Where does the cursor go after adding a block via `/`?

The block appears in its structural position (which might be far from the empty line where `/` was pressed). The cursor **jumps to the new block**. This is a scroll-jump, and it could be disorienting if the block ends up at the top of the step while the user was at the bottom.

Mitigation: a subtle scroll animation, and maybe a brief highlight/pulse on the newly inserted block. "You added this, here it is."

### The "optional" checkbox on collect fields

This is an attribute of the collect block, not of individual fields. Where does it live? I'd put it as a line below the last field:

```
📥 first_name · string
📥 last_name · string
☐ Caller can decline to answer
+ add field
```

The checkbox is keyboard-accessible: arrow down to it, Space to toggle. Reads like a sentence.

### Branch targets — the dropdown

When you Tab into the target segment of a branch line, it should behave like a **combobox**: you can type to filter step names, arrow through matches, Enter to select. If you type a name that doesn't exist, it could offer to create a new step with that name. This closes the loop — you can build the whole script without touching the mouse.

### Reordering steps

**Keyboard**: Alt+Up/Down (or Cmd+Shift+Up/Down) to move the current step up or down. Standard pattern from VS Code, Notion, etc.

**Reordering blocks within a step**: not needed. The structure dictates the order. One less thing to think about.

### What if someone pastes a huge block of text from a Google Doc?

It goes into whichever text block has focus (say or instruction). If they paste an entire script draft from a doc into the say field, that's... fine? It's wrong structurally, but the content is preserved and they can break it up. We could explore a "smart paste" that detects structure (headings → step names, "If X" lines → branches) but that's a later optimization. The AI builder you mentioned is probably the better path for that conversion.
