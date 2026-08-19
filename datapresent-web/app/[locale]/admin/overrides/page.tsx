"use client";

import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type OverrideScope = "USER" | "ORG";

interface Override {
  id: string;
  scope: OverrideScope;
  scopeId: string;
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  expiresAt: string | null;
  reason: string;
  createdById: string;
  createdBy: { id: string; name: string | null; email: string };
  createdAt: string;
}

interface OverridesResponse {
  data: Override[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FeatureOption {
  key: string;
}

interface OverrideFormState {
  scope: OverrideScope;
  scopeId: string;
  featureKey: string;
  enabled: boolean;
  limitValue: string;
  expiresAt: string;
  reason: string;
}

const PAGE_SIZE = 20;
const EMPTY_FORM: OverrideFormState = {
  scope: "USER",
  scopeId: "",
  featureKey: "",
  enabled: true,
  limitValue: "",
  expiresAt: "",
  reason: "",
};

export default function AdminOverridesPage() {
  const t = useTranslations("admin.overrides");
  const tc = useTranslations("admin.common");

  const [overrides, setOverrides] = useState<Override[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [scopeFilter, setScopeFilter] = useState<OverrideScope | "ALL">("ALL");
  const [features, setFeatures] = useState<FeatureOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<OverrideFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Override | null>(null);

  const fetchOverrides = useCallback(async (targetPage: number, scope: OverrideScope | "ALL") => {
    const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
    if (scope !== "ALL") params.set("scope", scope);
    const res = await fetch(`/api/admin/overrides?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch overrides");
    const data = (await res.json()) as OverridesResponse;
    setOverrides(data.data);
    setPage(data.pagination.page);
    setTotalPages(data.pagination.totalPages);
    setTotal(data.pagination.total);
  }, []);

  const loadOverrides = useCallback(
    async (targetPage: number, scope: OverrideScope | "ALL", silent = false) => {
      if (!silent) setLoading(true);
      try {
        await fetchOverrides(targetPage, scope);
        setError(false);
      } catch {
        setError(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchOverrides],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchOverrides(1, scopeFilter);
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
  }, [fetchOverrides, scopeFilter]);

  useEffect(() => {
    // Load feature keys for the creation form
    let cancelled = false;
    async function loadFeatures() {
      try {
        const res = await fetch("/api/admin/features?limit=100");
        if (!res.ok) return;
        const data = (await res.json()) as { data: FeatureOption[] };
        if (!cancelled) setFeatures(data.data);
      } catch {
        /* feature picker is optional; skip on failure */
      }
    }
    loadFeatures();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.scopeId.trim() || !form.featureKey || !form.reason.trim()) {
      toast.error(tc("required"));
      return;
    }

    setSubmitting(true);
    try {
      const parsedLimit = form.limitValue.trim() === "" ? null : Number(form.limitValue);
      const payload = {
        scope: form.scope,
        scopeId: form.scopeId.trim(),
        featureKey: form.featureKey,
        enabled: form.enabled,
        limitValue: Number.isNaN(parsedLimit as number) ? null : parsedLimit,
        expiresAt: form.expiresAt || undefined,
        reason: form.reason.trim(),
      };
      const res = await fetch("/api/admin/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || tc("error"));
        return;
      }

      toast.success(t("created"));
      setDialogOpen(false);
      await loadOverrides(1, scopeFilter, true);
    } catch {
      toast.error(tc("error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/overrides/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || tc("error"));
        return;
      }
      toast.success(t("deleted"));
      setDeleteTarget(null);
      await loadOverrides(page, scopeFilter, true);
    } catch {
      toast.error(tc("error"));
    }
  };

  const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");

  return (
    <div>
      <div className="app-page-header">
        <div>
          <h1 className="app-heading app-heading-xl">{t("title")}</h1>
          <p className="app-page-desc">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("new")}
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          <AlertTitle>{tc("error")}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={() => loadOverrides(page, scopeFilter)}>
              {tc("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Select
          value={scopeFilter}
          onValueChange={(value) => setScopeFilter(value as OverrideScope | "ALL")}
          className="w-48"
          aria-label={t("scope")}
        >
          <SelectItem value="ALL">{t("allScopes")}</SelectItem>
          <SelectItem value="USER">USER</SelectItem>
          <SelectItem value="ORG">ORG</SelectItem>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table min-w-[900px]">
              <thead>
                <tr>
                  <th>{t("scope")}</th>
                  <th>{t("scopeId")}</th>
                  <th>{t("featureKey")}</th>
                  <th>{t("enabled")}</th>
                  <th>{t("limitValue")}</th>
                  <th>{t("expiresAt")}</th>
                  <th>{t("reason")}</th>
                  <th>{t("createdBy")}</th>
                  <th>{t("createdAt")}</th>
                  <th>{tc("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(overrides ?? []).map((override) => (
                  <tr key={override.id}>
                    <td>
                      <Badge variant={override.scope === "ORG" ? "success" : "outline"}>
                        {override.scope}
                      </Badge>
                    </td>
                    <td className="text-sm">
                      <code className="bg-muted px-1.5 py-0.5 rounded">{override.scopeId}</code>
                    </td>
                    <td className="font-medium">{override.featureKey}</td>
                    <td>
                      <Badge variant={override.enabled ? "success" : "secondary"}>
                        {override.enabled ? tc("yes") : tc("no")}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {override.limitValue === null ? "—" : override.limitValue}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {override.expiresAt ? (
                        <span
                          className={
                            new Date(override.expiresAt) < new Date()
                              ? "text-destructive"
                              : undefined
                          }
                        >
                          {formatDate(override.expiresAt)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {override.reason}
                    </td>
                    <td className="text-sm text-muted-foreground">{override.createdBy.email}</td>
                    <td className="text-sm text-muted-foreground">
                      {formatDate(override.createdAt)}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(override)}
                        aria-label={`${tc("delete")} ${override.featureKey} ${override.scopeId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 0 && totalPages > 1 && (
            <div className="app-pagination">
              <div className="app-pagination-info">
                {tc("page")} {page} {tc("of")} {totalPages} · {total}
              </div>
              <div className="app-pagination-actions">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => loadOverrides(page - 1, scopeFilter)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {tc("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => loadOverrides(page + 1, scopeFilter)}
                >
                  {tc("next")}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("new")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="override-scope">{t("scope")}</Label>
              <Select
                id="override-scope"
                value={form.scope}
                onValueChange={(value) => setForm((f) => ({ ...f, scope: value as OverrideScope }))}
              >
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="ORG">ORG</SelectItem>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-scope-id">{t("scopeId")}</Label>
              <Input
                id="override-scope-id"
                value={form.scopeId}
                onChange={(e) => setForm((f) => ({ ...f, scopeId: e.target.value }))}
                placeholder={form.scope === "USER" ? "user_id" : "org_id"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-feature">{t("featureKey")}</Label>
              <Select
                id="override-feature"
                value={form.featureKey}
                onValueChange={(value) => setForm((f) => ({ ...f, featureKey: value }))}
              >
                <SelectItem value="" disabled>
                  —
                </SelectItem>
                {features.map((feature) => (
                  <SelectItem key={feature.key} value={feature.key}>
                    {feature.key}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="override-enabled">{t("enabled")}</Label>
              <Switch
                id="override-enabled"
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, enabled: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-limit">{t("limitValue")}</Label>
              <Input
                id="override-limit"
                type="number"
                min={0}
                value={form.limitValue}
                onChange={(e) => setForm((f) => ({ ...f, limitValue: e.target.value }))}
                placeholder="∞"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-expires">{t("expiresAt")}</Label>
              <Input
                id="override-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-reason">{t("reason")}</Label>
              <Textarea
                id="override-reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("deleteTitle")}
        description={t("deleteDesc")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
