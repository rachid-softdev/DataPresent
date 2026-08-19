"use client";

import { ArrowRight, Boxes, Building2, SlidersHorizontal, ToggleLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PaginationInfo {
  total: number;
}

interface OverviewStats {
  plans: number;
  features: number;
  overrides: number;
  orgs: number;
}

export default function AdminOverviewPage() {
  const t = useTranslations("admin");
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const [plansRes, featuresRes, overridesRes, orgsRes] = await Promise.all([
          fetch("/api/admin/plans"),
          fetch("/api/admin/features?limit=1"),
          fetch("/api/admin/overrides?limit=1"),
          fetch("/api/admin/orgs?limit=1"),
        ]);

        if (!plansRes.ok || !featuresRes.ok || !overridesRes.ok || !orgsRes.ok) {
          if (!cancelled) setError(true);
          return;
        }

        const [plans, features, overrides, orgs] = await Promise.all([
          plansRes.json(),
          featuresRes.json(),
          overridesRes.json(),
          orgsRes.json(),
        ]);

        if (!cancelled) {
          setStats({
            plans: (plans.data as unknown[]).length,
            features: (features as { pagination: PaginationInfo }).pagination.total,
            overrides: (overrides as { pagination: PaginationInfo }).pagination.total,
            orgs: (orgs as { pagination: PaginationInfo }).pagination.total,
          });
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = [
    {
      href: "/admin/plans",
      title: t("overview.plansTitle"),
      description: t("overview.plansDesc"),
      value: stats?.plans,
      icon: Boxes,
    },
    {
      href: "/admin/features",
      title: t("overview.featuresTitle"),
      description: t("overview.featuresDesc"),
      value: stats?.features,
      icon: ToggleLeft,
    },
    {
      href: "/admin/overrides",
      title: t("overview.overridesTitle"),
      description: t("overview.overridesDesc"),
      value: stats?.overrides,
      icon: SlidersHorizontal,
    },
    {
      href: "/admin/orgs",
      title: t("overview.orgsTitle"),
      description: t("overview.orgsDesc"),
      value: stats?.orgs,
      icon: Building2,
    },
  ];

  return (
    <div>
      <div className="app-page-header">
        <div>
          <h1>{t("overview.title")}</h1>
          <p className="app-page-desc">{t("overview.subtitle")}</p>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              {t("common.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group">
              <div className="app-stat-card h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div className="app-icon-box app-icon-box-primary">
                    <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-12 mb-1" />
                ) : (
                  <div className="app-stat-value">{section.value ?? "—"}</div>
                )}
                <div className="app-stat-label mb-1">{section.title}</div>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
