export type ItemAddBody = {
  op: "add"
  tripId: string
  title: string
  startDate: string
  endDate: string
  location: string
  notes?: string
  linkLabel?: string
  linkUrl?: string
  locationTo?: string
}

export type ItemUpdateBody = {
  op: "update"
  itemId: string
  title: string
  startDate: string
  endDate: string
  location: string
  notes?: string
  linkLabel?: string
  linkUrl?: string
  locationTo?: string
}

export type ItemRemoveBody = {
  op: "remove"
  tripId: string
  itemId: string
}

export type ItemProposeBody = ItemAddBody | ItemUpdateBody | ItemRemoveBody

export type ArchiveBody = { tripId: string }

export type ConfirmBody = {
  proposalId: string
  target: "trip" | "item"
  displayName?: string
}

export type RejectBody = { proposalId: string }

type ItemFailure = { ok: false; error: "Invalid item fields." }
type TripFailure = { ok: false; error: "Invalid trip fields." }
type ConfirmFailure = { ok: false; error: "Invalid confirm fields." }
type RejectFailure = { ok: false; error: "Invalid reject fields." }

const invalidItem: ItemFailure = { ok: false, error: "Invalid item fields." }
const invalidTrip: TripFailure = { ok: false, error: "Invalid trip fields." }
const invalidConfirm: ConfirmFailure = { ok: false, error: "Invalid confirm fields." }
const invalidReject: RejectFailure = { ok: false, error: "Invalid reject fields." }

const optionalItemKeys = ["notes", "linkLabel", "linkUrl", "locationTo"] as const

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
}

function readStrings(
  body: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
): Record<string, string> | null {
  const allowed = new Set([...required, ...optional])
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      return null
    }
  }
  const values: Record<string, string> = {}
  for (const key of required) {
    const value = body[key]
    if (typeof value !== "string") {
      return null
    }
    values[key] = value
  }
  for (const key of optional) {
    if (!(key in body)) {
      continue
    }
    const value = body[key]
    if (typeof value !== "string") {
      return null
    }
    values[key] = value
  }
  return values
}

function itemFields(values: Record<string, string>) {
  return {
    title: values.title ?? "",
    startDate: values.startDate ?? "",
    endDate: values.endDate ?? "",
    location: values.location ?? "",
    ...(values.notes !== undefined ? { notes: values.notes } : {}),
    ...(values.linkLabel !== undefined ? { linkLabel: values.linkLabel } : {}),
    ...(values.linkUrl !== undefined ? { linkUrl: values.linkUrl } : {}),
    ...(values.locationTo !== undefined ? { locationTo: values.locationTo } : {}),
  }
}

export function parseItemBody(body: unknown): { ok: true; value: ItemProposeBody } | ItemFailure {
  if (!isRecord(body) || (body.op !== "add" && body.op !== "update" && body.op !== "remove")) {
    return invalidItem
  }
  if (body.op === "remove") {
    const values = readStrings(body, ["op", "tripId", "itemId"], [])
    if (!values) {
      return invalidItem
    }
    return { ok: true, value: { op: "remove", tripId: values.tripId ?? "", itemId: values.itemId ?? "" } }
  }
  if (body.op === "add") {
    const values = readStrings(body, ["op", "tripId", "title", "startDate", "endDate", "location"], optionalItemKeys)
    if (!values) {
      return invalidItem
    }
    return { ok: true, value: { op: "add", tripId: values.tripId ?? "", ...itemFields(values) } }
  }
  const values = readStrings(body, ["op", "itemId", "title", "startDate", "endDate", "location"], optionalItemKeys)
  if (!values) {
    return invalidItem
  }
  return { ok: true, value: { op: "update", itemId: values.itemId ?? "", ...itemFields(values) } }
}

export function parseArchiveBody(body: unknown): { ok: true; value: ArchiveBody } | TripFailure {
  if (!isRecord(body)) {
    return invalidTrip
  }
  const values = readStrings(body, ["tripId"], [])
  if (!values) {
    return invalidTrip
  }
  return { ok: true, value: { tripId: values.tripId ?? "" } }
}

export function parseConfirmBody(body: unknown): { ok: true; value: ConfirmBody } | ConfirmFailure {
  if (!isRecord(body)) {
    return invalidConfirm
  }
  const values = readStrings(body, ["proposalId", "target"], ["displayName"])
  if (!values || (values.target !== "trip" && values.target !== "item")) {
    return invalidConfirm
  }
  return {
    ok: true,
    value: {
      proposalId: values.proposalId ?? "",
      target: values.target,
      ...(values.displayName !== undefined ? { displayName: values.displayName } : {}),
    },
  }
}

export function parseRejectBody(body: unknown): { ok: true; value: RejectBody } | RejectFailure {
  if (!isRecord(body)) {
    return invalidReject
  }
  const values = readStrings(body, ["proposalId"], [])
  if (!values) {
    return invalidReject
  }
  return { ok: true, value: { proposalId: values.proposalId ?? "" } }
}
