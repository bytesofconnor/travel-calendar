import { ConvexError, v } from "convex/values"

import { storedAttendeeIds } from "../lib/attendees"
import type { Id } from "./_generated/dataModel"
import type { Doc } from "./_generated/dataModel"
import { mutation } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { insertItem } from "./items"
import { getCurrentUserId, requireMembership } from "./lib/auth"
import { geoPlaceValidator, travelModeValidator } from "./lib/place"

const planType = v.union(v.literal("stay"), v.literal("flight"), v.literal("place"))

async function memberIds(ctx: MutationCtx, tripId: Id<"trips">) {
  const members = await ctx.db
    .query("tripMembers")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .collect()
  return members.map((member) => member.userId)
}

async function ideaForSource(ctx: MutationCtx, sourceItemId: Id<"tripItems">) {
  const rows = await ctx.db
    .query("tripIdeas")
    .withIndex("by_source", (q) => q.eq("sourceItemId", sourceItemId))
    .take(1)
  return rows[0] ?? null
}

async function copyNote(ctx: MutationCtx, tripId: Id<"trips">, item: Doc<"tripItems">) {
  if (item.tripId !== tripId || item.planType !== "note") return null
  const text = item.title.trim()
  if (!text) return null
  const existing = await ideaForSource(ctx, item._id)
  if (existing) return existing._id
  const linkUrl = item.linkUrl?.trim()
  return await ctx.db.insert("tripIdeas", {
    tripId,
    text,
    ...(linkUrl ? { linkUrl } : {}),
    suggestedBy: item.createdBy,
    goUserIds: [],
    status: "open",
    suggestedDate: item.startDate,
    sourceItemId: item._id,
    createdAt: Date.now(),
  })
}

export const add = mutation({
  args: {
    tripId: v.id("trips"),
    text: v.string(),
    linkUrl: v.optional(v.string()),
  },
  returns: v.id("tripIdeas"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, args.tripId, userId)
    const text = args.text.trim()
    if (!text) throw new Error("Write an idea first.")
    const linkUrl = args.linkUrl?.trim()
    return await ctx.db.insert("tripIdeas", {
      tripId: args.tripId,
      text,
      ...(linkUrl ? { linkUrl } : {}),
      suggestedBy: userId,
      goUserIds: [],
      status: "open",
      createdAt: Date.now(),
    })
  },
})

export const toggleGo = mutation({
  args: { ideaId: v.id("tripIdeas") },
  returns: v.array(v.id("users")),
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId)
    if (!idea) throw new Error("Idea not found.")
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, idea.tripId, userId)
    if (idea.status !== "open") return idea.goUserIds
    const goUserIds = idea.goUserIds.includes(userId)
      ? idea.goUserIds.filter((id) => id !== userId)
      : [...idea.goUserIds, userId]
    await ctx.db.patch(idea._id, { goUserIds })
    return goUserIds
  },
})

export const ensureFromNote = mutation({
  args: {
    tripId: v.id("trips"),
    sourceItemId: v.id("tripItems"),
  },
  returns: v.id("tripIdeas"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, args.tripId, userId)
    const item = await ctx.db.get(args.sourceItemId)
    if (!item) throw new Error("Note not found.")
    const ideaId = await copyNote(ctx, args.tripId, item)
    if (!ideaId) throw new Error("Note not found.")
    return ideaId
  },
})

export const migrateTrip = mutation({
  args: { tripId: v.id("trips") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, args.tripId, userId)
    const items = await ctx.db
      .query("tripItems")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect()
    let created = 0
    for (const item of items) {
      if (item.planType !== "note") continue
      const before = await ideaForSource(ctx, item._id)
      const ideaId = await copyNote(ctx, args.tripId, item)
      if (ideaId && !before) created += 1
    }
    return created
  },
})

export const putOnDay = mutation({
  args: {
    ideaId: v.id("tripIdeas"),
    title: v.string(),
    notes: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    location: v.string(),
    locationTo: v.optional(v.string()),
    planType: v.optional(planType),
    travelMode: v.optional(travelModeValidator),
    place: v.optional(v.union(geoPlaceValidator, v.null())),
    placeTo: v.optional(v.union(geoPlaceValidator, v.null())),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    startTimeZone: v.optional(v.string()),
    endTimeZone: v.optional(v.string()),
    confirmation: v.optional(v.string()),
    flightCode: v.optional(v.string()),
    address: v.optional(v.string()),
    attendeeIds: v.optional(v.array(v.id("users"))),
  },
  returns: v.object({
    ideaId: v.id("tripIdeas"),
    itemId: v.id("tripItems"),
  }),
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId)
    if (!idea) throw new Error("Idea not found.")
    const userId = await getCurrentUserId(ctx)
    await requireMembership(ctx, idea.tripId, userId)
    if (idea.status === "placed" && idea.placedItemId) {
      return { ideaId: idea._id, itemId: idea.placedItemId }
    }
    if (idea.status !== "open") throw new Error("This idea is already on a day.")
    const members = await memberIds(ctx, idea.tripId)
    const requested = args.attendeeIds ?? []
    const allowed = new Set(members)
    for (const id of requested) {
      if (!allowed.has(id)) throw new ConvexError("Not a member of this trip")
    }
    const attendees = storedAttendeeIds(requested, members)
    const result = await insertItem(
      ctx,
      idea.tripId,
      userId,
      {
        title: args.title,
        notes: args.notes,
        linkLabel: args.linkLabel,
        linkUrl: args.linkUrl,
        startDate: args.startDate,
        endDate: args.endDate,
        location: args.location,
        locationTo: args.locationTo,
        planType: args.planType ?? "place",
        travelMode: args.travelMode,
        place: args.place,
        placeTo: args.placeTo,
        startTime: args.startTime,
        endTime: args.endTime,
        startTimeZone: args.startTimeZone,
        endTimeZone: args.endTimeZone,
        confirmation: args.confirmation,
        flightCode: args.flightCode,
        address: args.address,
        attendeeIds: attendees ?? null,
      },
      { proposedBy: userId, confirmedBy: userId },
    )
    if (!result.ok) throw new Error("Title is required.")
    await ctx.db.patch(idea._id, { status: "placed", placedItemId: result.itemId })
    return { ideaId: idea._id, itemId: result.itemId }
  },
})
