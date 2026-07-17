import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

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
    // Inline deps that ship their own React copy so the alias below is applied.
    // Otherwise Vitest externalizes node_modules and Node resolves lucide-react's
    // "react" to the @datapresent/ui-pinned 19.2.6, causing a duplicate-React crash
    // ("Cannot read properties of null (reading 'useContext')").
    server: {
      deps: {
        inline: ["lucide-react", "@datapresent/ui"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@datapresent/worker-common": path.resolve(__dirname, "../packages/worker-common/src"),
      // Force a single React + lucide-react copy. The `@datapresent/ui` workspace
      // package pins react@19.2.6 and resolves to a lucide-react build against that
      // version; without this, lucide-react icons call useContext on the wrong React
      // instance and crash with "Cannot read properties of null (reading 'useContext')".
      react: path.resolve(__dirname, "./node_modules/react"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react-dom/client": path.resolve(__dirname, "./node_modules/react-dom/client"),
      "lucide-react": path.resolve(__dirname, "./node_modules/lucide-react"),
      // `@datapresent/ui` also resolves `next` and `lucide-react` against its pinned
      // react@19.2.6; redirect them to the app's react@19.2.7 builds.
      next: path.resolve(__dirname, "./node_modules/next"),
    },
    dedupe: ["react", "react-dom"],
  },
});
