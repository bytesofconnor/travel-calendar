import assert from "node:assert/strict"
import test from "node:test"

import { convexTest } from "convex-test"

import { api } from "./_generated/api.js"
import schema from "./schema.ts"

const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./ideas.ts": () => import("./ideas.ts"),
}

async function seed() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const connor = await ctx.db.insert("users", { name: "Connor" })
    const caitlin = await ctx.db.insert("users", { name: "Caitlin" })
    const alex = await ctx.db.insert("users", { name: "Alex" })
    const tripId = await ctx.db.insert("trips", {
      name: "Vietnam 27",
      inviteCode: "viet27idea",
      startDate: "2027-06-11",
      endDate: "2027-07-02",
      createdBy: connor,
    })
    for (const [userId, displayName, role] of [
      [connor, "Connor", "owner"],
      [caitlin, "Caitlin", "editor"],
      [alex, "Alex", "editor"],
    ] as const) {
      await ctx.db.insert("tripMembers", { tripId, userId, role, displayName })
    }
    const noteId = await ctx.db.insert("tripItems", {
      tripId,
      title: "Night market",
      startDate: "2027-06-20",
      endDate: "2027-06-20",
      location: "",
      planType: "note",
      createdBy: connor,
    })
    return { connor, caitlin, alex, tripId, noteId }
  })
  return {
    ids,
    connor: t.withIdentity({ subject: ids.connor, name: "Connor" }),
    caitlin: t.withIdentity({ subject: ids.caitlin, name: "Caitlin" }),
    t,
  }
}

test("an idea has no date, a second person can go, and the day keeps the note", async () => {
  const { connor, caitlin, t, ids } = await seed()
  const { tripId, noteId } = ids
  const ideaId = await connor.mutation(api.ideas.add, {
    tripId,
    text: "Ha Long overnight cruise",
    linkUrl: " https://example.com/halong ",
  })
  const added = await t.run(async (ctx) => ctx.db.get(ideaId))
  assert.ok(added)
  assert.equal(added.text, "Ha Long overnight cruise")
  assert.equal(added.linkUrl, "https://example.com/halong")
  assert.equal(added.status, "open")
  assert.equal(added.suggestedDate, undefined)
  assert.equal(added.suggestedBy, ids.connor)

  const afterConnor = await connor.mutation(api.ideas.toggleGo, { ideaId })
  const afterCaitlin = await caitlin.mutation(api.ideas.toggleGo, { ideaId })
  assert.equal(afterConnor.length, 1)
  assert.equal(afterCaitlin.length, 2)

  const placed = await caitlin.mutation(api.ideas.putOnDay, {
    ideaId,
    title: "Ha Long overnight cruise",
    startDate: "2027-06-20",
    endDate: "2027-06-20",
    location: "Ha Long Bay",
    planType: "place",
    attendeeIds: afterCaitlin,
  })
  const idea = await t.run(async (ctx) => ctx.db.get(ideaId))
  const item = await t.run(async (ctx) => ctx.db.get(placed.itemId))
  const note = await t.run(async (ctx) => ctx.db.get(noteId))
  assert.equal(idea?.status, "placed")
  assert.equal(idea?.placedItemId, placed.itemId)
  assert.equal(item?.planType, "place")
  assert.equal(item?.title, "Ha Long overnight cruise")
  assert.ok(item?.attendeeIds?.includes(afterCaitlin[0]!))
  assert.ok(item?.attendeeIds?.includes(afterCaitlin[1]!))
  assert.equal(note?.planType, "note")
  assert.equal(note?.title, "Night market")
  const still = await connor.mutation(api.ideas.toggleGo, { ideaId })
  assert.deepEqual(still, afterCaitlin)
})

test("putOnDay rejects a person who is not on the trip", async () => {
  const { connor, t, ids } = await seed()
  const ideaId = await connor.mutation(api.ideas.add, { tripId: ids.tripId, text: "Cooking class" })
  const stranger = await t.run(async (ctx) => ctx.db.insert("users", { name: "Stranger" }))
  await assert.rejects(
    () =>
      connor.mutation(api.ideas.putOnDay, {
        ideaId,
        title: "Cooking class",
        startDate: "2027-06-21",
        endDate: "2027-06-21",
        location: "Hanoi",
        attendeeIds: [stranger],
      }),
    /Not a member/,
  )
})

test("migrateTrip copies each note once and does not delete it", async () => {
  const { connor, t, ids } = await seed()
  const { tripId, noteId } = ids
  const first = await connor.mutation(api.ideas.migrateTrip, { tripId })
  const second = await connor.mutation(api.ideas.migrateTrip, { tripId })
  assert.equal(first, 1)
  assert.equal(second, 0)
  const rows = await t.run(async (ctx) =>
    ctx.db
      .query("tripIdeas")
      .withIndex("by_source", (q) => q.eq("sourceItemId", noteId))
      .collect(),
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.text, "Night market")
  assert.equal(rows[0]?.suggestedDate, "2027-06-20")
  assert.equal(rows[0]?.status, "open")
  const note = await t.run(async (ctx) => ctx.db.get(noteId))
  assert.equal(note?.title, "Night market")
})
