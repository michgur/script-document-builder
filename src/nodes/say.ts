import { Editor, mergeAttributes } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";

import { findParentStepNode, whenSelected } from "../lib/editor-utils";

export const SayNode = Paragraph.extend({
  name: "say",
  group: "block",
  content: "(text|hardBreak)*",

  parseHTML() {
    return [{ tag: 'p[data-node-type="say"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "say",
        class: "min-h-6 leading-7 text-zinc-800",
      }),
      0,
    ];
  },

  // delete last line to show composer when possible
  onUpdate: whenSelected("say", ({ editor, node, pos }) => {
    if (node.textContent.length === 0) {
      if (isSelectedSayAttachedToComposer(editor)) editor.commands.deleteCurrentNode();
    } else if (node.lastChild?.type.name === "hardBreak") {
      editor.commands.deleteRange({
        from: pos + node.nodeSize - 2,
        to: pos + node.nodeSize,
      });
    }
    return true;
  }),

  // clean orphaned, empty say nodes
  onSelectionUpdate({ editor }) {
    const step = findParentStepNode(editor.state.selection);
    if (!step || editor.state.selection.$from.parent.type.name === this.name) return;

    const index = step.node.children.findIndex((c) => c.type.name === this.name);
    if (index < 0) return;
    const node = step.node.child(index);
    if (node.textContent.trim().length > 0) return;
    const offset = step.node.children
      .slice(0, index)
      .reduce((agg, child) => agg + child.nodeSize, 0);
    editor.commands.deleteRange({
      from: step.pos + offset,
      to: step.pos + offset + node.nodeSize,
    });
  },

  addKeyboardShortcuts() {
    return {
      Enter: whenSelected(
        this.name,
        ({ editor, node, pos }) => {
          const showComposer =
            editor.state.selection.$to.parentOffset === node.nodeSize - 2 &&
            isSelectedSayAttachedToComposer(editor);

          editor.commands.insertContent(showComposer ? "" : "\n");
          if (showComposer) {
            editor.commands.setTextSelection(node.nodeSize + pos + 2);
          }
          return true;
        },
        { allowNonempty: true },
      ),
    };
  },
});

function isSelectedSayAttachedToComposer(editor: Editor): boolean {
  const step = findParentStepNode(editor.state.selection);
  return !!step && step.node.childCount <= 3;
}
