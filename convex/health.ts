import { v } from "convex/values"

import { query } from "./_generated/server"

/** Smoke-test query used during migration scaffolding. */
export const ping = query({
  args: {},
  returns: v.object({
    ok: v.boolean(),
    now: v.number(),
  }),
  handler: async () => {
    return { ok: true, now: Date.now() }
  },
})
