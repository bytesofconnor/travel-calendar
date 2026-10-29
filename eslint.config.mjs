import { defineConfig, globalIgnores } from "eslint/config"
import convexPlugin from "@convex-dev/eslint-plugin"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...convexPlugin.configs.recommended,
  {
    files: ["**/convex/**/*.ts"],
    rules: {
      // Convex 1.45 still types db.get/patch/delete(id). The two-argument
      // table form is a later API, so this rule cannot be applied yet.
      "@convex-dev/explicit-table-ids": "off",
    },
  },
  {
    rules: {
      // Existing screens sync local UI state in effects and call Date.now or
      // Math.random while rendering. Reworking them would change behavior.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "convex/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/theme-pack-css",
                "@/lib/theme-pack-css.ts",
                "**/theme-pack-css",
                "**/theme-pack-css.ts",
              ],
              message:
                "Import the pack id from @/lib/theme-packs. scripts/check-theme-packs.ts is the CSS caller.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
    "test-results/**",
    "playwright-report/**",
  ]),
])
