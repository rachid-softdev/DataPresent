"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

type CallbackState = "loading" | "success" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const [state, setState] = useState<CallbackState>(token ? "loading" : "error");
  const [error, setError] = useState<string | null>(token ? null : "Missing token");

  useEffect(() => {
    if (!token) {
      router.replace("/login?error=errors.auth.invalidToken");
      return;
    }

    async function completeAuth() {
      try {
        const res = await fetch("/api/auth/callback/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          setState("success");
          router.replace("/");
        } else {
          const data = await res.json().catch(() => ({}));
          setState("error");
          setError(data.error || "Authentication failed");
          router.replace(`/login?error=${encodeURIComponent(data.error || "errors.auth.failed")}`);
        }
      } catch {
        setState("error");
        setError("Network error");
        router.replace("/login?error=errors.auth.failed");
      }
    }

    completeAuth();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      {state === "loading" && (
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Signing you in...</p>
        </div>
      )}
      {state === "error" && error && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
