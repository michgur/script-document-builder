import type { KeyboardShortcutCommand } from "@tiptap/core";
import { mergeAttributes, Node } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { ChevronDownIcon } from "lucide-react";

import { nodeDataAttr } from "../lib/editor-utils";

export const SummaryNode = Node.create({
  name: "summary",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: nodeDataAttr("label"),
    };
  },

  parseHTML() {
    return [{ tag: `summary[data-node-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "summary",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": this.name,
      }),
      node.attrs["label"],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Summary, {
      as: "summary",
      className:
        "py-1 text-xs font-medium tracking-wide text-zinc-500 uppercase list-none cursor-default outline-none select-none",
    });
  },

  addKeyboardShortcuts() {
    const toggleDetails: KeyboardShortcutCommand = ({ editor }) => {
      const { selection } = editor.state;
      if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name) {
        return false;
      }

      const summary = editor.view.nodeDOM(selection.from);
      if (!(summary instanceof HTMLElement)) {
        return false;
      }

      summary.click();
      return true;
    };

    return {
      Enter: toggleDetails,
      Space: toggleDetails,
    };
  },
});

function Summary({ node }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper
      contentEditable={false}
      data-label={node.attrs["label"]}
      className="flex w-fit items-center gap-1 py-0.5 tt-selected:bg-selection"
    >
      {node.attrs["label"]}
      <ChevronDownIcon className="size-4 transition-transform in-open:-rotate-180" />
    </NodeViewWrapper>
  );
}
