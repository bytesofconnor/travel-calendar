import { v } from "convex/values"

import { internalQuery } from "./_generated/server"
import { bundleItemValidator, getTripBundleForUser, listTripsForUser, tripValidator } from "./lib/tripData"

export const listTrips = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(tripValidator),
  handler: async (ctx, args) => {
    return await listTripsForUser(ctx, args.userId)
  },
})

export const getBundle = internalQuery({
  args: {
    userId: v.id("users"),
    tripId: v.id("trips"),
  },
  returns: v.union(
    v.object({
      trip: tripValidator,
      members: v.array(
        v.object({
          _id: v.id("tripMembers"),
          tripId: v.id("trips"),
          userId: v.id("users"),
          role: v.union(v.literal("owner"), v.literal("editor")),
          displayName: v.string(),
        }),
      ),
      items: v.array(bundleItemValidator),
      note: v.union(
        v.object({
          _id: v.id("tripNotes"),
          tripId: v.id("trips"),
          content: v.string(),
          updatedBy: v.optional(v.id("users")),
          _creationTime: v.number(),
        }),
        v.null(),
      ),
      packingItems: v.array(
        v.object({
          _id: v.id("tripPackingItems"),
          tripId: v.id("trips"),
          label: v.string(),
          isChecked: v.boolean(),
          sortOrder: v.number(),
          createdBy: v.optional(v.id("users")),
          updatedBy: v.optional(v.id("users")),
          _creationTime: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await getTripBundleForUser(ctx, args.tripId, args.userId)
  },
})
