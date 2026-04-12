import * as Ariakit from "@ariakit/react";
import { mergeAttributes, Node, type NodeViewProps } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { ArrowLeftIcon, CopyIcon, GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";

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
    <div contentEditable={false} suppressContentEditableWarning className="z-20 select-none">
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
        <GripVerticalIcon size={14} />
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
          <PlusIcon size={14} />
          Insert step above
        </Ariakit.MenuItem>
        <Ariakit.MenuItem
          render={<button type="button" />}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 outline-none data-active-item:bg-zinc-100"
          onMouseDown={onInsertBelow}
        >
          <PlusIcon size={14} />
          Insert step below
        </Ariakit.MenuItem>
        <Ariakit.MenuItem
          render={<button type="button" />}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 outline-none data-active-item:bg-zinc-100"
          onMouseDown={onDuplicate}
        >
          <CopyIcon size={14} />
          Duplicate step
        </Ariakit.MenuItem>
        <Ariakit.MenuItem
          render={<button type="button" />}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-rose-600 outline-none data-active-item:bg-rose-50"
          onMouseDown={onDelete}
        >
          <Trash2Icon size={14} />
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

export const StepNode = Node.create({
  name: "step",
  group: "block",
  content: "step_title say? instruction? fields? branch? transition? composer",
  isolating: true,
  defining: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'section[data-node-type="step"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", mergeAttributes(HTMLAttributes, { "data-node-type": "step" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Step);
  },
});

function Step({ editor, getPos, node }: NodeViewProps) {
  const runAtStepPosition = (action: (position: number) => void) => {
    const pos = getPos();
    if (pos) action(pos);
  };

  const sources: [string, number][] = [];
  const title = node.firstChild?.textContent;
  editor.state.doc.children.forEach((step, idx) =>
    step.descendants((dec) => {
      if (dec.type.name === "transition_target") {
        if (dec.textContent === title && step.firstChild?.textContent)
          sources.push([step.firstChild.textContent, idx]);
        return false;
      }
      return true;
    }),
  );

  return (
    <NodeViewWrapper className="group mb-4 grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] gap-1">
      <ul className="col-span-2 ps-6 text-xs">
        {sources.map(([s, i]) => (
          <li key={s}>
            <button
              className="flex w-fit cursor-pointer gap-1 rounded-sm px-2 py-1 text-blue-600 opacity-50 hover:bg-blue-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                editor.commands.focus(editor.state.doc.resolve(0).posAtIndex(i) + s.length + 2);
              }}
            >
              <ArrowLeftIcon className="size-4 text-blue-400" />
              {s}
            </button>
          </li>
        ))}
      </ul>
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
      <NodeViewContent className="*:flex *:flex-col" />
    </NodeViewWrapper>
  );
}
