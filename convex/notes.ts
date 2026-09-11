import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { getCurrentUserId, requireMembership } from "./lib/auth"

export const save = mutation({
  args: {
    tripId: v.id("trips"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, args.tripId, userId)

    const existing = await ctx.db
      .query("tripNotes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedBy: userId,
      })
    } else {
      await ctx.db.insert("tripNotes", {
        tripId: args.tripId,
        content: args.content,
        updatedBy: userId,
      })
    }

    return null
  },
})
