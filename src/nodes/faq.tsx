import { getNodeType, mergeAttributes, Node } from "@tiptap/core";
import { NodeViewContent, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";

import { findParentNodeOfType, whenSelected } from "../lib/editor-utils";

export const FaqQuestionNode = Node.create({
  name: "faq_question",
  group: "block",
  content: "(text|hardBreak)*",
  defining: true,

  parseHTML() {
    return [{ tag: 'summary[data-node-type="faq_question"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "summary",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "faq_question",
        class:
          "list-none cursor-pointer rounded-md px-3 py-2 text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqQuestion);
  },

  addKeyboardShortcuts() {
    return {
      Enter: whenSelected(
        this.name,
        ({ editor, node }) => {
          const { selection } = editor.state;
          const atEnd = selection.$to.parentOffset >= node.nodeSize - 2;

          if (!atEnd) {
            editor.commands.insertContent("\n");
            return true;
          }

          const faqItem = findParentNodeOfType(selection, FaqItemNode.name);
          if (!faqItem) return false;

          const variationType = getNodeType(FaqVariationNode.name, editor.schema);
          const firstNestedPos = faqItem.pos + 1 + faqItem.node.child(0).nodeSize;
          const nextNode = faqItem.node.child(1);

          if (nextNode?.type.name === FaqVariationNode.name) {
            editor.commands.setTextSelection(firstNestedPos + 1);
            return true;
          }

          const variation = variationType.createAndFill();
          if (!variation) return true;

          editor.commands.insertContentAt(firstNestedPos, variation);
          editor.commands.setTextSelection(firstNestedPos + 1);
          return true;
        },
        { allowNonempty: true },
      ),
    };
  },
});

export const FaqVariationNode = Node.create({
  name: "faq_variation",
  group: "block",
  content: "(text|hardBreak)*",

  parseHTML() {
    return [{ tag: 'p[data-node-type="faq_variation"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "faq_variation",
        class: "ml-3 rounded-md border-l-2 border-zinc-200 pl-3 text-zinc-700",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqVariation);
  },
});

export const FaqAnswerNode = Node.create({
  name: "faq_answer",
  group: "block",
  content: "(text|hardBreak)*",
  defining: true,

  parseHTML() {
    return [{ tag: 'p[data-node-type="faq_answer"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "faq_answer",
        class: "rounded-md bg-zinc-50 px-3 py-2 text-zinc-800",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqAnswer);
  },

  addKeyboardShortcuts() {
    return {
      Enter: whenSelected(
        this.name,
        ({ editor, node }) => {
          const { selection } = editor.state;
          const atEnd = selection.$to.parentOffset >= node.nodeSize - 2;
          if (!atEnd) {
            editor.commands.insertContent("\n");
            return true;
          }

          const faqItem = findParentNodeOfType(selection, FaqItemNode.name);
          if (!faqItem) return false;

          const itemType = getNodeType(FaqItemNode.name, editor.schema);
          const nextItem = itemType.createAndFill();
          if (!nextItem) return true;

          const insertionPos = faqItem.pos + faqItem.node.nodeSize;
          editor.commands.insertContentAt(insertionPos, nextItem);
          editor.commands.setTextSelection(insertionPos + 2);
          return true;
        },
        { allowNonempty: true },
      ),
    };
  },
});

export const FaqItemNode = Node.create({
  name: "faq_item",
  group: "block",
  content: "faq_question faq_variation* faq_answer",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el: HTMLElement) => el.hasAttribute("open"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.open === false ? {} : { open: "open" },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'details[data-node-type="faq_item"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "faq_item",
        class: "rounded-lg border border-zinc-200 bg-white p-1",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqItem);
  },
});

export const FaqNode = Node.create({
  name: "faq",
  group: "block",
  content: "faq_item+",
  defining: true,

  parseHTML() {
    return [{ tag: 'section[data-node-type="faq"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "faq",
        class: "ms-8 space-y-2",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Faq);
  },

  addExtensions() {
    return [FaqItemNode, FaqQuestionNode, FaqVariationNode, FaqAnswerNode];
  },
});

function Faq() {
  return (
    <div data-node-view-wrapper className="ms-8 space-y-2">
      <NodeViewContent className="space-y-2" />
    </div>
  );
}

function FaqItem({ node, updateAttributes }: ReactNodeViewProps) {
  const open = Boolean(node.attrs.open);

  return (
    <details
      data-node-view-wrapper
      data-node-type="faq_item"
      className="rounded-lg border border-zinc-200 bg-white p-1"
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        if (nextOpen !== open) {
          updateAttributes({ open: nextOpen });
        }
      }}
    >
      <NodeViewContent className="space-y-2 [&_summary]:mb-1" />
    </details>
  );
}

function FaqQuestion() {
  return (
    <summary
      data-node-view-wrapper
      data-node-type="faq_question"
      className="cursor-pointer list-none rounded-md px-3 py-2 text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden"
    >
      <NodeViewContent className="min-h-6 leading-6 outline-none" />
    </summary>
  );
}

function FaqVariation() {
  return (
    <div
      data-node-view-wrapper
      data-node-type="faq_variation"
      className="ml-3 rounded-md border-l-2 border-zinc-200 pl-3 text-zinc-700"
    >
      <NodeViewContent className="min-h-6 leading-6 outline-none" />
    </div>
  );
}

function FaqAnswer() {
  return (
    <div
      data-node-view-wrapper
      data-node-type="faq_answer"
      className="rounded-md bg-zinc-50 px-3 py-2 text-zinc-800"
    >
      <div
        contentEditable={false}
        className="mb-1 text-[11px] font-medium tracking-wide text-zinc-500 uppercase"
      >
        Answer
      </div>
      <NodeViewContent className="min-h-6 leading-6 outline-none" />
    </div>
  );
}
