import { hash } from "@node-rs/argon2";
import type { BrowserContext, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

// ---------------------------------------------------------------------------
// Shared test user credentials — used across all authenticated E2E tests
// ---------------------------------------------------------------------------
export const TEST_USER_EMAIL = "e2e-test@datapresent.com";
export const TEST_USER_PASSWORD = "E2eTestPassword123!";
export const TEST_USER_NAME = "E2E Test User";

// ---------------------------------------------------------------------------
// Dedicated Prisma client for E2E auth helpers
// We instantiate our own client rather than importing @/lib/prisma to avoid
// depending on Next.js module resolution (tests/ is excluded from tsconfig).
// ---------------------------------------------------------------------------
let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * Dispose the Prisma client (call in afterAll or global teardown).
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Upsert a test user + password in the database.
 *
 * The user is marked as verified so the app treats it as a fully onboarded
 * account (matches real sign-up flow when email is verified).
 */
export async function createTestUser() {
  const db = getPrisma();

  const user = await db.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: {
      name: TEST_USER_NAME,
      isVerified: true,
      emailVerified: new Date(),
    },
    create: {
      email: TEST_USER_EMAIL,
      name: TEST_USER_NAME,
      isVerified: true,
      emailVerified: new Date(),
    },
  });

  // Hash password using the same parameters as lib/password.ts
  const hashedPassword = await hash(TEST_USER_PASSWORD, {
    memoryCost: 65536,
    timeCost: 3,
    outputLen: 32,
    parallelism: 4,
  });

  await db.password.upsert({
    where: { userId: user.id },
    update: { hash: hashedPassword },
    create: { userId: user.id, hash: hashedPassword },
  });

  return user;
}

/**
 * Generate a valid encrypted next-auth session JWT.
 *
 * The encoding mirrors what @auth/core does internally during sign-in:
 *   - salt  = cookie name ("authjs.session-token")
 *   - secret = NEXTAUTH_SECRET
 *   - token  = the JWT payload that the jwt callback would return
 *
 * The resulting string can be set as the `authjs.session-token` cookie value.
 */
export async function generateSessionToken(user: {
  id: string;
  email: string | null;
  name: string | null;
}) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not defined. Ensure e2e/.env.test is loaded.");
  }

  // Token shape matches what the jwt callback in lib/auth.ts produces
  const token = {
    sub: user.id,
    email: user.email,
    name: user.name,
    isVerified: true,
    iat: Math.floor(Date.now() / 1000),
  };

  // The salt must match the cookie name for non-secure (localhost) mode.
  // See: @auth/core/lib/utils/cookie.js → defaultCookies()
  const salt = "authjs.session-token";

  return await encode({
    secret,
    salt,
    token,
    maxAge: 24 * 60 * 60, // 24 hours — matches lib/auth.ts session.maxAge
  });
}

/**
 * Inject the next-auth session cookie into a Playwright browser context.
 *
 * After this call, any page loaded in this context will carry the session,
 * and the app's middleware / getServerSession will see the authenticated user.
 */
export async function setSessionCookie(context: BrowserContext, sessionToken: string) {
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}

/**
 * Full one-shot authentication for a Playwright page:
 *   1. Create (or re-use) the E2E test user in the database
 *   2. Generate an encrypted session JWT
 *   3. Inject it as a cookie on the page's context
 *
 * Call this in `test.beforeEach` or in a setup file.
 */
export async function authenticatePage(page: Page) {
  const user = await createTestUser();
  const sessionToken = await generateSessionToken(user);
  await setSessionCookie(page.context(), sessionToken);
  return { user, sessionToken };
}
