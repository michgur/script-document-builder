import type { Editor as TiptapEditor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Dropcursor from "@tiptap/extension-dropcursor";
import Focus from "@tiptap/extension-focus";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";

import { Placeholder } from "./lib/placeholder";
import { BranchActionNode, BranchCaseNode, BranchConditionNode, BranchNode } from "./nodes/branch";
import { ComboboxNode } from "./nodes/combobox";
import { ComposerNode } from "./nodes/composer";
import { FaqAnswerNode, FaqNode, FaqQuestionNode, FaqVariationNode } from "./nodes/faq";
import { FieldNode, FieldsNode } from "./nodes/fields";
import { IdentityNode } from "./nodes/identity";
import { InstructionNode } from "./nodes/instruction";
import { SayNode } from "./nodes/say";
import { SectionHeadingNode } from "./nodes/section_heading";
import { StepNode } from "./nodes/step";
import { StepTitleNode } from "./nodes/step_title";
import {
  TransitionCaseNode,
  TransitionSentenceNode,
  TransitionNode,
  TransitionSummaryNode,
  TransitionTargetNode,
  TransitionConditionNode,
  TransitionDescriptionNode,
  TransitionSayNode,
} from "./nodes/transitions";

const StepDocumentNode = Document.extend({
  content: "identity section_heading step+ section_heading faq",
});

const initialContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "identity",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "You are a helpful assistant..." }],
        },
      ],
    },
    {
      type: "section_heading",
      attrs: { label: "Script" },
    },
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
    {
      type: "section_heading",
      attrs: { label: "FAQ" },
    },
    {
      type: "faq",
      content: [
        {
          type: "faq_item",
          attrs: { open: true },
          content: [
            { type: "faq_question", content: [] },
            { type: "faq_answer", content: [] },
          ],
        },
      ],
    },
  ],
};

export default function Editor({
  onChange,
  externalContent,
  onEditorReady,
}: {
  onChange?: (value: JSONContent) => void;
  externalContent?: JSONContent;
  onEditorReady?: (editor: TiptapEditor | null) => void;
}) {
  const editor = useEditor({
    extensions: [
      StepDocumentNode,
      Text,
      Paragraph,
      HardBreak,
      History,
      IdentityNode,
      FaqNode,
      SectionHeadingNode,
      StepTitleNode,
      SayNode,
      ComposerNode,
      InstructionNode,
      FieldsNode,
      FieldNode,
      StepNode,
      ComboboxNode,
      BranchActionNode,
      BranchConditionNode,
      BranchCaseNode,
      BranchNode,
      TransitionNode,
      TransitionSummaryNode,
      TransitionCaseNode,
      TransitionTargetNode,
      TransitionConditionNode,
      TransitionDescriptionNode,
      TransitionSayNode,
      TransitionSentenceNode,
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
              [FieldsNode.name]: "Field name...",
              [FaqQuestionNode.name]: "What might the user ask?",
              [FaqVariationNode.name]: "Another way they might ask...",
              [FaqAnswerNode.name]: "What should the agent answer?",
              [Paragraph.name]:
                editor.state.doc.resolve(pos).parent.type.name === "faq"
                  ? "Common questions and direct answers for the agent to use..."
                  : "Your agent's persona, what it's allowed to talk about and what to avoid...",
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

  useEffect(() => {
    if (!editor || externalContent?.type !== "doc") return;
    editor.commands.setContent(externalContent);
  }, [editor, externalContent]);

  useEffect(() => {
    if (!onEditorReady) return;
    onEditorReady(editor);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  return <EditorContent className="pb-16" editor={editor} />;
}
