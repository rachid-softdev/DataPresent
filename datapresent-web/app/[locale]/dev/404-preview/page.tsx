"use client";

import { notFound } from "next/navigation";
import NotFound from "@/app/[locale]/not-found";

/**
 * Dev only: preview of the not-found page (app/[locale]/not-found.tsx).
 * Used in iframe from /dev/pages.
 *
 * In production, real 404 (defense in depth + proxy blocking).
 */
export default function NotFoundPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <NotFound />;
}
