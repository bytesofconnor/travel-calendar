import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import { requireMembership, requireOwner } from "./lib/auth"
import { requireAccess } from "./access"
import { getTripBundleForUser, listTripsForUser, tripValidator } from "./lib/tripData"
import { themePackValidator } from "./lib/themePack"

function generateInviteCode() {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

const memberValidator = v.object({
  _id: v.id("tripMembers"),
  tripId: v.id("trips"),
  userId: v.id("users"),
  role: v.union(v.literal("owner"), v.literal("editor")),
  displayName: v.string(),
})

export const listMine = query({
  args: {},
  returns: v.array(tripValidator),
  handler: async (ctx) => {
    const userId = await requireAccess(ctx)
    return await listTripsForUser(ctx, userId)
  },
})

export const getBundle = query({
  args: { tripId: v.id("trips") },
  returns: v.union(
    v.object({
      trip: tripValidator,
      members: v.array(memberValidator),
      items: v.array(
        v.object({
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
        }),
      ),
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
    const userId = await requireAccess(ctx)
    return await getTripBundleForUser(ctx, args.tripId, userId)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    displayName: v.string(),
  },
  returns: v.id("trips"),
  handler: async (ctx, args) => {
    const userId = await requireAccess(ctx)
    const name = args.name.trim()
    const displayName = args.displayName.trim()
    if (!name || !displayName) {
      throw new Error("Trip name and display name are required.")
    }

    let inviteCode = generateInviteCode()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await ctx.db
        .query("trips")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
        .unique()
      if (!existing) {
        break
      }
      inviteCode = generateInviteCode()
    }

    const tripId = await ctx.db.insert("trips", {
      name,
      inviteCode,
      startDate: args.startDate,
      endDate: args.endDate,
      createdBy: userId,
    })

    await ctx.db.insert("tripMembers", {
      tripId,
      userId,
      role: "owner",
      displayName,
    })

    await ctx.db.insert("tripNotes", {
      tripId,
      content: "",
      updatedBy: userId,
    })

    return tripId
  },
})

export const join = mutation({
  args: {
    inviteCode: v.string(),
    displayName: v.string(),
  },
  returns: v.id("trips"),
  handler: async (ctx, args) => {
    const userId = await requireAccess(ctx)
    const displayName = args.displayName.trim()
    const inviteCode = args.inviteCode.trim().toLowerCase()
    if (!displayName || !inviteCode) {
      throw new Error("Invite code and display name are required.")
    }

    const trip = await ctx.db
      .query("trips")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
      .unique()

    if (!trip) {
      throw new Error("Invite code not found.")
    }

    const existing = await ctx.db
      .query("tripMembers")
      .withIndex("by_trip_and_user", (q) => q.eq("tripId", trip._id).eq("userId", userId))
      .unique()

    if (existing) {
      return trip._id
    }

    await ctx.db.insert("tripMembers", {
      tripId: trip._id,
      userId,
      role: "editor",
      displayName,
    })

    return trip._id
  },
})

export const update = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.tripId)
    await ctx.db.patch(args.tripId, {
      name: args.name.trim(),
      startDate: args.startDate,
      endDate: args.endDate,
    })
    return null
  },
})

export const updateCover = mutation({
  args: {
    tripId: v.id("trips"),
    coverImageUrl: v.optional(v.string()),
    coverImagePhotographer: v.optional(v.string()),
    coverImageSourceUrl: v.optional(v.string()),
    coverImageQuery: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.tripId)
    const { tripId, ...cover } = args
    await ctx.db.patch(tripId, cover)
    return null
  },
})

export const setThemePack = mutation({
  args: {
    tripId: v.id("trips"),
    themePack: v.union(themePackValidator, v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.tripId)
    await ctx.db.patch(args.tripId, {
      themePack: args.themePack ?? undefined,
    })
    return null
  },
})
