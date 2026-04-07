import type { JSONContent } from "@tiptap/core";

type ConditionDSL = string;

export type Field = {
  name: string;
  type: "string" | "number" | "boolean";
  enum?: string[];
  description?: string;
};

export type Branch = ({ description: string } | { condition: ConditionDSL }) & {
  say?: string;
  target: string;
};

export type Step = {
  name: string;
  say?: string;
  instruction?: string;
  fields?: Field[];
  branches?: Record<string, Branch>;
};

export type Script = {
  steps: Step[];
};

function textContent(node: JSONContent): string | null {
  if (node.type === "text") return node.text ?? null;
  if (node.type === "hardBreak") return "\n";
  if (!node.content) return null;
  const content = node.content?.map(textContent).filter((t) => t !== null);
  return content.length > 0 ? content.join("") : null;
}

// like textContent, but also cleans up stuff
function paragraphContent(node: JSONContent): string | null {
  const text = textContent(node);
  if (text === null) return null;
  return text
    .trim()
    .split("\n")
    .map((ln) => ln.trim())
    .join("\n");
}

export function compileFromEditorJson(doc: JSONContent): Script {
  return {
    steps: (doc.content ?? [])
      .filter((node) => node.type === "step")
      .map((step) => {
        const content = step.content ?? [];
        const title = content.find((n) => n.type === "step_title");
        const name = title && textContent(title);
        if (!name || name.length === 0) return null;

        const sayNode = content.find((n) => n.type === "say");
        const say = (sayNode && paragraphContent(sayNode)) ?? undefined;
        const instructionNode = content.find((n) => n.type === "instruction");
        const instruction = (instructionNode && paragraphContent(instructionNode)) ?? undefined;
        const fields = content
          .filter((n) => n.type === "collect")
          .map((n, idx) => {
            const field: Field = {
              name: name + idx,
              type: n.attrs?.fieldType ?? "string",
            };
            if ((field.type as string) === "selection") {
              field.type = "string";
              const rawOptions = n.attrs?.options;
              const options = typeof rawOptions === "string" ? rawOptions : "";
              field.enum = options
                .split("\n")
                .map((option) => option.trim())
                .filter(Boolean);
            }
            return field;
          });

        return {
          name,
          say,
          instruction,
          fields: fields.length > 0 ? fields : undefined,
        };
      })
      .filter((step) => step !== null),
  };
}
