import assert from "node:assert/strict"
import test from "node:test"

import { nightLabel, todayBrief, tripNights, type GlancePlan } from "./trip-glance.ts"

function plan(partial: GlancePlan): GlancePlan {
  return partial
}

const flight = plan({
  id: "flight",
  title: "MN to DC",
  startDate: "2027-06-11",
  endDate: "2027-06-11",
  location: "MSP",
  locationTo: "DC",
  planType: "flight",
  startTime: "09:40",
  endTime: "13:15",
})

const stay = plan({
  id: "stay",
  title: "Airbnb",
  startDate: "2027-06-11",
  endDate: "2027-06-14",
  location: "Washington DC",
  planType: "stay",
})

const lunch = plan({
  id: "lunch",
  title: "Lunch",
  startDate: "2027-06-12",
  endDate: "2027-06-12",
  location: "Washington DC",
  planType: "place",
  startTime: "12:30",
})

const museum = plan({
  id: "museum",
  title: "Museum",
  startDate: "2027-06-12",
  endDate: "2027-06-12",
  location: "Washington DC",
  planType: "place",
})

const back = plan({
  id: "back",
  title: "DC to MN",
  startDate: "2027-06-14",
  endDate: "2027-06-14",
  location: "DC",
  locationTo: "MSP",
  planType: "flight",
  startTime: "16:00",
  endTime: "18:10",
})

const weekend = [flight, stay, lunch, museum, back]

test("a day inside the trip lists today in time order, tonight's stay, and the next leg", () => {
  const brief = todayBrief(weekend, "2027-06-12", "2027-06-11", "2027-06-14")
  assert.equal(brief.active, true)
  assert.deepEqual(
    brief.plans.map((item) => item.title),
    ["Airbnb", "Lunch", "Museum"],
  )
  assert.deepEqual(brief.sleep, { id: "stay", title: "Airbnb", city: "Washington DC" })
  assert.equal(brief.nextLeg?.title, "DC to MN")
  assert.equal(brief.nextLeg?.timeLabel, "4:00 PM → 6:10 PM")
  assert.equal(brief.nextLeg?.from, "DC")
  assert.equal(brief.nextLeg?.to, "MSP")
  assert.equal(brief.nextLeg?.date, "2027-06-14")
})

test("before the trip, today stays inactive and the nights are still the overnights", () => {
  const brief = todayBrief(weekend, "2027-06-01", "2027-06-11", "2027-06-14")
  assert.equal(brief.active, false)
  const nights = tripNights(weekend, "2027-06-11", "2027-06-14")
  assert.deepEqual(
    nights.map((night) => nightLabel(night)),
    [
      "Night 1 of 3, Washington DC, Airbnb",
      "Night 2 of 3, Washington DC, Airbnb",
      "Night 3 of 3, Washington DC, Airbnb",
    ],
  )
  assert.equal(nights.some((night) => night.cityChange), false)
})

test("checkout morning has no sleep tonight, and the flight that day is the next leg", () => {
  const brief = todayBrief(weekend, "2027-06-14", "2027-06-11", "2027-06-14")
  assert.equal(brief.sleep, null)
  assert.equal(brief.nextLeg?.title, "DC to MN")
  assert.equal(brief.nextLeg?.date, "2027-06-14")
  assert.deepEqual(
    brief.plans.map((item) => item.title),
    ["Airbnb", "DC to MN"],
  )
})

test("an untimed leg says all day", () => {
  const train = plan({
    id: "train",
    title: "Train to Lao Cai",
    startDate: "2027-06-16",
    endDate: "2027-06-16",
    location: "Hanoi",
    locationTo: "Lao Cai",
    planType: "flight",
    travelMode: "train",
  })
  const brief = todayBrief([train], "2027-06-15", "2027-06-15", "2027-06-20")
  assert.equal(brief.nextLeg?.timeLabel, "All day")
  assert.equal(brief.nextLeg?.from, "Hanoi")
  assert.equal(brief.nextLeg?.to, "Lao Cai")
})

test("vietnam nights name the city, a city change, and a night with no stay", () => {
  const items: GlancePlan[] = [
    plan({
      id: "hanoi",
      title: "Old Quarter apartment",
      startDate: "2027-06-11",
      endDate: "2027-06-19",
      location: "Hanoi",
    }),
    plan({
      id: "lanterns",
      title: "Lantern walk",
      startDate: "2027-06-20",
      endDate: "2027-06-20",
      location: "Hội An",
      planType: "place",
    }),
    plan({
      id: "hoian",
      title: "Hội An house",
      startDate: "2027-06-23",
      endDate: "2027-06-24",
      location: "Hội An",
      planType: "stay",
    }),
    plan({
      id: "saigon",
      title: "District 1 loft",
      startDate: "2027-06-24",
      endDate: "2027-07-02",
      location: "Ho Chi Minh City",
      planType: "stay",
    }),
  ]
  const nights = tripNights(items, "2027-06-11", "2027-07-02")
  const byDate = new Map(nights.map((night) => [night.date, night]))
  assert.equal(nights.length, 21)
  assert.equal(nightLabel(byDate.get("2027-06-19")!, "2027-06-19"), "Night 9 of 21, Hanoi, no stay booked, today")
  assert.equal(
    nightLabel(byDate.get("2027-06-20")!),
    "Night 10 of 21, Hội An, no stay booked, new city",
  )
  assert.equal(nightLabel(byDate.get("2027-06-21")!), "Night 11 of 21, Hội An, no stay booked")
  assert.equal(byDate.get("2027-06-23")?.cityChange, false)
  assert.equal(
    nightLabel(byDate.get("2027-06-24")!),
    "Night 14 of 21, Ho Chi Minh City, District 1 loft, new city",
  )
})

test("a one-day trip has no overnight to show", () => {
  assert.deepEqual(tripNights(weekend, "2027-06-11", "2027-06-11"), [])
})

test("a filtered-out stay leaves the night unbooked", () => {
  const nights = tripNights([lunch, museum], "2027-06-11", "2027-06-14")
  assert.equal(nightLabel(nights[0]!), "Night 1 of 3, no stay booked")
  assert.equal(nightLabel(nights[1]!), "Night 2 of 3, Washington DC, no stay booked")
})
