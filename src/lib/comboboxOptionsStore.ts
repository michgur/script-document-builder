import { useSyncExternalStore } from "react";

type ComboboxOptionsState = Record<string, string[]>;
const EMPTY_OPTIONS: string[] = [];

let state: ComboboxOptionsState = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function sanitizeOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter(Boolean);
}

function normalizeState(nextState: ComboboxOptionsState): ComboboxOptionsState {
  const out: ComboboxOptionsState = {};

  for (const [rawKey, rawOptions] of Object.entries(nextState)) {
    const key = rawKey.trim();
    if (!key) {
      continue;
    }
    out[key] = sanitizeOptions(rawOptions);
  }

  return out;
}

function statesEqual(a: ComboboxOptionsState, b: ComboboxOptionsState): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    const aValues = a[key] ?? [];
    const bValues = b[key] ?? [];

    if (aValues.length !== bValues.length) {
      return false;
    }

    for (let index = 0; index < aValues.length; index += 1) {
      if (aValues[index] !== bValues[index]) {
        return false;
      }
    }
  }

  return true;
}

export function replaceComboboxOptions(nextState: ComboboxOptionsState) {
  const next = normalizeState(nextState);
  if (statesEqual(state, next)) {
    return;
  }

  state = next;
  emit();
}

export function getComboboxOptions(key: string): string[] {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return EMPTY_OPTIONS;
  }

  return state[normalizedKey] ?? EMPTY_OPTIONS;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useComboboxOptions(key: string): string[] {
  return useSyncExternalStore(
    subscribe,
    () => getComboboxOptions(key),
    () => getComboboxOptions(key),
  );
}
