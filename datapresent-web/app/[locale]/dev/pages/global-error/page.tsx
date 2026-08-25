"use client";

import { notFound } from "next/navigation";
import Link from "next/link";

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Dev only: preview of the root error.tsx (app/error.tsx) with simulated props.
 * We render the error content inline (NOT importing app/error.tsx directly)
 * to avoid nesting <html>/<body> inside the app's own <html>/<body>,
 * which would cause a hydration mismatch.
 *
 * In production, real 404 (defense in depth + proxy blocking).
 */
export default function GlobalErrorPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12 bg-background">
      <div className="text-center max-w-lg">
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-500 animate-pulse"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>
        </div>

        <h1 className="app-heading app-heading-xl mb-3">A critical error occurred</h1>
        <p className="text-muted-foreground text-lg mb-4 max-w-sm mx-auto">
          The application encountered a problem. Please refresh the page.
        </p>

        {IS_DEV && (
          <div className="mb-6 p-4 bg-muted rounded-xl text-left text-sm overflow-auto max-h-32 border border-border">
            <p className="font-mono text-red-500 break-words">Demo global error (dev pages)</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="app-btn app-btn-primary app-btn-lg"
          >
            Retry
          </button>
          <Link href="/" className="app-btn app-btn-outline app-btn-lg">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
