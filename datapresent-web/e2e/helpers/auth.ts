// ---------------------------------------------------------------------------
// PromptBearer-style E2E auth helpers
//
// Re-exports from the existing e2e/auth-helpers.ts to avoid
// duplicating credential constants, Prisma user creation, JWT generation,
// cookie injection, and teardown logic.
// ---------------------------------------------------------------------------

export {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_USER_NAME,
  createTestUser,
  generateSessionToken,
  setSessionCookie,
  authenticatePage,
  disconnectPrisma,
} from "../auth-helpers";
