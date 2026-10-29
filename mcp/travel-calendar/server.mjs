#!/usr/bin/env node
import { realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { parseJoinToolInput, parseThemeToolInput, themePackIds } from "./toolInputs.mjs"

const siteUrl = (process.env.TRAVEL_CALENDAR_SITE_URL ?? "").replace(/\/$/, "")
const apiKey = process.env.TRAVEL_CALENDAR_API_KEY ?? ""
const HOST_HEADER = "X-Travel-Calendar-Host"
const HOST_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/

const secondPropose =
  "A second call inserts a second pending row. Nothing becomes the shared plan until a different person confirms."
const proposeOnly = "A propose-only key cannot confirm."

function isProcessEntry() {
  const entry = process.argv[1]
  if (!entry) {
    return false
  }
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entry)
  } catch {
    return false
  }
}

if (isProcessEntry() && (!siteUrl || !apiKey)) {
  console.error(
    "Missing TRAVEL_CALENDAR_SITE_URL or TRAVEL_CALENDAR_API_KEY. See mcp/travel-calendar/README.md",
  )
  process.exit(1)
}

function requireHost(input) {
  if (typeof input?.host !== "string") {
    throw new Error("host_required")
  }
  const host = input.host.trim().toLowerCase()
  if (!HOST_PATTERN.test(host)) {
    throw new Error("host_required")
  }
  return host
}

async function agentFetch(path, init) {
  const host = requireHost(init)
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    [HOST_HEADER]: host,
  }
  const method = init?.method ?? "GET"
  let payload
  if (init?.body !== undefined) {
    headers["Content-Type"] = "application/json"
    payload = JSON.stringify(init.body)
  }
  const response = await fetch(`${siteUrl}${path}`, {
    method,
    headers,
    body: payload,
  })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  if (!response.ok) {
    if (
      response.status === 402 &&
      body &&
      typeof body === "object" &&
      body.error === "payment_required"
    ) {
      const url = body.paymentUrl ? `\nPay here: ${body.paymentUrl}` : ""
      throw new Error(
        `${body.message ?? "Lifetime access required ($9.99 once)."}${url}`,
      )
    }
    const message =
      body && typeof body === "object" && "error" in body
        ? String(body.error)
        : `HTTP ${response.status}`
    throw new Error(message)
  }
  return body
}

function requireId(input, field) {
  if (typeof input?.[field] !== "string" || !input[field].trim()) {
    throw new Error(`${field} is required`)
  }
  return input[field].trim()
}

function requireTripFields(input, fields) {
  for (const field of fields) {
    if (typeof input?.[field] !== "string") {
      throw new Error("Invalid trip fields.")
    }
  }
}

async function proposeTrip(input, op) {
  const host = requireHost(input)
  if (op === "add") {
    requireTripFields(input, ["name", "startDate", "endDate", "displayName"])
    return await agentFetch("/agent/v1/trips", {
      method: "POST",
      host,
      body: {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        displayName: input.displayName,
      },
    })
  }
  if (op === "update") {
    const tripId = requireId(input, "tripId")
    requireTripFields(input, ["name", "startDate", "endDate"])
    return await agentFetch(`/agent/v1/trips/${encodeURIComponent(tripId)}`, {
      method: "PUT",
      host,
      body: {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    })
  }
  if (op === "archive") {
    const tripId = requireId(input, "tripId")
    return await agentFetch("/agent/v1/archive", {
      method: "POST",
      host,
      body: { tripId },
    })
  }
  throw new Error("Invalid trip fields.")
}

function optionalItemFields(input) {
  const body = {}
  for (const field of ["notes", "linkLabel", "linkUrl", "locationTo"]) {
    if (input?.[field] === undefined) {
      continue
    }
    if (typeof input[field] !== "string") {
      throw new Error("Invalid item fields.")
    }
    body[field] = input[field]
  }
  return body
}

function itemContent(input) {
  for (const field of ["title", "startDate", "endDate", "location"]) {
    if (typeof input?.[field] !== "string") {
      throw new Error("Invalid item fields.")
    }
  }
  return {
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    location: input.location,
    ...optionalItemFields(input),
  }
}

async function proposeItem(input, op) {
  const host = requireHost(input)
  if (op === "add") {
    if (typeof input?.tripId !== "string") {
      throw new Error("Invalid item fields.")
    }
    return await agentFetch("/agent/v1/items", {
      method: "POST",
      host,
      body: { op: "add", tripId: input.tripId, ...itemContent(input) },
    })
  }
  if (op === "update") {
    if (typeof input?.itemId !== "string") {
      throw new Error("Invalid item fields.")
    }
    return await agentFetch("/agent/v1/items", {
      method: "POST",
      host,
      body: { op: "update", itemId: input.itemId, ...itemContent(input) },
    })
  }
  if (op === "remove") {
    if (typeof input?.tripId !== "string" || typeof input?.itemId !== "string") {
      throw new Error("Invalid item fields.")
    }
    return await agentFetch("/agent/v1/items", {
      method: "POST",
      host,
      body: { op: "remove", tripId: input.tripId, itemId: input.itemId },
    })
  }
  throw new Error("Invalid item fields.")
}

async function confirmTarget(input, target) {
  const host = requireHost(input)
  if (typeof input?.proposalId !== "string" || !input.proposalId) {
    throw new Error("Invalid confirm fields.")
  }
  const body = { proposalId: input.proposalId, target }
  if (input.displayName !== undefined) {
    if (typeof input.displayName !== "string") {
      throw new Error("Invalid confirm fields.")
    }
    body.displayName = input.displayName
  }
  return await agentFetch("/agent/v1/confirm", { method: "POST", host, body })
}

async function rejectProposal(input) {
  const host = requireHost(input)
  if (typeof input?.proposalId !== "string" || !input.proposalId) {
    throw new Error("Invalid reject fields.")
  }
  return await agentFetch("/agent/v1/reject", {
    method: "POST",
    host,
    body: { proposalId: input.proposalId },
  })
}

function searchPath(input) {
  const params = new URLSearchParams()
  for (const field of ["date", "place", "status"]) {
    if (input?.[field] === undefined) {
      continue
    }
    if (typeof input[field] !== "string") {
      throw new Error("Invalid search.")
    }
    params.set(field, input[field])
  }
  const query = params.toString()
  return query ? `/agent/v1/search/trips?${query}` : "/agent/v1/search/trips"
}

export async function createTrip(input) {
  return await proposeTrip(input, "add")
}

export async function updateTrip(input) {
  return await proposeTrip(input, "update")
}

export async function tripsJoin(input) {
  const parsed = parseJoinToolInput(input)
  return await agentFetch("/agent/v1/join", {
    method: "POST",
    host: parsed.host,
    body: {
      inviteCode: parsed.inviteCode,
      displayName: parsed.displayName,
    },
  })
}

export async function tripsSetThemePack(input) {
  const parsed = parseThemeToolInput(input)
  return await agentFetch("/agent/v1/theme", {
    method: "POST",
    host: parsed.host,
    body: {
      tripId: parsed.tripId,
      themePack: parsed.themePack,
    },
  })
}

export async function confirmPending(input) {
  const host = requireHost(input)
  return await agentFetch("/agent/v1/confirm/pending", { method: "GET", host })
}

const hostField = {
  type: "string",
  description: "Agent host name. Sent as X-Travel-Calendar-Host, never in the JSON body.",
}

function toolSchema(properties, required) {
  return {
    type: "object",
    properties: { host: hostField, ...properties },
    required: ["host", ...required],
    additionalProperties: false,
  }
}

const tripIdField = { type: "string", description: "Convex trip document id" }
const itemIdField = { type: "string", description: "Convex trip item document id" }
const proposalIdField = { type: "string", description: "Proposal id" }
const dateField = { type: "string", description: "Date, YYYY-MM-DD" }
const displayNameField = {
  type: "string",
  description: "Name stored on the membership when a trip add is confirmed",
}

const itemProperties = {
  tripId: tripIdField,
  itemId: itemIdField,
  title: { type: "string" },
  startDate: dateField,
  endDate: dateField,
  location: { type: "string" },
  notes: { type: "string" },
  linkLabel: { type: "string" },
  linkUrl: { type: "string" },
  locationTo: { type: "string" },
}

const toolRegistry = [
  {
    name: "check_access",
    description:
      "Check whether lifetime access is granted. If payment is required, returns a Stripe paymentUrl ($9.99 once). Requires host.",
    inputSchema: toolSchema({}, []),
    call: (args) => agentFetch("/agent/v1/access", { method: "GET", host: requireHost(args) }),
  },
  {
    name: "list_trips",
    description:
      "List trips the authenticated user can access. Skips archived trips. Requires lifetime access and host.",
    inputSchema: toolSchema({}, []),
    call: (args) => agentFetch("/agent/v1/trips", { method: "GET", host: requireHost(args) }),
  },
  {
    name: "trips_get",
    description:
      "Load one trip by id, including an archived trip. Requires lifetime access and host.",
    inputSchema: toolSchema({ tripId: tripIdField }, ["tripId"]),
    call: (args) =>
      agentFetch(`/agent/v1/trip/${encodeURIComponent(requireId(args, "tripId"))}`, {
        method: "GET",
        host: requireHost(args),
      }),
  },
  {
    name: "trips_search",
    description:
      "Filter trips by date (YYYY-MM-DD, inclusive on the trip or an item), place (location or locationTo), or status (active or archived). Omitted status means active. No date, place, or status returns no trips. Pending is not a trip status. Requires lifetime access and host.",
    inputSchema: toolSchema(
      {
        date: dateField,
        place: { type: "string" },
        status: { type: "string", description: "active or archived" },
      },
      [],
    ),
    call: (args) => agentFetch(searchPath(args), { method: "GET", host: requireHost(args) }),
  },
  {
    name: "trips_join",
    description:
      "Join a trip with an invite code. The membership is written immediately. A second call keeps the stored role and display name. An owner who submits their own code stays owner. Requires host.",
    inputSchema: toolSchema(
      {
        inviteCode: { type: "string", description: "Invite code" },
        displayName: { type: "string", description: "Name stored when this user is a new member" },
      },
      ["inviteCode", "displayName"],
    ),
    call: (args) => tripsJoin(args),
  },
  {
    name: "trips_set_theme_pack",
    description:
      "Set the trip theme pack, or pass null to clear it. Any member can set it. There is no paywall. A missing trip or a non-member is Trip not found. Requires host.",
    inputSchema: toolSchema(
      {
        tripId: tripIdField,
        themePack: {
          anyOf: [{ type: "string", enum: themePackIds }, { type: "null" }],
          description: "Theme pack id, or null to clear the pack",
        },
      },
      ["tripId", "themePack"],
    ),
    call: (args) => tripsSetThemePack(args),
  },
  {
    name: "create_trip",
    description: `Propose a new trip. Does not insert the trip until a different person confirms. ${secondPropose} Requires lifetime access and host. displayName is stored on the owner membership when the proposal is confirmed.`,
    inputSchema: toolSchema(
      {
        name: { type: "string" },
        startDate: dateField,
        endDate: dateField,
        displayName: displayNameField,
      },
      ["name", "startDate", "endDate", "displayName"],
    ),
    call: (args) => createTrip(args),
  },
  {
    name: "update_trip",
    description: `Propose replacing the trip name, start date, and end date. Send all three. ${secondPropose} The API key's user must be an owner when the proposal is applied. Does not check lifetime access. Requires host.`,
    inputSchema: toolSchema(
      {
        tripId: tripIdField,
        name: { type: "string" },
        startDate: dateField,
        endDate: dateField,
      },
      ["tripId", "name", "startDate", "endDate"],
    ),
    call: (args) => updateTrip(args),
  },
  {
    name: "trips_archive",
    description: `Propose archiving a trip. The trip stays active until a different partner confirms. ${secondPropose} Requires lifetime access and host.`,
    inputSchema: toolSchema({ tripId: tripIdField }, ["tripId"]),
    call: (args) => proposeTrip(args, "archive"),
  },
  {
    name: "trips_propose",
    description: `Propose a trip add, update, or archive. op is add, update, or archive. Same propose path as create_trip, update_trip, and trips_archive. ${secondPropose} Requires host.`,
    inputSchema: toolSchema(
      {
        op: { type: "string", description: "add, update, or archive" },
        tripId: tripIdField,
        name: { type: "string" },
        startDate: dateField,
        endDate: dateField,
        displayName: displayNameField,
      },
      ["op"],
    ),
    call: (args) => {
      const op = args?.op
      if (op !== "add" && op !== "update" && op !== "archive") {
        throw new Error("Invalid trip fields.")
      }
      return proposeTrip(args, op)
    },
  },
  {
    name: "trips_confirm",
    description: `Confirm a pending trip proposal. ${proposeOnly} You cannot confirm your own proposal. Trip add requires displayName. Confirming an already confirmed proposal returns that row and does not insert the trip again. Requires lifetime access and host.`,
    inputSchema: toolSchema(
      { proposalId: proposalIdField, displayName: displayNameField },
      ["proposalId"],
    ),
    call: (args) => confirmTarget(args, "trip"),
  },
  {
    name: "trips_reject",
    description:
      "Reject a pending trip proposal, or withdraw one you proposed. A confirmed proposal stays confirmed. Requires lifetime access and host.",
    inputSchema: toolSchema({ proposalId: proposalIdField }, ["proposalId"]),
    call: (args) => rejectProposal(args),
  },
  {
    name: "items_list",
    description: "List calendar items on a trip. Requires lifetime access and host.",
    inputSchema: toolSchema({ tripId: tripIdField }, ["tripId"]),
    call: (args) =>
      agentFetch(`/agent/v1/items?tripId=${encodeURIComponent(requireId(args, "tripId"))}`, {
        method: "GET",
        host: requireHost(args),
      }),
  },
  {
    name: "items_get",
    description: "Load one calendar item by id. Requires lifetime access and host.",
    inputSchema: toolSchema({ itemId: itemIdField }, ["itemId"]),
    call: (args) =>
      agentFetch(`/agent/v1/item/${encodeURIComponent(requireId(args, "itemId"))}`, {
        method: "GET",
        host: requireHost(args),
      }),
  },
  {
    name: "items_add",
    description: `Propose adding a calendar item. ${secondPropose} Requires lifetime access and host.`,
    inputSchema: toolSchema(itemProperties, ["tripId", "title", "startDate", "endDate", "location"]),
    call: (args) => proposeItem(args, "add"),
  },
  {
    name: "items_update",
    description: `Propose replacing a calendar item. Send the full field set. ${secondPropose} Requires lifetime access and host.`,
    inputSchema: toolSchema(itemProperties, ["itemId", "title", "startDate", "endDate", "location"]),
    call: (args) => proposeItem(args, "update"),
  },
  {
    name: "items_remove",
    description: `Propose removing a calendar item. The item stays until a different partner confirms. ${secondPropose} Requires lifetime access and host.`,
    inputSchema: toolSchema({ tripId: tripIdField, itemId: itemIdField }, ["tripId", "itemId"]),
    call: (args) => proposeItem(args, "remove"),
  },
  {
    name: "items_propose",
    description: `Propose an item add, update, or remove. op is add, update, or remove. Same propose path as items_add, items_update, and items_remove. ${secondPropose} Requires lifetime access and host.`,
    inputSchema: toolSchema(
      { op: { type: "string", description: "add, update, or remove" }, ...itemProperties },
      ["op"],
    ),
    call: (args) => {
      const op = args?.op
      if (op !== "add" && op !== "update" && op !== "remove") {
        throw new Error("Invalid item fields.")
      }
      return proposeItem(args, op)
    },
  },
  {
    name: "items_confirm",
    description: `Confirm a pending item proposal. ${proposeOnly} You cannot confirm your own proposal. Confirming an already confirmed proposal returns that row and does not apply it again. Requires lifetime access and host.`,
    inputSchema: toolSchema({ proposalId: proposalIdField }, ["proposalId"]),
    call: (args) => confirmTarget(args, "item"),
  },
  {
    name: "confirm_pending",
    description:
      "List pending proposals this user can see. Each row has row_text, glance_url, proposed_by, confirmed_by, and pending_for. Requires lifetime access and host.",
    inputSchema: toolSchema({}, []),
    call: (args) => confirmPending(args),
  },
  {
    name: "get_trip_bundle",
    description:
      "Load a trip bundle: trip metadata, members, calendar items, notes, and packing list. An archived trip is included when requested by id. Requires lifetime access and host.",
    inputSchema: toolSchema({ tripId: tripIdField }, ["tripId"]),
    call: (args) =>
      agentFetch(`/agent/v1/trips/${encodeURIComponent(requireId(args, "tripId"))}`, {
        method: "GET",
        host: requireHost(args),
      }),
  },
]

const server = new Server(
  { name: "travel-calendar", version: "0.1.0" },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolRegistry.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const tool = toolRegistry.find((entry) => entry.name === name)
  try {
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`)
    }
    const data = await tool.call(args ?? {})
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      isError: true,
      content: [{ type: "text", text: message }],
    }
  }
})

if (isProcessEntry()) {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
