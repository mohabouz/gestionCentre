import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    rules: {
      // These effects intentionally hydrate or synchronize browser state.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/app/api/state/route.ts"],
    rules: {
      // State normalization combines relational Prisma results into UI view models.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-desktop/**",
    "out/**",
    "build/**",
    "desktop-build/**",
    "dist-desktop/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
