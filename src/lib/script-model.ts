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
  disabled?: boolean;
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

function parseFieldType(rawType: unknown): Field["type"] {
  return rawType === "number" || rawType === "boolean" || rawType === "string" ? rawType : "string";
}

function normalizeField(field: Partial<Field>, fallbackName = ""): Field {
  const enumValues = (field.enum ?? [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  const description =
    typeof field.description === "string" && field.description.trim().length > 0
      ? field.description.trim()
      : undefined;
  const name = typeof field.name === "string" ? field.name.trim() : "";

  return {
    name: name.length > 0 ? name : fallbackName,
    type: parseFieldType(field.type),
    ...(enumValues.length > 0 && { enum: enumValues }),
    ...(description && { description }),
  };
}

function serializeFieldAttr(field: Field): string {
  return JSON.stringify(normalizeField(field));
}

function parseFieldAttr(raw: unknown, fallbackName: string): Field {
  if (typeof raw === "string") {
    const value = raw.trim();
    if (value.length > 0) {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed && typeof parsed === "object") {
          return normalizeField(parsed as Partial<Field>, fallbackName);
        }
      } catch {
        return normalizeField({ name: value, type: "string" }, fallbackName);
      }
    }
  }

  if (raw && typeof raw === "object") {
    return normalizeField(raw as Partial<Field>, fallbackName);
  }

  return normalizeField({ name: fallbackName, type: "string" }, fallbackName);
}

function parseLegacyFieldCases(stepName: string, fieldsNode: JSONContent): Field[] {
  return (fieldsNode.content ?? [])
    .filter((fieldNode) => fieldNode.type === "field_case")
    .map<Field>((fieldNode, idx) => {
      const parts = fieldNode.content ?? [];
      const fieldName = textContent(parts.find((p) => p.type === "field_name"));
      const typeNode = parts.find((p) => p.type === "field_type");
      const comboboxType = typeNode?.content?.find((n) => n.type === "combobox")?.attrs?.value;
      const rawType =
        typeof comboboxType === "string"
          ? comboboxType.trim()
          : (textContent(typeNode)?.trim() ?? "");
      const enumText = textContent(parts.find((p) => p.type === "field_enum")) ?? "";
      const enumValues = enumText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const description = textContent(parts.find((p) => p.type === "field_description")) ?? "";

      return normalizeField(
        {
          name: fieldName ?? "",
          type: parseFieldType(rawType),
          ...(enumValues.length > 0 && { enum: enumValues }),
          ...(description.trim().length > 0 && {
            description: description.trim(),
          }),
        },
        `${stepName}_field_${idx + 1}`,
      );
    });
}

function parseLegacyCollectFields(stepName: string, nodes: JSONContent[]): Field[] {
  return nodes
    .filter((n) => n.type === "collect")
    .map((n, idx) => {
      const rawType = n.attrs?.fieldType;
      const field: Field = {
        name: `${stepName}_field_${idx + 1}`,
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
      content.push({
        type: "fields",
        content: step.fields.map<JSONContent>((field, idx) => ({
          type: "field",
          attrs: {
            field: serializeFieldAttr(normalizeField(field, `${step.name}_field_${idx + 1}`)),
          },
        })),
      });
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
        const fieldsNode = content.find((n) => n.type === "fields");
        const fieldsFromAttr =
          fieldsNode?.content
            ?.filter((fieldNode) => fieldNode.type === "field")
            .map((fieldNode, idx) =>
              parseFieldAttr(fieldNode.attrs?.field, `${name}_field_${idx + 1}`),
            ) ?? [];
        const fieldsFromLegacyCases =
          fieldsFromAttr.length > 0 || !fieldsNode ? [] : parseLegacyFieldCases(name, fieldsNode);
        const fields =
          fieldsFromAttr.length > 0
            ? fieldsFromAttr
            : fieldsFromLegacyCases.length > 0
              ? fieldsFromLegacyCases
              : parseLegacyCollectFields(name, content);

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
