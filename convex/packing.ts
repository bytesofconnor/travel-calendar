import { v } from "convex/values"

import { mutation } from "./_generated/server"
import { getCurrentUserId, requireMembership } from "./lib/auth"

export const add = mutation({
  args: {
    tripId: v.id("trips"),
    label: v.string(),
  },
  returns: v.id("tripPackingItems"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, args.tripId, userId)
    const label = args.label.trim()
    if (!label) {
      throw new Error("Label is required.")
    }

    const existing = await ctx.db
      .query("tripPackingItems")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect()
    const sortOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1

    return await ctx.db.insert("tripPackingItems", {
      tripId: args.tripId,
      label,
      isChecked: false,
      sortOrder,
      createdBy: userId,
      updatedBy: userId,
    })
  },
})

export const addMany = mutation({
  args: {
    tripId: v.id("trips"),
    labels: v.array(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, args.tripId, userId)

    const existing = await ctx.db
      .query("tripPackingItems")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect()
    let sortOrder = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1)
    let created = 0

    for (const raw of args.labels) {
      const label = raw.trim()
      if (!label) continue
      sortOrder += 1
      await ctx.db.insert("tripPackingItems", {
        tripId: args.tripId,
        label,
        isChecked: false,
        sortOrder,
        createdBy: userId,
        updatedBy: userId,
      })
      created += 1
    }

    return created
  },
})

export const toggle = mutation({
  args: {
    itemId: v.id("tripPackingItems"),
    isChecked: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error("Item not found.")
    }
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, item.tripId, userId)
    await ctx.db.patch(args.itemId, {
      isChecked: args.isChecked,
      updatedBy: userId,
    })
    return null
  },
})

export const rename = mutation({
  args: {
    itemId: v.id("tripPackingItems"),
    label: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error("Item not found.")
    }
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, item.tripId, userId)
    const label = args.label.trim()
    if (!label) {
      await ctx.db.delete(args.itemId)
      return null
    }
    await ctx.db.patch(args.itemId, { label, updatedBy: userId })
    return null
  },
})

export const remove = mutation({
  args: { itemId: v.id("tripPackingItems") },
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
