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

type ParseFailure = { ok: false; error: "Invalid trip fields." }

const invalidTripFields: ParseFailure = {
  ok: false,
  error: "Invalid trip fields.",
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
}

function readExactStrings(
  body: unknown,
  fields: readonly string[],
): { ok: true; values: Record<string, string> } | ParseFailure {
  if (!isRecord(body) || Object.keys(body).length !== fields.length) {
    return invalidTripFields
  }
  const values: Record<string, string> = {}
  for (const field of fields) {
    const value = body[field]
    if (typeof value !== "string") {
      return invalidTripFields
    }
    values[field] = value
  }
  return { ok: true, values }
}

export function parseCreateBody(
  body: unknown,
): { ok: true; value: CreateTripBody } | ParseFailure {
  const read = readExactStrings(body, ["name", "startDate", "endDate", "displayName"])
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
  const read = readExactStrings(body, ["name", "startDate", "endDate"])
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
