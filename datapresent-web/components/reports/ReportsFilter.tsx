"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Report {
  id: string;
  title: string;
  sector: string;
  status: string;
  createdAt: Date;
}

interface ReportsFilterProps {
  reports: Report[];
  page: number;
  totalPages: number;
  totalReports: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type StatusFilter = "ALL" | "DONE" | "PROCESSING" | "ERROR";

export function ReportsFilter({
  reports,
  page,
  totalPages,
  totalReports,
  hasNextPage,
  hasPrevPage,
}: ReportsFilterProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      // Text search
      if (search) {
        const q = search.toLowerCase();
        const titleMatch = r.title?.toLowerCase().includes(q);
        const sectorMatch = r.sector?.toLowerCase().includes(q);
        if (!titleMatch && !sectorMatch) return false;
      }
      // Status filter
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      return true;
    });
  }, [reports, search, statusFilter]);

  const statusPills: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: "Tous" },
    { key: "DONE", label: t("reports.status.done") },
    { key: "PROCESSING", label: t("reports.status.processing") },
    { key: "ERROR", label: t("reports.status.error") },
  ];

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  const hasActiveFilters = search || statusFilter !== "ALL";

  const emptyMessage = hasActiveFilters
    ? {
        title: t("reports.noResults"),
        description: t("reports.noResultsDesc"),
      }
    : {
        title: t("reports.empty"),
        description: t("reports.uploadData"),
        action: { label: t("reports.new"), href: "/new" } as const,
      };

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un rapport..."
            className="pl-9 pr-8"
            aria-label="Rechercher par nom ou secteur"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {statusPills.map((pill) => (
          <button
            key={pill.key}
            onClick={() => setStatusFilter(pill.key)}
            className={`inline-flex items-center px-3 sm:px-3 py-2 sm:py-1.5 rounded-full text-xs sm:text-xs font-medium transition-all border ${
              statusFilter === pill.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {pill.label}
          </button>
        ))}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors ml-1"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground mb-4">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={emptyMessage.title}
          description={emptyMessage.description}
          action={"action" in emptyMessage ? emptyMessage.action : undefined}
        />
      ) : (
        <>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>{t("reports.columns.name")}</th>
                  <th>Secteur</th>
                  <th>{t("reports.columns.status")}</th>
                  <th>{t("reports.columns.date")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {filtered.map((report) => (
                    <motion.tr
                      key={report.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="font-medium">{report.title}</td>
                      <td className="text-muted-foreground">{report.sector}</td>
                      <td>
                        <Badge
                          variant={
                            report.status === "DONE"
                              ? "success"
                              : report.status === "ERROR"
                                ? "error"
                                : "warning"
                          }
                        >
                          {t(`reports.status.${report.status.toLowerCase()}`)}
                        </Badge>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td>
                        <Link href={`/reports/${report.id}`}>
                          <Button size="sm">{t("common.seeAll")}</Button>
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="app-pagination">
              <div className="app-pagination-info">
                Affichage de {(page - 1) * reports.length + 1} à{" "}
                {Math.min(page * reports.length, totalReports)} sur {totalReports} rapports
              </div>
              <div className="app-pagination-actions">
                <Link href={hasPrevPage ? `?page=${page - 1}` : "#"}>
                  <Button variant="outline" size="sm" disabled={!hasPrevPage}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Précédent
                  </Button>
                </Link>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} sur {totalPages}
                </span>
                <Link href={hasNextPage ? `?page=${page + 1}` : "#"}>
                  <Button variant="outline" size="sm" disabled={!hasNextPage}>
                    Suivant
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
