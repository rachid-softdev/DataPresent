import { describe, expect, it } from "vitest";
import { buildGoogleSearchUrl, isRelevantResult, unwrapGoogleUrl } from "../search/google.js";
import { companyFromTitle, normalizeDomain } from "../stages/discover.js";

describe("unwrapGoogleUrl", () => {
  it("dé-redirige les URLs Google /url?q=", () => {
    const raw = "https://www.google.com/url?q=https%3A%2F%2Fwww.acme.fr%2Fcontact&sa=U&ved=2ahU";
    expect(unwrapGoogleUrl(raw)).toBe("https://www.acme.fr/contact");
  });

  it("laisse passer une URL directe (paramètres conservés)", () => {
    expect(unwrapGoogleUrl("https://www.acme.fr/?utm_source=google")).toBe(
      "https://www.acme.fr/?utm_source=google",
    );
    expect(unwrapGoogleUrl("https://acme.fr")).toBe("https://acme.fr");
  });

  it("retourne undefined pour une URL invalide", () => {
    expect(unwrapGoogleUrl("")).toBeUndefined();
    expect(unwrapGoogleUrl("not-a-url")).toBeUndefined();
  });
});

describe("isRelevantResult", () => {
  it("accepte les sites d'entreprises", () => {
    expect(isRelevantResult("https://acme.fr")).toBe(true);
    expect(isRelevantResult("https://www.acme.com/contact")).toBe(true);
  });

  it("rejette google, réseaux sociaux, dictionnaires et annuaires", () => {
    expect(isRelevantResult("https://www.google.com/search?q=x")).toBe(false);
    expect(isRelevantResult("https://www.facebook.com/acme")).toBe(false);
    expect(isRelevantResult("https://www.linkedin.com/company/acme")).toBe(false);
    expect(isRelevantResult("https://fr.wikipedia.org/wiki/Acme")).toBe(false);
    expect(isRelevantResult("https://www.cnrtl.fr/definition/acme")).toBe(false);
    expect(isRelevantResult("https://fr.wiktionary.org/wiki/acme")).toBe(false);
    expect(isRelevantResult("https://www.le-dictionnaire.com/definition/acme")).toBe(false);
    expect(isRelevantResult("https://www.indeed.com/jobs")).toBe(false);
  });

  it("rejette les non-http", () => {
    expect(isRelevantResult("javascript:void(0)")).toBe(false);
  });
});

describe("normalizeDomain", () => {
  it("normalise les domaines", () => {
    expect(normalizeDomain("https://www.Acme.fr/contact")).toBe("acme.fr");
    expect(normalizeDomain("https://acme.co.uk")).toBe("acme.co.uk");
    expect(normalizeDomain("acme.io")).toBe("acme.io");
  });

  it("retourne une chaîne vide si invalide", () => {
    expect(normalizeDomain("")).toBe("");
    expect(normalizeDomain("pas un domaine")).toBe("");
  });
});

describe("companyFromTitle", () => {
  it("extrait le nom depuis un titre Google", () => {
    expect(companyFromTitle("Acme Analytics - Data Consulting Paris")).toBe("Acme Analytics");
    expect(companyFromTitle("Acme Ltd | Business Intelligence")).toBe("Acme Ltd");
    expect(companyFromTitle("Acme : Services")).toBe("Acme");
  });

  it("retourne une chaîne vide sans séparateur", () => {
    expect(companyFromTitle("")).toBe("");
  });
});

describe("buildGoogleSearchUrl", () => {
  it("Google : hl + gl + cr forcés depuis le pays", () => {
    const url = new URL(buildGoogleSearchUrl("agence data analytics", "fr", "FR"));
    expect(url.searchParams.get("q")).toBe("agence data analytics");
    expect(url.searchParams.get("hl")).toBe("fr");
    expect(url.searchParams.get("gl")).toBe("fr");
    expect(url.searchParams.get("cr")).toBe("countryFR");
  });

  it("pays par défaut dérivé de la langue si absent", () => {
    expect(new URL(buildGoogleSearchUrl("q", "fr", undefined)).searchParams.get("cr")).toBe(
      "countryFR",
    );
    expect(new URL(buildGoogleSearchUrl("q", "en", undefined)).searchParams.get("cr")).toBe(
      "countryUS",
    );
  });
});
