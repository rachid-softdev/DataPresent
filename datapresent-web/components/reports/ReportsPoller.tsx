"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface ReportEntry {
  id: string;
  status: string;
}

interface ReportsPollerProps {
  reports: ReportEntry[];
}

/**
 * Polls the reports API every 5 seconds when any report has a
 * PROCESSING or PENDING status. Triggers a router refresh once
 * the processing reports transition to a terminal status.
 */
export function ReportsPoller({ reports }: ReportsPollerProps) {
  const router = useRouter();
  const processingRef = useRef(false);

  const hasProcessing = reports.some((r) => r.status === "PROCESSING" || r.status === "PENDING");

  useEffect(() => {
    if (!hasProcessing) {
      processingRef.current = false;
      return;
    }

    processingRef.current = true;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/reports?limit=50");
        if (!res.ok) return;
        const data = await res.json();
        const stillProcessing = (data.reports || []).some(
          (r: ReportEntry) => r.status === "PROCESSING" || r.status === "PENDING",
        );
        if (!stillProcessing && processingRef.current) {
          processingRef.current = false;
          router.refresh();
        }
      } catch {
        // Silently retry on next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [hasProcessing, router]);

  return null;
}
