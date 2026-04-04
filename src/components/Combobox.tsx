import * as Ariakit from "@ariakit/react";
import { type ComponentPropsWithoutRef, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";

type ComboboxProps = Omit<ComponentPropsWithoutRef<typeof Ariakit.Combobox>, "value"> & {
  defaultValue?: string;
  options?: string[];
  onCommit?: (value: string) => void;
  popoverClassName?: string;
};

export function Combobox({
  defaultValue = "",
  options = [],
  onCommit,
  className,
  popoverClassName,
  onBlur,
  onKeyDown,
  ...props
}: ComboboxProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    return query ? options.filter((option) => option.toLowerCase().includes(query)) : options;
  }, [value, options]);

  const commit = (nextValue = value) => {
    onCommit?.(nextValue.trim());
  };

  return (
    <Ariakit.ComboboxProvider value={value} setValue={setValue} open={true}>
      <div role="combobox" ref={wrapperRef} className="relative">
        <Ariakit.Combobox
          {...props}
          className={cn("outline-none", className)}
          onBlur={(event) => {
            const relatedTarget = event.relatedTarget;
            if (
              relatedTarget instanceof globalThis.Node &&
              wrapperRef.current?.contains(relatedTarget)
            ) {
              return;
            }
            onBlur?.(event);
            commit(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            onKeyDown?.(event);
          }}
        />

        {options.length > 0 ? (
          <Ariakit.ComboboxPopover
            portal={false}
            gutter={6}
            className={cn("z-50 max-h-56 overflow-auto rounded-md bg-white p-1", popoverClassName)}
          >
            {matches.map((option) => (
              <Ariakit.ComboboxItem
                key={option}
                value={option}
                focusOnHover
                className="block w-full cursor-pointer rounded px-2 py-1 text-left text-sm text-zinc-700 data-active-item:bg-zinc-100"
              />
            ))}
          </Ariakit.ComboboxPopover>
        ) : null}
      </div>
    </Ariakit.ComboboxProvider>
  );
}
