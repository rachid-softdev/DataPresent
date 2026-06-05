import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: [
        "lib/**/*.ts",
        "lib/**/*.tsx",
        "hooks/**/*.ts",
        "hooks/**/*.tsx",
        "i18n/**/*.ts",
        "components/**/*.tsx",
        "api/**/*.ts",
        "middleware/**/*.ts",
        "scripts/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "lib/prisma.ts",
        "lib/r2.ts",
        "lib/queue/client.ts",
        "api/**/route.ts",
      ],
      thresholds: {
        lines: 60,
        functions: 50,
        branches: 40,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
