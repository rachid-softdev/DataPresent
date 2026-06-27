"use client";

import { useState, useEffect, type ReactNode } from "react";

export function HydrationGuard({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Safe: single render cycle to prevent hydration mismatch
    setMounted(true);
  }, []);
  if (!mounted) return fallback ?? <div style={{ minHeight: "100vh" }} />;
  return <>{children}</>;
}
