import { defineSchema, defineTable } from "convex/server"
import { authTables } from "@convex-dev/auth/server"
import { v } from "convex/values"

import { themePackValidator } from "./lib/themePack"

export default defineSchema({
  ...authTables,

  trips: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    createdBy: v.id("users"),
    archivedAt: v.optional(v.number()),
    proposedBy: v.optional(v.id("users")),
    confirmedBy: v.optional(v.id("users")),
    coverImageUrl: v.optional(v.string()),
    coverImagePhotographer: v.optional(v.string()),
    coverImageSourceUrl: v.optional(v.string()),
    coverImageQuery: v.optional(v.string()),
    themePack: v.optional(themePackValidator),
    updatedAt: v.optional(v.number()),
  })
    .index("by_invite_code", ["inviteCode"])
    .index("by_created_by", ["createdBy"]),

  tripMembers: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("editor")),
    displayName: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_trip", ["tripId"])
    .index("by_trip_and_user", ["tripId", "userId"]),

  tripItems: defineTable({
    tripId: v.id("trips"),
    title: v.string(),
    notes: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    location: v.string(),
    locationTo: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    startTimeZone: v.optional(v.string()),
    endTimeZone: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    revision: v.optional(v.number()),
    createdBy: v.id("users"),
    proposedBy: v.optional(v.id("users")),
    confirmedBy: v.optional(v.id("users")),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_and_start", ["tripId", "startDate"]),

  tripNotes: defineTable({
    tripId: v.id("trips"),
    content: v.string(),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  }).index("by_trip", ["tripId"]),

  calendarFeeds: defineTable({
    tripId: v.id("trips"),
    userId: v.id("users"),
    token: v.string(),
    tokenHash: v.string(),
    createdAt: v.number(),
    rotatedAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_trip_and_user", ["tripId", "userId"]),

  tripGapClaims: defineTable({
    tripId: v.id("trips"),
    gapId: v.string(),
    userId: v.id("users"),
    claimedAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_and_gap", ["tripId", "gapId"]),

  tripPackingItems: defineTable({
    tripId: v.id("trips"),
    label: v.string(),
    isChecked: v.boolean(),
    sortOrder: v.number(),
    createdBy: v.optional(v.id("users")),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_checked_sort", ["tripId", "isChecked", "sortOrder"]),

  access: defineTable({
    userId: v.id("users"),
    grantedAt: v.number(),
    method: v.union(v.literal("stripe"), v.literal("code")),
  }).index("by_user", ["userId"]),

  agentApiKeys: defineTable({
    userId: v.id("users"),
    name: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    confirmEnabled: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_key_hash", ["keyHash"]),

  proposals: defineTable({
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("rejected")),
    target: v.union(v.literal("trip"), v.literal("item")),
    op: v.union(v.literal("add"), v.literal("update"), v.literal("archive"), v.literal("remove")),
    tripId: v.optional(v.id("trips")),
    itemId: v.optional(v.id("tripItems")),
    proposedBy: v.id("users"),
    host: v.string(),
    summary: v.string(),
    ownerDisplayName: v.optional(v.string()),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    displayName: v.optional(v.string()),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    locationTo: v.optional(v.string()),
    confirmedBy: v.optional(v.id("users")),
    appliedTripId: v.optional(v.id("trips")),
    appliedItemId: v.optional(v.id("tripItems")),
  })
    .index("by_trip_and_status", ["tripId", "status"])
    .index("by_proposer_and_status", ["proposedBy", "status"]),
})
