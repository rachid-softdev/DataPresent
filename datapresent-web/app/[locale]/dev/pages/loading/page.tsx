"use client";

import { notFound } from "next/navigation";

/**
 * Dev only: preview of the various loading states in the app.
 * Renders the locale-level spinner and dashboard skeleton directly.
 *
 * In production, real 404 (defense in depth + proxy blocking).
 */
export default function LoadingPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <h1 className="app-heading app-heading-lg mb-4">Loading States Preview</h1>

      {/* Locale-level loading spinner */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Locale Loading (spinner)</h2>
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
          <div className="px-4 py-3 bg-muted border-b border-border">
            <p className="text-xs font-mono text-muted-foreground">[locale]/loading.tsx</p>
          </div>
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard skeleton */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Dashboard Skeleton</h2>
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
          <div className="px-4 py-3 bg-muted border-b border-border">
            <p className="text-xs font-mono text-muted-foreground">(dashboard)/loading.tsx</p>
          </div>
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="w-48 h-8 bg-muted animate-pulse rounded" />
              <div className="w-32 h-10 bg-muted animate-pulse rounded" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="border border-border rounded-lg p-6">
                    <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-5 bg-muted rounded" />
                      <div className="w-24 h-5 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Auth skeleton */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Auth Loading (skeleton)</h2>
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
          <div className="px-4 py-3 bg-muted border-b border-border">
            <p className="text-xs font-mono text-muted-foreground">(auth)/loading.tsx</p>
          </div>
          <div className="min-h-[300px] flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-sm border w-full max-w-md">
              <div className="h-8 w-48 mx-auto mb-6 bg-muted animate-pulse rounded" />
              <div className="space-y-4">
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
