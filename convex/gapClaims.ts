import { ConvexError, v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { internalMutation, mutation } from "./_generated/server"
import { getCurrentUserId, getMembership } from "./lib/auth"
import { isGapId } from "../lib/trip-home/detect.ts"

type ClaimResult =
  | {
      ok: true
      response: {
        tripId: Id<"trips">
        gapId: string
        claimed: boolean
        userId: Id<"users">
        displayName: string
      }
    }
  | { ok: false; error: "not_found" | "invalid_gap" }

export async function setGapClaim(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: { tripId: string; gapId: string; claimed: boolean },
): Promise<ClaimResult> {
  if (!isGapId(input.gapId)) return { ok: false, error: "invalid_gap" }
  const tripId = ctx.db.normalizeId("trips", input.tripId)
  if (!tripId) return { ok: false, error: "not_found" }
  const membership = await getMembership(ctx, tripId, userId)
  if (!membership) return { ok: false, error: "not_found" }

  const existing = await ctx.db
    .query("tripGapClaims")
    .withIndex("by_trip_and_gap", (q) => q.eq("tripId", tripId).eq("gapId", input.gapId))
    .unique()

  if (!input.claimed) {
    if (existing && existing.userId === userId) await ctx.db.delete(existing._id)
    return {
      ok: true,
      response: {
        tripId,
        gapId: input.gapId,
        claimed: false,
        userId,
        displayName: membership.displayName,
      },
    }
  }

  if (existing?.userId === userId) {
    return {
      ok: true,
      response: {
        tripId,
        gapId: input.gapId,
        claimed: true,
        userId,
        displayName: membership.displayName,
      },
    }
  }

  if (existing) await ctx.db.delete(existing._id)
  await ctx.db.insert("tripGapClaims", {
    tripId,
    gapId: input.gapId,
    userId,
    claimedAt: Date.now(),
  })
  return {
    ok: true,
    response: {
      tripId,
      gapId: input.gapId,
      claimed: true,
      userId,
      displayName: membership.displayName,
    },
  }
}

const claimReturn = v.object({
  tripId: v.id("trips"),
  gapId: v.string(),
  claimed: v.boolean(),
  userId: v.id("users"),
  displayName: v.string(),
})

export const set = mutation({
  args: {
    tripId: v.id("trips"),
    gapId: v.string(),
    claimed: v.boolean(),
  },
  returns: claimReturn,
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const result = await setGapClaim(ctx, userId, args)
    if (!result.ok) {
      throw new ConvexError(result.error === "invalid_gap" ? "Invalid gap." : "Not a member of this trip")
    }
    return result.response
  },
})

export const setForAgent = internalMutation({
  args: {
    userId: v.id("users"),
    tripId: v.string(),
    gapId: v.string(),
    claimed: v.boolean(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), response: claimReturn }),
    v.object({
      ok: v.literal(false),
      error: v.union(v.literal("not_found"), v.literal("invalid_gap")),
    }),
  ),
  handler: async (ctx, args) => {
    return await setGapClaim(ctx, args.userId, args)
  },
})
