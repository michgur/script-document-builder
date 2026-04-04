import type { Editor } from "@tiptap/core";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { replaceComboboxOptions } from "./comboboxOptionsStore";

export type EditorModelStep = {
  name: string;
  type: string;
  field_type?: string;
  choices?: string[];
};

type EditorModelContextValue = {
  getStepNames: () => string[];
  getCompiledStepAtPos: (pos: number) => EditorModelStep | null;
};

type EditorModelProviderProps = {
  editor: Editor | null;
  compiledSteps: EditorModelStep[];
  children: ReactNode;
};

const EditorModelContext = createContext<EditorModelContextValue>({
  getStepNames: () => [],
  getCompiledStepAtPos: () => null,
});

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function getStepNameAtPos(editor: Editor, pos: number): string {
  const safePos = Math.max(0, Math.min(pos, editor.state.doc.content.size));
  const $pos = editor.state.doc.resolve(safePos);

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name !== "step") {
      continue;
    }

    for (let index = 0; index < node.childCount; index += 1) {
      const child = node.child(index);
      if (child.type.name === "stepTitle") {
        return child.textContent.trim();
      }
    }

    return "";
  }

  return "";
}

function buildCompiledStepMap(compiledSteps: EditorModelStep[]) {
  const map = new Map<string, EditorModelStep>();
  for (const step of compiledSteps) {
    const key = normalizeName(step.name);
    if (key && !map.has(key)) {
      map.set(key, step);
    }
  }
  return map;
}

export function EditorModelProvider({ editor, compiledSteps, children }: EditorModelProviderProps) {
  useEffect(() => {
    if (!editor) {
      replaceComboboxOptions({});
      return;
    }

    const stepNames = compiledSteps.map((step) => step.name).filter(Boolean);
    const compiledByName = buildCompiledStepMap(compiledSteps);
    const nextOptions: Record<string, string[]> = {};

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "branch_case" || node.childCount < 2) {
        return true;
      }

      const conditionNode = node.child(0);
      const conditionPos = pos + 1;
      const actionPos = conditionPos + conditionNode.nodeSize;
      const stepName = normalizeName(getStepNameAtPos(editor, pos));
      const step = stepName ? (compiledByName.get(stepName) ?? null) : null;

      const conditionOptions =
        step?.type === "collect" && step.field_type === "yes/no"
          ? ["Yes", "No"]
          : step?.type === "collect" && step.field_type === "selection"
            ? (step.choices ?? [])
            : [];

      nextOptions[`branch_condition.${conditionPos}`] = conditionOptions;
      nextOptions[`branch_action.${actionPos}`] = stepNames;
      return false;
    });

    replaceComboboxOptions(nextOptions);
  }, [compiledSteps, editor]);

  const value = useMemo<EditorModelContextValue>(() => {
    const names = compiledSteps.map((step) => step.name).filter(Boolean);

    const getCompiledStepAtPos = (pos: number) => {
      if (!editor) {
        return null;
      }

      const stepName = normalizeName(getStepNameAtPos(editor, pos));
      if (!stepName) {
        return null;
      }

      return compiledSteps.find((step) => normalizeName(step.name) === stepName) ?? null;
    };

    return {
      getStepNames: () => names,
      getCompiledStepAtPos,
    };
  }, [compiledSteps, editor]);

  return <EditorModelContext.Provider value={value}>{children}</EditorModelContext.Provider>;
}

export function useEditorModel() {
  return useContext(EditorModelContext);
}
