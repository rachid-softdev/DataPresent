import "@testing-library/jest-dom";
import { vi } from "vitest";

// Environment variables required by env.ts validation at module load time
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("CSRF_SECRET", "test-secret-key-for-testing-12345678");
vi.stubEnv("NEXTAUTH_SECRET", "test-nextauth-secret-for-testing-123456");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key-for-testing-1234567890abcdef");
vi.stubEnv("JOB_SIGNING_SECRET", "test-job-signing-secret-for-testing-12345678");
