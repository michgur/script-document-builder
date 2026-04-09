import { Editor, findParentNode, type Attribute, type KeyboardShortcutCommand } from "@tiptap/core";
import type { Node, NodeType, ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection, type Selection } from "@tiptap/pm/state";

type StepContext = {
  stepNode: Node;
  stepPos: number;
  stepDepth: number;
};

export function whenSelected(
  type: string,
  handler: (props: { editor: Editor; node: Node; pos: number }) => boolean | void,
  options?: {
    allowNonempty?: boolean;
    nodeSelection?: boolean;
  },
): KeyboardShortcutCommand {
  return ({ editor }) => {
    const { selection } = editor.state;

    if (
      options?.nodeSelection &&
      selection instanceof NodeSelection &&
      selection.node.type.name === type
    ) {
      return handler({ editor, node: selection.node, pos: selection.from }) ?? false;
    }

    if (!selection.empty && !options?.allowNonempty) return false;
    const match = findParentNode((node) => node.type.name === type)(selection);
    if (!match) return false;

    const { node, pos } = match;
    return handler({ editor, node, pos }) ?? false;
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

export function nodeDataAttr(name: string, defaultValue = ""): Attribute {
  const attr = `data-${name}`;
  return {
    default: defaultValue,
    parseHTML: (el: HTMLElement) => el.getAttribute(attr),
    renderHTML: (attrs: Record<string, unknown>) =>
      typeof attrs[name] === "string" && attrs[name].length > 0 ? { [attr]: attrs[name] } : {},
  };
}

export function findInsertionPosition(parentPos: ResolvedPos, nodeType: NodeType) {
  for (let i = parentPos.parent.childCount; i >= 0; i--) {
    if (parentPos.parent.canReplaceWith(i, i, nodeType)) {
      return parentPos.posAtIndex(i);
    }
  }
  return null;
}
