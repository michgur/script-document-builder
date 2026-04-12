import { mergeAttributes, Node } from "@tiptap/core";

export const IdentityNode = Node.create({
  name: "identity",
  group: "block",
  content: "paragraph*",
  defining: true,

  parseHTML() {
    return [{ tag: 'section[data-node-type="identity"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "identity",
        class: "ms-8 mb-2",
      }),
      [
        "h2",
        {
          contenteditable: "false",
          class: "text-3xl font-semibold tracking-tight my-2",
        },
        "Identity",
      ],
      ["div", 0],
    ];
  },
});
