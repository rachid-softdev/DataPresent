"use client";

import { useState, useEffect } from "react";

export function LandingClientWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Safe: single render cycle to prevent hydration mismatch
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  }

  return <>{children}</>;
}
