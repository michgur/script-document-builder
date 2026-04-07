import * as AriaKit from "@ariakit/react";
import type { SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useImperativeHandle, useState } from "react";

import type { ComposerSuggestionItem } from "../lib/composer-suggestions";
import { cn } from "../lib/utils";

export type ComposerSuggestionsRef = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type ComposerSuggestionsProps = SuggestionProps<
  ComposerSuggestionItem,
  ComposerSuggestionItem
>;

export const ComposerSuggestions = forwardRef<ComposerSuggestionsRef, ComposerSuggestionsProps>(
  function SlashCommandList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectItem = (index: number) => items[index] && command(items[index]);

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: (event) => {
          if (items.length === 0) {
            return false;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex((index) => (index > 0 ? index - 1 : items.length - 1));
            return true;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex((index) => (index < items.length - 1 ? index + 1 : 0));
            return true;
          }

          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            event.stopPropagation();
            selectItem(selectedIndex);
            return true;
          }

          return false;
        },
      }),
      [items, selectedIndex],
    );

    return (
      <div className="w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl">
        {items.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <AriaKit.Button
                  key={item.title}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition outline-none",
                    index === selectedIndex
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-50",
                  )}
                  onMouseEnter={() => {
                    setSelectedIndex(index);
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectItem(index);
                  }}
                >
                  <Icon size={14} className="mt-0.5 shrink-0 text-zinc-500" />
                  <span className="space-y-0.5">
                    <span className="block text-sm leading-5 font-medium">{item.title}</span>
                    <span className="block text-xs leading-4 text-zinc-500">
                      {item.description}
                    </span>
                  </span>
                </AriaKit.Button>
              );
            })}
          </div>
        ) : (
          <div className="px-2 py-1 text-sm text-zinc-500">No matches</div>
        )}
      </div>
    );
  },
);
