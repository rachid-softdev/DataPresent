"use client";

import { motion } from "framer-motion";
import { Loader2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SubStage {
  id: string;
  label: string;
}

interface GenerationProgressProps {
  /** 0–100 overall progress value */
  progress: number;
  /** Sub-stages that make up the generation pipeline */
  subStages: SubStage[];
  /** Index of the currently active sub-stage */
  activeSubStage: number;
  /** True if upload/generation has stalled */
  stalled: boolean;
  /** Stall warning message */
  stallMessage?: string;
  /** Called when the user cancels */
  onCancel: () => void;
  /** Called when the user retries after stall */
  onRetry?: () => void;
  className?: string;
}

export function GenerationProgress({
  progress,
  subStages,
  activeSubStage,
  stalled,
  stallMessage,
  onCancel,
  onRetry,
  className,
}: GenerationProgressProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Overall progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Génération du rapport</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} max={100} className="h-2" />
      </div>

      {/* Sub-stage list */}
      <div className="space-y-2">
        {subStages.map((stage, idx) => {
          const isActive = idx === activeSubStage;
          const isDone = idx < activeSubStage;
          const isPending = idx > activeSubStage;

          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300",
                isActive && "bg-primary/5 border border-primary/15",
                isDone && "text-muted-foreground/60",
                isPending && "text-muted-foreground/30",
              )}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {isDone ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="w-4 h-4 text-primary" />
                  </motion.div>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-sm transition-colors",
                  isActive && "font-medium text-foreground",
                  isDone && "line-through",
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stall warning */}
      {stalled && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {stallMessage || "La génération semble prendre plus de temps que prévu."}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Vous pouvez annuler et réessayer, ou patienter.
            </p>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex-shrink-0"
            >
              Réessayer
            </Button>
          )}
        </motion.div>
      )}

      {/* Cancel button */}
      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-muted-foreground hover:text-destructive gap-2"
        >
          <XCircle className="w-4 h-4" />
          Annuler
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook that returns a stable list of sub-stages for generation.
 */
export function useGenerationSubStages(t: (key: string) => string): SubStage[] {
  return [
    { id: "analyse", label: t("upload.stages.analyse") || "Analyse des données" },
    { id: "charts", label: t("upload.stages.charts") || "Création des graphiques" },
    { id: "layout", label: t("upload.stages.layout") || "Mise en page" },
    { id: "finalize", label: t("upload.stages.finalize") || "Finalisation du rapport" },
  ];
}
