import { Node } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

import { Combobox as ComboboxPrimitive } from "../components/Combobox";
import { useComboboxOptions } from "../lib/comboboxOptionsStore";
import { nodeDataAttr } from "../lib/editor-utils";
import { cn } from "../lib/utils";

export const ComboboxNode = Node.create({
  name: "combobox",
  group: "inline",
  inline: true,
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      value: nodeDataAttr("value"),
      placeholder: nodeDataAttr("placeholder"),
      options: nodeDataAttr("options"),
      editing: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: `span[data-node-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { ...HTMLAttributes, "data-node-type": this.name }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ComboboxView, {
      stopEvent: ({ event }) =>
        event.target instanceof HTMLElement && event.target.closest("[role=combobox]") !== null,
    });
  },

  addKeyboardShortcuts() {
    const startEditing = () =>
      this.editor.commands.command(({ state, tr }) => {
        const { selection } = state;
        if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name) {
          return false;
        }

        tr.setNodeMarkup(selection.from, undefined, {
          ...selection.node.attrs,
          editing: true,
        });
        return true;
      });

    return {
      Enter: startEditing,
      Space: startEditing,
    };
  },
});

function ComboboxView({ node, selected, editor, getPos }: NodeViewProps) {
  const value = String(node.attrs.value ?? "");
  const placeholder = String(node.attrs.placeholder ?? "");
  const staticOptions = String(node.attrs.options ?? "")
    .split("\n")
    .map((opt) => opt.trim())
    .filter(Boolean);
  let positionKey = "";
  try {
    const pos = getPos();
    if (typeof pos === "number") {
      positionKey = `${node.type.name}.${pos}`;
    }
  } catch {
    positionKey = "";
  }
  const dynamicOptions = useComboboxOptions(positionKey);
  const options = staticOptions.length > 0 ? staticOptions : dynamicOptions;
  const editing = Boolean(node.attrs.editing);

  const setEditing = (nextEditing: boolean, nextValue = value) => {
    const pos = getPos();
    if (typeof pos !== "number") {
      return;
    }

    editor.commands.command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        value: nextValue,
        editing: nextEditing,
      });
      if (!nextEditing) {
        tr.setSelection(NodeSelection.create(tr.doc, pos));
      }
      return true;
    });
    if (!nextEditing) {
      editor.view.focus();
    }
  };

  return (
    <NodeViewWrapper
      contentEditable={false}
      data-placeholder={placeholder}
      onClick={() => editing || setEditing(true)}
      className={cn(
        "relative inline-flex select-none",
        selected && "bg-blue-200/40",
        !editing &&
          (value
            ? "font-medium opacity-60"
            : "before:pointer-events-none before:text-zinc-400 before:content-[attr(data-placeholder)]"),
        !editing &&
          value &&
          !options.includes(value) &&
          "underline decoration-red-500! decoration-wavy decoration-1 underline-offset-5",
      )}
    >
      {editing ? (
        <ComboboxPrimitive
          autoSelect
          defaultValue={value}
          autoFocus
          options={options}
          placeholder={placeholder}
          onCommit={(value) => setEditing(false, value)}
          className="field-sizing-content underline decoration-zinc-400 underline-offset-5"
        />
      ) : (
        value || "\u200B"
      )}
    </NodeViewWrapper>
  );
}
