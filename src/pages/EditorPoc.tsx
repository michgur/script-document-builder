import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Dropcursor from "@tiptap/extension-dropcursor";
import Text from "@tiptap/extension-text";
import { Node as TiptapNode, type Editor, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useState } from "react";
import {
  buildEditorSlashCommandItems,
  createEditorSlashExtension,
} from "../lib/editorSlashCommands";
import {
  BranchActionNode,
  BranchCaseNode,
  BranchConditionNode,
  BranchNode,
} from "../blocks/Branch";
import { CollectNode, type CollectFieldType } from "../blocks/Collect";
import { ComboboxNode } from "../blocks/Combobox";
import { InstructionNode } from "../blocks/Instruction";
import { createEmptyStep, StepNode } from "../blocks/Step";
import { EditorModelProvider } from "../lib/editorModelContext";

type CompiledStep = {
  name: string;
  type: "say" | "collect";
  say?: string;
  instruction?: string;
  field_type?: CollectFieldType;
  choices?: string[];
};

const StepDoc = Document.extend({
  content: "step+",
});

const StepTitle = TiptapNode.create({
  name: "stepTitle",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "h3" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "h3",
      mergeAttributes(HTMLAttributes, {
        class: "text-lg font-semibold leading-7 tracking-tight text-zinc-900",
      }),
      0,
    ];
  },
});

const StepParagraph = Paragraph.extend({});

function isBlankStep(node: JsonNode | undefined): boolean {
  if (node?.type !== "step") {
    return false;
  }

  const children = node.content ?? [];
  if (children.length !== 1 || children[0]?.type !== "stepTitle") {
    return false;
  }

  return inlineNodesToText(children[0].content).trim().length === 0;
}

function ensureTrailingComposerStep(editor: Editor): boolean {
  const doc = editor.getJSON();
  const nodes = (doc.content as JsonNode[] | undefined) ?? [];
  const lastNode = nodes.at(-1);

  if (isBlankStep(lastNode)) {
    return false;
  }

  return editor.commands.insertContentAt(editor.state.doc.content.size, createEmptyStep(), {
    updateSelection: false,
  });
}

function isSelectionInLastStepTitle(editor: Editor): boolean {
  const { selection, doc } = editor.state;
  const { $from } = selection;

  if ($from.parent.type.name !== "stepTitle") {
    return false;
  }

  const stepIndex = $from.index(0);
  return stepIndex === doc.childCount - 1;
}

const slashCommandItems = buildEditorSlashCommandItems(createEmptyStep);
const slashCommandExtension = createEditorSlashExtension(slashCommandItems);

type JsonNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  content?: JsonNode[];
};

function inlineNodesToText(nodes: JsonNode[] | undefined): string {
  if (!nodes) {
    return "";
  }

  return nodes
    .map((node) => {
      if (node.type === "text") {
        return node.text ?? "";
      }

      if (node.type === "hardBreak") {
        return "\n";
      }

      return inlineNodesToText(node.content);
    })
    .join("");
}

function compileFromJson(doc: JsonNode | null): CompiledStep[] {
  if (!doc?.content) {
    return [];
  }

  return doc.content
    .filter((node) => node.type === "step")
    .map((stepNode) => {
      const children = stepNode.content ?? [];
      const titleNode = children.find((child) => child.type === "stepTitle");

      const out: CompiledStep = {
        name: inlineNodesToText(titleNode?.content).trim(),
        type: "say",
      };

      const sayLines: string[] = [];
      const instructionLines: string[] = [];

      for (const child of children) {
        if (child.type === "paragraph") {
          const text = inlineNodesToText(child.content).trim();
          if (text) {
            sayLines.push(text);
          }
          continue;
        }

        if (child.type === "instruction") {
          const text = inlineNodesToText(child.content).trim();
          if (text) {
            instructionLines.push(text);
          }
          continue;
        }

        if (child.type === "collect") {
          out.type = "collect";
          out.field_type = (child.attrs?.fieldType as CollectFieldType) ?? "text";

          if (out.field_type === "selection") {
            const rawOptions = child.attrs?.options;
            const options = typeof rawOptions === "string" ? rawOptions : "";

            out.choices = options
              .split("\n")
              .map((option) => option.trim())
              .filter(Boolean);
          }

          continue;
        }
      }

      if (sayLines.length > 0) {
        out.say = sayLines.join("\n");
      }

      if (instructionLines.length > 0) {
        out.instruction = instructionLines.join("\n");
      }

      return out;
    })
    .filter((step) => step.name.length > 0);
}

const initialContent: JsonNode = {
  type: "doc",
  content: [
    {
      type: "step",
      content: [
        { type: "stepTitle", content: [{ type: "text", text: "Greeting" }] },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "I'm an advisor with Care-In-Homes following up about your request for senior care.",
            },
          ],
        },
      ],
    },
    {
      type: "step",
      content: [
        {
          type: "stepTitle",
          content: [{ type: "text", text: "Still looking for care" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Are you still looking for care?" }],
        },
        {
          type: "collect",
          attrs: {
            fieldType: "yes/no",
            options: "",
          },
        },
      ],
    },
    {
      type: "step",
      content: [{ type: "stepTitle" }],
    },
  ],
};

export default function EditorPoc() {
  const [compiled, setCompiled] = useState<CompiledStep[]>([]);

  const editor = useEditor({
    extensions: [
      StepDoc,
      Text,
      HardBreak,
      History,
      StepParagraph,
      StepTitle,
      Placeholder.configure({
        placeholder: ({ node }) =>
          ({
            stepTitle: "Step name",
            paragraph: "Press '/' for commands",
            combobox: "test",
          })[node.type.name] ?? "",
        showOnlyCurrent: true,
        includeChildren: true,
      }),
      InstructionNode,
      CollectNode,
      BranchNode,
      BranchCaseNode,
      BranchConditionNode,
      BranchActionNode,
      ComboboxNode,
      StepNode,
      slashCommandExtension,
      Dropcursor.configure({
        class: "h-1! rounded-full bg-blue-500/20!",
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "tiptap-editor outline-none flex flex-col py-4 gap-4 text-sm/7",
      },
    },
    onUpdate({ editor: instance }) {
      setCompiled(compileFromJson(instance.getJSON() as JsonNode));
    },
    onSelectionUpdate({ editor: instance }) {
      if (!isSelectionInLastStepTitle(instance)) {
        ensureTrailingComposerStep(instance);
      }
    },
    onCreate({ editor: instance }) {
      ensureTrailingComposerStep(instance);
      setCompiled(compileFromJson(instance.getJSON() as JsonNode));
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 selection:bg-blue-200/40 md:px-8">
      <EditorModelProvider editor={editor} compiledSteps={compiled}>
        <div className="mx-auto flex max-w-2xl flex-col gap-8 rounded-xl bg-white py-12 pr-9 pl-2 shadow-sm ring-1 ring-zinc-200">
          <h1 className="pl-7 text-3xl font-semibold tracking-tight">Steps</h1>
          <EditorContent editor={editor} />
          <details className="ml-7 rounded-md bg-zinc-900 p-3 text-zinc-100">
            <summary className="cursor-pointer text-sm select-none">Compiled model</summary>
            <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(compiled, null, 2)}</pre>
          </details>
        </div>
      </EditorModelProvider>
    </div>
  );
}
