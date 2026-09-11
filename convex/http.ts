import { httpRouter } from "convex/server"

import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { httpAction } from "./_generated/server"
import { paymentUrlForUser } from "./access"
import { auth } from "./auth"
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
    const token = extractBearer(request)
    if (!token) {
      return jsonResponse({ error: "Missing Bearer token" }, 401)
    }

    const resolved = await ctx.runQuery(internal.agentKeys.resolveBearer, {
      bearerToken: token,
    })
    if (!resolved) {
      return jsonResponse({ error: "Invalid API key" }, 401)
    }

    await ctx.runMutation(internal.agentKeys.touchLastUsed, {
      keyId: resolved.keyId,
    })

    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: resolved.userId,
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
    const token = extractBearer(request)
    if (!token) {
      return jsonResponse({ error: "Missing Bearer token" }, 401)
    }

    const resolved = await ctx.runQuery(internal.agentKeys.resolveBearer, {
      bearerToken: token,
    })
    if (!resolved) {
      return jsonResponse({ error: "Invalid API key" }, 401)
    }

    await ctx.runMutation(internal.agentKeys.touchLastUsed, {
      keyId: resolved.keyId,
    })

    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: resolved.userId,
    })
    if (!access.granted) {
      return paymentRequired(resolved.userId)
    }

    const trips = await ctx.runQuery(internal.agentReads.listTrips, {
      userId: resolved.userId,
    })
    return jsonResponse({ trips })
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
    const token = extractBearer(request)
    if (!token) {
      return jsonResponse({ error: "Missing Bearer token" }, 401)
    }

    const resolved = await ctx.runQuery(internal.agentKeys.resolveBearer, {
      bearerToken: token,
    })
    if (!resolved) {
      return jsonResponse({ error: "Invalid API key" }, 401)
    }

    await ctx.runMutation(internal.agentKeys.touchLastUsed, {
      keyId: resolved.keyId,
    })

    const access = await ctx.runQuery(internal.access.checkForUser, {
      userId: resolved.userId,
    })
    if (!access.granted) {
      return paymentRequired(resolved.userId)
    }

    const url = new URL(request.url)
    const tripId = url.pathname.replace(/\/+$/, "").split("/").pop()

    if (!tripId || tripId === "trips") {
      return jsonResponse({ error: "tripId required" }, 400)
    }

    const bundle = await ctx.runQuery(internal.agentReads.getBundle, {
      userId: resolved.userId,
      tripId: tripId as Id<"trips">,
    })

    if (!bundle) {
      return jsonResponse({ error: "Trip not found" }, 404)
    }

    return jsonResponse(bundle)
  }),
})

export default http
