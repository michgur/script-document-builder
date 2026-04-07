import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

export type CollectFieldType = "text" | "number" | "yes/no" | "selection";

export const CollectNode = TiptapNode.create({
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
        <NodeViewWrapper className="w-fit">
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
