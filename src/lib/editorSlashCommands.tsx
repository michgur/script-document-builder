import * as Ariakit from "@ariakit/react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  BotMessageSquare,
  CircleHelp,
  FormInput,
  GitBranch,
  type LucideIcon,
  TextCursorInput,
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "./utils";

type SlashCommandRunContext = {
  editor: Editor;
  range: Range;
};

export type SlashCommandItem = {
  title: string;
  description: string;
  aliases: string[];
  icon: LucideIcon;
  run: ({ editor, range }: SlashCommandRunContext) => void;
};

type SlashCommandListProps = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
};

type SlashCommandListRef = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
  function SlashCommandList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (!item) {
        return;
      }
      command(item);
    };

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
                <Ariakit.Button
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
                </Ariakit.Button>
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

function updateMenuPosition(
  menuContainer: HTMLDivElement,
  clientRect?: (() => DOMRect | null) | null,
) {
  const rect = clientRect?.();

  if (!rect) {
    menuContainer.style.display = "none";
    return;
  }

  const maxLeft = window.innerWidth - menuContainer.offsetWidth - 12;
  const left = Math.min(Math.max(rect.left, 12), Math.max(maxLeft, 12));
  const top = rect.bottom + 8;

  menuContainer.style.display = "block";
  menuContainer.style.left = `${left}px`;
  menuContainer.style.top = `${top}px`;
}

function filterSlashCommandItems(items: SlashCommandItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const haystack = [item.title, item.description, ...item.aliases].join(" ").toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function createEditorSlashExtension(items: SlashCommandItem[]) {
  return Extension.create({
    name: "editorSlashCommands",

    addProseMirrorPlugins() {
      return [
        Suggestion<SlashCommandItem, SlashCommandItem>({
          editor: this.editor,
          char: "/",
          startOfLine: true,
          allowedPrefixes: null,
          decorationTag: "span",
          decorationClass: "slash-command-decoration",
          allow: ({ state, range }) => {
            const parentType = state.doc.resolve(range.from).parent.type.name;

            return (
              parentType === "stepTitle" ||
              parentType === "paragraph" ||
              parentType === "instruction"
            );
          },
          items: ({ query }) => filterSlashCommandItems(items, query),
          command: ({ editor, range, props }) => {
            props.run({ editor, range });
          },
          render: () => {
            let renderer: ReactRenderer<SlashCommandListRef, SlashCommandListProps> | undefined;
            let menuContainer: HTMLDivElement | undefined;

            return {
              onStart: (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
                menuContainer = document.createElement("div");
                menuContainer.className = "pointer-events-auto fixed top-0 left-0 z-50";
                document.body.append(menuContainer);

                renderer = new ReactRenderer(SlashCommandList, {
                  editor: props.editor,
                  props: {
                    items: props.items,
                    command: props.command,
                  } satisfies SlashCommandListProps,
                });

                menuContainer.append(renderer.element);
                updateMenuPosition(menuContainer, props.clientRect);
              },

              onUpdate: (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
                renderer?.updateProps({
                  items: props.items,
                  command: props.command,
                } satisfies SlashCommandListProps);

                if (menuContainer) {
                  updateMenuPosition(menuContainer, props.clientRect);
                }
              },

              onKeyDown: ({ event, view }: SuggestionKeyDownProps) => {
                if (event.key === "Escape") {
                  exitSuggestion(view);
                  return true;
                }

                return renderer?.ref?.onKeyDown(event) ?? false;
              },

              onExit: () => {
                renderer?.destroy();
                renderer = undefined;

                if (menuContainer) {
                  menuContainer.remove();
                  menuContainer = undefined;
                }
              },
            };
          },
        }),
      ];
    },
  });
}

export function buildEditorSlashCommandItems(createEmptyStep: () => object): SlashCommandItem[] {
  return [
    {
      title: "Step",
      description: "Insert a new script step",
      aliases: ["section", "block"],
      icon: BotMessageSquare,
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent(createEmptyStep()).run();
      },
    },
    {
      title: "Instructions",
      description: "Add guidance for the agent",
      aliases: ["note", "guide", "instruction"],
      icon: CircleHelp,
      run: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: "instruction", content: [] })
          .run();
      },
    },
    {
      title: "Collect response",
      description: "Capture structured caller input",
      aliases: ["collect", "question", "answer", "field"],
      icon: TextCursorInput,
      run: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "collect",
            attrs: { fieldType: "text", options: "" },
          })
          .run();
      },
    },
    {
      title: "Combobox",
      description: "Capture structured caller input",
      aliases: ["combobox"],
      icon: FormInput,
      run: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "combobox",
            attrs: {
              value: "",
              placeholder: "condition value",
            },
          })
          .run();
      },
    },
    {
      title: "If",
      description: "Add branch routing cases",
      aliases: ["if", "branch", "route", "routing"],
      icon: GitBranch,
      run: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: "branch",
            content: [
              {
                type: "branch_case",
                content: [
                  {
                    type: "branch_if",
                    content: [
                      {
                        type: "combobox",
                        attrs: {
                          value: "",
                          placeholder: "condition value",
                        },
                      },
                    ],
                  },
                  {
                    type: "branch_then",
                    content: [
                      {
                        type: "combobox",
                        attrs: {
                          value: "",
                          placeholder: "next action",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          })
          .run();
      },
    },
  ];
}
