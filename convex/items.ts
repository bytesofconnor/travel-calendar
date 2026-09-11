import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { getCurrentUserId, requireMembership } from "./lib/auth"

export const create = mutation({
  args: {
    tripId: v.id("trips"),
    title: v.string(),
    notes: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    location: v.string(),
    locationTo: v.optional(v.string()),
  },
  returns: v.id("tripItems"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, args.tripId, userId)
    const title = args.title.trim()
    if (!title) {
      throw new Error("Title is required.")
    }

    return await ctx.db.insert("tripItems", {
      tripId: args.tripId,
      title,
      notes: args.notes?.trim() || undefined,
      linkLabel: args.linkLabel?.trim() || undefined,
      linkUrl: args.linkUrl?.trim() || undefined,
      startDate: args.startDate,
      endDate: args.endDate,
      location: args.location,
      locationTo: args.locationTo,
      createdBy: userId,
    })
  },
})

export const update = mutation({
  args: {
    itemId: v.id("tripItems"),
    title: v.string(),
    notes: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    location: v.string(),
    locationTo: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error("Item not found.")
    }
    await requireMembership(ctx, item.tripId)
    const title = args.title.trim()
    if (!title) {
      throw new Error("Title is required.")
    }

    await ctx.db.patch(args.itemId, {
      title,
      notes: args.notes?.trim() || undefined,
      linkLabel: args.linkLabel?.trim() || undefined,
      linkUrl: args.linkUrl?.trim() || undefined,
      startDate: args.startDate,
      endDate: args.endDate,
      location: args.location,
      locationTo: args.locationTo,
    })
    return null
  },
})

export const remove = mutation({
  args: { itemId: v.id("tripItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) {
      return null
    }
    await requireMembership(ctx, item.tripId)
    await ctx.db.delete(args.itemId)
    return null
  },
})
