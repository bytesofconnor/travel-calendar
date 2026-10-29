import assert from "node:assert/strict"
import { register } from "node:module"
import test from "node:test"

const registered = register(new URL("./resolveTsHook.mjs", import.meta.url), {
  parentURL: import.meta.url,
})
if (registered instanceof Promise) {
  await registered
}

const { parseJoinBody, parseThemeBody } = await import("../../convex/lib/agentTripBody.ts")
const { getTripBundleForUser } = await import("../../convex/lib/tripData.ts")
const { parseHost } = await import("../../convex/lib/proposalTransition.ts")
const { applyThemePack, joinByInvite } = await import("../../convex/trips.ts")

process.env.TRAVEL_CALENDAR_SITE_URL = "https://example.convex.site"
process.env.TRAVEL_CALENDAR_API_KEY = "tc_test"

const { getTripBundle, tripsJoin, tripsSetThemePack } = await import("./server.mjs")

type Key = {
  token: string
  userId: string
  confirmEnabled: boolean
}

type MemberSeed = {
  userId: string
  role: "owner" | "editor"
  displayName: string
}

type ItemSeed = {
  title: string
  startDate: string
  endDate: string
  location: string
  createdBy: string
}

type TripSeed = {
  name: string
  inviteCode: string
  startDate: string
  endDate: string
  createdBy: string
  themePack?: string
  members: MemberSeed[]
  items?: ItemSeed[]
}

type Stored = Record<string, unknown> & { _id: string; _creationTime: number }

const indexFields: Record<string, Record<string, readonly string[]>> = {
  trips: {
    by_invite_code: ["inviteCode"],
    by_created_by: ["createdBy"],
  },
  tripMembers: {
    by_user: ["userId"],
    by_trip: ["tripId"],
    by_trip_and_user: ["tripId", "userId"],
  },
  tripItems: {
    by_trip: ["tripId"],
    by_trip_and_start: ["tripId", "startDate"],
  },
  tripNotes: {
    by_trip: ["tripId"],
  },
  tripPackingItems: {
    by_trip: ["tripId"],
    by_trip_checked_sort: ["tripId", "isChecked", "sortOrder"],
  },
  access: {
    by_user: ["userId"],
  },
  proposals: {
    by_trip_and_status: ["tripId", "status"],
    by_proposer_and_status: ["proposedBy", "status"],
  },
  agentApiKeys: {
    by_user: ["userId"],
    by_key_hash: ["keyHash"],
  },
  users: {},
}

function definedFields(value: Record<string, unknown>) {
  const doc: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(value)) {
    if (field !== undefined) {
      doc[key] = field
    }
  }
  return doc
}

function compareField(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right
  }
  return String(left ?? "").localeCompare(String(right ?? ""))
}

function createMemoryDb() {
  const tables = new Map<string, Map<string, Stored>>()
  let clock = 1

  function rows(tableName: string) {
    let table = tables.get(tableName)
    if (!table) {
      table = new Map()
      tables.set(tableName, table)
    }
    return table
  }

  function tableNameOf(id: string) {
    const splitAt = id.indexOf("_")
    if (splitAt <= 0) {
      return null
    }
    return id.slice(0, splitAt)
  }

  return {
    insert(tableName: string, value: Record<string, unknown>) {
      const id = `${tableName}_${clock}`
      const doc = { ...definedFields(value), _id: id, _creationTime: clock } as Stored
      clock += 1
      rows(tableName).set(id, doc)
      return id
    },
    get(id: string) {
      if (typeof id !== "string") {
        return null
      }
      const tableName = tableNameOf(id)
      if (!tableName) {
        return null
      }
      const doc = rows(tableName).get(id)
      return doc ? { ...doc } : null
    },
    patch(id: string, fields: Record<string, unknown>) {
      const tableName = typeof id === "string" ? tableNameOf(id) : null
      const doc = tableName ? rows(tableName).get(id) : undefined
      if (!doc) {
        throw new Error(`db.patch missing ${id}`)
      }
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) {
          delete doc[key]
        } else {
          doc[key] = value
        }
      }
    },
    delete(id: string) {
      const tableName = typeof id === "string" ? tableNameOf(id) : null
      const table = tableName ? rows(tableName) : undefined
      if (!table?.delete(id)) {
        throw new Error(`db.delete missing ${id}`)
      }
    },
    replace() {
      throw new Error("db.replace is not implemented")
    },
    normalizeId(tableName: string, id: string) {
      if (typeof id !== "string" || !id.startsWith(`${tableName}_`)) {
        return null
      }
      return id
    },
    query(tableName: string) {
      return {
        withIndex(indexName: string, build: (query: { eq: (field: string, value: unknown) => unknown }) => void) {
          const fields = indexFields[tableName]?.[indexName]
          if (!fields) {
            throw new Error(`db index ${tableName}.${indexName} is not implemented`)
          }
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq(field: string, value: unknown) {
              filters.push([field, value])
              return chain
            },
          }
          build(chain)
          if (filters.length === 0 || filters.length > fields.length) {
            throw new Error(`db index ${tableName}.${indexName} eq count ${filters.length}`)
          }
          for (let index = 0; index < filters.length; index += 1) {
            if (filters[index]?.[0] !== fields[index]) {
              throw new Error(`db index ${tableName}.${indexName} field ${filters[index]?.[0]}`)
            }
          }
          const matched = () => {
            const found = [...rows(tableName).values()].filter((row) =>
              filters.every(([field, value]) => row[field] === value),
            )
            const rest = fields.slice(filters.length)
            found.sort((left, right) => {
              for (const field of rest) {
                const order = compareField(left[field], right[field])
                if (order !== 0) {
                  return order
                }
              }
              return left._creationTime - right._creationTime
            })
            return found.map((row) => ({ ...row }))
          }
          return {
            async unique() {
              const found = matched()
              if (found.length > 1) {
                throw new Error(`db.unique ${tableName}.${indexName} matched ${found.length}`)
              }
              return found[0] ?? null
            },
            async collect() {
              return matched()
            },
            first() {
              throw new Error("db.first is not implemented")
            },
            take() {
              throw new Error("db.take is not implemented")
            },
          }
        },
        filter() {
          throw new Error("db.query.filter is not implemented")
        },
        collect() {
          throw new Error("db.query.collect is not implemented")
        },
        unique() {
          throw new Error("db.query.unique is not implemented")
        },
      }
    },
  }
}

function header(init: RequestInit | undefined, name: string) {
  const headers = init?.headers
  if (!headers) {
    return null
  }
  if (headers instanceof Headers) {
    return headers.get(name)
  }
  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === name.toLowerCase())
    return found?.[1] ?? null
  }
  const key = Object.keys(headers).find((entry) => entry.toLowerCase() === name.toLowerCase())
  return key ? headers[key] : null
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function readJson(init: RequestInit | undefined) {
  if (typeof init?.body !== "string") {
    return { ok: false as const, response: jsonResponse({ error: "Invalid JSON." }, 400) }
  }
  try {
    return { ok: true as const, body: JSON.parse(init.body) as unknown }
  } catch {
    return { ok: false as const, response: jsonResponse({ error: "Invalid JSON." }, 400) }
  }
}

export function createAgentBundleHarness(options: { keys: Key[]; trips?: TripSeed[] }) {
  const db = createMemoryDb()
  const tripIds: string[] = []
  for (const trip of options.trips ?? []) {
    const tripId = db.insert("trips", {
      name: trip.name,
      inviteCode: trip.inviteCode,
      startDate: trip.startDate,
      endDate: trip.endDate,
      createdBy: trip.createdBy,
      ...(trip.themePack ? { themePack: trip.themePack } : {}),
    })
    tripIds.push(tripId)
    for (const member of trip.members) {
      db.insert("tripMembers", {
        tripId,
        userId: member.userId,
        role: member.role,
        displayName: member.displayName,
      })
    }
    db.insert("tripNotes", {
      tripId,
      content: "",
      updatedBy: trip.createdBy,
    })
    for (const item of trip.items ?? []) {
      db.insert("tripItems", {
        tripId,
        title: item.title,
        startDate: item.startDate,
        endDate: item.endDate,
        location: item.location,
        createdBy: item.createdBy,
      })
    }
  }

  const ctx = { db } as Parameters<typeof joinByInvite>[0]

  async function fetch(input: RequestInfo | URL, init?: RequestInit) {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
    const path = url.pathname.replace(/\/+$/, "")
    const method = init?.method ?? "GET"
    const hostHeader = header(init, "x-travel-calendar-host")
    const host = hostHeader === null ? null : parseHost(hostHeader)
    if (!host) {
      return jsonResponse({ error: "host_required" }, 400)
    }
    const authorization = header(init, "authorization")
    const match = authorization ? /^Bearer\s+(.+)$/i.exec(authorization.trim()) : null
    const token = match?.[1]?.trim()
    const key = options.keys.find((entry) => entry.token === token)
    if (!key) {
      return jsonResponse({ error: "Invalid API key" }, 401)
    }
    const userId = key.userId

    if (method === "POST" && path === "/agent/v1/join") {
      const body = await readJson(init)
      if (!body.ok) {
        return body.response
      }
      const parsed = parseJoinBody(body.body)
      if (!parsed.ok) {
        return jsonResponse({ error: parsed.error }, 400)
      }
      const result = await joinByInvite(ctx, userId as never, parsed.value.inviteCode, parsed.value.displayName)
      if (!result.ok) {
        if (result.error === "payment_required") {
          return jsonResponse(
            {
              error: "payment_required",
              message: "Lifetime access required ($9.99 once).",
              paymentUrl: null,
            },
            402,
          )
        }
        if (result.error === "invite_not_found") {
          return jsonResponse({ error: "Invite code not found." }, 404)
        }
        return jsonResponse({ error: "Invite code and display name are required." }, 400)
      }
      return jsonResponse({
        tripId: result.tripId,
        joined: result.joined,
        role: result.role,
        displayName: result.displayName,
      })
    }

    if (method === "POST" && path === "/agent/v1/theme") {
      const body = await readJson(init)
      if (!body.ok) {
        return body.response
      }
      const parsed = parseThemeBody(body.body)
      if (!parsed.ok) {
        return jsonResponse({ error: parsed.error }, 400)
      }
      const tripId = ctx.db.normalizeId("trips", parsed.value.tripId)
      if (!tripId) {
        return jsonResponse({ error: "Trip not found" }, 404)
      }
      const result = await applyThemePack(ctx, userId as never, tripId, parsed.value.themePack)
      if (!result.ok) {
        if (result.error === "not_found") {
          return jsonResponse({ error: "Trip not found" }, 404)
        }
        return jsonResponse({ error: "Invalid theme fields." }, 400)
      }
      return jsonResponse({ tripId: result.tripId, themePack: result.themePack })
    }

    if (method === "GET" && path.startsWith("/agent/v1/trips/")) {
      const tripId = path.split("/").pop()
      if (!tripId || tripId === "trips") {
        return jsonResponse({ error: "tripId required" }, 400)
      }
      const bundle = await getTripBundleForUser(ctx, tripId as never, userId as never)
      if (!bundle) {
        return jsonResponse({ error: "Trip not found" }, 404)
      }
      return jsonResponse(bundle)
    }

    return jsonResponse({ error: "Not found" }, 404)
  }

  return { fetch, tripIds }
}

const keys = [
  { token: "tc_ada", userId: "users_ada", confirmEnabled: false },
  { token: "tc_bea", userId: "users_bea", confirmEnabled: false },
  { token: "tc_cam", userId: "users_cam", confirmEnabled: false },
]

function lisbonTrip(): TripSeed {
  return {
    name: "Lisbon",
    inviteCode: "abc",
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    createdBy: "users_ada",
    themePack: "golden-hour",
    members: [{ userId: "users_ada", role: "owner", displayName: "Ada" }],
  }
}

type Bundle = {
  trip: { name: string; themePack: string | null }
  members: Array<{ userId: string; role: string; displayName: string }>
}

async function withFetch(token: string, run: (tripId: string) => Promise<void>) {
  const previous = process.env.TRAVEL_CALENDAR_API_KEY
  process.env.TRAVEL_CALENDAR_API_KEY = token
  const harness = createAgentBundleHarness({ keys, trips: [lisbonTrip()] })
  const original = globalThis.fetch
  globalThis.fetch = harness.fetch as typeof fetch
  try {
    const tripId = harness.tripIds[0]
    assert.ok(tripId)
    await run(tripId)
  } finally {
    globalThis.fetch = original
    if (previous === undefined) {
      delete process.env.TRAVEL_CALENDAR_API_KEY
    } else {
      process.env.TRAVEL_CALENDAR_API_KEY = previous
    }
  }
}

function editorsNamed(bundle: Bundle, userId: string) {
  return bundle.members.filter((member) => member.userId === userId)
}

test("trips_join then get_trip_bundle shows the new editor once", async () => {
  await withFetch("tc_bea", async (tripId) => {
    const joined = await tripsJoin({ host: "grok", inviteCode: "AbC", displayName: "Bea" })
    assert.equal(joined.joined, "inserted")
    assert.equal(joined.role, "editor")
    assert.equal(joined.displayName, "Bea")
    assert.equal(joined.tripId, tripId)
    assert.equal(Object.hasOwn(joined, "proposed_by"), false)
    assert.equal(Object.hasOwn(joined, "confirmed_by"), false)
    assert.equal(Object.hasOwn(joined, "pending_for"), false)
    const bundle = (await getTripBundle({ host: "grok", tripId })) as Bundle
    const bea = editorsNamed(bundle, "users_bea")
    assert.equal(bea.length, 1)
    assert.equal(bea[0]?.role, "editor")
    assert.equal(bea[0]?.displayName, "Bea")
    assert.equal(bundle.members.length, 2)
  })
})

test("a second trips_join keeps the stored name, role, and one membership", async () => {
  await withFetch("tc_bea", async (tripId) => {
    await tripsJoin({ host: "grok", inviteCode: "abc", displayName: "Bea" })
    const again = await tripsJoin({ host: "grok", inviteCode: "abc", displayName: "Cam" })
    assert.equal(again.joined, "already_member")
    assert.equal(again.role, "editor")
    assert.equal(again.displayName, "Bea")
    const bundle = (await getTripBundle({ host: "grok", tripId })) as Bundle
    const bea = editorsNamed(bundle, "users_bea")
    assert.equal(bea.length, 1)
    assert.equal(bea[0]?.role, "editor")
    assert.equal(bea[0]?.displayName, "Bea")
    assert.equal(bundle.members.length, 2)
  })
})

test("trips_set_theme_pack then get_trip_bundle shows the pack", async () => {
  await withFetch("tc_ada", async (tripId) => {
    const updated = await tripsSetThemePack({ host: "grok", tripId, themePack: "dusk-rose" })
    assert.deepEqual(updated, { tripId, themePack: "dusk-rose" })
    assert.equal(Object.hasOwn(updated, "proposed_by"), false)
    assert.equal(Object.hasOwn(updated, "confirmed_by"), false)
    assert.equal(Object.hasOwn(updated, "pending_for"), false)
    const bundle = (await getTripBundle({ host: "grok", tripId })) as Bundle
    assert.equal(bundle.trip.themePack, "dusk-rose")
  })
})

test("trips_set_theme_pack null clears the pack in get_trip_bundle", async () => {
  await withFetch("tc_ada", async (tripId) => {
    await tripsSetThemePack({ host: "grok", tripId, themePack: "coastal-infra" })
    const cleared = await tripsSetThemePack({ host: "grok", tripId, themePack: null })
    assert.deepEqual(cleared, { tripId, themePack: null })
    const bundle = (await getTripBundle({ host: "grok", tripId })) as Bundle
    assert.equal(bundle.trip.themePack, null)
  })
})

test("a non-member trips_set_theme_pack leaves the pack and surfaces Trip not found", async () => {
  await withFetch("tc_cam", async (tripId) => {
    await assert.rejects(() => tripsSetThemePack({ host: "grok", tripId, themePack: "sage-coast" }), {
      message: "Trip not found",
    })
    process.env.TRAVEL_CALENDAR_API_KEY = "tc_ada"
    const bundle = (await getTripBundle({ host: "grok", tripId })) as Bundle
    assert.equal(bundle.trip.themePack, "golden-hour")
    assert.equal(bundle.trip.name, "Lisbon")
  })
})
