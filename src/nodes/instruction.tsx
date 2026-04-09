import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

import { whenSelected } from "../lib/editor-utils";

export const InstructionNode = TiptapNode.create({
  name: "instruction",
  group: "block",
  content: "(text|hardBreak)*",

  parseHTML() {
    return [{ tag: 'div[data-node-type="instruction"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "instruction" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => {
      return (
        <NodeViewWrapper className="my-4 min-w-32">
          <span
            contentEditable={false}
            className="pointer-events-none top-1 left-2 flex items-center gap-1 py-1 text-xs font-medium text-amber-500 select-none"
          >
            Instructions
          </span>
          <NodeViewContent className="min-h-6 border-s-2 border-s-amber-400 px-2 py-1 leading-6 text-amber-900" />
        </NodeViewWrapper>
      );
    });
  },

  addKeyboardShortcuts() {
    return {
      Enter: whenSelected(
        this.name,
        ({ editor }) => {
          editor.commands.insertContent("\n");
          return true;
        },
        { allowNonempty: true },
      ),
    };
  },
});
