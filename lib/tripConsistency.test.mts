import assert from "node:assert/strict"
import { register } from "node:module"
import test from "node:test"

import type { ItemInput, SharedTrip } from "./shared-trip.ts"

const registered = register(new URL("../mcp/travel-calendar/resolveTsHook.mjs", import.meta.url), {
  parentURL: import.meta.url,
})
if (registered instanceof Promise) {
  await registered
}

const {
  addItem,
  deleteItem,
  editItem,
  listTrips,
  readMember,
  saveSharedNote,
  saveTripDates,
  seedSharedTrip,
} = await import("./trip-pair.ts")

const tripName = "Lisbon with you"
const originalEnd = "2026-05-20"
const shiftedEnd = "2026-05-08"

const place: ItemInput = {
  title: "Time Out Market",
  startDate: "2026-05-12",
  endDate: "2026-05-12",
  location: "Cais do Sodre",
}

const stay: ItemInput = {
  title: "Alfama apartment",
  startDate: "2026-05-10",
  endDate: "2026-05-18",
  location: "Alfama",
}

const flight: ItemInput = {
  title: "TAP",
  startDate: "2026-05-01",
  endDate: "2026-05-01",
  location: "SFO",
  locationTo: "LIS",
}

function item(trip: SharedTrip, title: string) {
  return trip.items.find((entry) => entry.title === title)
}

async function bothReadSameTrip(db: Parameters<typeof readMember>[0], ownerId: string, partnerId: string, tripId: string) {
  const owner = await readMember(db, ownerId, tripId)
  const partner = await readMember(db, partnerId, tripId)
  const partnerReload = await readMember(db, partnerId, tripId)
  assert.ok(owner)
  assert.ok(partner)
  assert.ok(partnerReload)
  assert.equal(owner.viewerRole, "owner")
  assert.equal(partner.viewerRole, "editor")
  assert.deepEqual(owner.trip, partner.trip)
  assert.deepEqual(partnerReload.trip, partner.trip)
  const ownerList = await listTrips(db, ownerId)
  const partnerList = await listTrips(db, partnerId)
  assert.deepEqual(ownerList, partnerList)
  assert.deepEqual(ownerList, [
    { name: owner.trip.name, startDate: owner.trip.startDate, endDate: owner.trip.endDate },
  ])
  return owner.trip
}

test("both members read the same trip after dates, places, and plans change", async () => {
  const { db, ownerId, partnerId, tripId } = await seedSharedTrip()

  const created = await bothReadSameTrip(db, ownerId, partnerId, tripId)
  assert.equal(created.name, tripName)
  assert.equal(created.startDate, "2026-05-01")
  assert.equal(created.endDate, originalEnd)
  assert.deepEqual(created.items, [])
  assert.equal(created.note, "")
  assert.deepEqual(
    created.members.map((member) => member.displayName).sort(),
    ["Avery", "Blair"],
  )

  await addItem(db, partnerId, tripId, place)
  await addItem(db, ownerId, tripId, stay)
  await addItem(db, ownerId, tripId, flight)
  const withPlans = await bothReadSameTrip(db, ownerId, partnerId, tripId)
  assert.equal(item(withPlans, "Time Out Market")?.location, "Cais do Sodre")
  assert.equal(item(withPlans, "TAP")?.locationTo, "LIS")
  assert.equal(item(withPlans, "Alfama apartment")?.endDate, "2026-05-18")

  await editItem(db, ownerId, item(withPlans, "Time Out Market")!.id, {
    ...place,
    location: "Market hall",
  })
  const edited = await bothReadSameTrip(db, ownerId, partnerId, tripId)
  assert.equal(item(edited, "Time Out Market")?.location, "Market hall")

  await saveTripDates(db, ownerId, tripId, tripName, "2026-05-01", shiftedEnd)
  const shifted = await bothReadSameTrip(db, ownerId, partnerId, tripId)
  assert.equal(shifted.endDate, shiftedEnd)
  const stayAfter = item(shifted, "Alfama apartment")
  const placeAfter = item(shifted, "Time Out Market")
  const flightAfter = item(shifted, "TAP")
  assert.ok(stayAfter && placeAfter && flightAfter)
  assert.ok(stayAfter.startDate > shifted.endDate)
  assert.ok(placeAfter.startDate > shifted.endDate)
  assert.equal(flightAfter.locationTo, "LIS")

  await deleteItem(db, ownerId, placeAfter.id)
  const removed = await bothReadSameTrip(db, ownerId, partnerId, tripId)
  assert.equal(item(removed, "Time Out Market"), undefined)
  assert.ok(item(removed, "Alfama apartment"))
  assert.ok(item(removed, "TAP"))

  await saveSharedNote(db, ownerId, tripId, "Meet at the lockbox")
  const noted = await bothReadSameTrip(db, ownerId, partnerId, tripId)
  assert.equal(noted.note, "Meet at the lockbox")
  assert.equal(noted.endDate, shiftedEnd)
  assert.ok(item(noted, "Alfama apartment")!.startDate > noted.endDate)
})

test("a partner cannot change trip dates and both members still read the owner's dates", async () => {
  const { db, ownerId, partnerId, tripId } = await seedSharedTrip()
  const before = await bothReadSameTrip(db, ownerId, partnerId, tripId)

  await assert.rejects(
    () => saveTripDates(db, partnerId, tripId, "Renamed", "2026-05-02", "2026-05-03"),
    /Owner access required/,
  )

  const after = await bothReadSameTrip(db, ownerId, partnerId, tripId)
  assert.deepEqual(after, before)
})

test("someone who has not joined does not read the trip", async () => {
  const { db, tripId } = await seedSharedTrip()
  db.insert("access", { userId: "stranger", grantedAt: 1, method: "code" })
  assert.equal(await readMember(db, "stranger", tripId), null)
})
