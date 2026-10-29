import { v } from "convex/values"

import type { Id } from "./_generated/dataModel"
import { internalMutation, internalQuery, mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { apiKeyPrefix, generateApiKey, sha256Hex } from "./lib/apiKeys"
import { getCurrentUserId } from "./lib/auth"

const keyMetaValidator = v.object({
  _id: v.id("agentApiKeys"),
  name: v.string(),
  keyPrefix: v.string(),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
})

export const listMine = query({
  args: {},
  returns: v.array(keyMetaValidator),
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    const keys = await ctx.db
      .query("agentApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    return keys
      .map((key) => ({
        _id: key._id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const create = mutation({
  args: { name: v.string() },
  returns: v.object({
    keyId: v.id("agentApiKeys"),
    key: v.string(),
    keyPrefix: v.string(),
  }),
  handler: async (ctx, args) => {
    // Keys may be created before payment; trip reads return 402 until access is granted.
    const userId = await getCurrentUserId(ctx)
    return await createKeyForUser(ctx, userId, args.name)
  },
})

/** CLI bootstrap: `npx convex run agentKeys:createForUser '{"userId":"...","name":"mcp"}'` */
export const createForUser = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  returns: v.object({
    keyId: v.id("agentApiKeys"),
    key: v.string(),
    keyPrefix: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error("User not found")
    }
    return await createKeyForUser(ctx, args.userId, args.name)
  },
})

export const revoke = mutation({
  args: { keyId: v.id("agentApiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const key = await ctx.db.get(args.keyId)
    if (!key || key.userId !== userId) {
      throw new Error("API key not found")
    }
    await ctx.db.delete(args.keyId)
    return null
  },
})

export const resolveBearer = internalQuery({
  args: { bearerToken: v.string() },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      keyId: v.id("agentApiKeys"),
      confirmEnabled: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const token = args.bearerToken.trim()
    if (!token.startsWith("tc_")) {
      return null
    }
    const keyHash = await sha256Hex(token)
    const key = await ctx.db
      .query("agentApiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", keyHash))
      .unique()
    if (!key) {
      return null
    }
    return {
      userId: key.userId,
      keyId: key._id,
      confirmEnabled: key.confirmEnabled === true,
    }
  },
})

export const touchLastUsed = internalMutation({
  args: { keyId: v.id("agentApiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { lastUsedAt: Date.now() })
    return null
  },
})

/** CLI: `npx convex run agentKeys:revokeById '{"keyId":"..."}'` */
export const revokeById = internalMutation({
  args: { keyId: v.id("agentApiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId)
    if (key) {
      await ctx.db.delete(args.keyId)
    }
    return null
  },
})

async function createKeyForUser(ctx: MutationCtx, userId: Id<"users">, name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error("Name is required")
  }

  const key = generateApiKey()
  const keyHash = await sha256Hex(key)
  const keyId = await ctx.db.insert("agentApiKeys", {
    userId,
    name: trimmed,
    keyPrefix: apiKeyPrefix(key),
    keyHash,
    createdAt: Date.now(),
    confirmEnabled: false,
  })

  return { keyId, key, keyPrefix: apiKeyPrefix(key) }
}
