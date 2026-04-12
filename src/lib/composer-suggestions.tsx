import { getNodeType, type Editor, type Range } from "@tiptap/core";
import { NodeType, type Node } from "@tiptap/pm/model";
import { TextSelection, type Plugin } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import {
  CompassIcon,
  ListFilterIcon,
  SplitIcon,
  StepForwardIcon,
  type LucideIcon,
} from "lucide-react";

import {
  ComposerSuggestions,
  type ComposerSuggestionsProps,
  type ComposerSuggestionsRef,
} from "../components/ComposerSuggestions";
import { FieldsNode } from "../nodes/fields";
import { InstructionNode } from "../nodes/instruction";
import { StepNode } from "../nodes/step";
import { TransitionCaseNode, TransitionNode } from "../nodes/transitions";
import { findParentStepNode } from "./editor-utils";
import { reactSuggestionRenderer } from "./react-suggestion-renderer";

export type ComposerSuggestionItem = {
  title: string;
  description: string;
  aliases: string[];
  icon: LucideIcon;
  run: (ctx: { editor: Editor; range: Range; step: { node: Node; pos: number } }) => void;
  isAllowed?: (ctx: { editor: Editor; step: { node: Node; pos: number } }) => boolean;
};

function addToStep(
  type: string,
  create?: (props: { editor: Editor; step: { node: Node; pos: number } }) => Node | null,
): ComposerSuggestionItem["run"] {
  return ({ editor, step }) => {
    const nodeType = getNodeType(type, editor.schema);
    const index = findInsertionIndex(step.node, nodeType);
    if (typeof index !== "number") return;

    const pos = editor.state.doc.resolve(step.pos + 1).posAtIndex(index);
    editor.commands.insertContentAt(
      pos,
      create ? create({ editor, step }) : nodeType.createAndFill(),
    );
    editor.commands.setTextSelection(TextSelection.near(editor.state.doc.resolve(pos)));
  };
}

function findInsertionIndex(stepNode: Node, nodeType: NodeType) {
  for (let i = stepNode.childCount; i > 0; i--) {
    if (stepNode.canReplaceWith(i, i, nodeType)) return i;
  }
  return null;
}

const COMPOSER_SUGGESTIONS: ComposerSuggestionItem[] = [
  {
    title: "Step",
    description: "Add a step",
    aliases: ["new"],
    icon: StepForwardIcon,
    run({ editor, range }) {
      const node = getNodeType(StepNode.name, editor.schema).createAndFill();
      if (node) {
        editor.commands.insertContentAt(range.to, node);
        editor.commands.setTextSelection(
          TextSelection.near(editor.state.doc.resolve(range.to + 1)),
        );
      }
    },
  },
  {
    title: "Instruction",
    description: "Instruct the agent with a prompt",
    aliases: ["instruction", "prompt"],
    icon: CompassIcon,
    run: addToStep(InstructionNode.name),
    isAllowed: ({ step }) => step.node.children.every((c) => c.type.name !== "instruction"),
  },
  {
    title: "Fields",
    description: "Add a fields list",
    aliases: ["fields", "collect", "list"],
    icon: ListFilterIcon,
    run: addToStep(FieldsNode.name),
    isAllowed: ({ step }) => step.node.children.every((c) => c.type.name !== FieldsNode.name),
  },
  {
    title: "Transitions",
    description: "Define how to choose next step",
    aliases: ["transitions", "branches", "if", "goto"],
    icon: SplitIcon,
    run: addToStep(TransitionNode.name, ({ editor }) => {
      const transition = getNodeType(TransitionNode.name, editor.schema);
      const transitionCase = getNodeType(TransitionCaseNode.name, editor.schema);
      const firstCase = transitionCase.createAndFill();
      if (!firstCase) return null;
      return transition.createAndFill(undefined, firstCase);
    }),
    isAllowed: ({ step }) => step.node.children.every((c) => c.type.name !== "transition"),
  },
];

function filterComposerSuggetions({ query, editor }: { query: string; editor: Editor }) {
  const step = findParentStepNode(editor.state.selection);
  const items = step
    ? COMPOSER_SUGGESTIONS.filter((sug) => !sug.isAllowed || sug.isAllowed({ editor, step }))
    : COMPOSER_SUGGESTIONS;

  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [item.title, item.description, ...item.aliases].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

export function createComposerSuggestionsPlugin(editor: Editor, nodeType: string): Plugin {
  return Suggestion<ComposerSuggestionItem, ComposerSuggestionItem>({
    editor,
    char: "/",
    startOfLine: true,
    allowedPrefixes: null,
    decorationTag: "span",
    decorationClass: "slash-command-decoration",
    allow: ({ state, range }) => {
      return state.doc.resolve(range.from).parent.type.name === nodeType;
    },
    items: filterComposerSuggetions,
    command: ({ editor, range, props }) => {
      editor.commands.deleteRange(range);
      const step = findParentStepNode(editor.state.selection);
      if (!step) return;

      props.run({ editor, range: { from: range.from, to: range.from }, step });
    },
    render: reactSuggestionRenderer<
      ComposerSuggestionItem,
      ComposerSuggestionItem,
      ComposerSuggestionsRef,
      ComposerSuggestionsProps
    >(ComposerSuggestions),
  });
}
