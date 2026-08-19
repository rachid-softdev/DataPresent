"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Plan = "FREE" | "STARTER" | "PRO" | "ULTRA";
type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus | null;
  memberCount: number;
  reportCount: number;
  createdAt: string;
}

interface OrgsResponse {
  data: Org[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const PAGE_SIZE = 20;

export default function AdminOrgsPage() {
  const t = useTranslations("admin.orgs");
  const tc = useTranslations("admin.common");

  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search input (~300ms)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const fetchOrgs = useCallback(async (targetPage: number, query: string) => {
    const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
    if (query.trim()) params.set("search", query.trim());
    const res = await fetch(`/api/admin/orgs?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch orgs");
    const data = (await res.json()) as OrgsResponse;
    setOrgs(data.data);
    setPage(data.pagination.page);
    setTotalPages(data.pagination.totalPages);
    setTotal(data.pagination.total);
  }, []);

  const loadOrgs = useCallback(
    async (targetPage: number, query: string, silent = false) => {
      if (!silent) setLoading(true);
      try {
        await fetchOrgs(targetPage, query);
        setError(false);
      } catch {
        setError(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchOrgs],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchOrgs(1, debouncedSearch);
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
  }, [debouncedSearch, fetchOrgs]);

  const statusVariant = (status: SubscriptionStatus | null) => {
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
            <Button variant="outline" size="sm" onClick={() => loadOrgs(page, debouncedSearch)}>
              {tc("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
          className="pl-9 pr-8"
          aria-label={t("search")}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
            aria-label={tc("close")}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
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
            <table className="app-table min-w-[760px]">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("slug")}</th>
                  <th>{t("plan")}</th>
                  <th>{t("status")}</th>
                  <th>{t("members")}</th>
                  <th>{t("reports")}</th>
                  <th>{t("createdAt")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(orgs ?? []).map((org) => (
                  <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                    <td className="font-medium">
                      <Link href={`/admin/orgs/${org.id}`} className="text-primary hover:underline">
                        {org.name}
                      </Link>
                    </td>
                    <td className="text-sm text-muted-foreground">{org.slug}</td>
                    <td>
                      <Badge variant="outline">{org.plan}</Badge>
                    </td>
                    <td>
                      <Badge variant={statusVariant(org.subscriptionStatus)}>
                        {org.subscriptionStatus ?? "—"}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">{org.memberCount}</td>
                    <td className="text-sm text-muted-foreground">{org.reportCount}</td>
                    <td className="text-sm text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
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
                  onClick={() => loadOrgs(page - 1, debouncedSearch)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {tc("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => loadOrgs(page + 1, debouncedSearch)}
                >
                  {tc("next")}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
