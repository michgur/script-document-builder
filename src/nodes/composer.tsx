import { getNodeType, mergeAttributes, Node, type NodeViewProps, type Range } from "@tiptap/core";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

import { createComposerSuggestionsPlugin } from "../lib/composer-suggestions";
import { findParentStepNode, whenSelected } from "../lib/editor-utils";
import { cn } from "../lib/utils";
import { SayNode } from "./say";
import { StepNode } from "./step";

export const ComposerNode = Node.create({
  name: "composer",
  group: "block",
  content: "text*",

  addKeyboardShortcuts() {
    return {
      Enter: whenSelected(this.name, ({ editor, node }) => {
        const step = findParentStepNode(editor.state.selection);
        if (!step || node.textContent.length > 0) {
          return false;
        }

        const newStepPos = step.pos + step.node.nodeSize;
        editor.commands.insertContentAt(
          newStepPos,
          getNodeType(StepNode.name, editor.schema).createAndFill(),
        );
        editor.commands.setTextSelection(newStepPos + 2); // 2 = skip start + end tokens
        return true;
      }),
      Backspace: whenSelected(this.name, ({ editor, node, pos }) => {
        if (node.textContent.length > 0) return false;
        editor.commands.setTextSelection(pos - 1);
        return true;
      }),
    };
  },

  onSelectionUpdate({ editor }) {
    if (editor.isActive("composer")) return;

    const clearRanges: Range[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== this.name) return true;
      if (node.textContent.length > 0) clearRanges.push({ from: pos, to: pos + node.nodeSize });
      return false;
    });

    const chain = editor.chain();
    clearRanges.sort((a, b) => b.from - a.from).forEach(chain.deleteRange);
    chain.run();
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const { state } = view;
            const { selection, tr, schema } = state;
            const parent = selection.$from.parent;
            if (parent.type.name !== this.name) return false;

            let text = event.clipboardData?.getData("text/plain").trim();
            if (!text) return false;

            const step = findParentStepNode(selection);
            if (!step) return false;

            const composerIndex = step.node.children.findIndex((n) => n.type.name === this.name);
            if (composerIndex === 1) {
              // step_title + composer
              const sayNode = getNodeType(SayNode.name, schema).createAndFill(
                undefined,
                schema.nodeFromJSON({ type: "text", text }),
              );
              if (!sayNode) return true;
              const pos = step.pos + step.node.child(0).nodeSize;
              tr.insert(pos, sayNode).setSelection(
                TextSelection.create(tr.doc, pos + 2 + text.length),
              );
              view.dispatch(tr);
            } else {
              // step_title + say + composer
              text = "\n" + text;
              const pos = step.pos + step.node.child(0).nodeSize + step.node.child(1).nodeSize;
              tr.insertText(text, pos).setSelection(
                TextSelection.create(tr.doc, pos + text.length),
              );
              view.dispatch(tr);
            }
            return true;
          },
          handleTextInput: (view, _from, _to, text) => {
            const { state } = view;
            const { selection, tr, schema } = state;
            const { parent } = selection.$from;
            if (
              !selection.empty ||
              parent.type.name !== this.name ||
              parent.textContent.startsWith("/") ||
              (parent.textContent.trim().length === 0 && text.startsWith("/"))
            ) {
              return false;
            }

            const step = findParentStepNode(selection);
            if (!step) {
              return false;
            }

            const composerIndex = step.node.children.findIndex((n) => n.type.name === this.name);
            if (composerIndex === 1) {
              // step_title + composer
              const sayNode = getNodeType(SayNode.name, schema).createAndFill(
                undefined,
                schema.nodeFromJSON({ type: "text", text }),
              );
              if (!sayNode) return true;
              const pos = step.pos + step.node.child(0).nodeSize;
              tr.insert(pos, sayNode).setSelection(
                TextSelection.create(tr.doc, pos + 2 + text.length),
              );
              view.dispatch(tr);
            } else if (composerIndex === 2) {
              // step_title + say + composer
              text = "\n" + text;
              const pos = step.pos + step.node.child(0).nodeSize + step.node.child(1).nodeSize;
              tr.insertText(text, pos).setSelection(
                TextSelection.create(tr.doc, pos + text.length),
              );
              view.dispatch(tr);
            }

            return true;
          },
        },
      }),
      createComposerSuggestionsPlugin(this.editor, this.name),
    ];
  },

  parseHTML() {
    return [{ tag: 'div[data-node-type="composer"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "composer",
        class: "h-fit",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Composer);
  },
});

function Composer(props: NodeViewProps) {
  const hidden = props.decorations.length + props.node.textContent.length === 0;
  return (
    <NodeViewWrapper className={cn(hidden && "**:h-0")}>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
