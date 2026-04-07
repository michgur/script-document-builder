import { Editor, findParentNode, type KeyboardShortcutCommand } from "@tiptap/core";
import type { Node, ResolvedPos } from "@tiptap/pm/model";
import type { Selection } from "@tiptap/pm/state";

type StepContext = {
  stepNode: Node;
  stepPos: number;
  stepDepth: number;
};

export function whenSelected(
  type: string,
  handler: (props: { editor: Editor; node: Node; pos: number }) => boolean,
  options?: {
    allowNonempty?: boolean;
  },
): KeyboardShortcutCommand {
  return ({ editor }) => {
    const { selection } = editor.state;
    if (!selection.empty && !options?.allowNonempty) return false;

    const match = findParentNode((node) => node.type.name === type)(selection);
    if (!match) return false;

    const { node, pos } = match;
    return handler({ editor, node, pos });
  };
}

export function findParentNodeOfType(selection: Selection, type: string) {
  return findParentNode((node: Node) => node.type.name === type)(selection);
}

export function findParentStepNode(selection: Selection) {
  return findParentNodeOfType(selection, "step");
}

export function getCurrentStepContext($pos: ResolvedPos): StepContext | null {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name !== "step") {
      continue;
    }

    return {
      stepNode: node,
      stepPos: $pos.before(depth),
      stepDepth: depth,
    };
  }

  return null;
}

export function getStepChildIndexByType(stepNode: Node, childTypeName: string): number {
  for (let index = 0; index < stepNode.childCount; index += 1) {
    if (stepNode.child(index)?.type.name === childTypeName) {
      return index;
    }
  }

  return -1;
}

export function getStepChildPos(stepPos: number, stepNode: Node, childIndex: number): number {
  let offset = 1;
  for (let index = 0; index < childIndex; index += 1) {
    offset += stepNode.child(index)?.nodeSize ?? 0;
  }

  return stepPos + offset;
}

export function stepHasCustomNodes(stepNode: Node): boolean {
  for (let index = 0; index < stepNode.childCount; index += 1) {
    const childName = stepNode.child(index)?.type.name;
    if (childName !== "step_title" && childName !== "say" && childName !== "composer") {
      return true;
    }
  }

  return false;
}
