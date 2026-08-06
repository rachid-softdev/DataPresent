import { describe, expect, it, vi } from "vitest";
import { AnalysisSchema, EmailSchema, fillTemplate, parseClaudeJson } from "../ai/analyze.js";

describe("fillTemplate", () => {
  it("remplace les placeholders", () => {
    const out = fillTemplate("Company: {company} — lang: {language}", {
      company: "Acme",
      language: "fr",
    });
    expect(out).toBe("Company: Acme — lang: fr");
  });

  it("laisse les inconnus intacts", () => {
    expect(fillTemplate("x {unknown} y", {})).toBe("x {unknown} y");
  });
});

describe("parseClaudeJson", () => {
  it("parse le JSON nu", () => {
    expect(parseClaudeJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parse le JSON avec fences markdown", () => {
    const raw = 'Voici le résultat:\n```json\n{"a": 2}\n```\nFin.';
    expect(parseClaudeJson<{ a: number }>(raw)).toEqual({ a: 2 });
  });
});

describe("AnalysisSchema", () => {
  it("valide une analyse complète", () => {
    const parsed = AnalysisSchema.parse({
      score: 78,
      fitsIcp: true,
      language: "fr",
      sector: "consulting",
      needs: ["client reporting", "pitch decks"],
      suggestedAngle: "Automatiser vos rapports clients",
      reasoning: "Sector matches.",
    });
    expect(parsed.score).toBe(78);
    expect(parsed.fitsIcp).toBe(true);
  });

  it("rejette un score hors bornes", () => {
    expect(() =>
      AnalysisSchema.parse({
        score: 150,
        fitsIcp: true,
        language: "fr",
        sector: "x",
        needs: [],
        suggestedAngle: "",
        reasoning: "",
      }),
    ).toThrow();
  });

  it("rejette une langue inconnue", () => {
    expect(() =>
      AnalysisSchema.parse({
        score: 50,
        fitsIcp: false,
        language: "de",
        sector: "x",
        needs: [],
        suggestedAngle: "",
        reasoning: "",
      }),
    ).toThrow();
  });
});

describe("EmailSchema", () => {
  it("valide un email généré", () => {
    const parsed = EmailSchema.parse({
      subject: "Vos rapports clients en 30 secondes",
      body: "Bonjour,\n\nDataPresent transforme vos fichiers en présentations.",
    });
    expect(parsed.subject.length).toBeLessThanOrEqual(80);
  });

  it("rejette un objet vide", () => {
    expect(() => EmailSchema.parse({ subject: "", body: "" })).toThrow();
  });
});

// Le mock du SDK Anthropic évite tout appel réseau dans les tests.
vi.mock("@anthropic-ai/sdk", () => {
  const create = vi.fn();
  return {
    default: class {
      messages = {
        create,
      };
    },
  };
});
