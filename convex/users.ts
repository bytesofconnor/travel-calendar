import { v } from "convex/values"

import { query } from "./_generated/server"
import { getCurrentUser } from "./lib/auth"

export const me = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
      image: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx)
      return {
        _id: user._id,
        email: user.email ?? null,
        name: user.name ?? null,
        image: user.image ?? null,
      }
    } catch {
      return null
    }
  },
})
