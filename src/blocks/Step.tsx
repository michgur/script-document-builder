import * as Ariakit from "@ariakit/react";
import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

type StepHandleMenuProps = {
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function StepHandleMenu({
  onInsertAbove,
  onInsertBelow,
  onDuplicate,
  onDelete,
}: StepHandleMenuProps) {
  const menu = Ariakit.useMenuStore();
  return (
    <div
      contentEditable={false}
      suppressContentEditableWarning
      className="absolute top-1 left-0 z-20 select-none"
    >
      <Ariakit.MenuButton
        store={menu}
        render={<button type="button" />}
        data-drag-handle
        className={cn(
          "flex size-7 items-center justify-center rounded text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:cursor-grab hover:bg-zinc-200 hover:text-zinc-600 active:cursor-grabbing aria-expanded:bg-zinc-300 aria-expanded:text-zinc-500 aria-expanded:opacity-100",
          "group-hover:opacity-100 hover:cursor-grab hover:bg-zinc-200 hover:text-zinc-600 active:cursor-grabbing",
          "aria-expanded:bg-zinc-300 aria-expanded:text-zinc-500 aria-expanded:opacity-100",
        )}
        aria-label="Step actions"
      >
        <GripVertical size={14} />
      </Ariakit.MenuButton>

      <Ariakit.Menu
        store={menu}
        gutter={6}
        className="z-50 min-w-44 rounded-lg border border-zinc-200 bg-white p-1.5 text-sm shadow-lg outline-none"
      >
        <Ariakit.MenuItem
          render={<button type="button" />}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 outline-none data-active-item:bg-zinc-100"
          onMouseDown={onInsertAbove}
        >
          <Plus size={14} />
          Insert step above
        </Ariakit.MenuItem>
        <Ariakit.MenuItem
          render={<button type="button" />}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 outline-none data-active-item:bg-zinc-100"
          onMouseDown={onInsertBelow}
        >
          <Plus size={14} />
          Insert step below
        </Ariakit.MenuItem>
        <Ariakit.MenuItem
          render={<button type="button" />}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 outline-none data-active-item:bg-zinc-100"
          onMouseDown={onDuplicate}
        >
          <Copy size={14} />
          Duplicate step
        </Ariakit.MenuItem>
        <Ariakit.MenuItem
          render={<button type="button" />}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-rose-600 outline-none data-active-item:bg-rose-50"
          onMouseDown={onDelete}
        >
          <Trash2 size={14} />
          Delete step
        </Ariakit.MenuItem>
      </Ariakit.Menu>
    </div>
  );
}

export function createEmptyStep() {
  return {
    type: "step",
    content: [{ type: "stepTitle" }],
  };
}

export const StepNode = TiptapNode.create({
  name: "step",
  group: "block",
  content: "stepTitle (paragraph|instruction|collect|branch)*",
  draggable: true,
  isolating: true,
  defining: true,

  parseHTML() {
    return [{ tag: 'section[data-node-type="step"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", mergeAttributes(HTMLAttributes, { "data-node-type": "step" }), 0];
  },

  addKeyboardShortcuts() {
    const deleteIfBlankStep = () => {
      const { selection } = this.editor.state;
      if (!selection.empty) {
        return false;
      }

      const { $from } = selection;
      const title = $from.parent;
      if (title.type.name !== "stepTitle" || title.textContent.length > 0) {
        return false;
      }

      const stepNode = $from.node(1);
      if (stepNode.type.name !== "step" || stepNode.childCount > 1) {
        return false;
      }

      const from = $from.before(1);
      return this.editor.commands.deleteRange({
        from,
        to: from + stepNode.nodeSize,
      });
    };

    return {
      Backspace: deleteIfBlankStep,
      Enter: () => {
        const { selection } = this.editor.state;
        if (!selection.empty) return false;
        const { $from } = selection;
        switch ($from.parent.type.name) {
          case "instruction":
            return this.editor.commands.insertContent("<br>");
          case "stepTitle":
            if ($from.parentOffset > 0) return false;
            {
              const step = $from.before(1);
              return this.editor.commands.insertContentAt(step, createEmptyStep(), {
                updateSelection: false,
              });
            }
          default:
            return false;
        }
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ editor, getPos, node }) => {
      const runAtStepPosition = (action: (position: number) => void) => {
        const pos = getPos();
        if (pos) action(pos);
      };

      return (
        <NodeViewWrapper className="group relative rounded-md p-1">
          <StepHandleMenu
            onInsertAbove={() => {
              runAtStepPosition((position) => {
                editor.commands.insertContentAt(position, createEmptyStep());
                editor.commands.focus(position);
              });
            }}
            onInsertBelow={() => {
              runAtStepPosition((position) => {
                editor.commands.insertContentAt(position + node.nodeSize, createEmptyStep());
                editor.commands.focus(position + node.nodeSize);
              });
            }}
            onDuplicate={() => {
              runAtStepPosition((position) => {
                editor.commands.insertContentAt(position + node.nodeSize, node.toJSON());
              });
            }}
            onDelete={() => {
              runAtStepPosition((position) => {
                editor.commands.deleteRange({
                  from: position,
                  to: position + node.nodeSize,
                });
              });
            }}
          />
          <NodeViewContent className="pl-7 *:flex *:flex-col *:gap-2" />
        </NodeViewWrapper>
      );
    });
  },
});
