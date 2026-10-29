// Node's type stripper resolves this file only with an explicit .ts specifier.
import { THEME_PACKS, type ThemePackId } from "./theme-packs.ts"

type HueSlot =
  | "h-paper"
  | "h-ink"
  | "h-ring"
  | "h-flight"
  | "h-stay"
  | "h-place"
  | "h-note"
  | "h-ask"
  | "h-together"

type ModePaint =
  | { alias: string }
  | { white: true }
  | { l: number; c: number | "paper" | "paper-dark"; h: HueSlot; fallback: number }

type LadderRow = {
  token: string
  light: ModePaint
  dark: ModePaint
}

const PAPER_CHROMA_FALLBACK = { light: 0.002, dark: 0.012 } as const

const LADDER: readonly LadderRow[] = [
  { token: "--background", light: { l: 0.991, c: "paper", h: "h-paper", fallback: 240 }, dark: { l: 0.145, c: "paper-dark", h: "h-paper", fallback: 255 } },
  { token: "--foreground", light: { l: 0.16, c: 0.015, h: "h-ink", fallback: 255 }, dark: { l: 0.96, c: 0.005, h: "h-ink", fallback: 240 } },
  { token: "--card", light: { white: true }, dark: { l: 0.19, c: 0.012, h: "h-paper", fallback: 255 } },
  { token: "--card-foreground", light: { alias: "--foreground" }, dark: { alias: "--foreground" } },
  { token: "--popover", light: { alias: "--card" }, dark: { alias: "--card" } },
  { token: "--popover-foreground", light: { alias: "--foreground" }, dark: { alias: "--foreground" } },
  { token: "--primary", light: { l: 0.2, c: 0.02, h: "h-ink", fallback: 255 }, dark: { alias: "--foreground" } },
  { token: "--secondary", light: { l: 0.965, c: 0.004, h: "h-paper", fallback: 240 }, dark: { l: 0.22, c: 0.012, h: "h-paper", fallback: 255 } },
  { token: "--secondary-foreground", light: { l: 0.22, c: 0.015, h: "h-ink", fallback: 255 }, dark: { l: 0.92, c: 0.005, h: "h-ink", fallback: 240 } },
  { token: "--muted", light: { l: 0.965, c: 0.003, h: "h-paper", fallback: 240 }, dark: { alias: "--secondary" } },
  { token: "--muted-foreground", light: { l: 0.42, c: 0.02, h: "h-paper", fallback: 250 }, dark: { l: 0.72, c: 0.02, h: "h-paper", fallback: 250 } },
  { token: "--accent", light: { alias: "--secondary" }, dark: { l: 0.24, c: 0.014, h: "h-paper", fallback: 255 } },
  { token: "--accent-foreground", light: { alias: "--primary" }, dark: { alias: "--primary" } },
  { token: "--border", light: { l: 0.91, c: 0.006, h: "h-paper", fallback: 240 }, dark: { l: 0.3, c: 0.015, h: "h-paper", fallback: 255 } },
  { token: "--input", light: { alias: "--muted" }, dark: { alias: "--muted" } },
  { token: "--ring", light: { l: 0.55, c: 0.04, h: "h-ring", fallback: 240 }, dark: { l: 0.55, c: 0.06, h: "h-ring", fallback: 240 } },
  { token: "--sidebar", light: { l: 0.985, c: 0.002, h: "h-paper", fallback: 240 }, dark: { alias: "--background" } },
  { token: "--sidebar-foreground", light: { alias: "--foreground" }, dark: { alias: "--foreground" } },
  { token: "--sidebar-primary", light: { alias: "--primary" }, dark: { alias: "--primary" } },
  { token: "--sidebar-primary-foreground", light: { alias: "--primary-foreground" }, dark: { alias: "--primary-foreground" } },
  { token: "--sidebar-accent", light: { alias: "--secondary" }, dark: { alias: "--secondary" } },
  { token: "--sidebar-accent-foreground", light: { alias: "--secondary-foreground" }, dark: { alias: "--foreground" } },
  { token: "--sidebar-border", light: { alias: "--border" }, dark: { alias: "--border" } },
  { token: "--sidebar-ring", light: { alias: "--ring" }, dark: { alias: "--ring" } },
  { token: "--kind-flight", light: { l: 0.44, c: 0.13, h: "h-flight", fallback: 240 }, dark: { l: 0.78, c: 0.1, h: "h-flight", fallback: 240 } },
  { token: "--kind-stay", light: { l: 0.42, c: 0.15, h: "h-stay", fallback: 295 }, dark: { l: 0.78, c: 0.12, h: "h-stay", fallback: 295 } },
  { token: "--kind-place", light: { l: 0.4, c: 0.12, h: "h-place", fallback: 155 }, dark: { l: 0.78, c: 0.1, h: "h-place", fallback: 155 } },
  { token: "--kind-note", light: { l: 0.46, c: 0.13, h: "h-note", fallback: 70 }, dark: { l: 0.82, c: 0.1, h: "h-note", fallback: 75 } },
  { token: "--kind-ask", light: { l: 0.48, c: 0.15, h: "h-ask", fallback: 350 }, dark: { l: 0.8, c: 0.1, h: "h-ask", fallback: 350 } },
  { token: "--together", light: { l: 0.68, c: 0.14, h: "h-together", fallback: 40 }, dark: { l: 0.78, c: 0.12, h: "h-together", fallback: 40 } },
  { token: "--together-foreground", light: { l: 0.16, c: 0.03, h: "h-together", fallback: 40 }, dark: { l: 0.16, c: 0.02, h: "h-together", fallback: 40 } },
  { token: "--partner", light: { alias: "--together" }, dark: { alias: "--together" } },
]

type KindHue = "flight" | "stay" | "place" | "note" | "ask"

type PackRecipe = {
  paperHue: number
  paperChroma: number
  paperChromaDark: number
  inkHue: number
  togetherHue: number
  togetherIsolated: boolean
  ring: "together" | "flight"
  kinds: Record<KindHue, number>
}

const RECIPES = {
  "golden-hour": {
    paperHue: 72,
    paperChroma: 0.012,
    paperChromaDark: 0.02,
    inkHue: 55,
    togetherHue: 32,
    togetherIsolated: false,
    ring: "together",
    kinds: { flight: 245, stay: 320, place: 125, note: 78, ask: 355 },
  },
  "dusk-rose": {
    paperHue: 8,
    paperChroma: 0.01,
    paperChromaDark: 0.018,
    inkHue: 12,
    togetherHue: 50,
    togetherIsolated: false,
    ring: "together",
    kinds: { flight: 230, stay: 345, place: 155, note: 80, ask: 300 },
  },
  "coastal-infra": {
    paperHue: 240,
    paperChroma: 0,
    paperChromaDark: 0.008,
    inkHue: 250,
    togetherHue: 25,
    togetherIsolated: true,
    ring: "flight",
    kinds: { flight: 215, stay: 285, place: 160, note: 250, ask: 330 },
  },
  "sage-coast": {
    paperHue: 150,
    paperChroma: 0.01,
    paperChromaDark: 0.016,
    inkHue: 165,
    togetherHue: 78,
    togetherIsolated: false,
    ring: "together",
    kinds: { flight: 225, stay: 290, place: 152, note: 85, ask: 350 },
  },
} as const satisfies Record<ThemePackId, PackRecipe>

type RecipeKeysMatch = Exclude<keyof typeof RECIPES, ThemePackId> extends never ? "match" : never
const recipeKeysCheck: RecipeKeysMatch = "match"
void recipeKeysCheck

const KIND_BANDS = {
  flight: [210, 250],
  stay: [265, 345],
  place: [125, 175],
} as const

const KIND_NAMES = ["flight", "stay", "place", "note", "ask"] as const

const PACK_PROPS = [
  "--h-paper",
  "--h-ink",
  "--h-ring",
  "--h-flight",
  "--h-stay",
  "--h-place",
  "--h-note",
  "--h-ask",
  "--h-together",
  "--c-paper",
  "--c-paper-dark",
] as const

const BANNED_OUTPUT = ["--brand", "--live", "--cover-chrome"] as const

export function ladderTokenNames(): readonly string[] {
  return LADDER.map((row) => row.token)
}

function formatNum(value: number): string {
  return String(value)
}

function hueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360
  return Math.min(delta, 360 - delta)
}

function assertRecipe(id: ThemePackId, recipe: PackRecipe) {
  if (recipe.paperChroma < 0 || recipe.paperChroma > 0.014) {
    throw new Error(`${id} paper chroma ${recipe.paperChroma} is outside 0..0.014`)
  }
  if (recipe.paperChromaDark < 0 || recipe.paperChromaDark > 0.025) {
    throw new Error(`${id} dark paper chroma ${recipe.paperChromaDark} is outside 0..0.025`)
  }
  for (const kind of ["flight", "stay", "place"] as const) {
    const [min, max] = KIND_BANDS[kind]
    const hue = recipe.kinds[kind]
    if (hue < min || hue > max) {
      throw new Error(`${id} ${kind} hue ${hue} is outside ${min}..${max}`)
    }
  }
  for (let left = 0; left < KIND_NAMES.length; left += 1) {
    for (let right = left + 1; right < KIND_NAMES.length; right += 1) {
      const a = KIND_NAMES[left]
      const b = KIND_NAMES[right]
      if (!a || !b) continue
      const distance = hueDistance(recipe.kinds[a], recipe.kinds[b])
      if (distance < 28) {
        throw new Error(`${id} ${a} and ${b} are ${distance} degrees apart`)
      }
    }
  }
  if (recipe.togetherIsolated) {
    for (const kind of KIND_NAMES) {
      const distance = hueDistance(recipe.togetherHue, recipe.kinds[kind])
      if (distance < 40) {
        throw new Error(`${id} together is ${distance} degrees from ${kind}`)
      }
    }
  }
}

function paint(step: ModePaint): string {
  if ("alias" in step) return `var(${step.alias})`
  if ("white" in step) return "oklch(1 0 0)"
  const chroma =
    step.c === "paper"
      ? `var(--c-paper, ${formatNum(PAPER_CHROMA_FALLBACK.light)})`
      : step.c === "paper-dark"
        ? `var(--c-paper-dark, ${formatNum(PAPER_CHROMA_FALLBACK.dark)})`
        : formatNum(step.c)
  return `oklch(${formatNum(step.l)} ${chroma} var(--${step.h}, ${formatNum(step.fallback)}))`
}

function block(selector: string, lines: readonly string[]): string {
  return `${selector} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`
}

function declaration(name: string, value: string): string {
  return `${name}: ${value};`
}

function swatchBackground(togetherHue: number): string {
  const together = LADDER.find((row) => row.token === "--together")
  if (!together || !("l" in together.light) || typeof together.light.c !== "number") {
    throw new Error("light --together must be an oklch step")
  }
  return `oklch(${formatNum(together.light.l)} ${formatNum(together.light.c)} ${formatNum(togetherHue)})`
}

function packBlock(id: ThemePackId): string {
  const recipe = RECIPES[id]
  assertRecipe(id, recipe)
  const ringHue = recipe.ring === "flight" ? recipe.kinds.flight : recipe.togetherHue
  const values: Record<(typeof PACK_PROPS)[number], number> = {
    "--h-paper": recipe.paperHue,
    "--h-ink": recipe.inkHue,
    "--h-ring": ringHue,
    "--h-flight": recipe.kinds.flight,
    "--h-stay": recipe.kinds.stay,
    "--h-place": recipe.kinds.place,
    "--h-note": recipe.kinds.note,
    "--h-ask": recipe.kinds.ask,
    "--h-together": recipe.togetherHue,
    "--c-paper": recipe.paperChroma,
    "--c-paper-dark": recipe.paperChromaDark,
  }
  // A ladder color here would pin the light step over .dark. Hues leave lightness on the ladder.
  return block(
    `html[data-theme="${id}"]`,
    PACK_PROPS.map((name) => declaration(name, formatNum(values[name]))),
  )
}

export function renderThemePackCss(): string {
  const ladderTokens = new Set(ladderTokenNames())
  for (const name of PACK_PROPS) {
    if (ladderTokens.has(name)) {
      throw new Error(`pack block cannot set ladder color ${name}`)
    }
  }

  const parts = [
    "/* Generated by scripts/check-theme-packs.ts. Edit lib/theme-pack-css.ts, then run pnpm theme-packs:write. */",
    block(
      ":root",
      LADDER.map((row) => declaration(row.token, paint(row.light))),
    ),
    block(
      ".dark",
      LADDER.map((row) => declaration(row.token, paint(row.dark))),
    ),
    ...THEME_PACKS.map((pack) => packBlock(pack.id)),
    ...THEME_PACKS.map((pack) =>
      block(`[data-pack-swatch="${pack.id}"]`, [
        declaration("background", swatchBackground(RECIPES[pack.id].togetherHue)),
      ]),
    ),
  ]
  const css = `${parts.join("\n\n")}\n`
  for (const banned of BANNED_OUTPUT) {
    if (css.includes(banned)) {
      throw new Error(`theme pack css contains ${banned}`)
    }
  }
  return css
}
