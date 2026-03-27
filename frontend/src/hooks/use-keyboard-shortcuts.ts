import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const matchesKey = event.key === shortcut.key;
        const matchesCtrl = shortcut.ctrlKey
          ? event.ctrlKey
          : !event.ctrlKey || shortcut.ctrlKey === false;
        const matchesShift = shortcut.shiftKey
          ? event.shiftKey
          : !event.shiftKey || shortcut.shiftKey === false;
        const matchesAlt = shortcut.altKey
          ? event.altKey
          : !event.altKey || shortcut.altKey === false;
        const matchesMeta = shortcut.metaKey
          ? event.metaKey
          : !event.metaKey || shortcut.metaKey === false;

        // Special handling for / key - allow even in inputs
        if (
          shortcut.key === "/" &&
          matchesKey &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          if (!isInput) {
            event.preventDefault();
            shortcut.handler();
          }
          continue;
        }

        if (
          matchesKey &&
          matchesCtrl &&
          matchesShift &&
          matchesAlt &&
          matchesMeta &&
          !isInput
        ) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export const COMMON_SHORTCUTS = {
  SEARCH_FOCUS: {
    key: "/",
    description: "Focus search",
  },
  HELP: {
    key: "?",
    shiftKey: true,
    description: "Show keyboard shortcuts",
  },
  ESCAPE: {
    key: "Escape",
    description: "Close dialog",
  },
} as const;
