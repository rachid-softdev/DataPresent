"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useKeyboardShortcut } from "@/components/hooks/use-keyboard-shortcut";
import { CommandPalette } from "@/components/layout/command-palette";

/**
 * Registers global keyboard shortcuts for the app:
 * - Cmd/Ctrl+K → open command palette
 * - N → new report (on dashboard)
 * - Esc → close command palette
 *
 * Renders the CommandPalette overlay.
 */
export function KeyboardShortcuts({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === "/" || pathname === "/fr" || pathname === "/en";

  // Cmd/Ctrl+K → open command palette
  const handlePaletteToggle = useCallback(() => {
    setPaletteOpen((open) => !open);
  }, []);

  useKeyboardShortcut({ key: "k", meta: true }, handlePaletteToggle);
  useKeyboardShortcut({ key: "k", ctrl: true }, handlePaletteToggle);

  // N → new report (only on dashboard pages, not when editing)
  const handleNewReport = useCallback(() => {
    router.push("/new");
  }, [router]);

  useKeyboardShortcut("n", handleNewReport, isDashboard);

  return (
    <>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {children}
    </>
  );
}
