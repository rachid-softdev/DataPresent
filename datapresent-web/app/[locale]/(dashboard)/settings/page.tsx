"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Building2,
  Users,
  CreditCard,
  Lock,
  TrendingUp,
  FileText,
  ArrowRight,
} from "lucide-react";

interface UsageStats {
  reports: {
    used: number;
    limit: number;
    remaining: number;
  };
  plan: string;
  planName: string;
  members: number;
}

export default function SettingsIndexPage() {
  const t = useTranslations("settings");
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/user/usage");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch usage:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const sections = [
    {
      title: t("profile.title"),
      description: t("profile.title"),
      href: "/settings/profile",
      icon: "user",
    },
    {
      title: t("organization.title"),
      description: t("organization.title"),
      href: "/settings/organization",
      icon: "org",
    },
    {
      title: t("team.title"),
      description: t("team.title"),
      href: "/settings/team",
      icon: "team",
      badge: stats?.members ? `${stats.members}` : undefined,
    },
    {
      title: t("billing.title"),
      description: t("billing.title"),
      href: "/settings/billing",
      icon: "billing",
      badge: stats?.planName,
    },
    {
      title: t("account.title"),
      description: t("account.title"),
      href: "/settings/account",
      icon: "account",
    },
  ];

  return (
    <div>
      <h1 className="app-heading app-heading-xl mb-8">{t("title")}</h1>

      {!loading && stats && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="app-stat-card">
            <CardDescription className="mb-1">{t("billing.plan")}</CardDescription>
            <div className="app-stat-value text-xl">{stats.planName || "Free"}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <TrendingUp className="w-4 h-4" />
              {stats.reports.limit === -1
                ? t("billing.features.reports")
                : `${stats.reports.remaining}`}
            </div>
          </div>

          <div className="app-stat-card">
            <CardDescription className="mb-1">{t("billing.usage.reports")}</CardDescription>
            <div className="app-stat-value text-xl">{stats.reports.used}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <FileText className="w-4 h-4" />
              {stats.reports.limit === -1 ? "∞" : `${stats.reports.limit}`}
            </div>
          </div>

          <div className="app-stat-card">
            <CardDescription className="mb-1">{t("team.members")}</CardDescription>
            <div className="app-stat-value text-xl">{stats.members}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Link href="/settings/team" className="hover:underline">
                {t("team.title")}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="app-icon-box app-icon-box-primary">
                    {section.icon === "user" ? (
                      <User className="w-[22px] h-[22px]" aria-hidden="true" />
                    ) : section.icon === "org" ? (
                      <Building2 className="w-[22px] h-[22px]" aria-hidden="true" />
                    ) : section.icon === "team" ? (
                      <Users className="w-[22px] h-[22px]" aria-hidden="true" />
                    ) : section.icon === "billing" ? (
                      <CreditCard className="w-[22px] h-[22px]" aria-hidden="true" />
                    ) : (
                      <Lock className="w-[22px] h-[22px]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      {section.badge && (
                        <span className="app-badge app-badge-outline">{section.badge}</span>
                      )}
                    </div>
                    <CardDescription className="mt-1">{section.description}</CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
