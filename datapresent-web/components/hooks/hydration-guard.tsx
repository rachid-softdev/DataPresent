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
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return fallback ?? <div style={{ minHeight: "100vh" }} />;
  return <>{children}</>;
}
