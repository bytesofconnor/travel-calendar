#!/usr/bin/env node
/**
 * Travel Calendar MCP server.
 *
 * Env:
 *   TRAVEL_CALENDAR_SITE_URL  e.g. https://determined-anaconda-212.convex.site
 *   TRAVEL_CALENDAR_API_KEY   tc_... personal key from agentKeys:createForUser
 */

import { realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

const siteUrl = (process.env.TRAVEL_CALENDAR_SITE_URL ?? "").replace(/\/$/, "")
const apiKey = process.env.TRAVEL_CALENDAR_API_KEY ?? ""

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

async function agentFetch(path, init) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
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

export async function createTrip(input) {
  if (
    typeof input?.name !== "string" ||
    typeof input?.startDate !== "string" ||
    typeof input?.endDate !== "string" ||
    typeof input?.displayName !== "string"
  ) {
    throw new Error("Invalid trip fields.")
  }
  return await agentFetch("/agent/v1/trips", {
    method: "POST",
    body: {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      displayName: input.displayName,
    },
  })
}

export async function updateTrip(input) {
  if (typeof input?.tripId !== "string" || !input.tripId.trim()) {
    throw new Error("tripId is required")
  }
  if (
    typeof input.name !== "string" ||
    typeof input.startDate !== "string" ||
    typeof input.endDate !== "string"
  ) {
    throw new Error("Invalid trip fields.")
  }
  return await agentFetch(`/agent/v1/trips/${encodeURIComponent(input.tripId.trim())}`, {
    method: "PUT",
    body: {
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  })
}

const server = new Server(
  { name: "travel-calendar", version: "0.1.0" },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "check_access",
      description:
        "Check whether lifetime access is granted. If payment is required, returns a Stripe paymentUrl agents can open/complete ($9.99 once).",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "list_trips",
      description:
        "List trips the authenticated Travel Calendar user can access (read-only). Requires lifetime access.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_trip_bundle",
      description:
        "Load a trip bundle: trip metadata, members, calendar items, notes, and packing list (read-only). Requires lifetime access.",
      inputSchema: {
        type: "object",
        properties: {
          tripId: {
            type: "string",
            description: "Convex trip document id",
          },
        },
        required: ["tripId"],
        additionalProperties: false,
      },
    },
    {
      name: "create_trip",
      description:
        "Create a trip for the API key's user. Requires lifetime access. displayName is stored on the owner membership, not taken from the API key label. Returns tripId for get_trip_bundle. A second call creates a second trip.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          startDate: { type: "string", description: "Start date, YYYY-MM-DD" },
          endDate: { type: "string", description: "End date, YYYY-MM-DD" },
          displayName: {
            type: "string",
            description: "Name stored on the owner membership",
          },
        },
        required: ["name", "startDate", "endDate", "displayName"],
        additionalProperties: false,
      },
    },
    {
      name: "update_trip",
      description:
        "Replace the trip name, start date, and end date. Send all three. The API key's user must be the owner. Does not check lifetime access. The same values twice leave the same trip. Partners see the change on reload and in get_trip_bundle.",
      inputSchema: {
        type: "object",
        properties: {
          tripId: {
            type: "string",
            description: "Convex trip document id",
          },
          name: { type: "string" },
          startDate: { type: "string", description: "Start date, YYYY-MM-DD" },
          endDate: { type: "string", description: "End date, YYYY-MM-DD" },
        },
        required: ["tripId", "name", "startDate", "endDate"],
        additionalProperties: false,
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === "check_access") {
      const data = await agentFetch("/agent/v1/access")
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      }
    }

    if (name === "list_trips") {
      const data = await agentFetch("/agent/v1/trips")
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      }
    }

    if (name === "get_trip_bundle") {
      const tripId = args?.tripId
      if (typeof tripId !== "string" || !tripId.trim()) {
        throw new Error("tripId is required")
      }
      const data = await agentFetch(
        `/agent/v1/trips/${encodeURIComponent(tripId.trim())}`,
      )
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      }
    }

    if (name === "create_trip") {
      const data = await createTrip(args)
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      }
    }

    if (name === "update_trip") {
      const data = await updateTrip(args)
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      }
    }

    throw new Error(`Unknown tool: ${name}`)
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
