import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { internalQuery, mutation } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { getCurrentUserId, getMembership, requireMembership } from "./lib/auth"
import { bundleItemValidator, serializeItem } from "./lib/tripData"

type ItemWrite = {
  title: string
  notes?: string
  linkLabel?: string
  linkUrl?: string
  startDate: string
  endDate: string
  location: string
  locationTo?: string
}

type Attribution = {
  proposedBy: Id<"users">
  confirmedBy: Id<"users">
}

const actorFields = {
  proposed_by: v.object({
    userId: v.id("users"),
    displayName: v.string(),
  }),
  confirmed_by: v.object({
    userId: v.id("users"),
    displayName: v.string(),
  }),
  pending_for: v.null(),
}

function actorWrite(userId: Id<"users">, displayName: string, itemId: Id<"tripItems">) {
  const person = { userId, displayName }
  return {
    proposed_by: person,
    confirmed_by: person,
    pending_for: null,
    itemId,
  }
}

function trimmedItem(input: ItemWrite) {
  return {
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    linkLabel: input.linkLabel?.trim() || undefined,
    linkUrl: input.linkUrl?.trim() || undefined,
    startDate: input.startDate,
    endDate: input.endDate,
    location: input.location,
    locationTo: input.locationTo,
  }
}

export async function insertItem(
  ctx: MutationCtx,
  tripId: Id<"trips">,
  createdBy: Id<"users">,
  input: ItemWrite,
  attribution?: Attribution,
) {
  const fields = trimmedItem(input)
  if (!fields.title) {
    return { ok: false as const, error: "title_required" as const }
  }
  const itemId = await ctx.db.insert("tripItems", {
    tripId,
    ...fields,
    createdBy,
    ...(attribution ?? {}),
  })
  return { ok: true as const, itemId }
}

export async function patchItem(
  ctx: MutationCtx,
  itemId: Id<"tripItems">,
  input: ItemWrite,
  attribution?: Attribution,
) {
  const item = await ctx.db.get(itemId)
  if (!item) {
    return { ok: false as const, error: "not_found" as const }
  }
  const fields = trimmedItem(input)
  if (!fields.title) {
    return { ok: false as const, error: "title_required" as const }
  }
  await ctx.db.patch(itemId, {
    ...fields,
    ...(attribution ?? {}),
  })
  return { ok: true as const, tripId: item.tripId }
}

export async function deleteItem(ctx: MutationCtx, itemId: Id<"tripItems">) {
  const item = await ctx.db.get(itemId)
  if (!item) {
    return { ok: false as const, error: "not_found" as const }
  }
  await ctx.db.delete(itemId)
  return { ok: true as const, tripId: item.tripId }
}

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
  returns: v.object({
    ...actorFields,
    itemId: v.id("tripItems"),
  }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const membership = await requireMembership(ctx, args.tripId, userId)
    const result = await insertItem(ctx, args.tripId, userId, args)
    if (!result.ok) {
      throw new Error("Title is required.")
    }
    return actorWrite(userId, membership.displayName, result.itemId)
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
  returns: v.object({
    ...actorFields,
    itemId: v.id("tripItems"),
  }),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) {
      throw new Error("Item not found.")
    }
    const membership = await requireMembership(ctx, item.tripId)
    const { itemId, ...fields } = args
    const result = await patchItem(ctx, itemId, fields)
    if (!result.ok && result.error === "title_required") {
      throw new Error("Title is required.")
    }
    if (!result.ok) {
      throw new Error("Item not found.")
    }
    return actorWrite(membership.userId, membership.displayName, args.itemId)
  },
})

export const remove = mutation({
  args: { itemId: v.id("tripItems") },
  returns: v.union(
    v.object({
      ...actorFields,
      itemId: v.id("tripItems"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) {
      return null
    }
    const membership = await requireMembership(ctx, item.tripId)
    await deleteItem(ctx, args.itemId)
    return actorWrite(membership.userId, membership.displayName, args.itemId)
  },
})

export const listForAgent = internalQuery({
  args: {
    userId: v.id("users"),
    tripId: v.string(),
  },
  returns: v.union(v.array(bundleItemValidator), v.null()),
  handler: async (ctx, args) => {
    const tripId = ctx.db.normalizeId("trips", args.tripId)
    if (!tripId) {
      return null
    }
    const membership = await getMembership(ctx, tripId, args.userId)
    if (!membership) {
      return null
    }
    const items = await ctx.db
      .query("tripItems")
      .withIndex("by_trip_and_start", (q) => q.eq("tripId", tripId))
      .collect()
    return items.map((item) => serializeItem(item))
  },
})

export const getForAgent = internalQuery({
  args: {
    userId: v.id("users"),
    itemId: v.string(),
  },
  returns: v.union(bundleItemValidator, v.null()),
  handler: async (ctx, args) => {
    const itemId = ctx.db.normalizeId("tripItems", args.itemId)
    if (!itemId) {
      return null
    }
    const item = await ctx.db.get(itemId)
    if (!item) {
      return null
    }
    const membership = await getMembership(ctx, item.tripId, args.userId)
    if (!membership) {
      return null
    }
    return serializeItem(item)
  },
})
