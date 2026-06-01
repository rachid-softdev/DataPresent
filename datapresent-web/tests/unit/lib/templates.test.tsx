// ==========================================
// Templates Tests
// ==========================================

import { describe, it, expect } from "vitest";
import { getTemplatesBySector, getSectorLabel, getLayoutIcon, TEMPLATES } from "@/lib/templates";

describe("templates", () => {
  describe("TEMPLATES", () => {
    it("should have multiple templates defined", () => {
      expect(TEMPLATES.length).toBeGreaterThan(0);
    });

    it("should have finance templates", () => {
      const financeTemplates = TEMPLATES.filter((t) => t.sector === "FINANCE");
      expect(financeTemplates.length).toBeGreaterThan(0);
    });

    it("should have marketing templates", () => {
      const marketingTemplates = TEMPLATES.filter((t) => t.sector === "MARKETING");
      expect(marketingTemplates.length).toBeGreaterThan(0);
    });

    it("should have hr templates", () => {
      const hrTemplates = TEMPLATES.filter((t) => t.sector === "HR");
      expect(hrTemplates.length).toBeGreaterThan(0);
    });

    it("should have saas templates", () => {
      const saasTemplates = TEMPLATES.filter((t) => t.sector === "SAAS");
      expect(saasTemplates.length).toBeGreaterThan(0);
    });

    it("should have generic templates", () => {
      const genericTemplates = TEMPLATES.filter((t) => t.sector === "GENERIC");
      expect(genericTemplates.length).toBeGreaterThan(0);
    });

    it("each template should have required fields", () => {
      TEMPLATES.forEach((template) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.sector).toBeDefined();
        expect(template.layouts).toBeDefined();
        expect(template.layouts.length).toBeGreaterThan(0);
        expect(template.slideCount).toBeDefined();
        expect(template.icon).toBeDefined();
      });
    });
  });

  describe("getTemplatesBySector", () => {
    it("should return all templates for FINANCE sector", () => {
      const result = getTemplatesBySector("FINANCE");
      expect(result.length).toBeGreaterThan(0);
      result.forEach((t) => expect(t.sector).toBe("FINANCE"));
    });

    it("should return all templates for MARKETING sector", () => {
      const result = getTemplatesBySector("MARKETING");
      expect(result.length).toBeGreaterThan(0);
      result.forEach((t) => expect(t.sector).toBe("MARKETING"));
    });

    it("should return all templates for HR sector", () => {
      const result = getTemplatesBySector("HR");
      expect(result.length).toBeGreaterThan(0);
      result.forEach((t) => expect(t.sector).toBe("HR"));
    });

    it("should return all templates for SAAS sector", () => {
      const result = getTemplatesBySector("SAAS");
      expect(result.length).toBeGreaterThan(0);
      result.forEach((t) => expect(t.sector).toBe("SAAS"));
    });

    it("should return all templates for GENERIC sector", () => {
      const result = getTemplatesBySector("GENERIC");
      expect(result.length).toBeGreaterThan(0);
      result.forEach((t) => expect(t.sector).toBe("GENERIC"));
    });

    it("should return empty array for unknown sector", () => {
      const result = getTemplatesBySector("UNKNOWN");
      expect(result).toEqual([]);
    });

    it("should return empty array for empty sector", () => {
      const result = getTemplatesBySector("");
      expect(result).toEqual([]);
    });
  });

  describe("getSectorLabel", () => {
    it("should return Finance for FINANCE", () => {
      expect(getSectorLabel("FINANCE")).toBe("Finance");
    });

    it("should return Marketing for MARKETING", () => {
      expect(getSectorLabel("MARKETING")).toBe("Marketing");
    });

    it("should return Ressources Humaines for HR", () => {
      expect(getSectorLabel("HR")).toBe("Ressources Humaines");
    });

    it("should return SaaS for SAAS", () => {
      expect(getSectorLabel("SAAS")).toBe("SaaS");
    });

    it("should return Générique for GENERIC", () => {
      expect(getSectorLabel("GENERIC")).toBe("Générique");
    });

    it("should return unknown sector if not found", () => {
      expect(getSectorLabel("UNKNOWN")).toBe("UNKNOWN");
    });

    it("should return empty string for empty input", () => {
      expect(getSectorLabel("")).toBe("");
    });
  });

  describe("getLayoutIcon", () => {
    it("should return Titre for TITLE_SLIDE", () => {
      expect(getLayoutIcon("TITLE_SLIDE")).toBe("Titre");
    });

    it("should return KPIs for KPI_GRID", () => {
      expect(getLayoutIcon("KPI_GRID")).toBe("KPIs");
    });

    it("should return Barres for BAR_CHART", () => {
      expect(getLayoutIcon("BAR_CHART")).toBe("Barres");
    });

    it("should return Lignes for LINE_CHART", () => {
      expect(getLayoutIcon("LINE_CHART")).toBe("Lignes");
    });

    it("should return Camembert for PIE_CHART", () => {
      expect(getLayoutIcon("PIE_CHART")).toBe("Camembert");
    });

    it("should return Comparaison for COMPARISON", () => {
      expect(getLayoutIcon("COMPARISON")).toBe("Comparaison");
    });

    it("should return Résumé for TEXT_SUMMARY", () => {
      expect(getLayoutIcon("TEXT_SUMMARY")).toBe("Résumé");
    });

    it("should return the layout key for unknown layout", () => {
      expect(getLayoutIcon("UNKNOWN")).toBe("UNKNOWN");
    });

    it("should return empty string for empty input", () => {
      expect(getLayoutIcon("")).toBe("");
    });
  });
});
