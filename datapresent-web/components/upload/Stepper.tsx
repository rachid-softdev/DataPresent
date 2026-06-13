"use client";

import { Upload, Settings2, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepId = "upload" | "config" | "generation" | "result";

interface Step {
  id: StepId;
  label: string;
  icon: React.ElementType;
}

interface StepperProps {
  steps: Step[];
  currentStep: StepId;
  className?: string;
}

function getStepIndex(steps: Step[], id: StepId): number {
  return steps.findIndex((s) => s.id === id);
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  const currentIdx = getStepIndex(steps, currentStep);

  return (
    <nav aria-label="Progression du rapport" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between gap-0">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;
          const Icon = step.icon;

          return (
            <li key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <div
                  className={cn(
                    "relative flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-300",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary bg-primary/10 text-primary",
                    isPending && "border-muted-foreground/25 text-muted-foreground/50",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <Icon className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
                  )}
                </div>

                {/* Label — hidden on narrow screens */}
                <div className="hidden sm:block">
                  <p
                    className={cn(
                      "text-sm font-medium leading-tight transition-colors duration-300",
                      isCompleted && "text-primary",
                      isCurrent && "text-foreground",
                      isPending && "text-muted-foreground/50",
                    )}
                  >
                    {step.label}
                  </p>
                  {isCurrent && <p className="text-xs text-muted-foreground">En cours</p>}
                </div>
              </div>

              {/* Connector line (not after last step) */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-2 sm:mx-4 transition-colors duration-300",
                    idx < currentIdx ? "bg-primary" : "bg-muted-foreground/20",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Pre-built default steps for report generation. */
export function useReportSteps(t: (key: string) => string): Step[] {
  return [
    { id: "upload", label: t("upload.title"), icon: Upload },
    { id: "config", label: t("upload.sector.title"), icon: Settings2 },
    { id: "generation", label: t("upload.generation.title"), icon: Sparkles },
    { id: "result", label: t("upload.result.title"), icon: FileText },
  ];
}
