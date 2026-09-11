import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"

import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type Ctx = QueryCtx | MutationCtx

export async function getCurrentUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError("Not authenticated")
  }
  return userId
}

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const userId = await getCurrentUserId(ctx)
  const user = await ctx.db.get(userId)
  if (!user) {
    throw new ConvexError("User not found")
  }
  return user
}

export async function getMembership(
  ctx: Ctx,
  tripId: Id<"trips">,
  userId: Id<"users">,
): Promise<Doc<"tripMembers"> | null> {
  return await ctx.db
    .query("tripMembers")
    .withIndex("by_trip_and_user", (q) => q.eq("tripId", tripId).eq("userId", userId))
    .unique()
}

export async function requireMembership(
  ctx: Ctx,
  tripId: Id<"trips">,
  userId?: Id<"users">,
): Promise<Doc<"tripMembers">> {
  const resolvedUserId = userId ?? (await getCurrentUserId(ctx))
  const membership = await getMembership(ctx, tripId, resolvedUserId)
  if (!membership) {
    throw new ConvexError("Not a member of this trip")
  }
  return membership
}

export async function requireOwner(
  ctx: Ctx,
  tripId: Id<"trips">,
): Promise<Doc<"tripMembers">> {
  const membership = await requireMembership(ctx, tripId)
  if (membership.role !== "owner") {
    throw new ConvexError("Owner access required")
  }
  return membership
}
