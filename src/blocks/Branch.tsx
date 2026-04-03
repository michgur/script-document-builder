import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

export const BranchNode = Node.create({
  name: "branch",
  group: "block",
  content: "branch_case*",

  parseHTML() {
    return [{ tag: 'div[data-node-type="branch"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "branch" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => {
      return (
        <NodeViewWrapper className="min-w-40">
          <NodeViewContent className="min-h-6 leading-6 outline-none" />
        </NodeViewWrapper>
      );
    });
  },
});

export const BranchCaseNode = Node.create({
  name: "branch_case",
  group: "block",
  content: "branch_if branch_then",

  parseHTML() {
    return [{ tag: 'div[data-node-type="branch_case"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "branch_case" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => {
      return (
        <NodeViewWrapper>
          <NodeViewContent />
        </NodeViewWrapper>
      );
    });
  },
});

export const BranchIfNode = Node.create({
  name: "branch_if",
  group: "inline",
  inline: true,
  content: "combobox",

  parseHTML() {
    return [{ tag: 'span[data-node-type="branch_if"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-node-type": "branch_if" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => {
      return (
        <NodeViewWrapper as="span" className="inline-flex items-center">
          <span contentEditable={false}>• If&nbsp;</span>
          <NodeViewContent className="leading-6 outline-none" />
        </NodeViewWrapper>
      );
    });
  },
});

export const BranchThenNode = Node.create({
  name: "branch_then",
  group: "inline",
  inline: true,
  content: "combobox",

  parseHTML() {
    return [{ tag: 'span[data-node-type="branch_then"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-node-type": "branch_then" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => {
      return (
        <NodeViewWrapper as="span" className="inline-flex items-center">
          <span contentEditable={false}>:&nbsp;</span>
          <NodeViewContent className="leading-6 outline-none" />
        </NodeViewWrapper>
      );
    });
  },
});
