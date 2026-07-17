"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GoogleIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const isDark = false; // We use CSS variables, no need for manual dark mode checks

  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: t(data.message) || data.message });
        setEmail("");
      } else {
        setMessage({ type: "error", text: t(data.error) || data.error });
      }
    } catch {
      setMessage({ type: "error", text: t("errors.generic") });
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = () => {
    if (!error) return null;
    if (error.startsWith("errors.")) {
      return t(error);
    }
    return null;
  };

  const errorMessage = getErrorMessage();

  return (
    <>
      {/* Auth header */}
      <header className="app-auth-header">
        <div className="app-auth-header-inner">
          <Link href="/" className="app-logo">
            <div className="app-logo-mark">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
              >
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 4 4-6" />
              </svg>
            </div>
            <span className="app-logo-text">DataPresent</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="app-auth-page pt-20">
        <div className="app-auth-card">
          <h1 className="app-heading app-heading-xl text-center mb-2">Connexion</h1>
          <p className="text-center text-muted-foreground text-sm mb-8">
            Connectez-vous à votre compte DataPresent
          </p>

          {errorMessage && <div className="app-alert app-alert-error mb-6">{errorMessage}</div>}

          <div className="space-y-4">
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="app-btn app-btn-outline w-full justify-center"
            >
              <GoogleIcon className="w-5 h-5" />
              Se connecter avec Google
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface text-muted-foreground">ou</span>
            </div>
          </div>

          <form onSubmit={handleMagicLink}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input"
                  required
                />
              </div>

              {message && (
                <div
                  className={`app-alert ${message.type === "success" ? "app-alert-success" : "app-alert-error"}`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="app-btn app-btn-primary w-full justify-center app-btn-lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </span>
                ) : (
                  "Envoyer le lien de connexion"
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-sm mt-8 text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Créez un compte
            </Link>
          </p>

          <p className="text-center text-sm mt-4">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6 text-muted-foreground/60">
          Le lien de connexion expire dans 10 minutes · Usage unique
        </p>
      </main>
    </>
  );
}
