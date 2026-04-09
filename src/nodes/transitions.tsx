import { getNodeType, mergeAttributes, Node } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import {
  ArrowRightIcon,
  BrainIcon,
  MessageCirclePlusIcon,
  SplitIcon,
  type LucideIcon,
} from "lucide-react";
import { useCallback, type MouseEventHandler, type ReactNode } from "react";

import {
  findInsertionPosition,
  findParentNodeOfType,
  nodeDataAttr,
  whenSelected,
} from "../lib/editor-utils";
import { SummaryNode } from "./summary";

export const TransitionSentenceNode = Node.create({
  name: "transition_sentence",
  group: "block",
  content: "text*",

  addAttributes() {
    return {
      prefix: nodeDataAttr("prefix", "If"),
    };
  },

  parseHTML() {
    return [{ tag: `div[data-node-type="${this.name}"]` }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": this.name,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TransitionSentence);
  },
});

function transitionSentenceNode(name: string, prefix?: string) {
  return TransitionSentenceNode.extend({
    name,
    addAttributes() {
      const attrs = (this.parent?.() ?? {}) as Record<string, any>;
      return {
        ...attrs,
        ...(prefix && { prefix: { ...attrs.prefix, default: prefix } }),
      };
    },
  });
}

export const TransitionTargetNode = transitionSentenceNode("transition_target", "Go to");
export const TransitionSummaryNode = SummaryNode.extend({
  name: "transition_summary",
  addAttributes() {
    const attrs = (this.parent?.() ?? {}) as Record<string, any>;
    return {
      ...attrs,
      label: {
        ...attrs.label,
        default: "Transitions",
      },
    };
  },
});
export const TransitionConditionNode = transitionSentenceNode("transition_condition", "If");
export const TransitionDescriptionNode = transitionSentenceNode("transition_description", "When");
export const TransitionSayNode = transitionSentenceNode("transition_say", "Say");

export const TransitionCaseNode = Node.create({
  name: "transition_case",
  group: "block",
  content: "transition_condition? transition_description? transition_say? transition_target",

  parseHTML() {
    return [{ tag: 'div[data-node-type="transition_case"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "transition_case" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TransitionCase);
  },

  addKeyboardShortcuts() {
    return {
      Enter: whenSelected(this.name, ({ editor }) => {
        const transitions = findParentNodeOfType(editor.state.selection, TransitionNode.name);
        if (transitions) {
          editor.commands.insertContentAt(
            transitions.pos + transitions.node.nodeSize - 1,
            this.type.createAndFill(),
          );
        }
        return true;
      }),
    };
  },
});

export const TransitionNode = Node.create({
  name: "transition",
  group: "block",
  content: "transition_case*",

  parseHTML() {
    return [{ tag: 'div[data-node-type="transition"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "transition" }), 0];
  },

  onUpdate: whenSelected("transition", ({ editor, node }) => {
    const hasCases = node.children.some((child) => child.type.name === TransitionCaseNode.name);
    if (!hasCases) editor.commands.deleteNode("transition");
  }),

  addNodeView() {
    return ReactNodeViewRenderer(Transitions);
  },
});

function Transitions() {
  return (
    <NodeViewWrapper className="my-2 min-w-40">
      <h4
        contentEditable={false}
        className="text-xs font-medium tracking-wide text-zinc-500 uppercase"
      >
        Transitions
      </h4>
      <NodeViewContent className="min-h-6 leading-6 outline-none" />
    </NodeViewWrapper>
  );
}

function TransitionSentence({ node }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="flex items-start">
      <strong className="font-medium" contentEditable={false}>
        {node.attrs["prefix"]}&nbsp;
      </strong>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

function TransitionCase({ editor, getPos, node }: ReactNodeViewProps) {
  const onClick = useCallback(
    (nodeType: string) => {
      const pos = getPos();
      if (!pos) return;
      const resolvedPos = editor.state.doc.resolve(pos + 1);
      const insertionPos = findInsertionPosition(resolvedPos, getNodeType(nodeType, editor.schema));
      if (!insertionPos) return;

      editor.commands.insertContentAt(
        insertionPos,
        getNodeType(nodeType, editor.schema).createAndFill(),
      );
      editor.commands.setTextSelection(TextSelection.near(editor.state.doc.resolve(insertionPos)));
      editor.view.focus();
    },
    [editor, getPos],
  );

  const components = node.children.map((c) => c.type.name);
  const showButtons = ["transition_condition", "transition_description", "transition_say"].map(
    (t) => !components.includes(t),
  );
  const showMenu = showButtons.some(Boolean);
  return (
    <NodeViewWrapper className="group grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] items-center gap-x-1 tt-selected:bg-selection tt-focus:[&_menu]:h-auto tt-focus:[&_menu]:opacity-100">
      <div contentEditable={false} className="flex h-lh items-center self-start">
        <ArrowRightIcon className="size-4 text-zinc-400" />
      </div>
      <NodeViewContent />
      {showMenu && (
        <menu
          className="col-start-2 flex w-fit divide-x divide-black/5 overflow-clip rounded-sm border border-black/5 not-focus-within:h-0 not-focus-within:opacity-0"
          contentEditable={false}
        >
          {showButtons[0] && (
            <ToolbarButton onClick={() => onClick(TransitionConditionNode.name)} icon={SplitIcon}>
              Condition
            </ToolbarButton>
          )}
          {showButtons[1] && (
            <ToolbarButton onClick={() => onClick(TransitionDescriptionNode.name)} icon={BrainIcon}>
              AI Condition
            </ToolbarButton>
          )}
          {showButtons[2] && (
            <ToolbarButton
              onClick={() => onClick(TransitionSayNode.name)}
              icon={MessageCirclePlusIcon}
            >
              Say something
            </ToolbarButton>
          )}
        </menu>
      )}
    </NodeViewWrapper>
  );
}

function ToolbarButton(props: {
  children: ReactNode;
  icon?: LucideIcon;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <li>
      <button
        onClick={props.onClick}
        className="flex cursor-pointer items-center gap-1 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100"
      >
        {props.icon && <props.icon className="size-3 text-zinc-400" strokeWidth={2} />}
        {props.children}
      </button>
    </li>
  );
}
