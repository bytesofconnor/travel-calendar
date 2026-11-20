import assert from "node:assert/strict"
import test from "node:test"

import {
  autoTitle,
  buildPlan,
  draftErrors,
  draftTitle,
  guessPlanType,
  headingFor,
  homeRole,
  isBareTitle,
  resolvePlanType,
  tripPlaceHint,
  type PlanDraft,
} from "./plan-form.ts"

const day = "2027-06-14"

function draft(overrides: Partial<PlanDraft> = {}): PlanDraft {
  return {
    type: "stay",
    customTitle: "",
    titleEdited: false,
    name: "",
    where: "",
    from: "",
    to: "",
    flightCode: "",
    startDate: day,
    endDate: "2027-06-18",
    startTime: "",
    endTime: "",
    startZone: "",
    endZone: "",
    notes: "",
    address: "",
    confirmation: "",
    linkLabel: "",
    linkUrl: "",
    ...overrides,
  }
}

test("a bare Stay is never the saved title", () => {
  assert.equal(isBareTitle("Stay"), true)
  const stay = draft({ where: "Airbnb in Hanoi Old Quarter" })
  assert.equal(draftTitle(stay), "Stay · Airbnb in Hanoi Old Quarter")
  assert.equal(autoTitle("flight", { from: "DC", to: "Hanoi" }), "Fly DC to Hanoi")
  const saved = buildPlan(stay, day)
  assert.equal(saved?.title, "Stay · Airbnb in Hanoi Old Quarter")
  assert.equal(saved?.planType, "stay")
})

test("flight title builds from the cities when the title is blank", () => {
  const flight = draft({
    type: "flight",
    from: "Hanoi",
    to: "Da Nang",
    endDate: day,
    flightCode: "VN 123",
  })
  assert.equal(draftTitle(flight), "Fly Hanoi to Da Nang")
  const saved = buildPlan(flight, day)
  assert.equal(saved?.title, "Fly Hanoi to Da Nang")
  assert.equal(saved?.location, "Hanoi")
  assert.equal(saved?.locationTo, "Da Nang")
  assert.equal(saved?.flightCode, "VN 123")
})

test("a custom title is kept", () => {
  const flight = draft({
    type: "flight",
    customTitle: "Ride from LIS",
    titleEdited: true,
    from: "LIS",
    to: "Lisbon",
    endDate: day,
  })
  assert.equal(draftTitle(flight), "Ride from LIS")
})

test("freeform text guesses a type", () => {
  assert.equal(guessPlanType("Fly DC to Hanoi"), "flight")
  assert.equal(guessPlanType("MN to DC"), "flight")
  assert.equal(guessPlanType("Airbnb in Hanoi"), "stay")
  assert.equal(guessPlanType("Note: pack raincoats"), "note")
  assert.equal(guessPlanType("Train street coffee"), "place")
})

test("legacy plans open as the type a person would expect", () => {
  assert.equal(
    resolvePlanType({ title: "Fly DC to Hanoi", location: "DC", startDate: day, endDate: day }),
    "flight",
  )
  assert.equal(homeRole({ title: "Fly DC to Hanoi", location: "DC", startDate: day, endDate: day }), "flight")
  assert.equal(
    homeRole({
      title: "MN to DC",
      location: "MSP",
      locationTo: "DCA",
      startDate: day,
      endDate: day,
    }),
    "flight",
  )
  assert.equal(
    homeRole({
      title: "Ride to SFO",
      location: "San Francisco",
      locationTo: "SFO",
      startDate: day,
      endDate: day,
    }),
    "transport",
  )
  assert.equal(
    resolvePlanType({
      title: "Alfama apartment",
      location: "Alfama",
      startDate: day,
      endDate: "2027-06-20",
    }),
    "stay",
  )
  assert.equal(
    resolvePlanType({ title: "Time Out Market", location: "Cais", startDate: day, endDate: day }),
    "place",
  )
  assert.equal(
    resolvePlanType({
      planType: "note",
      title: "Pack raincoats",
      location: "",
      startDate: day,
      endDate: day,
    }),
    "note",
  )
})

test("a picked place is stored and free text is not", () => {
  const saved = buildPlan(
    draft({
      where: "Hanoi",
      wherePlace: { name: "Hanoi", lat: 21.028, lng: 105.854, country: "VN", timeZone: "Asia/Bangkok" },
    }),
    day,
  )
  assert.equal(saved?.place?.lat, 21.028)
  assert.equal(saved?.place?.timeZone, "Asia/Bangkok")
  const typed = buildPlan(draft({ where: "Hanoi", wherePlace: { name: "Hanoi Old Quarter", lat: 1, lng: 2 } }), day)
  assert.equal(typed?.place, undefined)
  assert.equal(typed?.location, "Hanoi")
})

test("validation names the missing field and still allows a note without a date", () => {
  assert.equal(draftErrors(draft({ where: "" })).where, "Add where you're staying.")
  const note = buildPlan(draft({ type: "note", name: "Pack raincoats", startDate: "", endDate: "" }), day)
  assert.equal(note?.title, "Pack raincoats")
  assert.equal(note?.startDate, day)
  assert.equal(note?.location, "")
})

test("headings and trip hints stay short", () => {
  assert.equal(headingFor("stay", false), "Add a stay")
  assert.equal(headingFor("flight", true), "Edit flight")
  assert.equal(tripPlaceHint("Vietnam '27"), "Vietnam")
  assert.equal(tripPlaceHint("Lisbon with you"), "Lisbon")
})
