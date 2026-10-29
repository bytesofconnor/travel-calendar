import { z } from "zod"

export const themePackIds = ["golden-hour", "dusk-rose", "coastal-infra", "sage-coast"]

export const themePackIdSchema = z.enum(themePackIds)

const hostSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{0,63}$/, "host_required")

function reject(error, kind) {
  const field = error.issues[0]?.path?.[0]
  if (field === "host" || field === undefined) {
    throw new Error("host_required")
  }
  if (kind === "join" && field === "inviteCode") {
    throw new Error("invite_code_required")
  }
  if (kind === "theme" && field === "themePack") {
    throw new Error("Invalid theme pack.")
  }
  throw new Error(kind === "join" ? "Invalid join fields." : "Invalid theme fields.")
}

const joinToolInput = z.object({
  host: hostSchema,
  inviteCode: z.string().refine((value) => value.trim().length > 0, "invite_code_required"),
  displayName: z.string(),
})

const themeToolInput = z.object({
  host: hostSchema,
  tripId: z.string().trim().min(1),
  themePack: z.union([themePackIdSchema, z.null()]),
})

export function parseJoinToolInput(input) {
  const parsed = joinToolInput.safeParse(input ?? {})
  if (!parsed.success) {
    reject(parsed.error, "join")
  }
  return parsed.data
}

export function parseThemeToolInput(input) {
  const parsed = themeToolInput.safeParse(input ?? {})
  if (!parsed.success) {
    reject(parsed.error, "theme")
  }
  return parsed.data
}
