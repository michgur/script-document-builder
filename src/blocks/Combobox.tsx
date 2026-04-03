import { Node } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useRef } from "react";
import { cn } from "../lib/utils";

export const ComboboxNode = Node.create({
  name: "combobox",
  group: "inline",
  inline: true,
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      value: {
        parseHTML: (el: HTMLElement) => el.getAttribute("data-value"),
        renderHTML: (attrs: { value?: unknown }) =>
          typeof attrs.value === "string" && attrs.value.length > 0
            ? { "data-value": attrs.value }
            : {},
      },
      placeholder: {
        parseHTML: (el: HTMLElement) => el.getAttribute("data-placeholder"),
        renderHTML: (attrs: { placeholder?: unknown }) =>
          typeof attrs.placeholder === "string" && attrs.placeholder.length > 0
            ? { "data-placeholder": attrs.placeholder }
            : {},
      },
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
        event.target instanceof HTMLElement && event.target.closest("input") !== null,
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
  const value = typeof node.attrs.value === "string" ? node.attrs.value : "";
  const placeholder = typeof node.attrs.placeholder === "string" ? node.attrs.placeholder : "";
  const editing = Boolean(node.attrs.editing);
  const inputRef = useRef<HTMLInputElement>(null);

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
      onDoubleClick={() => setEditing(true)}
      className={cn(
        "relative inline-flex select-none",
        selected && "bg-blue-200/40",
        editing
          ? "underline decoration-zinc-400 underline-offset-5"
          : value
            ? "font-medium opacity-60"
            : "before:pointer-events-none before:text-zinc-400 before:content-[attr(data-placeholder)]",
      )}
    >
      {editing ? (
        <input
          autoFocus
          ref={inputRef}
          defaultValue={value}
          placeholder={placeholder}
          onBlur={(event) => setEditing(false, event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="field-sizing-content outline-none"
        />
      ) : (
        value || "\u200B"
      )}
    </NodeViewWrapper>
  );
}
