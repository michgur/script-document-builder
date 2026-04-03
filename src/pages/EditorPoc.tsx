import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import Dropcursor from "@tiptap/extension-dropcursor";
import Text from "@tiptap/extension-text";
import * as Ariakit from "@ariakit/react";
import { Node as TiptapNode, type Editor, mergeAttributes } from "@tiptap/core";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  buildEditorSlashCommandItems,
  createEditorSlashExtension,
} from "../lib/editorSlashCommands";
import { cn } from "../lib/utils";
import { BranchNode, BranchIfNode, BranchThenNode, BranchCaseNode } from "../blocks/Branch";
import { ComboboxNode } from "../blocks/Combobox";

type CollectFieldType = "text" | "number" | "yes/no" | "selection";

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

const Instruction = TiptapNode.create({
  name: "instruction",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: 'div[data-node-type="instruction"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "instruction" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => {
      return (
        <NodeViewWrapper>
          <div className="relative min-w-32 rounded-md bg-emerald-50 px-2 py-1.5 text-zinc-700">
            <div
              contentEditable={false}
              className="pointer-events-none top-1 left-2 text-xs font-medium text-emerald-700 select-none"
            >
              Instructions
            </div>
            <NodeViewContent className="min-h-6 leading-6 outline-none" />
          </div>
        </NodeViewWrapper>
      );
    });
  },
});

const Collect = TiptapNode.create({
  name: "collect",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      fieldType: {
        default: "text",
      },
      options: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-node-type="collect"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "collect" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes }) => {
      const fieldType = (node.attrs.fieldType as CollectFieldType) ?? "text";
      const options = String(node.attrs.options ?? "")
        .split("\n")
        .map((option) => option.trim())
        .filter(Boolean)
        .join("\n");

      return (
        <NodeViewWrapper>
          <div className="rounded-md bg-zinc-100 px-2 py-2 text-zinc-700 ring-blue-500/20 prose-selected:ring-2">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Collect</span>
              <select
                value={fieldType}
                className="grow rounded bg-white px-2 py-1 text-sm outline-none select-none"
                onChange={(event) => {
                  const next = event.target.value as CollectFieldType;
                  updateAttributes({
                    fieldType: next,
                    options: next === "selection" ? options || "Option 1\nOption 2" : "",
                  });
                }}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="yes/no">Yes / No</option>
                <option value="selection">Selection</option>
              </select>
            </div>

            {fieldType === "selection" ? (
              <div className="mt-2">
                <textarea
                  value={options}
                  className="w-full resize-none rounded bg-white px-2 py-1 text-sm leading-6 outline-none"
                  rows={Math.max(2, options.length ? options.split("\n").length : 2)}
                  placeholder="One option per line"
                  onChange={(event) => {
                    updateAttributes({ options: event.target.value });
                  }}
                />
                <p className="mt-1 text-xs text-zinc-500">One option per line</p>
              </div>
            ) : null}
          </div>
        </NodeViewWrapper>
      );
    });
  },
});

function findStepElementByName(stepName: string): HTMLElement | null {
  const stepElements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-step-node='true']"),
  );
  return stepElements.find((element) => element.dataset.stepName === stepName) ?? null;
}

function focusStepElement(stepName: string) {
  const stepElement = findStepElementByName(stepName);
  if (!stepElement) {
    return;
  }

  stepElement.scrollIntoView({ behavior: "smooth", block: "center" });
  stepElement.classList.add("ring-2", "ring-amber-300");
  window.setTimeout(() => {
    stepElement.classList.remove("ring-2", "ring-amber-300");
  }, 900);
}

function normalizedLabel(value: string): string {
  return value.trim().toLowerCase();
}

function inboundReferencesForStep(editor: Editor, targetStepName: string): string[] {
  const inbound = new Set<string>();
  const target = normalizedLabel(targetStepName);

  if (!target) {
    return [];
  }

  editor.state.doc.descendants((node, _pos, parent) => {
    if (parent !== editor.state.doc || node.type.name !== "step") {
      return true;
    }
    return false;
  });

  return Array.from(inbound);
}

const StepParagraph = Paragraph.extend({});

function createEmptyStep(): JsonNode {
  return {
    type: "step",
    content: [{ type: "stepTitle" }],
  };
}

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

const Step = TiptapNode.create({
  name: "step",
  group: "block",
  content: "stepTitle (paragraph|instruction|collect|branch)*",
  draggable: true,

  addAttributes() {
    return {
      sectionKind: {
        default: "step",
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-node-type="step"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "step",
        "data-section-kind": HTMLAttributes.sectionKind,
      }),
      0,
    ];
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
      const stepName = node.firstChild?.textContent.trim() ?? "";
      const isBranchSection = node.attrs.sectionKind === "branch";

      const inboundReferences = stepName ? inboundReferencesForStep(editor, stepName) : [];

      const runAtStepPosition = (action: (position: number) => void) => {
        let position: number | undefined;
        try {
          position = getPos();
        } catch {
          return;
        }
        if (typeof position !== "number") {
          return;
        }
        action(position);
      };

      return (
        <NodeViewWrapper>
          <section
            data-step-node="true"
            data-step-name={stepName || undefined}
            data-step-kind={isBranchSection ? "branch" : "step"}
            className="group relative rounded-md p-1"
          >
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
            {inboundReferences.length > 0 ? (
              <div
                contentEditable={false}
                className="mb-1 ml-7 flex flex-wrap items-center gap-1 text-xs text-zinc-500"
              >
                <span className="select-none">← from:</span>
                {inboundReferences.map((sourceName) => (
                  <button
                    key={sourceName}
                    type="button"
                    className="rounded px-1 text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
                    onClick={() => {
                      focusStepElement(sourceName);
                    }}
                  >
                    {sourceName}
                  </button>
                ))}
              </div>
            ) : null}
            {isBranchSection ? (
              <div contentEditable={false} className="mb-1 ml-7 text-xs font-medium text-zinc-500">
                🔀 Branch section
              </div>
            ) : null}
            <NodeViewContent className="pl-7 *:flex *:flex-col *:items-start *:gap-2" />
          </section>
        </NodeViewWrapper>
      );
    });
  },
});

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
            out.choices = String(child.attrs?.options ?? "")
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
              type: "combobox",
              attrs: {
                placeholder: "Set or get",
              },
            },
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
      Instruction,
      Collect,
      BranchNode,
      BranchCaseNode,
      BranchIfNode,
      BranchThenNode,
      ComboboxNode,
      Step,
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
      <div className="mx-auto flex max-w-4xl flex-col gap-8 rounded-xl bg-white py-12 pr-9 pl-2 shadow-sm ring-1 ring-zinc-200">
        <h1 className="pl-7 text-3xl font-semibold tracking-tight">Steps</h1>
        <EditorContent editor={editor} />
        <details className="ml-7 rounded-md bg-zinc-900 p-3 text-zinc-100">
          <summary className="cursor-pointer text-sm select-none">Compiled model</summary>
          <pre className="mt-3 overflow-x-auto text-xs">{JSON.stringify(compiled, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}
