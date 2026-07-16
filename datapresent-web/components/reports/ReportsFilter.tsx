"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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

const EXPORT_FORMATS = ["PPTX", "PDF", "DOCX"] as const;

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchExporting, setBatchExporting] = useState<string | null>(null);

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
  const filteredIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someSelected = filtered.some((r) => selectedIds.has(r.id));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.add(id);
        return next;
      });
    }
  }, [allSelected, filteredIds]);

  const handleBatchDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBatchDeleting(true);
    try {
      const res = await fetch("/api/reports/batch/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (res.ok) {
        toast.success(
          `${ids.length} rapport${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}`,
        );
        setSelectedIds(new Set());
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setBatchDeleting(false);
      setShowBatchDeleteConfirm(false);
    }
  }, [selectedIds]);

  const handleBatchExport = useCallback(
    async (format: string) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      setBatchExporting(format);
      let successCount = 0;
      let errorCount = 0;

      for (const id of ids) {
        try {
          const res = await fetch(`/api/reports/${id}/export`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format }),
          });
          if (res.ok) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }

      setBatchExporting(null);

      if (successCount > 0) {
        toast.success(
          `${successCount} export${successCount > 1 ? "s" : ""} ${format} lancé${successCount > 1 ? "s" : ""}`,
        );
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} export${errorCount > 1 ? "s" : ""} en échec`);
      }
    },
    [selectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

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
                  <th className="w-10">
                    <label className="flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected && !allSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="app-checkbox"
                        aria-label="Tout sélectionner"
                      />
                    </label>
                  </th>
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
                      className={`
                        transition-colors
                        ${selectedIds.has(report.id) ? "bg-primary/5" : "hover:bg-muted/30"}
                      `}
                    >
                      <td className="w-10">
                        <label className="flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(report.id)}
                            onChange={() => toggleSelect(report.id)}
                            className="app-checkbox"
                            aria-label={`Sélectionner ${report.title}`}
                          />
                        </label>
                      </td>
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

          {/* Batch action toolbar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-lg border mb-4"
              >
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
                </span>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  disabled={batchDeleting}
                  className="text-destructive hover:text-destructive gap-2"
                >
                  {batchDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Supprimer
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                    disabled={batchExporting !== null}
                  >
                    {batchExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Exporter
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="right-0">
                    {EXPORT_FORMATS.map((fmt) => (
                      <DropdownMenuItem
                        key={fmt}
                        onClick={() => {
                          if (batchExporting !== null) return;
                          handleBatchExport(fmt);
                        }}
                        className={batchExporting !== null ? "opacity-50 pointer-events-none" : ""}
                      >
                        {fmt}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Annuler
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

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
      {/* Batch delete confirmation */}
      <ConfirmDialog
        open={showBatchDeleteConfirm}
        onOpenChange={setShowBatchDeleteConfirm}
        title={`Supprimer ${selectedIds.size} rapport${selectedIds.size > 1 ? "s" : ""} ?`}
        description={`Les ${selectedIds.size} rapport${selectedIds.size > 1 ? "s" : ""} sélectionné${selectedIds.size > 1 ? "s" : ""} seront définitivement supprimés. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={handleBatchDelete}
      />
    </div>
  );
}
