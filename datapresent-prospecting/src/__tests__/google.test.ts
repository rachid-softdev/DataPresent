import { describe, expect, it } from "vitest";
import {
  buildSearchUrl,
  duckDuckGoRegion,
  isRelevantResult,
  unwrapBingUrl,
  unwrapGoogleUrl,
} from "../search/google.js";
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

describe("unwrapBingUrl", () => {
  it("décode l'URL réelle depuis /ck/a (base64url, préfixe a1)", () => {
    // "a1" + base64url("https://www.ladresse.com/agence/l-adresse-alfortville/204")
    const b64 = "a1aHR0cHM6Ly93d3cubGFkcmVzc2UuY29tL2FnZW5jZS9sLWFkcmVzc2UtYWxmb3J0dmlsbGUvMjA0";
    const raw = `https://www.bing.com/ck/a?!&&p=abc&u=${b64}&ntb=1`;
    expect(unwrapBingUrl(raw)).toBe("https://www.ladresse.com/agence/l-adresse-alfortville/204");
  });

  it("laisse passer une URL directe", () => {
    expect(unwrapBingUrl("https://acme.fr")).toBe("https://acme.fr");
  });

  it("retourne undefined si impossible", () => {
    expect(unwrapBingUrl("")).toBeUndefined();
    expect(unwrapBingUrl("https://www.bing.com/ck/a?!&&p=x")).toBeUndefined();
  });
});

describe("isRelevantResult", () => {
  it("accepte les sites d'entreprises", () => {
    expect(isRelevantResult("https://acme.fr")).toBe(true);
    expect(isRelevantResult("https://www.acme.com/contact")).toBe(true);
  });

  it("rejette google, réseaux sociaux et annuaires", () => {
    expect(isRelevantResult("https://www.google.com/search?q=x")).toBe(false);
    expect(isRelevantResult("https://www.facebook.com/acme")).toBe(false);
    expect(isRelevantResult("https://www.linkedin.com/company/acme")).toBe(false);
    expect(isRelevantResult("https://fr.wikipedia.org/wiki/Acme")).toBe(false);
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

describe("duckDuckGoRegion", () => {
  it("force la région DuckDuckGo par pays (contre le biais IP)", () => {
    expect(duckDuckGoRegion("FR", "fr")).toBe("fr-fr");
    expect(duckDuckGoRegion("GB", "en")).toBe("gb-en");
    expect(duckDuckGoRegion("US", "en")).toBe("us-en");
    expect(duckDuckGoRegion("IE", "en")).toBe("ie-en");
    expect(duckDuckGoRegion("CA", "en")).toBe("ca-en");
  });

  it("retombe sur la langue quand le pays est inconnu", () => {
    expect(duckDuckGoRegion("DE", "fr")).toBe("fr-fr");
    expect(duckDuckGoRegion(undefined, "en")).toBe("us-en");
  });
});

describe("buildSearchUrl", () => {
  it("Google : hl + gl + cr forcés depuis le pays", () => {
    const url = new URL(buildSearchUrl("google", "agence data analytics", "fr", "FR"));
    expect(url.searchParams.get("q")).toBe("agence data analytics");
    expect(url.searchParams.get("hl")).toBe("fr");
    expect(url.searchParams.get("gl")).toBe("fr");
    expect(url.searchParams.get("cr")).toBe("countryFR");
  });

  it("Bing : setlang + cc forcés depuis le pays", () => {
    const url = new URL(buildSearchUrl("bing", "data analytics agency", "en", "GB"));
    expect(url.searchParams.get("q")).toBe("data analytics agency");
    expect(url.searchParams.get("setlang")).toBe("en");
    expect(url.searchParams.get("cc")).toBe("GB");
  });

  it("DDG : kl région forcée", () => {
    const url = new URL(buildSearchUrl("ddg", "agence data analytics", "fr", "FR"));
    expect(url.searchParams.get("kl")).toBe("fr-fr");
  });

  it("pays par défaut dérivé de la langue si absent", () => {
    expect(new URL(buildSearchUrl("google", "q", "fr", undefined)).searchParams.get("cr")).toBe(
      "countryFR",
    );
    expect(new URL(buildSearchUrl("bing", "q", "en", undefined)).searchParams.get("cc")).toBe("US");
  });
});
