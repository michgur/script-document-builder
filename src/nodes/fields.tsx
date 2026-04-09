import { getNodeType, mergeAttributes, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { DotIcon } from "lucide-react";
import { useCallback, type MouseEventHandler, type ReactNode } from "react";

import {
  findInsertionPosition,
  findParentNodeOfType,
  nodeDataAttr,
  whenSelected,
} from "../lib/editor-utils";
import { SummaryNode } from "./summary";

export const FIELD_TYPE_OPTIONS = ["string", "number", "boolean"] as const;
export const FIELD_TYPE_OPTIONS_ATTR = FIELD_TYPE_OPTIONS.join("\n");

function createFieldTypeNode(schema: Schema, value: string): ProseMirrorNode {
  const fieldType = getNodeType(FieldTypeNode.name, schema);
  const combobox = getNodeType("combobox", schema);
  return fieldType.create(
    undefined,
    combobox.create({
      value,
      placeholder: "type",
      options: FIELD_TYPE_OPTIONS_ATTR,
    }),
  );
}

export function createFieldCaseNode(
  schema: Schema,
  options?: { name?: string; type?: (typeof FIELD_TYPE_OPTIONS)[number] },
): ProseMirrorNode {
  const fieldCase = getNodeType(FieldCaseNode.name, schema);
  const fieldName = getNodeType(FieldNameNode.name, schema);
  const name = options?.name?.trim() ?? "";

  return fieldCase.create(undefined, [
    fieldName.create(undefined, name.length > 0 ? schema.text(name) : undefined),
    createFieldTypeNode(schema, options?.type ?? "string"),
  ]);
}

export const FieldSentenceNode = Node.create({
  name: "field_sentence",
  group: "block",
  content: "text*",

  addAttributes() {
    return {
      prefix: nodeDataAttr("prefix", "Name"),
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
    return ReactNodeViewRenderer(FieldSentence);
  },
});

function fieldSentenceNode(name: string, prefix?: string) {
  return FieldSentenceNode.extend({
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

export const FieldNameNode = fieldSentenceNode("field_name", "Name");
export const FieldSummaryNode = SummaryNode.extend({
  name: "field_summary",
  addAttributes() {
    const attrs = (this.parent?.() ?? {}) as Record<string, any>;
    return {
      ...attrs,
      label: {
        ...attrs.label,
        default: "Fields",
      },
    };
  },
});
export const FieldEnumNode = fieldSentenceNode("field_enum", "Options");
export const FieldDescriptionNode = fieldSentenceNode("field_description", "Description");

export const FieldTypeNode = Node.create({
  name: "field_type",
  group: "block",
  content: "combobox",

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
    return ReactNodeViewRenderer(FieldType);
  },
});

export const FieldCaseNode = Node.create({
  name: "field_case",
  group: "block",
  content: "field_name field_type field_enum? field_description?",

  parseHTML() {
    return [{ tag: 'div[data-node-type="field_case"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "field_case" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FieldCase);
  },

  addKeyboardShortcuts() {
    return {
      Enter: whenSelected(this.name, ({ editor }) => {
        const fields = findParentNodeOfType(editor.state.selection, FieldsNode.name);
        if (fields) {
          editor.commands.insertContentAt(
            fields.pos + fields.node.nodeSize - 1,
            createFieldCaseNode(editor.schema),
          );
        }
        return true;
      }),
    };
  },
});

export const FieldsNode = Node.create({
  name: "fields",
  group: "block",
  content: "field_summary field_case*",

  parseHTML() {
    return [{ tag: 'div[data-node-type="fields"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-node-type": "fields" }), 0];
  },

  onUpdate: whenSelected("fields", ({ editor, node }) => {
    const hasCases = node.children.some((child) => child.type.name === FieldCaseNode.name);
    if (!hasCases) editor.commands.deleteNode("fields");
  }),

  addNodeView() {
    return ReactNodeViewRenderer(Fields, {
      contentDOMElementTag: "details",
    });
  },
});

function Fields() {
  return (
    <NodeViewWrapper className="my-2 min-w-40">
      <NodeViewContent className="min-h-6 leading-6 outline-none" />
    </NodeViewWrapper>
  );
}

function FieldSentence({ node }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="flex items-start">
      <strong className="font-medium" contentEditable={false}>
        {node.attrs["prefix"]}&nbsp;
      </strong>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

function FieldType() {
  return (
    <NodeViewWrapper className="flex items-start">
      <strong className="font-medium" contentEditable={false}>
        Type&nbsp;
      </strong>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

function FieldCase({ editor, getPos, node }: ReactNodeViewProps) {
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

  const components = node.children.map((child) => child.type.name);
  const showEnum = !components.includes(FieldEnumNode.name);
  const showDescription = !components.includes(FieldDescriptionNode.name);
  const showMenu = showEnum || showDescription;

  return (
    <NodeViewWrapper className="group grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] items-center gap-x-1 tt-selected:bg-selection tt-focus:[&_menu]:h-auto tt-focus:[&_menu]:opacity-100">
      <div contentEditable={false} className="flex h-lh items-center self-start">
        <DotIcon className="size-4 text-zinc-400" />
      </div>
      <NodeViewContent />
      {showMenu && (
        <menu
          className="col-start-2 flex w-fit divide-x divide-black/5 overflow-clip rounded-sm border border-black/5 not-focus-within:h-0 not-focus-within:opacity-0"
          contentEditable={false}
        >
          {showEnum && (
            <ToolbarButton onClick={() => onClick(FieldEnumNode.name)}>Add options</ToolbarButton>
          )}
          {showDescription && (
            <ToolbarButton onClick={() => onClick(FieldDescriptionNode.name)}>
              Add description
            </ToolbarButton>
          )}
        </menu>
      )}
    </NodeViewWrapper>
  );
}

function ToolbarButton(props: {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <li>
      <button
        onClick={props.onClick}
        className="flex cursor-pointer items-center gap-1 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100"
      >
        {props.children}
      </button>
    </li>
  );
}
