import type { ChangeEvent } from "react";

import type { Field } from "../lib/script-model";

type FieldPopupFormProps = {
  field: Field;
  onChange: (field: Field) => void;
};

function parseEnumList(value: string): string[] | undefined {
  const options = value
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
  return options.length > 0 ? options : undefined;
}

export function FieldPopupForm({ field, onChange }: FieldPopupFormProps) {
  const enumText = (field.enum ?? []).join("\n");

  const update = (next: Partial<Field>) => {
    const merged: Field = {
      ...field,
      ...next,
    };

    if (!merged.enum || merged.enum.length === 0) {
      delete merged.enum;
    }

    if (!merged.description || merged.description.trim().length === 0) {
      delete merged.description;
    }

    onChange(merged);
  };

  return (
    <form
      data-field-interactive="true"
      className="w-80 space-y-3 rounded-lg text-sm outline-none"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="space-y-1">
        <label className="text-xs font-medium tracking-wide text-zinc-600 uppercase">Name</label>
        <input
          value={field.name}
          autoFocus
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 outline-none focus:border-blue-400"
          placeholder="Field name"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            update({ name: event.currentTarget.value });
          }}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium tracking-wide text-zinc-600 uppercase">Type</label>
        <select
          value={field.type}
          className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 outline-none focus:border-blue-400"
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            update({ type: event.currentTarget.value as Field["type"] });
          }}
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium tracking-wide text-zinc-600 uppercase">
          Enum options
        </label>
        <textarea
          value={enumText}
          rows={Math.max(2, enumText.length > 0 ? enumText.split("\n").length : 2)}
          className="w-full resize-y rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 leading-6 outline-none focus:border-blue-400"
          placeholder="One value per line"
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
            update({ enum: parseEnumList(event.currentTarget.value) });
          }}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium tracking-wide text-zinc-600 uppercase">
          Description
        </label>
        <textarea
          value={field.description ?? ""}
          rows={3}
          className="w-full resize-y rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 leading-6 outline-none focus:border-blue-400"
          placeholder="Optional"
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
            update({ description: event.currentTarget.value });
          }}
        />
      </div>
    </form>
  );
}
