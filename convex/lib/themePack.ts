import { v } from "convex/values"

import { THEME_PACKS } from "../../lib/theme-packs"

const themePackLiterals = THEME_PACKS.map((pack) => v.literal(pack.id))
const [firstPack, secondPack, thirdPack, fourthPack] = themePackLiterals

if (!firstPack || !secondPack || !thirdPack || !fourthPack) {
  throw new Error("THEME_PACKS must list four ids.")
}

export const themePackValidator = v.union(firstPack, secondPack, thirdPack, fourthPack)
