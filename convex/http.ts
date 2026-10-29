import { httpRouter } from "convex/server"

import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { httpAction } from "./_generated/server"
import type { ActionCtx } from "./_generated/server"
import { paymentUrlForUser } from "./access"
import { auth } from "./auth"
import { parseCreateBody, parseUpdateBody } from "./lib/agentTripBody"
import { verifyStripeSignature } from "./lib/stripeWebhook"

const http = httpRouter()

auth.addHttpRoutes(http)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
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

function tripIdFromRequest(request: Request) {
  const tripId = new URL(request.url).pathname.replace(/\/+$/, "").split("/").pop()
  if (!tripId || tripId === "trips") {
    return null
  }
  return tripId
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

http.route({
  path: "/agent/v1/trips",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

http.route({
  path: "/agent/v1/access",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

http.route({
  path: "/agent/v1/access",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const resolved = await resolveAgent(ctx, request)
    if (!resolved.ok) {
      return resolved.response
    }

    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: resolved.principal.userId,
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
    const resolved = await resolveAgent(ctx, request)
    if (!resolved.ok) {
      return resolved.response
    }

    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: resolved.principal.userId,
    })
    if (!access.granted) {
      return paymentRequired(resolved.principal.userId)
    }

    const trips = await ctx.runQuery(internal.agentReads.listTrips, {
      userId: resolved.principal.userId,
    })
    return jsonResponse({ trips })
  }),
})

http.route({
  path: "/agent/v1/trips",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const resolved = await resolveAgent(ctx, request)
    if (!resolved.ok) {
      return resolved.response
    }

    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: resolved.principal.userId,
    })
    if (!access.granted) {
      return paymentRequired(resolved.principal.userId)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON." }, 400)
    }

    const parsed = parseCreateBody(body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400)
    }

    const result = await ctx.runMutation(internal.trips.createForAgent, {
      userId: resolved.principal.userId,
      name: parsed.value.name,
      startDate: parsed.value.startDate,
      endDate: parsed.value.endDate,
      displayName: parsed.value.displayName,
    })
    if (result.ok) {
      return jsonResponse({ tripId: result.tripId })
    }
    if (result.error === "payment_required") {
      return paymentRequired(resolved.principal.userId)
    }
    if (result.error === "name_required") {
      return jsonResponse({ error: "Trip name and display name are required." }, 400)
    }
    const unreachable: never = result.error
    throw new Error(unreachable)
  }),
})

http.route({
  pathPrefix: "/agent/v1/trips/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

http.route({
  pathPrefix: "/agent/v1/trips/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const resolved = await resolveAgent(ctx, request)
    if (!resolved.ok) {
      return resolved.response
    }

    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: resolved.principal.userId,
    })
    if (!access.granted) {
      return paymentRequired(resolved.principal.userId)
    }

    const tripId = tripIdFromRequest(request)
    if (!tripId) {
      return jsonResponse({ error: "tripId required" }, 400)
    }

    const bundle = await ctx.runQuery(internal.agentReads.getBundle, {
      userId: resolved.principal.userId,
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
    const resolved = await resolveAgent(ctx, request)
    if (!resolved.ok) {
      return resolved.response
    }

    const tripId = tripIdFromRequest(request)
    if (!tripId) {
      return jsonResponse({ error: "tripId required" }, 400)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: "Invalid JSON." }, 400)
    }

    const parsed = parseUpdateBody(body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400)
    }

    const result = await ctx.runMutation(internal.trips.updateForAgent, {
      userId: resolved.principal.userId,
      tripId,
      name: parsed.value.name,
      startDate: parsed.value.startDate,
      endDate: parsed.value.endDate,
    })
    if (result.ok) {
      return jsonResponse({ ok: true })
    }
    if (result.error === "name_required") {
      return jsonResponse({ error: "Trip name is required." }, 400)
    }
    if (result.error === "not_owner") {
      return jsonResponse({ error: "Owner access required" }, 403)
    }
    if (result.error === "not_found") {
      return jsonResponse({ error: "Trip not found" }, 404)
    }
    const unreachable: never = result.error
    throw new Error(unreachable)
  }),
})

export default http
