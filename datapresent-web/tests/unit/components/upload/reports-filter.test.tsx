import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportsFilter } from "@/components/reports/ReportsFilter";

// Mock framer-motion: AnimatePresence renders children directly (no exit animation delay),
// and motion.tr renders as a plain <tr>. This avoids issues with jsdom not supporting RAF.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    tr: ({ children, ...props }: Record<string, unknown>) => <tr {...props}>{children}</tr>,
  },
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "reports.title": "Rapports",
      "reports.status.done": "Terminé",
      "reports.status.processing": "En cours",
      "reports.status.error": "Erreur",
      "reports.columns.name": "Nom",
      "reports.columns.status": "Statut",
      "reports.columns.date": "Date",
      "reports.empty": "Aucun rapport",
      "reports.uploadData": "Importez vos données",
      "reports.new": "Nouveau rapport",
      "reports.noResults": "Aucun résultat",
      "reports.noResultsDesc": "Essayez de modifier vos filtres",
      "common.seeAll": "Voir",
    };
    return map[key] || key;
  },
}));

const REPORTS = [
  {
    id: "1",
    title: "Rapport Q3",
    sector: "SaaS",
    status: "DONE",
    createdAt: new Date("2026-06-01"),
  },
  {
    id: "2",
    title: "Analyse marché",
    sector: "Finance",
    status: "PROCESSING",
    createdAt: new Date("2026-06-05"),
  },
  {
    id: "3",
    title: "Budget 2026",
    sector: "Finance",
    status: "DONE",
    createdAt: new Date("2026-05-20"),
  },
  {
    id: "4",
    title: "Erreur test",
    sector: "Tech",
    status: "ERROR",
    createdAt: new Date("2026-06-10"),
  },
];

describe("ReportsFilter", () => {
  const defaultProps = {
    reports: REPORTS,
    page: 1,
    totalPages: 1,
    totalReports: REPORTS.length,
    hasNextPage: false,
    hasPrevPage: false,
  };

  it("renders all reports initially", () => {
    render(<ReportsFilter {...defaultProps} />);
    expect(screen.getByText("Rapport Q3")).toBeTruthy();
    expect(screen.getByText("Analyse marché")).toBeTruthy();
    expect(screen.getByText("Budget 2026")).toBeTruthy();
    expect(screen.getByText("Erreur test")).toBeTruthy();
  });

  it("filters by status pill — DONE", () => {
    render(<ReportsFilter {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Terminé" }));
    expect(screen.getByText("Rapport Q3")).toBeTruthy();
    expect(screen.getByText("Budget 2026")).toBeTruthy();
    expect(screen.queryByText("Analyse marché")).toBeNull();
    expect(screen.queryByText("Erreur test")).toBeNull();
  });

  it("filters by status pill — ERROR", () => {
    render(<ReportsFilter {...defaultProps} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Erreur" })[0]);
    expect(screen.getByText("Erreur test")).toBeTruthy();
    expect(screen.queryByText("Rapport Q3")).toBeNull();
  });

  it("shows all reports when 'Tous' is selected", () => {
    render(<ReportsFilter {...defaultProps} />);
    // Filter by ERROR first
    fireEvent.click(screen.getAllByRole("button", { name: "Erreur" })[0]);
    expect(screen.queryByText("Rapport Q3")).toBeNull();

    // Go back to Tous
    fireEvent.click(screen.getByRole("button", { name: "Tous" }));
    expect(screen.getByText("Rapport Q3")).toBeTruthy();
    expect(screen.getByText("Analyse marché")).toBeTruthy();
    expect(screen.getByText("Erreur test")).toBeTruthy();
  });

  it("filters by search text on sector", () => {
    render(<ReportsFilter {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText("Rechercher un rapport...");
    fireEvent.change(searchInput, { target: { value: "Finance" } });
    // Finance matches sector: Analyse marché + Budget 2026
    expect(screen.getByText("Analyse marché")).toBeTruthy();
    expect(screen.getByText("Budget 2026")).toBeTruthy();
  });

  it("shows clear filters link when filters active", () => {
    render(<ReportsFilter {...defaultProps} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Erreur" })[0]);
    expect(screen.getByText("Effacer les filtres")).toBeTruthy();
  });

  it("shows result count when filtered", () => {
    render(<ReportsFilter {...defaultProps} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Erreur" })[0]);
    expect(screen.getByText(/1 résultat/)).toBeTruthy();
  });

  it("shows empty state when no results match", () => {
    render(<ReportsFilter {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText("Rechercher un rapport...");
    fireEvent.change(searchInput, { target: { value: "zzz_nonexistent" } });
    expect(screen.getByText("Aucun résultat")).toBeTruthy();
  });

  it("search input can be cleared via X button", () => {
    render(<ReportsFilter {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText("Rechercher un rapport...");
    fireEvent.change(searchInput, { target: { value: "Finance" } });
    expect(screen.getByText("Analyse marché")).toBeTruthy();

    const clearButton = screen.getByLabelText("Effacer la recherche");
    fireEvent.click(clearButton);
    expect(screen.getByText("Rapport Q3")).toBeTruthy();
    expect(screen.getByText("Analyse marché")).toBeTruthy();
  });
});
