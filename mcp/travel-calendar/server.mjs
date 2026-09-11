#!/usr/bin/env node
/**
 * Travel Calendar MCP sketch — read-only trip tools (lifetime access required).
 *
 * Env:
 *   TRAVEL_CALENDAR_SITE_URL  e.g. https://determined-anaconda-212.convex.site
 *   TRAVEL_CALENDAR_API_KEY   tc_... personal key from agentKeys:createForUser
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

const siteUrl = (process.env.TRAVEL_CALENDAR_SITE_URL ?? "").replace(/\/$/, "")
const apiKey = process.env.TRAVEL_CALENDAR_API_KEY ?? ""

if (!siteUrl || !apiKey) {
  console.error(
    "Missing TRAVEL_CALENDAR_SITE_URL or TRAVEL_CALENDAR_API_KEY. See mcp/travel-calendar/README.md",
  )
  process.exit(1)
}

async function agentFetch(path) {
  const response = await fetch(`${siteUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
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

    throw new Error(`Unknown tool: ${name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      isError: true,
      content: [{ type: "text", text: message }],
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
