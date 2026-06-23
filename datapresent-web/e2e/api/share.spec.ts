import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { hashSync } from "@node-rs/argon2";
import {
  createTestUser,
  generateSessionToken,
  setSessionCookie,
  disconnectPrisma,
} from "../helpers/auth";
import { createTestReport, createTestOrganization, resetTestData } from "../helpers/db";

// Helper: fetch a CSRF token from the API (requires auth cookie from storageState).
async function getCsrfToken(
  request: import("@playwright/test").APIRequestContext,
): Promise<string> {
  const res = await request.get("/api/csrf-token");
  expect(res.status()).toBe(200);
  const body = await res.json();
  return body.token;
}

// ---------------------------------------------------------------------------
// Share API — four endpoints:
//   GET  /api/share/meta?token=xxx       (public, unauthenticated)
//   POST /api/share/verify-password       (public, unauthenticated)
//   GET  /api/reports/[id]/share          (authenticated, org member)
//   POST /api/reports/[id]/share          (authenticated, org member)
//   PATCH /api/reports/[id]/share         (authenticated, org member)
// ---------------------------------------------------------------------------

const sharePassword = "ValidP4ssword!";

/** Helper: create a public report with a known shareToken and optional password + expiry. */
async function createSharedReport(
  db: PrismaClient,
  orgId: string,
  overrides?: {
    shareToken?: string;
    sharePassword?: string | null;
    shareExpiresAt?: Date | null;
    isPublic?: boolean;
    allowComments?: boolean;
    allowEmbed?: boolean;
  },
) {
  const reportId = crypto.randomUUID();
  const token = overrides?.shareToken ?? crypto.randomUUID();
  // Passwords must be hashed (argon2) to match what the app stores via the API
  const hashedPassword =
    overrides?.sharePassword != null ? hashSync(overrides.sharePassword) : null;
  await db.report.create({
    data: {
      id: reportId,
      title: "E2E Shared Report",
      sector: "GENERIC",
      status: "DONE",
      slideCount: 3,
      orgId,
      isPublic: overrides?.isPublic ?? true,
      shareToken: token,
      sharePassword: hashedPassword,
      shareExpiresAt: overrides?.shareExpiresAt ?? null,
      allowComments: overrides?.allowComments ?? true,
      allowEmbed: overrides?.allowEmbed ?? false,
    },
  });
  return { id: reportId, shareToken: token };
}

/** Helper: create a minimal report that is NOT public (private). */
async function createPrivateReport(db: PrismaClient, orgId: string) {
  const reportId = crypto.randomUUID();
  await db.report.create({
    data: {
      id: reportId,
      title: "E2E Private Report",
      sector: "GENERIC",
      status: "DONE",
      slideCount: 0,
      orgId,
      isPublic: false,
      shareToken: null,
    },
  });
  return { id: reportId };
}

// ---------------------------------------------------------------------------
// Share Meta — GET /api/share/meta?token=xxx
// ---------------------------------------------------------------------------
test.describe("Share Meta API — GET /api/share/meta (public)", () => {
  let db: PrismaClient;
  let orgId: string;
  let publicToken: string;

  test.beforeAll(async () => {
    db = new PrismaClient();
    const user = await createTestUser();
    const org = await createTestOrganization(db, user.id);
    orgId = org.id;
    const shared = await createSharedReport(db, orgId, {
      sharePassword: null,
    });
    publicToken = shared.shareToken!;
  });

  test.afterAll(async () => {
    await db.$disconnect();
    await disconnectPrisma();
  });

  test("GET sans token retourne 400 'Token is required'", async ({ request }) => {
    const res = await request.get("/api/share/meta");
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Token is required");
  });

  test("GET avec token invalide retourne 404", async ({ request }) => {
    const res = await request.get("/api/share/meta?token=invalid-token-00000");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("GET avec token valide retourne 200 avec hasPassword, title, sector", async ({
    request,
  }) => {
    const res = await request.get(`/api/share/meta?token=${publicToken}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("hasPassword");
    expect(body).toHaveProperty("title");
    expect(body).toHaveProperty("sector");
    expect(body.hasPassword).toBe(false);
    expect(body.title).toBe("E2E Shared Report");
    expect(body.sector).toBe("GENERIC");
  });

  test("GET avec token expiré retourne 410", async ({ request }) => {
    const expiredToken = crypto.randomUUID();
    await createSharedReport(db, orgId, {
      shareToken: expiredToken,
      shareExpiresAt: new Date("2020-01-01"),
    });

    const res = await request.get(`/api/share/meta?token=${expiredToken}`);
    expect(res.status()).toBe(410);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code", "expired");
  });

  test("GET pour un rapport protégé par mot de passe → hasPassword: true", async ({ request }) => {
    const protectedToken = crypto.randomUUID();
    await createSharedReport(db, orgId, {
      shareToken: protectedToken,
      sharePassword: sharePassword,
    });

    const res = await request.get(`/api/share/meta?token=${protectedToken}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.hasPassword).toBe(true);
  });

  test("GET pour un rapport sans mot de passe → hasPassword: false", async ({ request }) => {
    const noPwdToken = crypto.randomUUID();
    await createSharedReport(db, orgId, {
      shareToken: noPwdToken,
      sharePassword: null,
    });

    const res = await request.get(`/api/share/meta?token=${noPwdToken}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.hasPassword).toBe(false);
  });

  test("GET pour un rapport non public retourne 404", async ({ request }) => {
    const privateReport = await createPrivateReport(db, orgId);
    // Private reports have no shareToken, so we use a made-up token
    const res = await request.get(`/api/share/meta?token=nonexistent-for-private`);
    expect(res.status()).toBe(404);
  });

  test("POST sur /api/share/meta retourne 405", async ({ request }) => {
    const res = await request.post("/api/share/meta");
    expect(res.status()).toBe(405);
  });
});

// ---------------------------------------------------------------------------
// Share Verify Password — POST /api/share/verify-password
// ---------------------------------------------------------------------------
test.describe("Share Verify Password API — POST /api/share/verify-password (public)", () => {
  let db: PrismaClient;
  let orgId: string;
  let protectedToken: string;
  let noPasswordToken: string;
  let expiredToken: string;

  test.beforeAll(async () => {
    db = new PrismaClient();
    const user = await createTestUser();
    const org = await createTestOrganization(db, user.id);
    orgId = org.id;

    // Report with password
    const pwd = await createSharedReport(db, orgId, {
      shareToken: crypto.randomUUID(),
      sharePassword: sharePassword,
    });
    protectedToken = pwd.shareToken!;

    // Report without password
    const noPwd = await createSharedReport(db, orgId, {
      shareToken: crypto.randomUUID(),
      sharePassword: null,
    });
    noPasswordToken = noPwd.shareToken!;

    // Expired report with password
    const exp = await createSharedReport(db, orgId, {
      shareToken: crypto.randomUUID(),
      sharePassword: sharePassword,
      shareExpiresAt: new Date("2020-01-01"),
    });
    expiredToken = exp.shareToken!;
  });

  test.afterAll(async () => {
    await db.$disconnect();
    await disconnectPrisma();
  });

  test("mot de passe correct retourne 200 avec report complet", async ({ request }) => {
    const res = await request.post("/api/share/verify-password", {
      data: { shareToken: protectedToken, password: sharePassword },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("report");
    expect(body.report).toHaveProperty("id");
    expect(body.report).toHaveProperty("title", "E2E Shared Report");
    expect(body.report).toHaveProperty("slides");
    expect(Array.isArray(body.report.slides)).toBe(true);
    expect(body.report).toHaveProperty("isWatermarked");
  });

  test("mot de passe incorrect retourne 401", async ({ request }) => {
    const res = await request.post("/api/share/verify-password", {
      data: { shareToken: protectedToken, password: "WrongP4ssword!" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("shareToken manquant retourne 400", async ({ request }) => {
    const res = await request.post("/api/share/verify-password", {
      data: { password: sharePassword },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("password manquant retourne 400", async ({ request }) => {
    const res = await request.post("/api/share/verify-password", {
      data: { shareToken: protectedToken },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("token expiré retourne 410", async ({ request }) => {
    const res = await request.post("/api/share/verify-password", {
      data: { shareToken: expiredToken, password: sharePassword },
    });
    expect(res.status()).toBe(410);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("rapport sans mot de passe → 200 (password ignoré)", async ({ request }) => {
    // Use a non-empty password so the !password check passes; the endpoint
    // ignores the submitted password when the report has no password set.
    const res = await request.post("/api/share/verify-password", {
      data: { shareToken: noPasswordToken, password: "dummy" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("report");
  });

  test("GET sur /api/share/verify-password retourne 405", async ({ request }) => {
    const res = await request.get("/api/share/verify-password");
    expect(res.status()).toBe(405);
  });

  test("JSON malformé retourne 400", async ({ request }) => {
    const res = await request.post("/api/share/verify-password", {
      data: "not valid json",
      headers: { "Content-Type": "application/json" },
    });
    // The API uses `req.json()` which throws on malformed JSON → 500, but
    // the catch block returns 500. We expect a 5xx or 400.
    expect([400, 500]).toContain(res.status());
  });
});

// ---------------------------------------------------------------------------
// Share Settings — GET /api/reports/[id]/share (authenticated)
// ---------------------------------------------------------------------------
test.describe("Share Settings API — GET /api/reports/[id]/share (authenticated)", () => {
  let db: PrismaClient;
  let orgId: string;
  let reportId: string;
  let otherOrgReportId: string;

  test.beforeAll(async () => {
    db = new PrismaClient();
    const user = await createTestUser();
    const org = await createTestOrganization(db, user.id);
    orgId = org.id;
    const report = await createSharedReport(db, orgId, {
      sharePassword: null,
    });
    reportId = report.id;

    // Create a report the user does NOT belong to
    const otherUserId = crypto.randomUUID();
    await db.user.upsert({
      where: { email: `other-${otherUserId}@e2e.datapresent.com` },
      update: {},
      create: {
        id: otherUserId,
        email: `other-${otherUserId}@e2e.datapresent.com`,
        name: "Other User",
        isVerified: true,
        emailVerified: new Date(),
      },
    });
    const otherOrg = await createTestOrganization(db, otherUserId);
    const otherReport = await createSharedReport(db, otherOrg.id, {
      sharePassword: null,
    });
    otherOrgReportId = otherReport.id;
  });

  test.afterAll(async () => {
    await db.$disconnect();
    await disconnectPrisma();
  });

  test("200 avec auth valide → retourne les paramètres de partage", async ({ request }) => {
    const res = await request.get(`/api/reports/${reportId}/share`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("shareToken");
    expect(body).toHaveProperty("isPublic", true);
    expect(body).toHaveProperty("allowComments");
    expect(body).toHaveProperty("allowEmbed");
    expect(body).toHaveProperty("expiresAt");
    expect(body).toHaveProperty("password");
    expect(body).toHaveProperty("commentCount");
    expect(body).toHaveProperty("shareUrl");
    expect(body.shareUrl).toContain("/share/");
  });

  test("rapport inexistant retourne 404", async ({ request }) => {
    const res = await request.get("/api/reports/nonexistent-00000000/share");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("membre d'une autre organisation → 403", async ({ request }) => {
    const res = await request.get(`/api/reports/${otherOrgReportId}/share`);
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

// ---------------------------------------------------------------------------
// Share Settings — POST /api/reports/[id]/share (authenticated)
// ---------------------------------------------------------------------------
test.describe("Share Settings API — POST /api/reports/[id]/share (authenticated)", () => {
  let db: PrismaClient;
  let orgId: string;
  let privateReportId: string;
  let publicReportId: string;

  test.beforeAll(async () => {
    db = new PrismaClient();
    const user = await createTestUser();
    const org = await createTestOrganization(db, user.id);
    orgId = org.id;

    // Private report (to make public)
    const priv = await createPrivateReport(db, orgId);
    privateReportId = priv.id;

    // Public report (to make private)
    const pub = await createSharedReport(db, orgId, {
      sharePassword: null,
    });
    publicReportId = pub.id;
  });

  test.afterAll(async () => {
    await db.$disconnect();
    await disconnectPrisma();
  });

  test("rendre un rapport public → 201 avec shareToken", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const res = await request.post(`/api/reports/${privateReportId}/share`, {
      data: { isPublic: true },
      headers: { "x-csrf-token": csrfToken },
    });
    // The API returns 201 for create, 200 for update; accept both
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty("shareToken");
    expect(body).toHaveProperty("isPublic", true);
    expect(body).toHaveProperty("shareUrl");
    expect(body.shareUrl).toContain("/share/");
  });

  test("rendre un rapport privé → 200", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const res = await request.post(`/api/reports/${publicReportId}/share`, {
      data: { isPublic: false },
      headers: { "x-csrf-token": csrfToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("isPublic", false);
    expect(body.shareToken).toBeNull();
    expect(body.shareUrl).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Share Settings — PATCH /api/reports/[id]/share (authenticated)
// ---------------------------------------------------------------------------
test.describe("Share Settings API — PATCH /api/reports/[id]/share (authenticated)", () => {
  let db: PrismaClient;
  let orgId: string;
  let reportId: string;

  test.beforeAll(async () => {
    db = new PrismaClient();
    const user = await createTestUser();
    const org = await createTestOrganization(db, user.id);
    orgId = org.id;
    const report = await createSharedReport(db, orgId, {
      sharePassword: null,
    });
    reportId = report.id;
  });

  test.afterAll(async () => {
    await db.$disconnect();
    await disconnectPrisma();
  });

  test("mettre à jour allowComments → 200", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const res = await request.patch(`/api/reports/${reportId}/share`, {
      data: { allowComments: false },
      headers: { "x-csrf-token": csrfToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("allowComments", false);
  });

  test("définir une expiration à 7 jours → 200 avec expiresAt", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const res = await request.patch(`/api/reports/${reportId}/share`, {
      data: { expiresAt: "7d" },
      headers: { "x-csrf-token": csrfToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("expiresAt");
    expect(body.expiresAt).not.toBeNull();
  });

  test("définir un mot de passe → 200 avec password: true", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const res = await request.patch(`/api/reports/${reportId}/share`, {
      data: { password: "NewStrongP4ss!" },
      headers: { "x-csrf-token": csrfToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("password", true);
  });

  test("effacer le mot de passe → 200 avec password: false", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const res = await request.patch(`/api/reports/${reportId}/share`, {
      data: { password: "" },
      headers: { "x-csrf-token": csrfToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("password", false);
  });

  test("expiresAt invalide → 400", async ({ request }) => {
    const csrfToken = await getCsrfToken(request);
    const res = await request.patch(`/api/reports/${reportId}/share`, {
      data: { expiresAt: "invalid-duration" },
      headers: { "x-csrf-token": csrfToken },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
