import { defineSchema, defineTable } from "convex/server"
import { authTables } from "@convex-dev/auth/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,

  trips: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    createdBy: v.id("users"),
    coverImageUrl: v.optional(v.string()),
    coverImagePhotographer: v.optional(v.string()),
    coverImageSourceUrl: v.optional(v.string()),
    coverImageQuery: v.optional(v.string()),
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
    createdBy: v.id("users"),
  })
    .index("by_trip", ["tripId"])
    .index("by_trip_and_start", ["tripId", "startDate"]),

  tripNotes: defineTable({
    tripId: v.id("trips"),
    content: v.string(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_trip", ["tripId"]),

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
  })
    .index("by_user", ["userId"])
    .index("by_key_hash", ["keyHash"]),
})
