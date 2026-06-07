import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Test files: allow `any` type for mocks, suppress unused-imports from test lifecycle hooks
  {
    files: ["**/*.test.*", "**/*.spec.*", "**/tests/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-pseudoRandomBytes": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-new-buffer": "warn",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-require": "warn",
    },
  },
]);

export default eslintConfig;
