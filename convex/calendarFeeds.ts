import { ConvexError, v } from "convex/values"

import { calendarToken, hashCalendarToken, isCalendarToken } from "../lib/calendar/token"
import { planTypeValidator } from "./lib/place"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { mutation, query } from "./_generated/server"
import { getCurrentUserId, getMembership } from "./lib/auth"

const feedItem = v.object({
  id: v.string(),
  title: v.string(),
  notes: v.optional(v.string()),
  linkLabel: v.optional(v.string()),
  linkUrl: v.optional(v.string()),
  startDate: v.string(),
  endDate: v.string(),
  location: v.string(),
  locationTo: v.optional(v.string()),
  planType: v.optional(planTypeValidator),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  startTimeZone: v.optional(v.string()),
  endTimeZone: v.optional(v.string()),
  revision: v.number(),
  updatedAt: v.number(),
})

const feedSource = v.object({
  tripId: v.string(),
  tripName: v.string(),
  tripUpdatedAt: v.number(),
  items: v.array(feedItem),
  note: v.union(
    v.object({
      content: v.string(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  ideaSourceIds: v.array(v.string()),
})

function defined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined)) as T
}

async function feedForMember(ctx: MutationCtx, tripId: Id<"trips">, userId: Id<"users">) {
  return await ctx.db
    .query("calendarFeeds")
    .withIndex("by_trip_and_user", (q) => q.eq("tripId", tripId).eq("userId", userId))
    .unique()
}

async function saveToken(
  ctx: MutationCtx,
  tripId: Id<"trips">,
  userId: Id<"users">,
  existing: { _id: Id<"calendarFeeds">; createdAt: number } | null,
) {
  const token = calendarToken()
  const tokenHash = await hashCalendarToken(token)
  const now = Date.now()
  if (existing) {
    await ctx.db.delete(existing._id)
  }
  await ctx.db.insert("calendarFeeds", {
    tripId,
    userId,
    token,
    tokenHash,
    createdAt: existing?.createdAt ?? now,
    rotatedAt: now,
  })
  return { token }
}

export async function revokeCalendarFeed(ctx: MutationCtx, tripId: Id<"trips">, userId: Id<"users">) {
  const existing = await feedForMember(ctx, tripId, userId)
  if (!existing || existing.revokedAt !== undefined) return
  await ctx.db.patch(existing._id, { revokedAt: Date.now() })
}

export const ensure = mutation({
  args: { tripId: v.id("trips") },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const membership = await getMembership(ctx, args.tripId, userId)
    if (!membership) {
      throw new ConvexError("Not a member of this trip")
    }
    const existing = await feedForMember(ctx, args.tripId, userId)
    if (existing && existing.revokedAt === undefined) {
      return { token: existing.token }
    }
    return await saveToken(ctx, args.tripId, userId, existing)
  },
})

export const reset = mutation({
  args: { tripId: v.id("trips") },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const membership = await getMembership(ctx, args.tripId, userId)
    if (!membership) {
      throw new ConvexError("Not a member of this trip")
    }
    const existing = await feedForMember(ctx, args.tripId, userId)
    return await saveToken(ctx, args.tripId, userId, existing)
  },
})

export const readByToken = query({
  args: { token: v.string() },
  returns: v.union(feedSource, v.null()),
  handler: async (ctx, args) => {
    if (!isCalendarToken(args.token)) return null
    const tokenHash = await hashCalendarToken(args.token)
    const row = await ctx.db
      .query("calendarFeeds")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique()
    if (!row || row.revokedAt !== undefined) return null
    const trip = await ctx.db.get(row.tripId)
    if (!trip || trip.archivedAt !== undefined) return null
    const membership = await getMembership(ctx, row.tripId, row.userId)
    if (!membership) return null

    const items = await ctx.db
      .query("tripItems")
      .withIndex("by_trip_and_start", (q) => q.eq("tripId", row.tripId))
      .collect()
    const ideas = await ctx.db
      .query("tripIdeas")
      .withIndex("by_trip", (q) => q.eq("tripId", row.tripId))
      .collect()
    const copied = new Set(ideas.flatMap((idea) => (idea.sourceItemId ? [idea.sourceItemId] : [])))
    const feedItems = items.filter((item) => !(item.planType === "note" && copied.has(item._id)))
    const note = await ctx.db
      .query("tripNotes")
      .withIndex("by_trip", (q) => q.eq("tripId", row.tripId))
      .unique()

    return {
      tripId: trip._id,
      tripName: trip.name,
      tripUpdatedAt: trip.updatedAt ?? trip._creationTime,
      items: feedItems.map((item) =>
        defined({
          id: item._id,
          title: item.title,
          notes: item.notes,
          linkLabel: item.linkLabel,
          linkUrl: item.linkUrl,
          startDate: item.startDate,
          endDate: item.endDate,
          location: item.location,
          locationTo: item.locationTo,
          planType: item.planType,
          startTime: item.startTime,
          endTime: item.endTime,
          startTimeZone: item.startTimeZone,
          endTimeZone: item.endTimeZone,
          revision: item.revision ?? 0,
          updatedAt: item.updatedAt ?? item._creationTime,
        }),
      ),
      note: note
        ? {
            content: note.content,
            updatedAt: note.updatedAt ?? note._creationTime,
          }
        : null,
      ideaSourceIds: [...copied],
    }
  },
})
