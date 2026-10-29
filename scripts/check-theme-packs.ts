import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { THEME_PACKS } from "../lib/theme-packs.ts"
import { ladderTokenNames, renderThemePackCss } from "../lib/theme-pack-css.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const cssPath = join(root, "app", "theme-packs.css")
const globalsPath = join(root, "app", "globals.css")

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

const expected = renderThemePackCss()
if (process.argv.includes("--write")) {
  writeFileSync(cssPath, expected)
}

let actual: string
try {
  actual = readFileSync(cssPath, "utf8")
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? error.code : ""
  if (code === "ENOENT") {
    fail("app/theme-packs.css is missing. Run pnpm theme-packs:write.")
  }
  throw error
}

if (actual !== expected) {
  fail("app/theme-packs.css does not match the generator. Run pnpm theme-packs:write.")
}

for (const pack of THEME_PACKS) {
  const selector = `html[data-theme="${pack.id}"]`
  if (!actual.includes(selector)) {
    fail(`app/theme-packs.css is missing ${selector}`)
  }
}

for (const banned of ["--brand", "--live", "--cover-chrome"]) {
  if (actual.includes(banned)) {
    fail(`app/theme-packs.css contains ${banned}`)
  }
}

const globals = readFileSync(globalsPath, "utf8")
for (const snippet of [
  "data-theme",
  ".dark .together-story",
  ".dark .mara-segment__btn",
  "oklch(0.97 0.01 240)",
]) {
  if (globals.includes(snippet)) {
    fail(`app/globals.css contains ${snippet}`)
  }
}

// `--color-background: var(--background)` does not contain `--background:`.
for (const token of ladderTokenNames()) {
  if (globals.includes(`${token}:`)) {
    fail(`app/globals.css still declares ${token}`)
  }
  const alias = `--color-${token.slice(2)}: var(${token})`
  if (!globals.includes(alias)) {
    fail(`app/globals.css is missing ${alias}`)
  }
}
