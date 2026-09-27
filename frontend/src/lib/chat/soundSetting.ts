"use client";

import { useSyncExternalStore } from "react";

const KEY = "kokoro.sound";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Not persisted in private mode; the toggle still works for this visit.
  }
  listeners.forEach((l) => l());
}

export function useSoundOn() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => true,
  );
}
