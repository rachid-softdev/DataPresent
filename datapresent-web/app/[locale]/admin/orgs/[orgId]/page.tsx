"use client";

import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type Plan = "FREE" | "STARTER" | "PRO" | "ULTRA";
type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

const PLANS: Plan[] = ["FREE", "STARTER", "PRO", "ULTRA"];

interface EntitlementsResponse {
  orgId: string;
  orgName: string;
  plan: Plan;
  status: SubscriptionStatus;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  resetAt: Record<string, string | null>;
}

interface DowngradePreviewItem {
  featureKey: string;
  currentlyEnabled: boolean;
  willBeEnabled: boolean;
  reason: "plan_downgrade" | "limit_exceeded";
  downgradeStrategy: string;
}

interface DowngradeResponse {
  orgId: string;
  currentPlan: Plan;
  targetPlan: Plan;
  previews: DowngradePreviewItem[];
  effectiveDate: string | null;
}

const statusVariant = (status: SubscriptionStatus) => {
  switch (status) {
    case "ACTIVE":
    case "TRIALING":
      return "success" as const;
    case "PAST_DUE":
      return "warning" as const;
    case "CANCELED":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

export default function AdminOrgDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const t = useTranslations("admin.orgs.detail");
  const tc = useTranslations("admin.common");

  const { orgId } = use(params);

  const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [targetPlan, setTargetPlan] = useState<Plan | "">("");
  const [downgrade, setDowngrade] = useState<DowngradeResponse | null>(null);
  const [noDowngrade, setNoDowngrade] = useState(false);
  const [downgradeLoading, setDowngradeLoading] = useState(false);

  const [invalidating, setInvalidating] = useState(false);

  const fetchEntitlements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/entitlements`);
      if (!res.ok) {
        if (res.status === 404) {
          setError(true);
          return;
        }
        throw new Error("Failed to fetch entitlements");
      }
      setEntitlements((await res.json()) as EntitlementsResponse);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/orgs/${orgId}/entitlements`);
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setError(true);
            return;
          }
          throw new Error("Failed to fetch entitlements");
        }
        if (!cancelled) {
          setEntitlements((await res.json()) as EntitlementsResponse);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const handleTargetPlanChange = async (plan: Plan | "") => {
    setTargetPlan(plan);
    setDowngrade(null);
    setNoDowngrade(false);
    if (!plan) return;

    setDowngradeLoading(true);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/downgrade-preview?targetPlan=${plan}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || tc("error"));
        return;
      }
      const data = (await res.json()) as DowngradeResponse | { message: string };
      if ("previews" in data) {
        setDowngrade(data);
      } else {
        setNoDowngrade(true);
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setDowngradeLoading(false);
    }
  };

  const handleInvalidateCache = async () => {
    setInvalidating(true);
    try {
      const res = await fetch(`/api/admin/cache/invalidate/${orgId}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || tc("error"));
        return;
      }
      toast.success(t("cacheInvalidated"));
    } catch {
      toast.error(tc("error"));
    } finally {
      setInvalidating(false);
    }
  };

  const limitKeys = entitlements
    ? Object.keys(entitlements.limits)
        .filter((key) => entitlements.limits[key] !== null && entitlements.limits[key] !== 0)
        .sort((a, b) => a.localeCompare(b))
    : [];

  const featureKeys = entitlements
    ? Object.keys(entitlements.features).sort((a, b) => a.localeCompare(b))
    : [];

  return (
    <div>
      <Link
        href="/admin/orgs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </Link>

      <div className="app-page-header">
        <div>
          <h1 className="app-heading app-heading-xl">{entitlements?.orgName ?? t("title")}</h1>
          <p className="app-page-desc">{orgId}</p>
        </div>
        <Button variant="outline" onClick={handleInvalidateCache} disabled={invalidating}>
          <RefreshCw className={`w-4 h-4 mr-2 ${invalidating ? "animate-spin" : ""}`} />
          {t("invalidateCache")}
        </Button>
      </div>

      {error && !loading && (
        <Alert variant="error" className="mb-6">
          <AlertTitle>{t("notFound")}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={fetchEntitlements}>
              {tc("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && !entitlements && (
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {entitlements && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("featuresTitle")}</CardTitle>
              <CardDescription>{t("featuresDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4 text-sm">
                <span className="text-muted-foreground">
                  {t("plan")}: <Badge variant="outline">{entitlements.plan}</Badge>
                </span>
                <span className="text-muted-foreground">
                  {t("status")}:{" "}
                  <Badge variant={statusVariant(entitlements.status)}>{entitlements.status}</Badge>
                </span>
              </div>
              <div className="space-y-2.5">
                {featureKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{key}</span>
                    <div className="flex items-center gap-2">
                      <Switch checked={entitlements.features[key]} disabled />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {entitlements.features[key] ? tc("yes") : tc("no")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Limits & usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("limitsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {limitKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {entitlements.plan} — {t("unlimited")}
                </p>
              ) : (
                <div className="space-y-4">
                  {limitKeys.map((key) => {
                    const limit = entitlements.limits[key];
                    const usage = entitlements.usage[key] ?? 0;
                    const isUnlimited = limit === null || limit === -1;
                    const percent = isUnlimited
                      ? 0
                      : Math.min(100, Math.round((usage / (limit ?? 1)) * 100));
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-medium">{key}</span>
                          <span className="text-muted-foreground">
                            {usage} / {isUnlimited ? "∞" : limit}
                          </span>
                        </div>
                        {!isUnlimited && <Progress value={percent} />}
                        {entitlements.resetAt[key] && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(entitlements.resetAt[key]!).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Downgrade preview */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-muted-foreground" />
                {t("downgradeTitle")}
              </CardTitle>
              <CardDescription>{t("downgradeDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("currentPlan")}: <Badge variant="outline">{entitlements.plan}</Badge>
                </span>
                <Select
                  value={targetPlan}
                  onValueChange={(value) => handleTargetPlanChange(value as Plan | "")}
                  className="w-44"
                  aria-label={t("targetPlan")}
                >
                  <SelectItem value="" disabled>
                    —
                  </SelectItem>
                  {PLANS.map((plan) => (
                    <SelectItem key={plan} value={plan}>
                      {plan}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {downgradeLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}

              {noDowngrade && !downgradeLoading && (
                <p className="text-sm text-muted-foreground">{t("noDowngrade")}</p>
              )}

              {downgrade && !downgradeLoading && (
                <>
                  {downgrade.previews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("noDowngrade")}</p>
                  ) : (
                    <div className="app-table-wrap overflow-x-auto">
                      <table className="app-table min-w-[560px]">
                        <thead>
                          <tr>
                            <th>{t("affected")}</th>
                            <th>{t("reason")}</th>
                            <th>—</th>
                            <th>{t("targetPlan")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {downgrade.previews.map((preview) => (
                            <tr key={preview.featureKey}>
                              <td className="font-medium">{preview.featureKey}</td>
                              <td className="text-sm text-muted-foreground">
                                {preview.reason === "limit_exceeded"
                                  ? `${t("reason")}: limit_exceeded`
                                  : preview.reason}
                              </td>
                              <td className="text-sm">
                                {preview.willBeEnabled ? (
                                  <Badge variant="success">{t("willBeEnabled")}</Badge>
                                ) : (
                                  <Badge variant="error">{t("willBeDisabled")}</Badge>
                                )}
                              </td>
                              <td className="text-sm text-muted-foreground">
                                {preview.downgradeStrategy}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {downgrade.effectiveDate && (
                    <p className="text-sm text-muted-foreground mt-3">
                      {t("effectiveDate")}: {new Date(downgrade.effectiveDate).toLocaleDateString()}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
