import Document from "@tiptap/extension-document";
import Dropcursor from "@tiptap/extension-dropcursor";
import Focus from "@tiptap/extension-focus";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Text from "@tiptap/extension-text";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";

import { Placeholder } from "./lib/placeholder";
import { BranchActionNode, BranchCaseNode, BranchConditionNode, BranchNode } from "./nodes/branch";
import { CollectNode } from "./nodes/collect";
import { ComboboxNode } from "./nodes/combobox";
import { ComposerNode } from "./nodes/composer";
import { InstructionNode } from "./nodes/instruction";
import { SayNode } from "./nodes/say";
import { StepNode } from "./nodes/step";
import { StepTitleNode } from "./nodes/step_title";
import {
  TransitionCaseNode,
  TransitionSentenceNode,
  TransitionNode,
  TransitionTargetNode,
  TransitionConditionNode,
  TransitionDescriptionNode,
  TransitionSayNode,
} from "./nodes/transitions";

const StepDocumentNode = Document.extend({
  content: "step+",
});

const initialContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "step",
      content: [
        { type: "step_title", content: [{ type: "text", text: "Greeting" }] },
        {
          type: "say",
          content: [
            {
              type: "text",
              text: "Thanks for taking my call today.",
            },
          ],
        },
        { type: "composer" },
      ],
    },
  ],
};

export default function Editor({ onChange }: { onChange?: (value: JSONContent) => void }) {
  const editor = useEditor({
    extensions: [
      StepDocumentNode,
      Text,
      HardBreak,
      History,
      StepTitleNode,
      SayNode,
      ComposerNode,
      InstructionNode,
      StepNode,
      ComboboxNode,
      BranchActionNode,
      BranchConditionNode,
      BranchCaseNode,
      BranchNode,
      TransitionNode,
      TransitionCaseNode,
      TransitionTargetNode,
      TransitionConditionNode,
      TransitionDescriptionNode,
      TransitionSayNode,
      TransitionSentenceNode,
      CollectNode,
      Focus.configure({ className: "tt-focus" }),
      Dropcursor.configure({
        class: "h-1! rounded-full bg-blue-500/20!",
      }),
      Placeholder.configure({
        placeholder: ({ node, pos, editor }) => {
          if (node.type.name === ComposerNode.name) {
            const parent = editor.state.doc.resolve(pos).parent;
            return parent.type.name === StepNode.name && parent.childCount <= 2
              ? "Type message for agent to say, or press '/' for commands"
              : "Press '/' for commands or 'Enter' for next step";
          }
          return (
            {
              [StepTitleNode.name]: "Step name",
              [SayNode.name]: "Type message for agent to say",
              [TransitionSayNode.name]: "Transition message...",
              [TransitionConditionNode.name]: "Condition...",
              [TransitionDescriptionNode.name]: "AI Condition...",
              [TransitionTargetNode.name]: "Target step...",
            }[node.type.name] ?? ""
          );
        },
        showOnlyCurrent: true,
        includeChildren: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "tiptap-editor outline-none flex flex-col py-4 gap-2 text-sm/7",
      },
    },
    ...(onChange && {
      onUpdate({ editor }) {
        onChange(editor.getJSON());
      },
      onCreate({ editor }) {
        onChange(editor.getJSON());
      },
    }),
  });

  return <EditorContent editor={editor} />;
}
