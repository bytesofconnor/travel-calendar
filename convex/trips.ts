import { ConvexError, v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { internalQuery, mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { requireAccess, userHasAccess } from "./access"
import { checkOwner, getCurrentUserId, getMembership, requireOwner } from "./lib/auth"
import { parseThemePack, type ThemePackId } from "../lib/theme-packs"
import { bundleItemValidator, getTripBundleForUser, listTripsForUser, serializeTrip, tripValidator } from "./lib/tripData"
import { parseSearchQuery, searchTrips } from "./lib/tripSearch"
import { themePackValidator } from "./lib/themePack"

type TripScheduleInput = {
  name: string
  startDate: string
  endDate: string
}

type CreateTripInput = TripScheduleInput & {
  displayName: string
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

function actorWrite(userId: Id<"users">, displayName: string, tripId: Id<"trips">) {
  const person = { userId, displayName }
  return {
    proposed_by: person,
    confirmed_by: person,
    pending_for: null,
    tripId,
  }
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
    const userId = await requireAccess(ctx)
    return await getTripBundleForUser(ctx, args.tripId, userId)
  },
})

export async function insertTrip(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: CreateTripInput,
  attribution?: Attribution,
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
    ...(attribution ?? {}),
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

export async function patchTrip(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: UpdateTripInput,
  attribution?: Attribution,
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
    ...(attribution ?? {}),
  })
  return { ok: true }
}

export async function archiveTrip(
  ctx: MutationCtx,
  userId: Id<"users">,
  tripId: Id<"trips">,
  attribution?: Attribution,
): Promise<UpdateTripResult> {
  const owner = await checkOwner(ctx, tripId, userId)
  if (!owner.ok) {
    return owner
  }
  await ctx.db.patch(tripId, {
    archivedAt: Date.now(),
    ...(attribution ?? {}),
  })
  return { ok: true }
}

export async function insertMember(
  ctx: MutationCtx,
  tripId: Id<"trips">,
  userId: Id<"users">,
  role: "owner" | "editor",
  displayName: string,
) {
  const name = displayName.trim()
  if (!name) {
    return { ok: false as const, error: "name_required" as const }
  }
  const existing = await getMembership(ctx, tripId, userId)
  if (existing) {
    return { ok: true as const, membershipId: existing._id }
  }
  const membershipId = await ctx.db.insert("tripMembers", {
    tripId,
    userId,
    role,
    displayName: name,
  })
  return { ok: true as const, membershipId }
}

export const create = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    displayName: v.string(),
  },
  returns: v.object({
    ...actorFields,
    tripId: v.id("trips"),
  }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const result = await createTripForUser(ctx, userId, args)
    if (result.ok) {
      return actorWrite(userId, args.displayName.trim(), result.tripId)
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

type JoinResult =
  | {
      ok: true
      tripId: Id<"trips">
      joined: "inserted" | "already_member"
      role: "owner" | "editor"
      displayName: string
    }
  | { ok: false; error: "payment_required" | "name_required" | "invite_not_found" }

type ThemeResult =
  | { ok: true; tripId: Id<"trips">; themePack: ThemePackId | null }
  | { ok: false; error: "not_found" | "invalid_pack" }

export async function joinByInvite(
  ctx: MutationCtx,
  userId: Id<"users">,
  inviteCode: string,
  displayName: string,
): Promise<JoinResult> {
  if (!(await userHasAccess(ctx, userId))) {
    return { ok: false, error: "payment_required" }
  }
  const name = displayName.trim()
  const code = inviteCode.trim().toLowerCase()
  if (!name || !code) {
    return { ok: false, error: "name_required" }
  }
  const trip = await ctx.db
    .query("trips")
    .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
    .unique()
  if (!trip) {
    return { ok: false, error: "invite_not_found" }
  }
  const existing = await getMembership(ctx, trip._id, userId)
  if (existing) {
    return {
      ok: true,
      tripId: trip._id,
      joined: "already_member",
      role: existing.role,
      displayName: existing.displayName,
    }
  }
  const inserted = await insertMember(ctx, trip._id, userId, "editor", name)
  if (!inserted.ok) {
    return { ok: false, error: "name_required" }
  }
  const membership = await getMembership(ctx, trip._id, userId)
  if (!membership) {
    throw new Error("Membership missing after insert.")
  }
  return {
    ok: true,
    tripId: trip._id,
    joined: "inserted",
    role: membership.role,
    displayName: membership.displayName,
  }
}

export async function applyThemePack(
  ctx: MutationCtx,
  userId: Id<"users">,
  tripId: Id<"trips">,
  themePack: string | null,
): Promise<ThemeResult> {
  const pack = themePack === null ? null : parseThemePack(themePack)
  if (themePack !== null && pack === null) {
    return { ok: false, error: "invalid_pack" }
  }
  const membership = await getMembership(ctx, tripId, userId)
  if (!membership) {
    return { ok: false, error: "not_found" }
  }
  const trip = await ctx.db.get(tripId)
  if (!trip) {
    return { ok: false, error: "not_found" }
  }
  await ctx.db.patch(tripId, { themePack: pack ?? undefined })
  return { ok: true, tripId, themePack: pack }
}

export const join = mutation({
  args: {
    inviteCode: v.string(),
    displayName: v.string(),
  },
  returns: v.id("trips"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const result = await joinByInvite(ctx, userId, args.inviteCode, args.displayName)
    if (result.ok) {
      return result.tripId
    }
    if (result.error === "payment_required") {
      throw new ConvexError("Payment required: lifetime access ($9.99 once)")
    }
    if (result.error === "name_required") {
      throw new Error("Invite code and display name are required.")
    }
    if (result.error === "invite_not_found") {
      throw new Error("Invite code not found.")
    }
    const unreachable: never = result.error
    throw new Error(unreachable)
  },
})

export const update = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.object({
    ...actorFields,
    tripId: v.id("trips"),
  }),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    throwUpdateFailure(await patchTrip(ctx, userId, args))
    const membership = await getMembership(ctx, args.tripId, userId)
    return actorWrite(userId, membership?.displayName ?? "", args.tripId)
  },
})

export const getForAgent = internalQuery({
  args: {
    userId: v.id("users"),
    tripId: v.string(),
  },
  returns: v.union(tripValidator, v.null()),
  handler: async (ctx, args) => {
    const tripId = ctx.db.normalizeId("trips", args.tripId)
    if (!tripId) {
      return null
    }
    const membership = await getMembership(ctx, tripId, args.userId)
    if (!membership) {
      return null
    }
    const trip = await ctx.db.get(tripId)
    if (!trip) {
      return null
    }
    return serializeTrip(trip)
  },
})

export const searchForAgent = internalQuery({
  args: {
    userId: v.id("users"),
    date: v.optional(v.string()),
    place: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  returns: v.array(tripValidator),
  handler: async (ctx, args) => {
    const parsed = parseSearchQuery({
      date: args.date,
      place: args.place,
      status: args.status,
    })
    if (!parsed.ok) {
      return []
    }
    const memberships = await ctx.db
      .query("tripMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()
    const trips = []
    const items = []
    for (const membership of memberships) {
      const trip = await ctx.db.get(membership.tripId)
      if (!trip) {
        continue
      }
      trips.push({
        id: trip._id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        ...(trip.archivedAt !== undefined ? { archivedAt: trip.archivedAt } : {}),
      })
      const tripItems = await ctx.db
        .query("tripItems")
        .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
        .collect()
      for (const item of tripItems) {
        items.push({
          tripId: trip._id,
          location: item.location,
          locationTo: item.locationTo,
          startDate: item.startDate,
          endDate: item.endDate,
        })
      }
    }
    const matches = new Set(searchTrips(trips, items, parsed.query).map((trip) => trip.id))
    const docs = []
    for (const trip of trips) {
      if (!matches.has(trip.id)) {
        continue
      }
      const doc = await ctx.db.get(trip.id as Id<"trips">)
      if (doc) {
        docs.push(serializeTrip(doc))
      }
    }
    return docs
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
    const userId = await getCurrentUserId(ctx)
    const result = await applyThemePack(ctx, userId, args.tripId, args.themePack)
    if (result.ok) {
      return null
    }
    if (result.error === "invalid_pack") {
      throw new Error("Invalid theme pack.")
    }
    throw new ConvexError("Not a member of this trip")
  },
})
