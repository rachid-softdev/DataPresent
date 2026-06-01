"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        toast.success(
          "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
        );
      } else {
        setError(data.error || "Une erreur est survenue");
        toast.error(data.error || "Erreur lors de la demande");
      }
    } catch {
      setError("Erreur de connexion");
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-auth-page">
      <div className="app-auth-card">
        <div className="flex justify-center mb-6">
          <div className="app-icon-box app-icon-box-primary" style={{ width: 56, height: 56 }}>
            <Mail className="w-7 h-7" />
          </div>
        </div>

        <h1 className="app-heading app-heading-lg text-center mb-2">Mot de passe oublié ?</h1>
        <p className="text-center text-muted-foreground text-sm mb-8">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de
          passe.
        </p>

        {success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans les
              prochaines minutes.
            </p>
            <div className="pt-4">
              <Link href="/login" className="app-btn app-btn-outline w-full justify-center">
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="app-alert app-alert-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

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
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="app-btn app-btn-primary w-full justify-center app-btn-lg"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                "Envoyer le lien de réinitialisation"
              )}
            </button>

            <div className="text-center pt-4">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
