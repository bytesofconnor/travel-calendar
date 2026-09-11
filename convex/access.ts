import { ConvexError, v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { getCurrentUserId } from "./lib/auth"

type Ctx = QueryCtx | MutationCtx

/** Paywall is on when Stripe Payment Link is configured on the Convex deployment. */
export function isAccessRequired() {
  return Boolean(process.env.STRIPE_PAYMENT_LINK?.trim())
}

export function paymentUrlForUser(userId: Id<"users">) {
  const base = process.env.STRIPE_PAYMENT_LINK?.trim()
  if (!base) return null
  const joiner = base.includes("?") ? "&" : "?"
  return `${base}${joiner}client_reference_id=${userId}`
}

export async function userHasAccess(ctx: Ctx, userId: Id<"users">) {
  if (!isAccessRequired()) {
    return true
  }
  const row = await ctx.db
    .query("access")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique()
  return row !== null
}

export async function requireAccess(ctx: Ctx, userId?: Id<"users">) {
  const resolvedUserId = userId ?? (await getCurrentUserId(ctx))
  if (await userHasAccess(ctx, resolvedUserId)) {
    return resolvedUserId
  }
  throw new ConvexError("Payment required: lifetime access ($9.99 once)")
}

async function grantAccess(
  ctx: MutationCtx,
  userId: Id<"users">,
  method: "stripe" | "code",
) {
  const existing = await ctx.db
    .query("access")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique()

  if (existing) {
    return existing._id
  }

  return await ctx.db.insert("access", {
    userId,
    grantedAt: Date.now(),
    method,
  })
}

export const hasAccess = query({
  args: {},
  returns: v.object({
    required: v.boolean(),
    granted: v.boolean(),
    paymentUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    const required = isAccessRequired()
    if (!required) {
      return { required: false, granted: true, paymentUrl: null }
    }
    const granted = await userHasAccess(ctx, userId)
    return {
      required: true,
      granted,
      paymentUrl: granted ? null : paymentUrlForUser(userId),
    }
  },
})

export const grantByCode = mutation({
  args: { code: v.string() },
  returns: v.object({ granted: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const raw = process.env.BYPASS_CODES ?? ""
    const valid = raw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
    const code = args.code.trim().toUpperCase()
    if (!code || !valid.includes(code)) {
      throw new ConvexError("Invalid code")
    }
    await grantAccess(ctx, userId, "code")
    return { granted: true }
  },
})

export const grantFromStripe = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      console.error("Stripe grant: user not found", args.userId)
      return null
    }
    await grantAccess(ctx, args.userId, "stripe")
    return null
  },
})

export const checkForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    required: v.boolean(),
    granted: v.boolean(),
    paymentUrl: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const required = isAccessRequired()
    if (!required) {
      return { required: false, granted: true, paymentUrl: null }
    }
    const granted = await userHasAccess(ctx, args.userId)
    return {
      required: true,
      granted,
      paymentUrl: granted ? null : paymentUrlForUser(args.userId),
    }
  },
})
