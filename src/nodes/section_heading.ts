import { mergeAttributes, Node } from "@tiptap/core";

export const SectionHeadingNode = Node.create({
  name: "section_heading",
  group: "block",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label") ?? "",
        renderHTML: (attributes: Record<string, unknown>) =>
          typeof attributes.label === "string" && attributes.label.length > 0
            ? { "data-label": attributes.label }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'h2[data-node-type="section_heading"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "h2",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "section_heading",
        contenteditable: "false",
        class: "ms-8 mt-10 mb-2 text-3xl font-semibold tracking-tight",
      }),
      node.attrs["label"],
    ];
  },
});
