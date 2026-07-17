// ---------------------------------------------------------------------------
// PromptBearer-style E2E auth helpers
//
// Re-exports from the existing e2e/auth-helpers.ts to avoid
// duplicating credential constants, Prisma user creation, JWT generation,
// cookie injection, and teardown logic.
// ---------------------------------------------------------------------------

export {
  authenticatePage,
  createTestUser,
  disconnectPrisma,
  generateSessionToken,
  setSessionCookie,
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_USER_PASSWORD,
} from "../auth-helpers";
