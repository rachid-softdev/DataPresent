"use client";

import { notFound } from "next/navigation";
import LocaleError from "@/app/[locale]/error";

/**
 * Dev only: preview of the [locale]/error.tsx error boundary with simulated props.
 * Used in iframe from /dev/pages.
 *
 * In production, real 404 (defense in depth + proxy blocking).
 */
export default function ErrorPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <LocaleError
      error={new Error("Demo error (dev pages)")}
      reset={() => {
        // No-op: static preview
      }}
    />
  );
}
