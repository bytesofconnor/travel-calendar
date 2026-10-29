export type CreateTripBody = {
  name: string
  startDate: string
  endDate: string
  displayName: string
}

export type UpdateTripBody = {
  name: string
  startDate: string
  endDate: string
}

export type JoinBody = {
  inviteCode: string
  displayName: string
}

export type ThemeBody = {
  tripId: string
  themePack: string | null
}

type ParseFailure = { ok: false; error: "Invalid trip fields." }
type JoinFailure = { ok: false; error: "Invalid join fields." }
type ThemeFailure = { ok: false; error: "Invalid theme fields." }

const invalidTripFields: ParseFailure = {
  ok: false,
  error: "Invalid trip fields.",
}

const invalidJoinFields: JoinFailure = {
  ok: false,
  error: "Invalid join fields.",
}

const invalidThemeFields: ThemeFailure = {
  ok: false,
  error: "Invalid theme fields.",
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
}

function readExactStrings<F extends { ok: false; error: string }>(
  body: unknown,
  fields: readonly string[],
  failure: F,
): { ok: true; values: Record<string, string> } | F {
  if (!isRecord(body) || Object.keys(body).length !== fields.length) {
    return failure
  }
  const values: Record<string, string> = {}
  for (const field of fields) {
    const value = body[field]
    if (typeof value !== "string") {
      return failure
    }
    values[field] = value
  }
  return { ok: true, values }
}

export function parseCreateBody(
  body: unknown,
): { ok: true; value: CreateTripBody } | ParseFailure {
  const read = readExactStrings(body, ["name", "startDate", "endDate", "displayName"], invalidTripFields)
  if (!read.ok) {
    return read
  }
  return {
    ok: true,
    value: {
      name: read.values.name,
      startDate: read.values.startDate,
      endDate: read.values.endDate,
      displayName: read.values.displayName,
    },
  }
}

export function parseUpdateBody(
  body: unknown,
): { ok: true; value: UpdateTripBody } | ParseFailure {
  const read = readExactStrings(body, ["name", "startDate", "endDate"], invalidTripFields)
  if (!read.ok) {
    return read
  }
  return {
    ok: true,
    value: {
      name: read.values.name,
      startDate: read.values.startDate,
      endDate: read.values.endDate,
    },
  }
}

export function parseJoinBody(body: unknown): { ok: true; value: JoinBody } | JoinFailure {
  const read = readExactStrings(body, ["inviteCode", "displayName"], invalidJoinFields)
  if (!read.ok) {
    return read
  }
  return {
    ok: true,
    value: {
      inviteCode: read.values.inviteCode,
      displayName: read.values.displayName,
    },
  }
}

export function parseThemeBody(body: unknown): { ok: true; value: ThemeBody } | ThemeFailure {
  if (!isRecord(body) || Object.keys(body).length !== 2) {
    return invalidThemeFields
  }
  const tripId = body.tripId
  const themePack = body.themePack
  if (typeof tripId !== "string" || (themePack !== null && typeof themePack !== "string")) {
    return invalidThemeFields
  }
  return { ok: true, value: { tripId, themePack } }
}
