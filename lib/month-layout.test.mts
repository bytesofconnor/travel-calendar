import assert from "node:assert/strict"
import test from "node:test"

import type { TripItem } from "./kanban-store.ts"
import { phoneDayFace, phonePlanLabel, stayBarsForWeek, tripEdges } from "./month-layout.ts"

function item(partial: Pick<TripItem, "id" | "title" | "startDate" | "endDate"> & Partial<TripItem>): TripItem {
  return {
    tripId: "trip",
    location: "Hanoi",
    createdBy: "user",
    createdAt: "2027-01-01T00:00:00.000Z",
    updatedAt: "2027-01-01T00:00:00.000Z",
    ...partial,
  }
}

const week = (startDay: number) =>
  Array.from({ length: 7 }, (_, index) => {
    const day = startDay + index
    return { iso: `2027-06-${String(day).padStart(2, "0")}`, inMonth: true }
  })

test("a multi-day stay is one bar, and the next week continues it", () => {
  const stay = item({ id: "hanoi", title: "Old Quarter apartment", startDate: "2027-06-11", endDate: "2027-06-16" })
  const first = stayBarsForWeek(week(6), [stay])
  assert.equal(first.length, 1)
  assert.deepEqual(
    { start: first[0].start, end: first[0].end, continuesBefore: first[0].continuesBefore, continuesAfter: first[0].continuesAfter },
    { start: 5, end: 6, continuesBefore: false, continuesAfter: true },
  )
  const second = stayBarsForWeek(week(13), [stay])
  assert.equal(second.length, 1)
  assert.equal(second[0].continuesBefore, true)
  assert.equal(second[0].continuesAfter, false)
  assert.equal(second[0].end - second[0].start, 3)
})

test("overlapping stays stack in lanes and a flight is not a bar", () => {
  const days = week(14)
  const bars = stayBarsForWeek(days, [
    item({ id: "a", title: "Old Quarter apartment", startDate: "2027-06-11", endDate: "2027-06-16" }),
    item({ id: "b", title: "Hội An house", startDate: "2027-06-16", endDate: "2027-06-24" }),
    item({
      id: "flight",
      title: "HAN to DAD",
      startDate: "2027-06-16",
      endDate: "2027-06-16",
      location: "HAN",
      locationTo: "DAD",
    }),
  ])
  assert.equal(bars.length, 2)
  assert.equal(new Set(bars.map((bar) => bar.lane)).size, 2)
  assert.equal(bars.some((bar) => bar.title === "HAN to DAD"), false)
})

test("a phone chip prefers a route code or the first words of the plan", () => {
  assert.equal(
    phonePlanLabel(
      item({
        id: "han",
        title: "SFO to HAN",
        startDate: "2027-06-11",
        endDate: "2027-06-11",
        location: "SFO",
        locationTo: "HAN",
      }),
    ),
    "SFO→HAN",
  )
  assert.equal(
    phonePlanLabel(
      item({
        id: "tap",
        title: "TAP to Lisbon",
        startDate: "2026-11-18",
        endDate: "2026-11-18",
        location: "SFO",
        locationTo: "LIS",
      }),
    ),
    "SFO→LIS",
  )
  assert.equal(
    phonePlanLabel(
      item({
        id: "dc",
        title: "MN to DC",
        startDate: "2027-06-11",
        endDate: "2027-06-11",
        location: "MSP",
        locationTo: "DC",
        planType: "flight",
      }),
    ),
    "MSP→DC",
  )
  assert.equal(
    phonePlanLabel(
      item({ id: "lantern", title: "Lantern walk", startDate: "2027-06-20", endDate: "2027-06-20", location: "Hội An" }),
    ),
    "Lantern",
  )
  assert.equal(
    phonePlanLabel(
      item({
        id: "market",
        title: "Ben Thanh Market",
        startDate: "2027-06-26",
        endDate: "2027-06-26",
        location: "Ho Chi Minh City",
      }),
    ),
    "Ben Thanh",
  )
  assert.equal(
    phonePlanLabel(
      item({ id: "train", title: "Train Street", startDate: "2027-06-12", endDate: "2027-06-12", location: "Hanoi" }),
    ),
    "Train",
  )
  assert.equal(
    phonePlanLabel(item({ id: "dinner", title: "Dinner", startDate: "2026-11-18", endDate: "2026-11-18", location: "Lisbon" })),
    "Dinner",
  )
  assert.equal(
    phonePlanLabel(item({ id: "tram", title: "Tram 28", startDate: "2026-11-18", endDate: "2026-11-18", location: "Lisbon" })),
    "Tram 28",
  )
})

test("a two-letter fragment is a count and three letters stay a label", () => {
  const measure = (text: string) => text.length * 10
  assert.equal(phoneDayFace(["SFO→HAN"], 70, measure), "label")
  assert.equal(phoneDayFace(["SFO→HAN"], 40, measure), "label")
  assert.equal(phoneDayFace(["SFO→HAN"], 25, measure), "count")
  assert.equal(phoneDayFace(["Ben Thanh"], 90, measure), "label")
  assert.equal(phoneDayFace(["Ben Thanh"], 40, measure), "label")
  assert.equal(phoneDayFace(["Ben Thanh"], 20, measure), "count")
  assert.equal(phoneDayFace(["Dinner"], 60, measure), "label")
  assert.equal(phoneDayFace([], 10, measure), "label")
})

test("trip edges mark the outside of a run and join the inside", () => {
  const days = week(11).map((day, index) => ({ ...day, iso: `2027-06-${11 + index}` }))
  const inside = tripEdges(days, 2, "2027-06-11", "2027-06-16")
  assert.equal(inside.inTrip, true)
  assert.equal(inside.joinLeft, true)
  assert.equal(inside.edges.includes("left"), false)
  const start = tripEdges(days, 0, "2027-06-11", "2027-06-16")
  assert.equal(start.edges.includes("left"), true)
  assert.equal(start.joinLeft, false)
})
