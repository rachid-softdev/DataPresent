"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Plan = "FREE" | "STARTER" | "PRO" | "ULTRA";

const PLANS: Plan[] = ["FREE", "STARTER", "PRO", "ULTRA"];

interface PlanFeature {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  configJson: unknown;
  downgradeStrategy: string;
}

interface PlanEntry {
  plan: Plan;
  features: PlanFeature[];
}

interface PlansResponse {
  data: PlanEntry[];
}

// The entitlements engine treats `-1` as "unlimited" (see lib/entitlements).
// A `null` limit means the plan record does not define one; we normalize both
// to an empty input and send `-1` so the POST /api/admin/plans upsert can
// actually clear a previously set limit (null is ignored in the update branch).
const UNLIMITED = -1;

export default function AdminPlansPage() {
  const t = useTranslations("admin.plans");
  const tc = useTranslations("admin.common");

  const [plans, setPlans] = useState<PlanEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  // Uncommitted limit input text, keyed by `${plan}:${featureKey}`
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({});

  const cellKey = (plan: Plan, featureKey: string) => `${plan}:${featureKey}`;

  const fetchPlans = useCallback(async () => {
    const res = await fetch("/api/admin/plans");
    if (!res.ok) throw new Error("Failed to fetch plans");
    const data = (await res.json()) as PlansResponse;
    return data.data;
  }, []);

  const refreshPlans = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setPlans(await fetchPlans());
        setError(false);
      } catch {
        setError(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchPlans],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPlans(await fetchPlans());
        setError(false);
      } catch {
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPlans]);

  const getCell = (plan: Plan, featureKey: string): PlanFeature | undefined =>
    plans?.find((p) => p.plan === plan)?.features.find((f) => f.featureKey === featureKey);

  const normalizeLimitInput = (value: number | null | undefined): string =>
    value === null || value === undefined || value === UNLIMITED ? "" : String(value);

  const normalizeLimitForSave = (value: number | null | undefined): number =>
    value === null || value === undefined || value === UNLIMITED ? UNLIMITED : value;

  const persistCell = useCallback(
    async (plan: Plan, featureKey: string, payload: { enabled: boolean; limitValue: number }) => {
      const key = cellKey(plan, featureKey);
      setSaving((prev) => ({ ...prev, [key]: true }));
      try {
        const res = await fetch("/api/admin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planKey: plan, featureKey, ...payload }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          toast.error(data?.error || t("saveError"));
          // Restore server truth after a failed write
          try {
            setPlans(await fetchPlans());
          } catch {
            /* keep current state */
          }
        }
      } catch {
        toast.error(t("saveError"));
        try {
          setPlans(await fetchPlans());
        } catch {
          /* keep current state */
        }
      } finally {
        setSaving((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [fetchPlans, t],
  );

  const handleToggleEnabled = (plan: Plan, featureKey: string, enabled: boolean) => {
    const cell = getCell(plan, featureKey);
    if (!cell) return;

    // Optimistic update
    setPlans(
      (prev) =>
        prev?.map((p) =>
          p.plan === plan
            ? {
                ...p,
                features: p.features.map((f) =>
                  f.featureKey === featureKey ? { ...f, enabled } : f,
                ),
              }
            : p,
        ) ?? prev,
    );

    persistCell(plan, featureKey, {
      enabled,
      limitValue: normalizeLimitForSave(cell.limitValue),
    });
  };

  const handleLimitChange = (plan: Plan, featureKey: string, raw: string) => {
    const key = cellKey(plan, featureKey);
    setLimitDrafts((prev) => ({ ...prev, [key]: raw }));
  };

  const handleLimitCommit = (plan: Plan, featureKey: string) => {
    const key = cellKey(plan, featureKey);
    const draft = limitDrafts[key];
    if (draft === undefined) return;

    const trimmed = draft.trim();
    const parsed = trimmed === "" ? UNLIMITED : Number(trimmed);
    const nextValue = Number.isNaN(parsed) ? UNLIMITED : Math.trunc(parsed);
    const cell = getCell(plan, featureKey);
    if (!cell) return;

    setLimitDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    // Optimistic update
    setPlans(
      (prev) =>
        prev?.map((p) =>
          p.plan === plan
            ? {
                ...p,
                features: p.features.map((f) =>
                  f.featureKey === featureKey ? { ...f, limitValue: nextValue } : f,
                ),
              }
            : p,
        ) ?? prev,
    );

    persistCell(plan, featureKey, {
      enabled: cell.enabled,
      limitValue: nextValue,
    });
  };

  const featureKeys = useCallback(() => {
    const keys = new Set<string>();
    plans?.forEach((p) => p.features.forEach((f) => keys.add(f.featureKey)));
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [plans]);

  if (loading) {
    return (
      <div>
        <div className="app-page-header">
          <div>
            <h1 className="app-heading app-heading-xl">{t("title")}</h1>
            <p className="app-page-desc">{t("subtitle")}</p>
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="app-page-header">
        <div>
          <h1 className="app-heading app-heading-xl">{t("title")}</h1>
          <p className="app-page-desc">{t("subtitle")}</p>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          <AlertTitle>{tc("error")}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => refreshPlans()}>
              {tc("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!error && plans && plans.length === 0 && (
        <Alert className="mb-6">
          <AlertDescription>{t("empty")}</AlertDescription>
        </Alert>
      )}

      {!error && plans && plans.length > 0 && (
        <div className="app-table-wrap overflow-x-auto">
          <table className="app-table min-w-[720px]">
            <thead>
              <tr>
                <th className="min-w-[180px]">{t("feature")}</th>
                {PLANS.map((plan) => (
                  <th key={plan} className="min-w-[220px] text-center">
                    {plan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {featureKeys().map((featureKey) => (
                <tr key={featureKey}>
                  <td className="font-medium">{featureKey}</td>
                  {PLANS.map((plan) => {
                    const cell = getCell(plan, featureKey);
                    const key = cellKey(plan, featureKey);
                    const isSaving = saving[key];
                    const draft = limitDrafts[key];
                    const inputValue =
                      draft !== undefined ? draft : normalizeLimitInput(cell?.limitValue);
                    return (
                      <td key={plan} className="text-center">
                        <div
                          className={cn(
                            "flex flex-col items-center gap-2 py-1 transition-opacity",
                            isSaving && "opacity-60",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={cell?.enabled ?? false}
                              onCheckedChange={(checked) =>
                                handleToggleEnabled(plan, featureKey, checked)
                              }
                              disabled={isSaving}
                              aria-label={`${t("enabled")} — ${featureKey} · ${plan}`}
                            />
                            {isSaving && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          <Input
                            type="number"
                            min={-1}
                            value={inputValue}
                            placeholder="∞"
                            disabled={isSaving}
                            onChange={(e) => handleLimitChange(plan, featureKey, e.target.value)}
                            onBlur={() => handleLimitCommit(plan, featureKey)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            className="w-24 h-8 text-center text-sm"
                            aria-label={`${t("limit")} — ${featureKey} · ${plan}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
