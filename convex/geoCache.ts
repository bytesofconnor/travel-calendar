import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

const DAY = 24 * 60 * 60 * 1000
const KEY = /^(place|weather)\|[a-z0-9 .,_:+|\-]{1,180}$/i

export const read = query({
  args: { key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { key }) => {
    if (!KEY.test(key)) return null
    const row = await ctx.db
      .query("geoCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()
    if (!row || Date.now() - row.updatedAt > DAY) return null
    return row.payload
  },
})

export const write = mutation({
  args: { key: v.string(), payload: v.string() },
  returns: v.null(),
  handler: async (ctx, { key, payload }) => {
    if (!KEY.test(key) || payload.length > 20_000) return null
    const existing = await ctx.db
      .query("geoCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()
    const updatedAt = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, { payload, updatedAt })
    } else {
      await ctx.db.insert("geoCache", { key, payload, updatedAt })
    }
    return null
  },
})
