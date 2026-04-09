import type { JSONContent } from "@tiptap/core";
import { useDeferredValue, useState } from "react";

import Editor from "../Editor";
import { compileFromEditorJson } from "../lib/script-model";

export default function EditorPoc2() {
  const [content, setContent] = useState<JSONContent>({});
  const deferredContent = useDeferredValue(content);

  return (
    <div className="size-full bg-zinc-50 px-4 py-10 text-zinc-900 selection:bg-selection">
      <div className="mx-auto me-8 h-full max-w-2xl rounded-xl bg-white py-12 ps-2 pe-9 shadow-sm ring-1 ring-zinc-200">
        <h1 className="ms-8 text-3xl font-semibold tracking-tight">Steps</h1>
        <Editor onChange={setContent} />
        <details className="ml-7 rounded-md bg-zinc-900 p-3 text-zinc-100">
          <summary className="cursor-pointer text-sm select-none">Compiled model</summary>
          <pre className="mt-3 overflow-x-auto text-xs">
            {JSON.stringify(compileFromEditorJson(deferredContent), null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
