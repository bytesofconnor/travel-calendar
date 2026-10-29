import { v } from "convex/values"

import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { parseThemePack } from "../../lib/theme-packs"
import { themePackValidator } from "./themePack"

export const tripValidator = v.object({
  _id: v.id("trips"),
  name: v.string(),
  inviteCode: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  createdBy: v.id("users"),
  _creationTime: v.number(),
  coverImageUrl: v.optional(v.string()),
  coverImagePhotographer: v.optional(v.string()),
  coverImageSourceUrl: v.optional(v.string()),
  coverImageQuery: v.optional(v.string()),
  themePack: v.union(themePackValidator, v.null()),
  archivedAt: v.optional(v.number()),
  proposedBy: v.optional(v.id("users")),
  confirmedBy: v.optional(v.id("users")),
})

export const bundleItemValidator = v.object({
  _id: v.id("tripItems"),
  tripId: v.id("trips"),
  title: v.string(),
  notes: v.optional(v.string()),
  linkLabel: v.optional(v.string()),
  linkUrl: v.optional(v.string()),
  startDate: v.string(),
  endDate: v.string(),
  location: v.string(),
  locationTo: v.optional(v.string()),
  createdBy: v.id("users"),
  _creationTime: v.number(),
  proposedBy: v.optional(v.id("users")),
  confirmedBy: v.optional(v.id("users")),
})

export function serializeTrip(trip: Doc<"trips">) {
  return {
    _id: trip._id,
    name: trip.name,
    inviteCode: trip.inviteCode,
    startDate: trip.startDate,
    endDate: trip.endDate,
    createdBy: trip.createdBy,
    _creationTime: trip._creationTime,
    coverImageUrl: trip.coverImageUrl,
    coverImagePhotographer: trip.coverImagePhotographer,
    coverImageSourceUrl: trip.coverImageSourceUrl,
    coverImageQuery: trip.coverImageQuery,
    themePack: parseThemePack(trip.themePack),
    ...(trip.archivedAt !== undefined ? { archivedAt: trip.archivedAt } : {}),
    ...(trip.proposedBy ? { proposedBy: trip.proposedBy } : {}),
    ...(trip.confirmedBy ? { confirmedBy: trip.confirmedBy } : {}),
  }
}

export function serializeItem(item: Doc<"tripItems">) {
  return {
    _id: item._id,
    tripId: item.tripId,
    title: item.title,
    notes: item.notes,
    linkLabel: item.linkLabel,
    linkUrl: item.linkUrl,
    startDate: item.startDate,
    endDate: item.endDate,
    location: item.location,
    locationTo: item.locationTo,
    createdBy: item.createdBy,
    _creationTime: item._creationTime,
    ...(item.proposedBy ? { proposedBy: item.proposedBy } : {}),
    ...(item.confirmedBy ? { confirmedBy: item.confirmedBy } : {}),
  }
}

export async function listTripsForUser(ctx: QueryCtx, userId: Id<"users">) {
  const memberships = await ctx.db
    .query("tripMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect()

  const trips: Array<ReturnType<typeof serializeTrip>> = []
  for (const membership of memberships) {
    const trip = await ctx.db.get(membership.tripId)
    if (trip && trip.archivedAt === undefined) {
      trips.push(serializeTrip(trip))
    }
  }

  trips.sort((a, b) => a.startDate.localeCompare(b.startDate))
  return trips
}

export async function getTripBundleForUser(
  ctx: QueryCtx,
  tripId: Id<"trips">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("tripMembers")
    .withIndex("by_trip_and_user", (q) => q.eq("tripId", tripId).eq("userId", userId))
    .unique()

  if (!membership) {
    return null
  }

  const trip = await ctx.db.get(tripId)
  if (!trip) {
    return null
  }

  const members = await ctx.db
    .query("tripMembers")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .collect()

  const items = await ctx.db
    .query("tripItems")
    .withIndex("by_trip_and_start", (q) => q.eq("tripId", tripId))
    .collect()

  const note = await ctx.db
    .query("tripNotes")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .unique()

  const packingItems = await ctx.db
    .query("tripPackingItems")
    .withIndex("by_trip", (q) => q.eq("tripId", tripId))
    .collect()

  return {
    trip: serializeTrip(trip),
    members: members.map((member) => ({
      _id: member._id,
      tripId: member.tripId,
      userId: member.userId,
      role: member.role,
      displayName: member.displayName,
    })),
    items: items.map((item) => serializeItem(item)),
    note: note
      ? {
          _id: note._id,
          tripId: note.tripId,
          content: note.content,
          updatedBy: note.updatedBy,
          _creationTime: note._creationTime,
        }
      : null,
    packingItems: packingItems.map((item) => ({
      _id: item._id,
      tripId: item.tripId,
      label: item.label,
      isChecked: item.isChecked,
      sortOrder: item.sortOrder,
      createdBy: item.createdBy,
      updatedBy: item.updatedBy,
      _creationTime: item._creationTime,
    })),
  }
}
