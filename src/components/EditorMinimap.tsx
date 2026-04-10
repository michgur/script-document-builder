import type { Editor, JSONContent } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useEffect, useMemo, useState } from "react";

import { cn } from "../lib/utils";

type EditorMinimapProps = {
  editor: Editor | null;
  content: JSONContent;
};

const STEP_SCROLL_MARGIN_PX = 48;

function readText(node?: JSONContent): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map((child) => readText(child)).join("");
}

function getStepPosByIndex(editor: Editor, targetIndex: number): number | null {
  if (targetIndex < 0) return null;

  let currentIndex = -1;
  let foundPos: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;
    if (node.type.name !== "step") return true;

    currentIndex += 1;
    if (currentIndex === targetIndex) {
      foundPos = pos;
    }

    return false;
  });

  return foundPos;
}

function getStepPositions(editor: Editor): number[] {
  const positions: number[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "step") {
      positions.push(pos);
      return false;
    }

    return true;
  });

  return positions;
}

function findScrollContainer(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const canScrollY = style.overflowY === "auto" || style.overflowY === "scroll";
    if (canScrollY && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}

function scrollNodeToTop(node: HTMLElement, anchor: HTMLElement, margin = STEP_SCROLL_MARGIN_PX) {
  const container = findScrollContainer(anchor);

  if (!container) {
    const top = window.scrollY + node.getBoundingClientRect().top - margin;
    window.scrollTo({ top, behavior: "smooth" });
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const top = container.scrollTop + (nodeRect.top - containerRect.top) - margin;

  container.scrollTo({ top, behavior: "smooth" });
}

function getStepTitleEndPos(editor: Editor, stepPos: number): number | null {
  const stepNode = editor.state.doc.nodeAt(stepPos);
  if (!stepNode || stepNode.type.name !== "step") return null;
  if (stepNode.childCount === 0) return null;

  const titleNode = stepNode.child(0);
  if (titleNode.type.name !== "step_title") return null;

  const titlePos = stepPos + 1;
  return titlePos + titleNode.nodeSize - 1;
}

function focusStepTitleEnd(editor: Editor, stepPos: number): number | null {
  const titleEndPos = getStepTitleEndPos(editor, stepPos);
  if (titleEndPos === null) return null;

  const nextSelection = TextSelection.create(editor.state.doc, titleEndPos);
  editor.view.dispatch(editor.state.tr.setSelection(nextSelection));
  editor.view.focus();

  return titleEndPos;
}

function getVisibleStepIndex(editor: Editor): number | null {
  const stepPositions = getStepPositions(editor);
  if (stepPositions.length === 0) return null;

  const container = findScrollContainer(editor.view.dom);
  const anchorTop = (container?.getBoundingClientRect().top ?? 0) + STEP_SCROLL_MARGIN_PX;

  let firstBelow: { index: number; delta: number } | null = null;
  let lastAbove: number | null = null;

  for (let index = 0; index < stepPositions.length; index += 1) {
    const titlePos = stepPositions[index] + 1;
    const titleNode = editor.view.nodeDOM(titlePos);
    if (!(titleNode instanceof HTMLElement)) continue;

    const delta = titleNode.getBoundingClientRect().top - anchorTop;
    if (delta >= 0) {
      if (!firstBelow || delta < firstBelow.delta) {
        firstBelow = { index, delta };
      }
      continue;
    }

    lastAbove = index;
  }

  if (firstBelow) return firstBelow.index;
  if (lastAbove !== null) return lastAbove;
  return 0;
}

function getActiveStepIndex(editor: Editor): number | null {
  const { $from } = editor.state.selection;
  let stepPos: number | null = null;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "step") {
      stepPos = $from.before(depth);
      break;
    }
  }

  if (stepPos === null) return null;

  let currentIndex = -1;
  let activeIndex: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (activeIndex !== null) return false;
    if (node.type.name !== "step") return true;

    currentIndex += 1;
    if (pos === stepPos) {
      activeIndex = currentIndex;
    }

    return false;
  });

  return activeIndex;
}

export default function EditorMinimap({ editor, content }: EditorMinimapProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);

  const steps = useMemo(() => {
    return (content.content ?? [])
      .filter((node) => node.type === "step")
      .map((step, index) => {
        const titleNode = step.content?.find((child) => child.type === "step_title");
        const title = readText(titleNode).replace(/\s+/g, " ").trim();
        return {
          index,
          title: title.length > 0 ? title : `Untitled step ${index + 1}`,
        };
      });
  }, [content]);

  useEffect(() => {
    if (!editor) {
      setFocusedIndex(null);
      return;
    }

    const updateFocusedIndex = () => {
      setFocusedIndex(getActiveStepIndex(editor));
    };

    updateFocusedIndex();
    editor.on("selectionUpdate", updateFocusedIndex);

    return () => {
      editor.off("selectionUpdate", updateFocusedIndex);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      setIsEditorFocused(false);
      return;
    }

    const onFocus = () => setIsEditorFocused(true);
    const onBlur = () => setIsEditorFocused(false);

    setIsEditorFocused(editor.isFocused);
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);

    return () => {
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || steps.length === 0) {
      setVisibleIndex(null);
      return;
    }

    let frameId: number | null = null;
    const scrollContainer = findScrollContainer(editor.view.dom);

    const updateVisibleIndex = () => {
      setVisibleIndex(getVisibleStepIndex(editor));
    };

    const scheduleUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateVisibleIndex();
      });
    };

    updateVisibleIndex();
    scrollContainer?.addEventListener("scroll", scheduleUpdate, {
      passive: true,
    });
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    editor.on("update", scheduleUpdate);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      scrollContainer?.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      editor.off("update", scheduleUpdate);
    };
  }, [editor, steps]);

  const activeIndex = isEditorFocused ? focusedIndex : (visibleIndex ?? focusedIndex);

  if (steps.length === 0) return null;

  return (
    <aside className="sticky top-10 hidden max-h-[calc(100vh-5rem)] w-42 shrink-0 overflow-y-auto py-12 md:block">
      <nav aria-label="Step minimap">
        <h4 className="mb-1 text-sm font-medium">Script</h4>
        <ol className="border-s-2 border-zinc-200">
          {steps.map((step) => {
            const isActive = step.index === activeIndex;
            return (
              <li key={step.index} className="h-6 p-0">
                <button
                  type="button"
                  className={cn(
                    "size-full overflow-clip rounded-e-md px-2 py-0.5 text-left text-xs text-nowrap text-ellipsis",
                    isActive
                      ? "bg-zinc-100 font-medium text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100",
                  )}
                  title={step.title}
                  aria-current={isActive ? "true" : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (!editor) return;
                    const stepPos = getStepPosByIndex(editor, step.index);
                    if (stepPos === null) return;

                    const titleEndPos = focusStepTitleEnd(editor, stepPos);
                    if (titleEndPos === null) return;

                    const titlePos = stepPos + 1;
                    const titleNode = editor.view.nodeDOM(titlePos);
                    if (titleNode instanceof HTMLElement) {
                      scrollNodeToTop(titleNode, editor.view.dom);
                    }
                  }}
                >
                  {step.title}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
