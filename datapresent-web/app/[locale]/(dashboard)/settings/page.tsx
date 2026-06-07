"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, TrendingUp, FileText, ArrowRight } from "lucide-react";

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
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ) : section.icon === "org" ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    ) : section.icon === "team" ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    ) : section.icon === "billing" ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="1" y="4" width="22" height="16" rx="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
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
