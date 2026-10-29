import assert from "node:assert/strict"
import test from "node:test"

import { THEME_PACKS } from "../../lib/theme-packs.ts"
import { parseThemeToolInput, themePackIdSchema } from "./toolInputs.mjs"

test("theme pack zod ids match THEME_PACKS", () => {
  assert.deepEqual(
    themePackIdSchema.options,
    THEME_PACKS.map((pack) => pack.id),
  )
  for (const pack of THEME_PACKS) {
    const parsed = parseThemeToolInput({
      host: "grok",
      tripId: "trip_1",
      themePack: pack.id,
    })
    assert.equal(parsed.themePack, pack.id)
  }
  assert.throws(
    () => parseThemeToolInput({ host: "grok", tripId: "trip_1", themePack: "not-a-pack" }),
    { message: "Invalid theme pack." },
  )
})
