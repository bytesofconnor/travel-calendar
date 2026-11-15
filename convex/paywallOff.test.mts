import assert from "node:assert/strict"
import { register } from "node:module"
import test from "node:test"

const registered = register(new URL("../mcp/travel-calendar/resolveTsHook.mjs", import.meta.url), {
  parentURL: import.meta.url,
})
if (registered instanceof Promise) {
  await registered
}

const { createTripForUser, insertTrip, joinByInvite, patchTrip } = await import("./trips.ts")

type Row = Record<string, unknown> & { _id: string; _creationTime: number }

function memoryDb() {
  const tables = new Map<string, Map<string, Row>>()
  let clock = 1

  function rows(table: string) {
    let bucket = tables.get(table)
    if (!bucket) {
      bucket = new Map()
      tables.set(table, bucket)
    }
    return bucket
  }

  function tableOf(id: string) {
    const splitAt = id.indexOf("_")
    return splitAt > 0 ? id.slice(0, splitAt) : null
  }

  return {
    insert(table: string, value: Record<string, unknown>) {
      const id = `${table}_${clock}`
      const doc = { ...value, _id: id, _creationTime: clock } as Row
      clock += 1
      rows(table).set(id, doc)
      return id
    },
    get(id: string) {
      const table = tableOf(id)
      const doc = table ? rows(table).get(id) : undefined
      return doc ? { ...doc } : null
    },
    patch(id: string, fields: Record<string, unknown>) {
      const table = tableOf(id)
      const doc = table ? rows(table).get(id) : undefined
      if (!doc) {
        throw new Error(`db.patch missing ${id}`)
      }
      Object.assign(doc, fields)
    },
    query(table: string) {
      return {
        withIndex(_index: string, build: (query: { eq: (field: string, value: unknown) => unknown }) => void) {
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq(field: string, value: unknown) {
              filters.push([field, value])
              return chain
            },
          }
          build(chain)
          const found = [...rows(table).values()].filter((row) =>
            filters.every(([field, value]) => row[field] === value),
          )
          return {
            async unique() {
              if (found.length > 1) {
                throw new Error(`db.unique ${table} matched ${found.length}`)
              }
              return found[0] ? { ...found[0] } : null
            },
          }
        },
      }
    },
  }
}

function tripCtx() {
  return { db: memoryDb() } as Parameters<typeof createTripForUser>[0]
}

const owner = "users_owner" as never
const partner = "users_partner" as never

async function withEnv(paywall: string | undefined, run: () => Promise<void>) {
  const previousFlag = process.env.PAYWALL_ENABLED
  const previousLink = process.env.STRIPE_PAYMENT_LINK
  process.env.STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test"
  if (paywall === undefined) {
    delete process.env.PAYWALL_ENABLED
  } else {
    process.env.PAYWALL_ENABLED = paywall
  }
  try {
    await run()
  } finally {
    if (previousFlag === undefined) {
      delete process.env.PAYWALL_ENABLED
    } else {
      process.env.PAYWALL_ENABLED = previousFlag
    }
    if (previousLink === undefined) {
      delete process.env.STRIPE_PAYMENT_LINK
    } else {
      process.env.STRIPE_PAYMENT_LINK = previousLink
    }
  }
}

test(
  "a non-paying user can create and edit a trip and invite a partner",
  { concurrency: false },
  async () => {
    await withEnv(undefined, async () => {
      const ctx = tripCtx()
      const created = await createTripForUser(ctx, owner, {
        name: "Family trip",
        startDate: "2026-12-01",
        endDate: "2026-12-08",
        displayName: "Connor",
      })
      assert.equal(created.ok, true)
      if (!created.ok) {
        return
      }

      const edited = await patchTrip(ctx, owner, {
        tripId: created.tripId,
        name: "Coast trip",
        startDate: "2026-12-02",
        endDate: "2026-12-09",
      })
      assert.equal(edited.ok, true)

      const trip = await ctx.db.get(created.tripId)
      assert.equal(trip?.name, "Coast trip")
      assert.equal(trip?.startDate, "2026-12-02")
      assert.equal(trip?.endDate, "2026-12-09")
      assert.equal(typeof trip?.inviteCode, "string")

      const joined = await joinByInvite(ctx, partner, String(trip?.inviteCode), "Alex")
      assert.equal(joined.ok, true)
      if (!joined.ok) {
        return
      }
      assert.equal(joined.tripId, created.tripId)
      assert.equal(joined.joined, "inserted")
      assert.equal(joined.role, "editor")
      assert.equal(joined.displayName, "Alex")
    })
  },
)

test(
  "PAYWALL_ENABLED true still blocks a user with no access row",
  { concurrency: false },
  async () => {
    await withEnv("true", async () => {
      const ctx = tripCtx()
      const created = await createTripForUser(ctx, owner, {
        name: "Family trip",
        startDate: "2026-12-01",
        endDate: "2026-12-08",
        displayName: "Connor",
      })
      assert.equal(created.ok, false)
      if (created.ok) {
        return
      }
      assert.equal(created.error, "payment_required")

      const seeded = await insertTrip(ctx, owner, {
        name: "Family trip",
        startDate: "2026-12-01",
        endDate: "2026-12-08",
        displayName: "Connor",
      })
      assert.equal(seeded.ok, true)
      if (!seeded.ok) {
        return
      }
      const trip = await ctx.db.get(seeded.tripId)
      const joined = await joinByInvite(ctx, partner, String(trip?.inviteCode), "Alex")
      assert.equal(joined.ok, false)
      if (joined.ok) {
        return
      }
      assert.equal(joined.error, "payment_required")
    })
  },
)
