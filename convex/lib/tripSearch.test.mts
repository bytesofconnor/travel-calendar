import assert from "node:assert/strict"
import test from "node:test"

import { searchTrips, type SearchItem, type SearchTrip } from "./tripSearch.ts"

const lisbon: SearchTrip = {
  id: "trip_lisbon",
  name: "Lisbon",
  startDate: "2026-05-01",
  endDate: "2026-05-08",
}

const archived: SearchTrip = {
  id: "trip_porto",
  name: "Porto",
  startDate: "2026-06-01",
  endDate: "2026-06-04",
  archivedAt: 1,
}

const market: SearchItem = {
  tripId: "trip_lisbon",
  location: "Lisbon",
  locationTo: "Alfama",
  startDate: "2026-05-02",
  endDate: "2026-05-02",
}

const ferry: SearchItem = {
  tripId: "trip_porto",
  location: "Gaia",
  locationTo: "Porto",
  startDate: "2026-06-02",
  endDate: "2026-06-02",
}

test("a date on the trip matches that active trip", () => {
  const hits = searchTrips([lisbon, archived], [market], { date: "2026-05-01" })
  assert.deepEqual(hits.map((trip) => trip.id), ["trip_lisbon"])
  const end = searchTrips([lisbon], [], { date: "2026-05-08" })
  assert.deepEqual(end.map((trip) => trip.id), ["trip_lisbon"])
  const outside = searchTrips([lisbon], [], { date: "2026-05-09" })
  assert.deepEqual(outside, [])
})

test("a date on an item matches when the trip range does not", () => {
  const trip: SearchTrip = {
    id: "trip_lisbon",
    name: "Lisbon",
    startDate: "2026-05-01",
    endDate: "2026-05-03",
  }
  const late: SearchItem = {
    tripId: "trip_lisbon",
    location: "Lisbon",
    startDate: "2026-05-10",
    endDate: "2026-05-10",
  }
  const hits = searchTrips([trip], [late], { date: "2026-05-10" })
  assert.deepEqual(hits.map((row) => row.id), ["trip_lisbon"])
})

test("place matches location or locationTo without regard to case", () => {
  const byLocation = searchTrips([lisbon, archived], [market, ferry], { place: "lisbon" })
  assert.deepEqual(byLocation.map((trip) => trip.id), ["trip_lisbon"])
  const byDestination = searchTrips([lisbon, archived], [market, ferry], { place: "alfama" })
  assert.deepEqual(byDestination.map((trip) => trip.id), ["trip_lisbon"])
  const archivedPlace = searchTrips([lisbon, archived], [market, ferry], {
    place: "PORTO",
    status: "archived",
  })
  assert.deepEqual(archivedPlace.map((trip) => trip.id), ["trip_porto"])
})

test("omitted status means active, and archived is a separate filter", () => {
  const active = searchTrips([lisbon, archived], [market, ferry], { status: "active" })
  assert.deepEqual(active.map((trip) => trip.id), ["trip_lisbon"])
  const onlyArchived = searchTrips([lisbon, archived], [market, ferry], { status: "archived" })
  assert.deepEqual(onlyArchived.map((trip) => trip.id), ["trip_porto"])
  const dated = searchTrips([lisbon, archived], [market, ferry], { date: "2026-06-02" })
  assert.deepEqual(dated, [])
  const datedArchived = searchTrips([lisbon, archived], [market, ferry], {
    date: "2026-06-02",
    status: "archived",
  })
  assert.deepEqual(datedArchived.map((trip) => trip.id), ["trip_porto"])
})

test("a call with no date, place, or status returns nothing", () => {
  assert.deepEqual(searchTrips([lisbon, archived], [market, ferry], {}), [])
  assert.deepEqual(searchTrips([lisbon], [market], { date: " ", place: "" }), [])
})
