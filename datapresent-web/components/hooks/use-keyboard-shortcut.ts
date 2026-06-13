"use client";

import { useEffect } from "react";

type KeyCombo = {
  key: string;
  meta?: boolean; // Cmd on Mac, Ctrl on Windows
  ctrl?: boolean;
  shift?: boolean;
};

const isEditing = () =>
  document.activeElement instanceof HTMLInputElement ||
  document.activeElement instanceof HTMLTextAreaElement ||
  document.activeElement instanceof HTMLSelectElement ||
  document.activeElement?.getAttribute("contenteditable") === "true";

/**
 * Register a global keyboard shortcut.
 * Skips when the user is typing in an input/textarea.
 */
export function useKeyboardShortcut(
  combo: KeyCombo | string,
  handler: (e: KeyboardEvent) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const normalized: KeyCombo = typeof combo === "string" ? { key: combo.toLowerCase() } : combo;

    const listener = (e: KeyboardEvent) => {
      // Don't intercept when user is typing
      if (isEditing()) return;

      const key = e.key.toLowerCase();
      const matchKey = key === normalized.key.toLowerCase();
      const matchMeta = normalized.meta ? e.metaKey : true;
      const matchCtrl = normalized.ctrl ? e.ctrlKey : true;
      const matchShift = normalized.shift ? e.shiftKey : true;

      // If meta/ctrl required, use either (cross-platform)
      const hasModifier = !normalized.meta && !normalized.ctrl ? true : e.metaKey || e.ctrlKey;

      if (matchKey && hasModifier && matchShift) {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [combo, handler, enabled]);
}
