import type { Editor as TiptapEditor, JSONContent } from "@tiptap/core";
import { useDeferredValue, useState } from "react";

import EditorMinimap from "../components/EditorMinimap";
import Editor from "../Editor";
import { compileFromEditorJson, compileToEditorJson, type Script } from "../lib/script-model";

const SAMPLE_NAMES = ["amanda-2", "amanda-3"];

function isScript(value: unknown): value is Script {
  return !!value && typeof value === "object" && Array.isArray((value as Script).steps);
}

export default function EditorPoc2() {
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [content, setContent] = useState<JSONContent>({});
  const [externalContent, setExternalContent] = useState<JSONContent>();
  const [selectedSample, setSelectedSample] = useState("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const deferredContent = useDeferredValue(content);

  const onSampleSelect = async (name: string) => {
    setSelectedSample(name);
    setSampleError(null);
    if (!name) return;

    setIsLoadingSample(true);
    try {
      const response = await fetch(`/samples/${name}.json`);
      if (!response.ok) {
        throw new Error(`Failed loading sample (${response.status})`);
      }

      const raw = (await response.json()) as unknown;
      const scriptCandidate = Array.isArray(raw) ? { steps: raw } : raw;
      if (!isScript(scriptCandidate)) {
        throw new Error("Invalid script format");
      }

      setExternalContent(compileToEditorJson(scriptCandidate));
    } catch (error) {
      setSampleError(error instanceof Error ? error.message : "Failed loading sample");
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="size-full bg-zinc-50 px-4 py-10 text-zinc-900 selection:bg-selection">
      <div className="mx-auto flex h-full max-w-6xl items-start justify-center gap-4">
        <EditorMinimap editor={editor} content={content} />
        <div className="h-full w-full max-w-2xl overflow-x-clip overflow-y-auto rounded-xl bg-white py-12 ps-2 pe-9 shadow-sm ring-1 ring-zinc-200">
          <h1 className="ms-8 text-3xl font-semibold tracking-tight">Script</h1>
          <div className="mx-8 mb-3 flex items-center gap-3">
            <label htmlFor="sample-picker" className="text-sm font-medium text-zinc-600">
              Load sample
            </label>
            <select
              id="sample-picker"
              value={selectedSample}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
              onChange={(event) => onSampleSelect(event.target.value)}
              disabled={isLoadingSample}
            >
              <option value="">Select...</option>
              {SAMPLE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {isLoadingSample ? <span className="text-xs text-zinc-500">Loading...</span> : null}
            {sampleError ? <span className="text-xs text-rose-600">{sampleError}</span> : null}
          </div>
          <Editor
            onChange={setContent}
            externalContent={externalContent}
            onEditorReady={setEditor}
          />
          <details className="ml-7 rounded-md bg-zinc-900 p-3 text-zinc-100">
            <summary className="cursor-pointer text-sm select-none">Compiled model</summary>
            <pre className="mt-3 overflow-x-auto text-xs">
              {JSON.stringify(compileFromEditorJson(deferredContent), null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
