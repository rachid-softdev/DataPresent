import { describe, expect, it } from "vitest";
import {
  extractEmails,
  getBestEmail,
  isValidBusinessEmail,
  isWellFormedEmail,
} from "../extraction/emails.js";

describe("isWellFormedEmail", () => {
  it("accepte les emails bien formés", () => {
    expect(isWellFormedEmail("contact@acme.fr")).toBe(true);
    expect(isWellFormedEmail("john.doe+tag@sub.domain.co")).toBe(true);
  });

  it("rejette les domaines invalides/jetables", () => {
    expect(isWellFormedEmail("x@example.com")).toBe(false);
    expect(isWellFormedEmail("x@test.com")).toBe(false);
    expect(isWellFormedEmail("x@wix.com")).toBe(false);
    expect(isWellFormedEmail("x@mailinator.com")).toBe(false);
    expect(isWellFormedEmail("pas-un-email")).toBe(false);
  });
});

describe("isValidBusinessEmail", () => {
  it("accepte un email business avec mot-clé (FR)", () => {
    expect(isValidBusinessEmail("contact@acme.fr")).toBe(true);
    expect(isValidBusinessEmail("secretariat@acme.fr")).toBe(true);
    expect(isValidBusinessEmail("rh@acme.fr")).toBe(true);
  });

  it("accepte un email business avec mot-clé (EN)", () => {
    expect(isValidBusinessEmail("sales@acme.com")).toBe(true);
    expect(isValidBusinessEmail("enquiries@acme.co.uk")).toBe(true);
    expect(isValidBusinessEmail("hello@acme.io")).toBe(true);
  });

  it("rejette un email personnel sur domaine grand public", () => {
    expect(isValidBusinessEmail("john.doe@gmail.com")).toBe(false);
    expect(isValidBusinessEmail("pierre@gmail.com")).toBe(false);
  });

  it("accepte un alias business sur domaine grand public", () => {
    expect(isValidBusinessEmail("contact.monagence@gmail.com")).toBe(true);
    expect(isValidBusinessEmail("info@yahoo.fr")).toBe(true);
  });

  it("valide via le contexte (mots-clés dans le texte)", () => {
    expect(isValidBusinessEmail("directeur@exemple.fr", "agence marketing")).toBe(true);
  });
});

describe("extractEmails", () => {
  it("extrait et dédoublonne les emails d'un texte", () => {
    const text = "Contactez contact@acme.fr ou sales@acme.fr. Aussi john.doe@gmail.com.";
    const emails = extractEmails(text);
    expect(emails).toContain("contact@acme.fr");
    expect(emails).toContain("sales@acme.fr");
    expect(emails).not.toContain("john.doe@gmail.com");
  });

  it("retourne une liste vide sans email", () => {
    expect(extractEmails("aucun email ici")).toEqual([]);
    expect(extractEmails("")).toEqual([]);
  });

  it("traite le HTML (emails dans les attributs)", () => {
    const html = '<a href="mailto:hello@acme.com">Contact</a> <img src="x@y.fr">';
    const emails = extractEmails(html);
    expect(emails).toContain("hello@acme.com");
  });
});

describe("getBestEmail", () => {
  it("privilégie contact/info", () => {
    expect(getBestEmail(["ceo@acme.fr", "contact@acme.fr"])).toBe("contact@acme.fr");
    expect(getBestEmail(["support@acme.fr", "sales@acme.fr"])).toBe("sales@acme.fr");
  });

  it("retourne le premier sinon (marketing est prioritaire)", () => {
    expect(getBestEmail(["ceo@acme.fr", "marketing@acme.fr"])).toBe("marketing@acme.fr");
    expect(getBestEmail([])).toBeUndefined();
  });
});
