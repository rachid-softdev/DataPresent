"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  FileText,
  Settings,
  HelpCircle,
  LogIn,
  UserPlus,
  LayoutDashboard,
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    {
      id: "new-report",
      label: "Nouveau rapport",
      description: "Créez une présentation à partir de vos données",
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        router.push("/new");
        onOpenChange(false);
      },
      keywords: ["new", "create", "report", "nouveau", "créer", "rapport"],
    },
    {
      id: "dashboard",
      label: t("dashboard"),
      description: "Retour au tableau de bord",
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => {
        router.push("/");
        onOpenChange(false);
      },
      keywords: ["dashboard", "home", "accueil", "tableau", "bord"],
    },
    {
      id: "reports",
      label: t("reports"),
      description: "Voir tous les rapports",
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        router.push("/reports");
        onOpenChange(false);
      },
      keywords: ["reports", "rapports", "all", "tous"],
    },
    {
      id: "settings",
      label: t("settings"),
      description: "Paramètres du compte",
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        router.push("/settings");
        onOpenChange(false);
      },
      keywords: ["settings", "paramètres", "config", "preferences"],
    },
    {
      id: "help",
      label: t("help"),
      description: "Aide et documentation",
      icon: <HelpCircle className="w-4 h-4" />,
      action: () => {
        router.push("/help");
        onOpenChange(false);
      },
      keywords: ["help", "aide", "support", "documentation"],
    },
    {
      id: "login",
      label: t("login"),
      description: "Se connecter",
      icon: <LogIn className="w-4 h-4" />,
      action: () => {
        router.push("/login");
        onOpenChange(false);
      },
      keywords: ["login", "connexion", "signin", "connect"],
    },
    {
      id: "signup",
      label: t("signup"),
      description: "Créer un compte",
      icon: <UserPlus className="w-4 h-4" />,
      action: () => {
        router.push("/signup");
        onOpenChange(false);
      },
      keywords: ["signup", "inscription", "register", "créer"],
    },
  ];

  const filtered = query.trim()
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.keywords.some((k) => k.includes(query.toLowerCase())),
      )
    : commands;

  useEffect(() => {
    if (open) {
      // Defer state reset to avoid cascading renders warning
      requestAnimationFrame(() => {
        setQuery("");
        setActiveIndex(0);
        inputRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    // Reset scroll position on query change — deferred to avoid cascading render
    const id = requestAnimationFrame(() => {
      setActiveIndex(0);
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[activeIndex]) {
            filtered[activeIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [filtered, activeIndex, onOpenChange],
  );

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        className="fixed left-1/2 top-[15vh] z-50 w-full max-w-lg -translate-x-1/2"
        role="dialog"
        aria-modal="true"
        aria-label="Commandes"
      >
        <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher une commande…"
              className="flex-1 h-12 bg-transparent text-foreground placeholder:text-muted-foreground/60 outline-none text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground bg-muted">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-72 overflow-y-auto p-2" role="listbox">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucun résultat pour &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((cmd, index) => (
                <button
                  key={cmd.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    index === activeIndex
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      index === activeIndex
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cmd.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{cmd.label}</div>
                    {cmd.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {cmd.description}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted font-medium">↑↓</kbd> Naviguer
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted font-medium">↵</kbd> Ouvrir
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted font-medium">Esc</kbd> Fermer
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
