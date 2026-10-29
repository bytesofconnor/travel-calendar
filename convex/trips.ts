import { ConvexError, v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { requireAccess, userHasAccess } from "./access"
import { checkOwner, getCurrentUserId, requireOwner } from "./lib/auth"
import { getTripBundleForUser, listTripsForUser } from "./lib/tripData"

type TripScheduleInput = {
  name: string
  startDate: string
  endDate: string
}

type CreateTripInput = TripScheduleInput & {
  displayName: string
}

type UpdateTripInput = TripScheduleInput & {
  tripId: Id<"trips">
}

type CreateTripResult =
  | { ok: true; tripId: Id<"trips"> }
  | { ok: false; error: "name_required" | "payment_required" }

type UpdateTripResult =
  | { ok: true }
  | { ok: false; error: "name_required" | "not_found" | "not_owner" }

function generateInviteCode() {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

const tripValidator = v.object({
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
})

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

async function insertTrip(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: CreateTripInput,
): Promise<CreateTripResult> {
  const name = input.name.trim()
  const displayName = input.displayName.trim()
  if (!name || !displayName) {
    return { ok: false, error: "name_required" }
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
    startDate: input.startDate,
    endDate: input.endDate,
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

  return { ok: true, tripId }
}

async function createTripForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: CreateTripInput,
): Promise<CreateTripResult> {
  if (!(await userHasAccess(ctx, userId))) {
    return { ok: false, error: "payment_required" }
  }
  return await insertTrip(ctx, userId, input)
}

function throwUpdateFailure(result: UpdateTripResult): asserts result is { ok: true } {
  if (result.ok) {
    return
  }
  if (result.error === "name_required") {
    throw new Error("Trip name is required.")
  }
  if (result.error === "not_owner") {
    throw new ConvexError("Owner access required")
  }
  if (result.error === "not_found") {
    throw new ConvexError("Not a member of this trip")
  }
  const unreachable: never = result.error
  throw new Error(unreachable)
}

async function patchTrip(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: UpdateTripInput,
): Promise<UpdateTripResult> {
  const owner = await checkOwner(ctx, input.tripId, userId)
  if (!owner.ok) {
    return owner
  }
  const name = input.name.trim()
  if (!name) {
    return { ok: false, error: "name_required" }
  }
  await ctx.db.patch(input.tripId, {
    name,
    startDate: input.startDate,
    endDate: input.endDate,
  })
  return { ok: true }
}

export const create = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    displayName: v.string(),
  },
  returns: v.id("trips"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const result = await createTripForUser(ctx, userId, args)
    if (result.ok) {
      return result.tripId
    }
    if (result.error === "payment_required") {
      throw new ConvexError("Payment required: lifetime access ($9.99 once)")
    }
    if (result.error === "name_required") {
      throw new Error("Trip name and display name are required.")
    }
    const unreachable: never = result.error
    throw new Error(unreachable)
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
    const userId = await getCurrentUserId(ctx)
    throwUpdateFailure(await patchTrip(ctx, userId, args))
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
