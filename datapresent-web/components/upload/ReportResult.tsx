"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportResultProps {
  /** "success" | "error" | null when still loading */
  status: "success" | "error" | null;
  /** Report ID to link to on success */
  reportId?: string;
  /** Report title on success */
  reportTitle?: string;
  /** Error message to display */
  errorMessage?: string;
  /** Called when the user clicks retry */
  onRetry: () => void;
  /** Called when the user dismisses (back to step 1) */
  onDismiss?: () => void;
  className?: string;
}

export function ReportResult({
  status,
  reportId,
  reportTitle,
  errorMessage,
  onRetry,
  onDismiss,
  className,
}: ReportResultProps) {
  return (
    <div className={cn("flex flex-col items-center text-center py-8", className)}>
      {status === "success" && reportId ? (
        <SuccessState reportId={reportId} reportTitle={reportTitle} onDismiss={onDismiss} />
      ) : status === "error" ? (
        <ErrorState message={errorMessage} onRetry={onRetry} onDismiss={onDismiss} />
      ) : (
        <PendingState />
      )}
    </div>
  );
}

function SuccessState({
  reportId,
  reportTitle,
  onDismiss,
}: {
  reportId: string;
  reportTitle?: string;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6 max-w-md mx-auto"
    >
      {/* Animated checkmark */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </motion.div>
        </motion.div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Rapport généré avec succès</h3>
        {reportTitle && <p className="text-muted-foreground">{reportTitle}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link href={`/reports/${reportId}`}>
          <Button className="w-full sm:w-auto gap-2">
            Voir le rapport
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/reports">
          <Button variant="outline" className="w-full sm:w-auto">
            Tous les rapports
          </Button>
        </Link>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Générer un autre rapport
        </button>
      )}
    </motion.div>
  );
}

function ErrorState({
  message,
  onRetry,
  onDismiss,
}: {
  message?: string;
  onRetry: () => void;
  onDismiss?: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6 max-w-md mx-auto"
    >
      <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Échec de la génération</h3>
        <p className="text-muted-foreground text-sm">
          {message || "Une erreur s'est produite lors de la génération du rapport."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button onClick={onRetry} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Réessayer
        </Button>
        {onDismiss && (
          <Button variant="outline" onClick={onDismiss}>
            Recommencer
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function PendingState() {
  return (
    <div className="space-y-4 max-w-md mx-auto py-8">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto animate-pulse">
        <div className="w-10 h-10 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-48 bg-muted rounded mx-auto animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
      </div>
    </div>
  );
}
