import { getNodeType, mergeAttributes, Node } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

import { findParentStepNode, whenSelected } from "../lib/editor-utils";

export const StepTitleNode = Node.create({
  name: "step_title",
  group: "block",
  content: "inline*",
  defining: true,

  addKeyboardShortcuts() {
    return {
      Enter: whenSelected(this.name, ({ editor, node, pos }) => {
        const step = findParentStepNode(editor.state.selection);
        if (!step) return true;

        let insertPos = pos + node.nodeSize;
        let insertContent: PMNode | null = null;
        if (editor.state.selection.$from.parentOffset === 0) {
          insertPos = step.pos;
          insertContent = getNodeType("step", editor.schema).createAndFill();
        } else if (!["say", "composer"].includes(step.node.child(1).type.name)) {
          insertContent = getNodeType("say", editor.schema).createAndFill();
        }
        if (insertContent) editor.commands.insertContentAt(insertPos, insertContent);

        editor.commands.setTextSelection(TextSelection.near(editor.state.doc.resolve(insertPos)));
        editor.commands.selectTextblockEnd();
        return true;
      }),
      Backspace: whenSelected(this.name, ({ editor, node }) => {
        if (node.textContent.length > 0) return false;

        const step = findParentStepNode(editor.state.selection);
        if (!step || step.node.textContent.trim().length > 0) return false;

        editor.commands.deleteRange({
          from: step.pos,
          to: step.pos + step.node.nodeSize,
        });
        editor.commands.setTextSelection(step.pos - 1);
        return true;
      }),
    };
  },

  parseHTML() {
    return [{ tag: 'h3[data-node-type="step_title"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "h3",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "step_title",
        class: "text-lg font-semibold leading-7 tracking-tight text-zinc-900",
      }),
      0,
    ];
  },
});
