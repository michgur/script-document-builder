import { findParentNode, mergeAttributes, Node } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { cn } from "../lib/utils";
import { ComboboxNode } from "./Combobox";
import { TextSelection } from "@tiptap/pm/state";

export const BranchConditionNode = ComboboxNode.extend({
  name: "branch_condition",

  addAttributes() {
    const attrs = (this.parent?.() ?? {}) as Record<string, any>;
    return {
      ...attrs,
      placeholder: {
        ...attrs.placeholder,
        default: "condition value",
      },
    };
  },
});

export const BranchActionNode = ComboboxNode.extend({
  name: "branch_action",

  addAttributes() {
    const attrs = (this.parent?.() ?? {}) as Record<string, any>;
    return {
      ...attrs,
      placeholder: {
        ...attrs.placeholder,
        default: "next action",
      },
    };
  },
});

export const BranchNode = Node.create({
  name: "branch",
  group: "block",
  content: "branch_case*",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-node-type="branch"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "branch" }), 0];
  },

  onUpdate({ editor }) {
    editor.commands.command(({ tr, state }) => {
      const deletions: number[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type.name !== this.type.name) return true;
        if (node.childCount === 0) deletions.push(pos);
        return false;
      });
      if (deletions.length === 0) return false;

      deletions.sort((a, b) => b - a);
      deletions.forEach((d) =>
        tr.replaceRangeWith(d, d + 1, state.schema.nodes.paragraph.create()),
      );
      tr.setSelection(TextSelection.create(tr.doc, deletions[deletions.length - 1] + 1));
      return true;
    });
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
  content: "branch_condition branch_action",
  defining: true,
  isolating: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-node-type="branch_case"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "branch_case" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ selected }) => {
      return (
        <NodeViewWrapper className={cn(selected && "bg-blue-200/40", "inline-flex items-center")}>
          <span contentEditable={false}>•&nbsp;If</span>
          <NodeViewContent
            className={cn(
              "inline-flex items-center gap-1 px-1",
              "[&>[data-node-view-wrapper]>:nth-child(2)]:before:content-[':']",
              "[&>[data-node-view-wrapper]>:nth-child(2)]:before:ms-0.5",
              "[&>[data-node-view-wrapper]>:nth-child(2)]:before:me-1",
            )}
          />
        </NodeViewWrapper>
      );
    });
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;

        const match = findParentNode((n) => n.type.name === this.name)(selection);
        if (
          !match ||
          (selection.$from.parentOffset > 0 && match.node.children.some((c) => !!c.attrs["value"]))
        )
          return false;

        const { pos, node } = match;
        editor.commands.command(({ tr }) => {
          tr.deleteRange(pos, pos + node.nodeSize);
          tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(0, pos - 1))));
          return true;
        });
        return true;
      },
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        if (
          !selection.empty ||
          selection.$from.parent.type.name !== this.name ||
          selection.$from.parentOffset < selection.$from.parent.nodeSize - 2
        )
          return false;

        editor.commands.command(({ tr }) => {
          tr.insert(selection.from, this.type.createAndFill()!);
          tr.setSelection(TextSelection.create(tr.doc, selection.from + 2));
          return true;
        });
        return true;
      },
    };
  },
});
