"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, Building2 } from "lucide-react";
import { toast } from "sonner";

function AcceptInviteContent() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteData, setInviteData] = useState<{
    email: string;
    orgName: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token d'invitation manquant");
      setLoading(false);
      return;
    }

    // Check if user is logged in - if not, redirect to login with invite token
    checkSessionAndAcceptInvite();
  }, [token]);

  const checkSessionAndAcceptInvite = async () => {
    try {
      // First check if user is logged in
      const sessionRes = await fetch("/api/user");

      if (!sessionRes.ok) {
        // User not logged in - redirect to login with invite token
        router.push(`/login?callbackUrl=/accept-invite?token=${token}`);
        return;
      }

      const sessionData = await sessionRes.json();

      // Now accept the invite
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setInviteData({
          email: sessionData.email,
          orgName: data.orgName || "votre organisation",
          role: data.role || "Membre",
        });
      } else {
        setError(data.error || "Une erreur est survenue");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Traitement de l&apos;invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="text-center text-destructive">Invitation invalide</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link href="/login">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Retour à l&apos;accueil
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="text-center text-green-600">Invitation acceptée !</CardTitle>
            <CardDescription className="text-center">
              Vous avez rejoint {inviteData?.orgName || "l'organisation"} en tant que{" "}
              {inviteData?.role || "Membre"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Vous pouvez maintenant accéder aux rapports et fonctionnalités de votre
                organisation.
              </p>
            </div>
            <Link href="/dashboard">
              <Button className="w-full">Aller au dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
