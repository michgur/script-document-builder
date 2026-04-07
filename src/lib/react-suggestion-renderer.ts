import { ReactRenderer } from "@tiptap/react";
import {
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";

export type ReactSuggestionRef = {
  [key: string]: any;
  onKeyDown?(evt: KeyboardEvent): void;
};

export type ReactSuggestionProps<I, TSelected> = {
  [key: string]: any;
} & Partial<SuggestionProps<I, TSelected>>;

export function reactSuggestionRenderer<
  I,
  TSelected,
  R extends ReactSuggestionRef,
  P extends ReactSuggestionProps<I, TSelected>,
>(Component: React.FC<P>, opts?: { as?: string; className?: string }): SuggestionOptions["render"] {
  return () => {
    let renderer: ReactRenderer<R, P> | undefined;
    let elt: HTMLElement | undefined;

    return {
      onStart: (props: SuggestionProps<I, TSelected>) => {
        elt = document.createElement("div");
        elt.className = "pointer-events-auto fixed top-0 left-0 z-50";
        document.body.append(elt);

        renderer = new ReactRenderer(Component, {
          editor: props.editor,
          as: opts?.as,
          className: opts?.className,
          props,
        });
        elt.append(renderer.element);

        positionElement(elt, props.clientRect);
      },

      onUpdate: (props: SuggestionProps<I, TSelected>) => {
        renderer?.updateProps(props);
        if (elt) positionElement(elt, props.clientRect);
      },

      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        return renderer?.ref?.onKeyDown?.(event) ?? false;
      },

      onExit: () => {
        renderer?.destroy();
        elt?.remove();
        renderer = undefined;
        elt = undefined;
      },
    };
  };
}

function positionElement(elt: HTMLElement, clientRect?: (() => DOMRect | null) | null) {
  const rect = clientRect?.();
  if (!rect) {
    elt.style.display = "none";
    return;
  }

  const maxLeft = window.innerWidth - elt.offsetWidth - 12;
  const left = Math.min(Math.max(rect.left, 12), Math.max(maxLeft, 12));
  const top = rect.bottom + 8;

  elt.style.display = "block";
  elt.style.left = `${left}px`;
  elt.style.top = `${top}px`;
}
