import * as Ariakit from "@ariakit/react";
import { getNodeType, mergeAttributes, Node } from "@tiptap/core";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { useEffect, useState } from "react";

import { FieldPopupForm } from "../components/FieldPopupForm";
import { findParentNodeOfType, nodeDataAttr, whenSelected } from "../lib/editor-utils";

export const FieldsNode = Node.create({
  name: "fields",
  group: "block",
  content: "field* text?",

  parseHTML() {
    return [{ tag: 'div[data-node-type="fields"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "fields" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Fields);
  },

  addProseMirrorPlugins() {
    const createNewField = (view: EditorView, text: string) => {
      const { selection, tr, schema } = view.state;
      const match = findParentNodeOfType(selection, this.name);
      if (!match) return false;

      const newField = getNodeType(FieldNode.name, schema).createAndFill({
        field: JSON.stringify({ name: text, type: "string" }),
        editing: true,
      });
      if (newField) {
        tr.insert(match.pos + match.node.nodeSize - 1, newField);
        view.dispatch(tr);
        const popover = view.nodeDOM(match.pos + match.node.nodeSize - 1);
        if (popover instanceof HTMLElement) {
          popover.querySelector("input")?.focus();
        }
      }
      return true;
    };

    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain");
            return !!text && createNewField(view, text);
          },
          handleTextInput: (view, _from, _to, text) => createNewField(view, text),
        },
      }),
    ];
  },
});

export const FieldNode = Node.create({
  name: "field",
  atom: true,
  draggable: false,
  inline: true,

  addAttributes() {
    return {
      field: nodeDataAttr("field", JSON.stringify({ type: "string" })),
      editing: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-node-type="field"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "field" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FieldChip, {
      stopEvent: ({ event }) =>
        event.target instanceof HTMLElement &&
        event.target.closest("[data-field-interactive='true']") !== null,
    });
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleTextInput: (view) => {
            const { selection } = view.state;
            return selection instanceof NodeSelection && selection.node.type.name === this.name;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    const startEditing = whenSelected(
      this.name,
      ({ editor, node }) => {
        return editor.commands.updateAttributes(this.name, {
          ...node.attrs,
          editing: true,
        });
      },
      { nodeSelection: true },
    );

    return {
      Enter: startEditing,
      Space: startEditing,
      Escape: whenSelected(this.name, ({ editor, pos }) => {
        return editor.commands.setNodeSelection(pos);
      }),
    };
  },
});

function Fields() {
  return (
    <NodeViewWrapper className="my-4 min-w-40">
      <h4
        contentEditable={false}
        className="mb-1 text-xs font-medium tracking-wide text-emerald-500 select-none"
      >
        Fields
      </h4>
      <NodeViewContent className="min-h-8 leading-6 outline-none *:space-y-1 *:space-x-2" />
    </NodeViewWrapper>
  );
}

function FieldChip({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const [draft, setDraft] = useState(JSON.parse(node.attrs.field));
  const [prev, setPrev] = useState(node.attrs.field);
  if (prev !== node.attrs.field) {
    setPrev(node.attrs.field);
    setDraft(JSON.parse(node.attrs.field));
  }

  const editing = Boolean(node.attrs.editing);

  useEffect(() => {
    const callback = () => setOpen(false);
    if (editing) {
      editor.on("focus", callback);
      return () => {
        editor.off("focus", callback);
      };
    }
  }, [editing]);

  const setOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      if (!editing) updateAttributes({ editing: true });
    } else {
      updateAttributes({
        field: JSON.stringify(draft),
        editing: false,
      });
    }
  };

  return (
    <NodeViewWrapper
      contentEditable={false}
      className="relative inline-flex min-h-7 items-center text-sm text-zinc-700 tt-selected:bg-selection tt-focus:bg-transparent tt-focus:*:first:ring-2"
    >
      <Ariakit.PopoverProvider open={editing} setOpen={setOpen} placement="top-start">
        <Ariakit.PopoverDisclosure
          data-field-interactive="true"
          render={<button type="button" />}
          className="min-w-2 cursor-pointer rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700 ring-selection transition outline-none hover:bg-emerald-200 active:bg-emerald-300"
        >
          {draft.name || "\u200b"}
        </Ariakit.PopoverDisclosure>

        <Ariakit.Popover
          gutter={4}
          data-field-interactive="true"
          className="z-50 rounded-xl border border-emerald-200 bg-emerald-50 p-3 outline-none"
        >
          <FieldPopupForm field={draft} onChange={setDraft} />
        </Ariakit.Popover>
      </Ariakit.PopoverProvider>
    </NodeViewWrapper>
  );
}
