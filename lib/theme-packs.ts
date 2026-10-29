export const THEME_PACKS = [
  { id: "golden-hour", label: "Golden Hour" },
  { id: "dusk-rose", label: "Dusk Rose" },
  { id: "coastal-infra", label: "Coastal Infra" },
  { id: "sage-coast", label: "Sage Coast" },
] as const

export type ThemePack = (typeof THEME_PACKS)[number]
export type ThemePackId = ThemePack["id"]

// Length 4 is the product. A fifth id fails this assignment.
type ThemePackCount = (typeof THEME_PACKS)["length"]
const themePackCountCheck: ThemePackCount extends 4 ? "four" : never = "four"
void themePackCountCheck

export function parseThemePack(value: unknown): ThemePackId | null {
  if (typeof value !== "string") return null
  for (const pack of THEME_PACKS) {
    if (pack.id === value) return pack.id
  }
  return null
}
