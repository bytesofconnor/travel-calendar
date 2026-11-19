import { isGapId } from "../../lib/trip-home/detect.ts"

export type GapClaimBody = {
  tripId: string
  gapId: string
  claimed: boolean
}

type GapFailure = { ok: false; error: "Invalid gap fields." }

const invalidGapFields: GapFailure = { ok: false, error: "Invalid gap fields." }

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
}

export function parseGapClaimBody(body: unknown): { ok: true; value: GapClaimBody } | GapFailure {
  if (!isRecord(body) || Object.keys(body).length !== 3) return invalidGapFields
  const { tripId, gapId, claimed } = body
  if (typeof tripId !== "string" || tripId.trim() === "") return invalidGapFields
  if (typeof gapId !== "string" || !isGapId(gapId)) return invalidGapFields
  if (typeof claimed !== "boolean") return invalidGapFields
  return { ok: true, value: { tripId: tripId.trim(), gapId, claimed } }
}
