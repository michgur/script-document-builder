import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

export const InstructionNode = TiptapNode.create({
  name: "instruction",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: 'div[data-node-type="instruction"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "instruction" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => {
      return (
        <NodeViewWrapper>
          <div className="relative min-w-32 border-s-2 border-s-emerald-400 px-2 py-1.5 text-zinc-700">
            <div
              contentEditable={false}
              className="pointer-events-none top-1 left-2 text-xs font-medium text-emerald-500 select-none"
            >
              Instructions
            </div>
            <NodeViewContent className="min-h-6 leading-6 text-emerald-900 outline-none" />
          </div>
        </NodeViewWrapper>
      );
    });
  },
});
