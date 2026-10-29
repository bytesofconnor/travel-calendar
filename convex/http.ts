import { httpRouter } from "convex/server"

import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { httpAction } from "./_generated/server"
import type { ActionCtx } from "./_generated/server"
import { paymentUrlForUser } from "./access"
import { auth } from "./auth"
import {
  parseArchiveBody,
  parseConfirmBody,
  parseItemBody,
  parseRejectBody,
} from "./lib/agentProposalBody"
import { parseCreateBody, parseUpdateBody } from "./lib/agentTripBody"
import { parseHost } from "./lib/proposalTransition"
import { parseSearchQuery } from "./lib/tripSearch"
import { verifyStripeSignature } from "./lib/stripeWebhook"

const http = httpRouter()

auth.addHttpRoutes(http)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Travel-Calendar-Host",
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  })
}

function extractBearer(request: Request): string | null {
  const header = request.headers.get("Authorization")
  if (!header) {
    return null
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() ?? null
}

function paymentRequired(userId: Id<"users">) {
  return jsonResponse(
    {
      error: "payment_required",
      message: "Lifetime access required ($9.99 once).",
      paymentUrl: paymentUrlForUser(userId),
    },
    402,
  )
}

async function resolveAgent(ctx: ActionCtx, request: Request) {
  const token = extractBearer(request)
  if (!token) {
    return { ok: false as const, response: jsonResponse({ error: "Missing Bearer token" }, 401) }
  }

  const resolved = await ctx.runQuery(internal.agentKeys.resolveBearer, {
    bearerToken: token,
  })
  if (!resolved) {
    return { ok: false as const, response: jsonResponse({ error: "Invalid API key" }, 401) }
  }

  await ctx.runMutation(internal.agentKeys.touchLastUsed, {
    keyId: resolved.keyId,
  })

  return { ok: true as const, principal: resolved }
}

function lastSegment(request: Request) {
  const segment = new URL(request.url).pathname.replace(/\/+$/, "").split("/").pop()
  if (!segment) {
    return null
  }
  return segment
}

function options(path: string) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async () => {
      return new Response(null, { status: 204, headers: corsHeaders })
    }),
  })
}

function optionsPrefix(pathPrefix: string) {
  http.route({
    pathPrefix,
    method: "OPTIONS",
    handler: httpAction(async () => {
      return new Response(null, { status: 204, headers: corsHeaders })
    }),
  })
}

async function begin(ctx: ActionCtx, request: Request, paywall: boolean) {
  const header = request.headers.get("X-Travel-Calendar-Host")
  const host = header === null ? null : parseHost(header)
  if (!host) {
    return { ok: false as const, response: jsonResponse({ error: "host_required" }, 400) }
  }
  const resolved = await resolveAgent(ctx, request)
  if (!resolved.ok) {
    return resolved
  }
  if (paywall) {
    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: resolved.principal.userId,
    })
    if (!access.granted) {
      return { ok: false as const, response: paymentRequired(resolved.principal.userId) }
    }
  }
  return { ok: true as const, host, principal: resolved.principal }
}

async function readJson(request: Request) {
  try {
    return { ok: true as const, body: await request.json() }
  } catch {
    return { ok: false as const, response: jsonResponse({ error: "Invalid JSON." }, 400) }
  }
}

function definedArgs<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined)) as T
}

function shellResponse(
  result: { ok: true; response: unknown } | { ok: false; error: string },
  userId: Id<"users">,
) {
  if (result.ok) {
    return jsonResponse(result.response)
  }
  switch (result.error) {
    case "propose_scope":
      return jsonResponse({ error: "propose_scope" }, 403)
    case "self_confirm":
    case "no_partner":
    case "not_pending_for":
    case "wrong_tool":
    case "target_missing":
      return jsonResponse({ error: result.error }, 409)
    case "not_owner":
      return jsonResponse({ error: "Owner access required" }, 403)
    case "trip_not_found":
      return jsonResponse({ error: "Trip not found" }, 404)
    case "item_not_found":
      return jsonResponse({ error: "Item not found" }, 404)
    case "proposal_not_found":
      return jsonResponse({ error: "Proposal not found" }, 404)
    case "name_required":
      return jsonResponse({ error: "Trip name and display name are required." }, 400)
    case "trip_name_required":
      return jsonResponse({ error: "Trip name is required." }, 400)
    case "title_required":
      return jsonResponse({ error: "Title is required." }, 400)
    case "display_name_required":
      return jsonResponse({ error: "display_name_required" }, 400)
    case "payment_required":
      return paymentRequired(userId)
    case "host_required":
      return jsonResponse({ error: "host_required" }, 400)
    default:
      return jsonResponse({ error: "Invalid proposal." }, 400)
  }
}

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    if (!webhookSecret) {
      return jsonResponse({ error: "Stripe not configured." }, 503)
    }

    let rawBody: string
    try {
      rawBody = await request.text()
    } catch {
      return jsonResponse({ error: "Could not read body." }, 400)
    }

    const signature = request.headers.get("stripe-signature")
    if (!signature) {
      return jsonResponse({ error: "Missing Stripe signature." }, 400)
    }

    if (!(await verifyStripeSignature(rawBody, signature, webhookSecret))) {
      return jsonResponse({ error: "Invalid signature." }, 400)
    }

    let event: { type: string; data: { object: Record<string, unknown> } }
    try {
      event = JSON.parse(rawBody) as typeof event
    } catch {
      return jsonResponse({ error: "Invalid JSON." }, 400)
    }

    if (event.type === "checkout.session.completed") {
      const userId = event.data.object["client_reference_id"]
      if (typeof userId === "string" && userId.length > 0) {
        await ctx.runMutation(internal.access.grantFromStripe, {
          userId: userId as Id<"users">,
        })
      }
    }

    return jsonResponse({ received: true })
  }),
})

options("/agent/v1/trips")
options("/agent/v1/access")
options("/agent/v1/archive")
options("/agent/v1/confirm")
options("/agent/v1/confirm/pending")
options("/agent/v1/reject")
options("/agent/v1/items")
options("/agent/v1/search/trips")
optionsPrefix("/agent/v1/trips/")
optionsPrefix("/agent/v1/trip/")
optionsPrefix("/agent/v1/item/")

http.route({
  path: "/agent/v1/access",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, false)
    if (!opened.ok) {
      return opened.response
    }

    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: opened.principal.userId,
    })

    return jsonResponse({
      ...access,
      price: { amount: 9.99, currency: "usd", interval: "once" },
    })
  }),
})

http.route({
  path: "/agent/v1/trips",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const trips = await ctx.runQuery(internal.agentReads.listTrips, {
      userId: opened.principal.userId,
    })
    return jsonResponse({ trips })
  }),
})

http.route({
  path: "/agent/v1/trips",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const body = await readJson(request)
    if (!body.ok) {
      return body.response
    }
    const parsed = parseCreateBody(body.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400)
    }
    const result = await ctx.runMutation(internal.proposals.proposeFromAgent, {
      userId: opened.principal.userId,
      host: opened.host,
      target: "trip",
      op: "add",
      name: parsed.value.name,
      startDate: parsed.value.startDate,
      endDate: parsed.value.endDate,
      displayName: parsed.value.displayName,
    })
    return shellResponse(result, opened.principal.userId)
  }),
})

http.route({
  pathPrefix: "/agent/v1/trips/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const tripId = lastSegment(request)
    if (!tripId || tripId === "trips") {
      return jsonResponse({ error: "tripId required" }, 400)
    }
    const bundle = await ctx.runQuery(internal.agentReads.getBundle, {
      userId: opened.principal.userId,
      tripId: tripId as Id<"trips">,
    })
    if (!bundle) {
      return jsonResponse({ error: "Trip not found" }, 404)
    }
    return jsonResponse(bundle)
  }),
})

http.route({
  pathPrefix: "/agent/v1/trips/",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, false)
    if (!opened.ok) {
      return opened.response
    }
    const tripId = lastSegment(request)
    if (!tripId || tripId === "trips") {
      return jsonResponse({ error: "tripId required" }, 400)
    }
    const body = await readJson(request)
    if (!body.ok) {
      return body.response
    }
    const parsed = parseUpdateBody(body.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400)
    }
    const result = await ctx.runMutation(internal.proposals.proposeFromAgent, {
      userId: opened.principal.userId,
      host: opened.host,
      target: "trip",
      op: "update",
      tripId,
      name: parsed.value.name,
      startDate: parsed.value.startDate,
      endDate: parsed.value.endDate,
    })
    return shellResponse(result, opened.principal.userId)
  }),
})

http.route({
  pathPrefix: "/agent/v1/trip/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const tripId = lastSegment(request)
    if (!tripId || tripId === "trip") {
      return jsonResponse({ error: "tripId required" }, 400)
    }
    const trip = await ctx.runQuery(internal.trips.getForAgent, {
      userId: opened.principal.userId,
      tripId,
    })
    if (!trip) {
      return jsonResponse({ error: "Trip not found" }, 404)
    }
    return jsonResponse(trip)
  }),
})

http.route({
  path: "/agent/v1/search/trips",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const url = new URL(request.url)
    const parsed = parseSearchQuery({
      date: url.searchParams.get("date"),
      place: url.searchParams.get("place"),
      status: url.searchParams.get("status"),
    })
    if (!parsed.ok) {
      const error = parsed.error === "status_is_trip_status" ? "status_is_trip_status" : "Invalid search."
      return jsonResponse({ error }, 400)
    }
    const trips = await ctx.runQuery(
      internal.trips.searchForAgent,
      definedArgs({
        userId: opened.principal.userId,
        date: parsed.query.date,
        place: parsed.query.place,
        status: parsed.query.status,
      }),
    )
    return jsonResponse({ trips })
  }),
})

http.route({
  path: "/agent/v1/archive",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const body = await readJson(request)
    if (!body.ok) {
      return body.response
    }
    const parsed = parseArchiveBody(body.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400)
    }
    const result = await ctx.runMutation(internal.proposals.proposeFromAgent, {
      userId: opened.principal.userId,
      host: opened.host,
      target: "trip",
      op: "archive",
      tripId: parsed.value.tripId,
    })
    return shellResponse(result, opened.principal.userId)
  }),
})

http.route({
  path: "/agent/v1/confirm",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const body = await readJson(request)
    if (!body.ok) {
      return body.response
    }
    const parsed = parseConfirmBody(body.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400)
    }
    const result = await ctx.runMutation(
      internal.proposals.confirmFromAgent,
      definedArgs({
        userId: opened.principal.userId,
        proposalId: parsed.value.proposalId as Id<"proposals">,
        expected: parsed.value.target,
        displayName: parsed.value.displayName,
        host: opened.host,
        confirmEnabled: opened.principal.confirmEnabled,
      }),
    )
    return shellResponse(result, opened.principal.userId)
  }),
})

http.route({
  path: "/agent/v1/reject",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const body = await readJson(request)
    if (!body.ok) {
      return body.response
    }
    const parsed = parseRejectBody(body.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400)
    }
    const result = await ctx.runMutation(internal.proposals.rejectFromAgent, {
      userId: opened.principal.userId,
      proposalId: parsed.value.proposalId as Id<"proposals">,
      host: opened.host,
      confirmEnabled: opened.principal.confirmEnabled,
    })
    return shellResponse(result, opened.principal.userId)
  }),
})

http.route({
  path: "/agent/v1/confirm/pending",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const pending = await ctx.runQuery(internal.proposals.listPendingForAgent, {
      userId: opened.principal.userId,
    })
    return jsonResponse(pending)
  }),
})

http.route({
  path: "/agent/v1/items",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const tripId = new URL(request.url).searchParams.get("tripId")
    if (!tripId) {
      return jsonResponse({ error: "tripId required" }, 400)
    }
    const items = await ctx.runQuery(internal.items.listForAgent, {
      userId: opened.principal.userId,
      tripId,
    })
    if (!items) {
      return jsonResponse({ error: "Trip not found" }, 404)
    }
    return jsonResponse({ items })
  }),
})

http.route({
  path: "/agent/v1/items",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const body = await readJson(request)
    if (!body.ok) {
      return body.response
    }
    const parsed = parseItemBody(body.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400)
    }
    const value = parsed.value
    const result = await ctx.runMutation(
      internal.proposals.proposeFromAgent,
      definedArgs({
        userId: opened.principal.userId,
        host: opened.host,
        target: "item" as const,
        op: value.op,
        tripId: value.op === "update" ? undefined : value.tripId,
        itemId: value.op === "add" ? undefined : value.itemId,
        title: value.op === "remove" ? undefined : value.title,
        notes: value.op === "remove" ? undefined : value.notes,
        linkLabel: value.op === "remove" ? undefined : value.linkLabel,
        linkUrl: value.op === "remove" ? undefined : value.linkUrl,
        startDate: value.op === "remove" ? undefined : value.startDate,
        endDate: value.op === "remove" ? undefined : value.endDate,
        location: value.op === "remove" ? undefined : value.location,
        locationTo: value.op === "remove" ? undefined : value.locationTo,
      }),
    )
    return shellResponse(result, opened.principal.userId)
  }),
})

http.route({
  pathPrefix: "/agent/v1/item/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const opened = await begin(ctx, request, true)
    if (!opened.ok) {
      return opened.response
    }
    const itemId = lastSegment(request)
    if (!itemId || itemId === "item") {
      return jsonResponse({ error: "itemId required" }, 400)
    }
    const item = await ctx.runQuery(internal.items.getForAgent, {
      userId: opened.principal.userId,
      itemId,
    })
    if (!item) {
      return jsonResponse({ error: "Item not found" }, 404)
    }
    return jsonResponse(item)
  }),
})

export default http
