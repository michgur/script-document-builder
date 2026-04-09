import type { JSONContent } from "@tiptap/core";

type ConditionDSL = string;

export type Field = {
  name: string;
  type: "string" | "number" | "boolean";
  enum?: string[];
  description?: string;
};

export type Transition = {
  description?: string;
  condition?: ConditionDSL;
  say?: string;
  target?: string;
};

export type Step = {
  name: string;
  say?: string;
  instruction?: string;
  fields?: Field[];
  transitions?: Transition[];
};

export type Script = {
  steps: Step[];
};

function textContent(node?: JSONContent): string | null {
  if (!node) return null;
  if (node.type === "text") return node.text ?? null;
  if (node.type === "hardBreak") return "\n";
  if (!node.content) return null;
  const content = node.content?.map(textContent).filter((t) => t !== null);
  return content.length > 0 ? content.join("") : null;
}

// like textContent, but also cleans up stuff
function paragraphContent(node?: JSONContent): string | null {
  const text = textContent(node);
  if (text === null) return null;
  return text
    .trim()
    .split("\n")
    .map((ln) => ln.trim())
    .join("\n");
}

function inlineContent(text: string): JSONContent[] {
  return text
    .split("\n")
    .flatMap<JSONContent>((line, idx, lines) => [
      ...(line.length > 0 ? [{ type: "text", text: line }] : []),
      ...(idx < lines.length - 1 ? [{ type: "hardBreak" }] : []),
    ]);
}

function collectAttrsFromField(field: Field): { fieldType: string; options: string } {
  if (field.enum && field.enum.length > 0) {
    return {
      fieldType: "selection",
      options: field.enum.join("\n"),
    };
  }

  if (field.type === "number") {
    return { fieldType: "number", options: "" };
  }

  if (field.type === "boolean") {
    return { fieldType: "yes/no", options: "" };
  }

  return { fieldType: "text", options: "" };
}

export function compileToEditorJson(script: Script): JSONContent {
  const steps = script.steps.map<JSONContent>((step) => {
    const content: JSONContent[] = [
      {
        type: "step_title",
        content: [{ type: "text", text: step.name }],
      },
    ];

    if (step.say && step.say.trim().length > 0) {
      content.push({
        type: "say",
        content: inlineContent(step.say.trim()),
      });
    }

    if (step.instruction && step.instruction.trim().length > 0) {
      content.push({
        type: "instruction",
        content: inlineContent(step.instruction.trim()),
      });
    }

    if (step.fields && step.fields.length > 0) {
      content.push(
        ...step.fields.map<JSONContent>((field) => ({
          type: "collect",
          attrs: collectAttrsFromField(field),
        })),
      );
    }

    if (step.transitions && step.transitions.length > 0) {
      content.push({
        type: "transition",
        content: step.transitions.map<JSONContent>((transition) => {
          const caseContent: JSONContent[] = [];

          if (transition.condition && transition.condition.trim().length > 0) {
            caseContent.push({
              type: "transition_condition",
              content: [{ type: "text", text: transition.condition.trim() }],
            });
          }

          if (transition.description && transition.description.trim().length > 0) {
            caseContent.push({
              type: "transition_description",
              content: [{ type: "text", text: transition.description.trim() }],
            });
          }

          if (transition.say && transition.say.trim().length > 0) {
            caseContent.push({
              type: "transition_say",
              content: [{ type: "text", text: transition.say.trim() }],
            });
          }

          caseContent.push({
            type: "transition_target",
            content:
              transition.target && transition.target.trim().length > 0
                ? [{ type: "text", text: transition.target.trim() }]
                : [],
          });

          return {
            type: "transition_case",
            content: caseContent,
          };
        }),
      });
    }

    content.push({ type: "composer" });

    return {
      type: "step",
      content,
    };
  });

  return {
    type: "doc",
    content:
      steps.length > 0
        ? steps
        : [
            {
              type: "step",
              content: [{ type: "step_title", content: [] }, { type: "composer" }],
            },
          ],
  };
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
            const rawType = n.attrs?.fieldType;
            const field: Field = {
              name: name + idx,
              type: rawType === "number" ? "number" : rawType === "yes/no" ? "boolean" : "string",
            };
            if (rawType === "selection") {
              const rawOptions = n.attrs?.options;
              const options = typeof rawOptions === "string" ? rawOptions : "";
              const parsedOptions = options
                .split("\n")
                .map((option) => option.trim())
                .filter(Boolean);
              if (parsedOptions.length > 0) {
                field.enum = parsedOptions;
              }
            }
            return field;
          });
        const transitionsNode = content.find((n) => n.type === "transition");
        const transitions =
          transitionsNode?.content
            ?.filter((t) => t.type === "transition_case")
            .map<Transition>((t) => {
              const parts = t.content ?? [];
              const target =
                textContent(parts.find((p) => p.type === "transition_target")) ?? undefined;
              const condition =
                textContent(parts.find((p) => p.type === "transition_condition")) ?? undefined;
              const say = textContent(parts.find((p) => p.type === "transition_say")) ?? undefined;
              const description =
                textContent(parts.find((p) => p.type === "transition_description")) ?? undefined;
              return { say, description, target, condition };
            }) ?? undefined;

        return {
          name,
          say,
          instruction,
          fields: fields.length > 0 ? fields : undefined,
          transitions,
        };
      })
      .filter((step) => step !== null),
  };
}
