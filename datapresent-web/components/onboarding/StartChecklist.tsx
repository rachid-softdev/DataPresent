"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  completed: boolean;
}

const ITEMS: Omit<ChecklistItem, "completed">[] = [
  { id: "import", label: "Importer mon premier fichier", href: "/new" },
  { id: "generate", label: "Générer un rapport automatique", href: "/new" },
  { id: "export", label: "Exporter une présentation (PPTX ou PDF)", href: "/reports" },
];

const CHECKLIST_KEY = "datapresent-checklist";

export function StartChecklist() {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    if (typeof window === "undefined") return ITEMS.map((i) => ({ ...i, completed: false }));
    try {
      const saved = localStorage.getItem(CHECKLIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return ITEMS.map((item) => ({
          ...item,
          completed: parsed[item.id] || false,
        }));
      }
    } catch {}
    return ITEMS.map((i) => ({ ...i, completed: false }));
  });

  const allDone = items.every((i) => i.completed);
  const doneCount = items.filter((i) => i.completed).length;

  const handleToggle = useCallback((id: string) => {
    setItems((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, completed: true } : item));
      // Persist to localStorage
      const obj: Record<string, boolean> = {};
      updated.forEach((i) => {
        obj[i.id] = i.completed;
      });
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(obj));
      return updated;
    });
  }, []);

  const handleReset = () => {
    localStorage.removeItem(CHECKLIST_KEY);
    setItems(ITEMS.map((i) => ({ ...i, completed: false })));
  };

  if (allDone) {
    return (
      <div className="bg-muted rounded-xl p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700">Tout est accompli !</p>
            <p className="text-xs text-muted-foreground">Vous maîtrisez DataPresent.</p>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Checklist de démarrage</h4>
        <span className="text-xs text-muted-foreground">
          {doneCount}/{items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5">
            <button
              onClick={() => handleToggle(item.id)}
              className="flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
              aria-label={
                item.completed ? `${item.label} (fait)` : `Marquer "${item.label}" comme fait`
              }
            >
              {item.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </motion.div>
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/60" />
              )}
            </button>
            <button
              onClick={() => (item.completed ? null : router.push(item.href))}
              className={`text-sm text-left ${
                item.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground hover:text-primary transition-colors"
              }`}
              disabled={item.completed}
            >
              {item.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
