"use client";

import { useSyncExternalStore } from "react";
import { createBlankCharacter, DEFAULT_CHARACTERS } from "./defaults";
import type { Character } from "./types";

const STORAGE_KEY = "kokoro.characters.v2";

let cache: Character[] | null = null;
const listeners = new Set<() => void>();

// Fill fields missing from older saved data so schema additions don't crash the UI.
function normalize(raw: Partial<Character>): Character {
  const base = createBlankCharacter(raw.id ?? crypto.randomUUID());
  return {
    ...base,
    ...raw,
    portrait: raw.portrait ?? null,
    motion: { ...base.motion, ...raw.motion },
    personality: { ...base.personality, ...raw.personality },
    rules: Array.isArray(raw.rules) ? raw.rules : [],
    fallbacks: Array.isArray(raw.fallbacks) ? raw.fallbacks : [],
  };
}

function read(): Character[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cache =
      Array.isArray(parsed) && parsed.length > 0
        ? parsed.map((c) => normalize(c as Partial<Character>))
        : DEFAULT_CHARACTERS;
  } catch {
    cache = DEFAULT_CHARACTERS;
  }
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCharacters(): Character[] {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_CHARACTERS);
}

// Returns false when the browser refuses to persist (e.g. quota exceeded by large photos);
// the change still applies for the current session.
export function saveCharacters(next: Character[]): boolean {
  cache = next;
  let persisted = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    persisted = false;
  }
  emit();
  return persisted;
}

export function updateCharacter(id: string, patch: (c: Character) => Character): boolean {
  return saveCharacters(read().map((c) => (c.id === id ? patch(c) : c)));
}

export function resetCharacters() {
  saveCharacters(DEFAULT_CHARACTERS);
}
