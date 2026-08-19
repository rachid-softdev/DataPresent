"use client";

import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type FeatureType = "BOOLEAN" | "LIMIT" | "EXPERIMENT";

const FEATURE_TYPES: FeatureType[] = ["BOOLEAN", "LIMIT", "EXPERIMENT"];

interface Feature {
  id: string;
  key: string;
  description: string | null;
  type: FeatureType;
  defaultConfig: unknown;
  isActive: boolean;
}

interface FeaturesResponse {
  data: Feature[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FeatureFormState {
  key: string;
  description: string;
  type: FeatureType;
  isActive: boolean;
}

const PAGE_SIZE = 20;
const EMPTY_FORM: FeatureFormState = {
  key: "",
  description: "",
  type: "BOOLEAN",
  isActive: true,
};

export default function AdminFeaturesPage() {
  const t = useTranslations("admin.features");
  const tc = useTranslations("admin.common");

  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FeatureFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const fetchFeatures = useCallback(async (targetPage: number) => {
    const res = await fetch(`/api/admin/features?page=${targetPage}&limit=${PAGE_SIZE}`);
    if (!res.ok) throw new Error("Failed to fetch features");
    const data = (await res.json()) as FeaturesResponse;
    setFeatures(data.data);
    setPage(data.pagination.page);
    setTotalPages(data.pagination.totalPages);
    setTotal(data.pagination.total);
  }, []);

  const loadFeatures = useCallback(
    async (targetPage: number, silent = false) => {
      if (!silent) setLoading(true);
      try {
        await fetchFeatures(targetPage);
        setError(false);
      } catch {
        setError(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchFeatures],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchFeatures(1);
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
  }, [fetchFeatures]);

  const openCreate = () => {
    setEditingKey(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (feature: Feature) => {
    setEditingKey(feature.key);
    setForm({
      key: feature.key,
      description: feature.description ?? "",
      type: feature.type,
      isActive: feature.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.key.trim()) {
      toast.error(t("key"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        key: form.key.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        isActive: form.isActive,
      };
      const res = await fetch("/api/admin/features", {
        method: editingKey ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 409) {
          toast.error(data?.error || t("keyExists"));
        } else {
          toast.error(data?.error || tc("error"));
        }
        return;
      }

      toast.success(editingKey ? t("updated") : t("created"));
      setDialogOpen(false);
      await loadFeatures(page, true);
    } catch {
      toast.error(tc("error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (feature: Feature) => {
    const key = feature.key;
    setToggling((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/admin/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, isActive: !feature.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || tc("error"));
        return;
      }
      toast.success(t("updated"));
      await loadFeatures(page, true);
    } catch {
      toast.error(tc("error"));
    } finally {
      setToggling((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

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
            <Button variant="outline" size="sm" onClick={() => loadFeatures(page)}>
              {tc("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table min-w-[640px]">
              <thead>
                <tr>
                  <th>{t("key")}</th>
                  <th>{t("description")}</th>
                  <th>{t("type")}</th>
                  <th>{t("isActive")}</th>
                  <th>{tc("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(features ?? []).map((feature) => (
                  <tr key={feature.id}>
                    <td className="font-medium">
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{feature.key}</code>
                    </td>
                    <td className="text-muted-foreground">{feature.description ?? "—"}</td>
                    <td>
                      <Badge variant="outline">{feature.type}</Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={feature.isActive}
                          onCheckedChange={() => handleToggleActive(feature)}
                          disabled={toggling[feature.key]}
                          aria-label={`${t("isActive")} — ${feature.key}`}
                        />
                        {toggling[feature.key] && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td>
                      <Button variant="outline" size="sm" onClick={() => openEdit(feature)}>
                        {tc("edit")}
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
                  onClick={() => loadFeatures(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {tc("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => loadFeatures(page + 1)}
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
            <DialogTitle>{editingKey ? t("edit") : t("new")}</DialogTitle>
            <DialogDescription>{editingKey ? editingKey : t("new")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feature-key">{t("key")}</Label>
              <Input
                id="feature-key"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                disabled={editingKey !== null}
                placeholder="myFeatureKey"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feature-description">{t("description")}</Label>
              <Textarea
                id="feature-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feature-type">{t("type")}</Label>
              <Select
                id="feature-type"
                value={form.type}
                onValueChange={(value) => setForm((f) => ({ ...f, type: value as FeatureType }))}
              >
                {FEATURE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feature-active">{t("isActive")}</Label>
              <Switch
                id="feature-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
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
    </div>
  );
}
