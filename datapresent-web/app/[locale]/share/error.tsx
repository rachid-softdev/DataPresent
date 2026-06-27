"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Share error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-destructive animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
            Rapport introuvable
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-sm mx-auto">
            Ce lien de partage n&apos;existe pas ou a été supprimé.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium transition-colors hover:bg-primary/90 hover:scale-105"
            >
              <AlertTriangle className="w-4 h-4" />
              Réessayer
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface text-surface-foreground px-6 py-3 font-medium transition-colors hover:bg-muted hover:scale-105"
            >
              <Home className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>

        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-destructive/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
