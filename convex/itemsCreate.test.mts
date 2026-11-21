import assert from "node:assert/strict"
import test from "node:test"

import { convexTest } from "convex-test"

import { api } from "./_generated/api.js"
import schema from "./schema.ts"

const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./items.ts": () => import("./items.ts"),
}

const modes = ["flight", "train", "bus", "shuttle", "taxi", "walk"] as const

type Created = {
  planType: string
  travelMode?: string
  title: string
}

async function freshTrip() {
  const t = convexTest(schema, modules)
  const seeded = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Connor" })
    const tripId = await ctx.db.insert("trips", {
      name: "Vietnam 27",
      inviteCode: "viet27",
      startDate: "2027-06-11",
      endDate: "2027-07-02",
      createdBy: userId,
    })
    await ctx.db.insert("tripMembers", {
      tripId,
      userId,
      role: "owner",
      displayName: "Connor",
    })
    await ctx.db.insert("access", { userId, grantedAt: 1, method: "code" })
    return { userId, tripId }
  })
  return { t: t.withIdentity({ subject: seeded.userId, name: "Connor" }), tripId: seeded.tripId }
}

async function createPlan(
  t: Awaited<ReturnType<typeof freshTrip>>["t"],
  tripId: Awaited<ReturnType<typeof freshTrip>>["tripId"],
  args: Record<string, unknown>,
) {
  const created = await t.mutation(api.items.create, {
    tripId,
    startDate: "2027-06-12",
    endDate: "2027-06-12",
    location: "Hanoi",
    ...args,
  })
  const itemId = created.itemId
  const doc = await t.run(async (ctx) => ctx.db.get(itemId))
  assert.ok(doc)
  return doc
}

test("items:create stores a stay, every travel mode, a place, and a note", async () => {
  const { t, tripId } = await freshTrip()
  const stay = await createPlan(t, tripId, {
    title: "Hotel in Hanoi",
    planType: "stay",
    endDate: "2027-06-14",
    location: "Hanoi",
  })
  assert.equal(stay.planType, "stay")
  assert.equal(stay.travelMode, undefined)

  const stored: Created[] = []
  for (const mode of modes) {
    const doc = await createPlan(t, tripId, {
      title: mode === "flight" ? "Fly HAN to SGN" : `${mode} to the old quarter`,
      planType: "flight",
      travelMode: mode,
      location: "Hanoi",
      locationTo: "Ho Chi Minh City",
      ...(mode === "walk" ? {} : { flightCode: mode === "flight" ? "VN123" : "SE1" }),
    })
    stored.push({ planType: doc.planType ?? "", travelMode: doc.travelMode, title: doc.title })
  }
  assert.deepEqual(
    stored.map((item) => item.travelMode),
    [...modes],
  )
  assert.ok(stored.every((item) => item.planType === "flight"))

  const place = await createPlan(t, tripId, {
    title: "Train Street coffee",
    planType: "place",
    location: "Train Street",
  })
  assert.equal(place.planType, "place")
  assert.equal(place.travelMode, undefined)

  const note = await createPlan(t, tripId, {
    title: "Bring cash for the night train",
    planType: "note",
    location: "",
  })
  assert.equal(note.planType, "note")
  assert.equal(note.title, "Bring cash for the night train")
})

test("items:create rejects a field the schema does not know", async () => {
  const { t, tripId } = await freshTrip()
  await assert.rejects(
    () =>
      t.mutation(api.items.create, {
        tripId,
        title: "Nope",
        startDate: "2027-06-12",
        endDate: "2027-06-12",
        location: "Hanoi",
        planType: "flight",
        carrier: "SE1",
      }),
    /ArgumentValidationError|extra field|carrier/i,
  )
})
