import assert from "node:assert/strict"
import test from "node:test"

import { buildTripHome, type HomePlan } from "./detect.ts"

function plan(overrides: HomePlan): HomePlan {
  return overrides
}

function ids(plans: HomePlan[], trip = { startDate: "2027-04-02", endDate: "2027-04-09" }, now = "2027-04-01T12:00:00.000Z") {
  return buildTripHome({
    trip,
    plans,
    now: { instant: now, timeZone: "America/Los_Angeles" },
  })
}

const overnight: HomePlan = plan({
  id: "flight_out",
  title: "TAP to Lisbon",
  startDate: "2027-04-02",
  endDate: "2027-04-03",
  location: "SFO",
  locationTo: "LIS",
  startTime: "22:00",
  endTime: "17:40",
  startTimeZone: "America/Los_Angeles",
  endTimeZone: "Europe/Lisbon",
})

const homeRide: HomePlan = plan({
  id: "ride_sfo",
  title: "Ride to SFO",
  startDate: "2027-04-02",
  endDate: "2027-04-02",
  location: "San Francisco",
  locationTo: "SFO",
})

const lisbonRide: HomePlan = plan({
  id: "ride_lis",
  title: "Ride from LIS",
  startDate: "2027-04-03",
  endDate: "2027-04-03",
  location: "LIS",
  locationTo: "Lisbon",
})

const stay: HomePlan = plan({
  id: "stay_lisbon",
  title: "Alfama apartment",
  startDate: "2027-04-03",
  endDate: "2027-04-08",
  location: "Alfama, Lisbon",
})

test("an overnight SFO to LIS flight spends the departure night in the air", () => {
  const home = ids([overnight, stay], { startDate: "2027-04-02", endDate: "2027-04-08" })
  const gapIds = home.gaps.map((gap) => gap.id)
  assert.equal(gapIds.includes("night:2027-04-02"), false)
  assert.equal(gapIds.includes("night:2027-04-03"), false)
  assert.ok(gapIds.includes("arrival:flight_out"))
  assert.ok(gapIds.includes("departure:flight_out"))
  const arrival = home.gaps.find((gap) => gap.id === "arrival:flight_out")
  assert.equal(arrival?.action.flow, "transport")
  assert.equal(arrival?.action.startDate, "2027-04-03")
  assert.equal(arrival?.action.location, "LIS")
  assert.equal(arrival?.action.locationTo, "Lisbon")
})

test("rides, an aligned stay, and both flights leave nothing missing", () => {
  const back: HomePlan = {
    id: "flight_back",
    title: "TAP home",
    startDate: "2027-04-08",
    endDate: "2027-04-08",
    location: "LIS",
    locationTo: "SFO",
    startTime: "10:00",
    endTime: "14:00",
    startTimeZone: "Europe/Lisbon",
    endTimeZone: "America/Los_Angeles",
  }
  const toLisbon: HomePlan = {
    id: "ride_to_lis",
    title: "Ride to LIS",
    startDate: "2027-04-08",
    endDate: "2027-04-08",
    location: "Lisbon",
    locationTo: "LIS",
  }
  const fromSfo: HomePlan = {
    id: "ride_from_sfo",
    title: "Ride from SFO",
    startDate: "2027-04-08",
    endDate: "2027-04-08",
    location: "SFO",
    locationTo: "San Francisco",
  }
  const home = ids(
    [overnight, homeRide, lisbonRide, stay, back, toLisbon, fromSfo],
    { startDate: "2027-04-02", endDate: "2027-04-08" },
  )
  assert.deepEqual(home.gaps, [])
  assert.equal(home.covered, true)
})

test("a short connection does not ask for a ride at the layover airport", () => {
  const home = ids(
    [
      {
        id: "to_cdg",
        title: "LIS to CDG",
        startDate: "2027-04-06",
        endDate: "2027-04-06",
        location: "LIS",
        locationTo: "CDG",
        startTime: "10:00",
        endTime: "13:00",
        startTimeZone: "Europe/Lisbon",
        endTimeZone: "Europe/Paris",
      },
      {
        id: "to_fco",
        title: "CDG to FCO",
        startDate: "2027-04-06",
        endDate: "2027-04-06",
        location: "CDG",
        locationTo: "FCO",
        startTime: "15:00",
        endTime: "17:00",
        startTimeZone: "Europe/Paris",
        endTimeZone: "Europe/Rome",
      },
    ],
    { startDate: "2027-04-06", endDate: "2027-04-07" },
  )
  const gapIds = home.gaps.map((gap) => gap.id)
  assert.equal(gapIds.includes("arrival:to_cdg"), false)
  assert.equal(gapIds.includes("departure:to_fco"), false)
  assert.ok(gapIds.includes("departure:to_cdg"))
  assert.ok(gapIds.includes("arrival:to_fco"))
})

test("a long layover still needs a ride off the airport and back", () => {
  const home = ids(
    [
      {
        id: "land_cdg",
        title: "Land CDG",
        startDate: "2027-04-06",
        endDate: "2027-04-06",
        location: "LIS",
        locationTo: "CDG",
        startTime: "08:00",
        endTime: "10:00",
        startTimeZone: "Europe/Lisbon",
        endTimeZone: "Europe/Paris",
      },
      {
        id: "leave_cdg",
        title: "Leave CDG",
        startDate: "2027-04-06",
        endDate: "2027-04-06",
        location: "CDG",
        locationTo: "FCO",
        startTime: "20:00",
        endTime: "22:00",
        startTimeZone: "Europe/Paris",
        endTimeZone: "Europe/Rome",
      },
    ],
    { startDate: "2027-04-06", endDate: "2027-04-07" },
  )
  const gapIds = home.gaps.map((gap) => gap.id)
  assert.ok(gapIds.includes("arrival:land_cdg"))
  assert.ok(gapIds.includes("departure:leave_cdg"))
})

test("a ride just after midnight still covers a late arrival", () => {
  const home = ids(
    [
      {
        ...overnight,
        endTime: "22:30",
      },
      {
        id: "late_ride",
        title: "Taxi",
        startDate: "2027-04-04",
        endDate: "2027-04-04",
        location: "LIS",
        locationTo: "Lisbon",
        startTime: "00:20",
        endTime: "01:00",
        startTimeZone: "Europe/Lisbon",
        endTimeZone: "Europe/Lisbon",
      },
    ],
    { startDate: "2027-04-02", endDate: "2027-04-04" },
  )
  assert.equal(
    home.gaps.some((gap) => gap.id === "arrival:flight_out"),
    false,
  )
})

test("a multi-city trip flags the night between Lisbon and Paris", () => {
  const home = ids([
    overnight,
    {
      id: "to_paris",
      title: "LIS to CDG",
      startDate: "2027-04-06",
      endDate: "2027-04-06",
      location: "LIS",
      locationTo: "CDG",
      startTime: "10:00",
      endTime: "13:00",
      startTimeZone: "Europe/Lisbon",
      endTimeZone: "Europe/Paris",
    },
    {
      id: "stay_lisbon",
      title: "Alfama apartment",
      startDate: "2027-04-03",
      endDate: "2027-04-06",
      location: "Alfama, Lisbon",
    },
    {
      id: "stay_paris",
      title: "Le Marais",
      startDate: "2027-04-07",
      endDate: "2027-04-09",
      location: "Paris",
    },
  ])
  const night = home.gaps.find((gap) => gap.id === "night:2027-04-06")
  assert.ok(night)
  assert.equal(night?.action.flow, "stay")
  assert.equal(night?.action.startDate, "2027-04-06")
  assert.equal(night?.action.endDate, "2027-04-07")
  assert.match(night?.action.location ?? "", /Paris/)
})

test("overlapping stays and overlapping flights are conflicts", () => {
  const home = ids([
    {
      id: "flight_a",
      title: "Morning hop",
      startDate: "2027-04-04",
      endDate: "2027-04-04",
      location: "LIS",
      locationTo: "CDG",
      startTime: "09:00",
      endTime: "14:00",
      startTimeZone: "Europe/Lisbon",
      endTimeZone: "Europe/Paris",
    },
    {
      id: "flight_b",
      title: "Also flying",
      startDate: "2027-04-04",
      endDate: "2027-04-04",
      location: "LIS",
      locationTo: "MAD",
      startTime: "10:00",
      endTime: "12:00",
      startTimeZone: "Europe/Lisbon",
      endTimeZone: "Europe/Madrid",
    },
    {
      id: "stay_a",
      title: "Alfama apartment",
      startDate: "2027-04-03",
      endDate: "2027-04-06",
      location: "Lisbon",
    },
    {
      id: "stay_b",
      title: "Baixa hotel",
      startDate: "2027-04-04",
      endDate: "2027-04-07",
      location: "Lisbon",
    },
  ])
  assert.ok(home.gaps.some((gap) => gap.kind === "conflict" && gap.title === "Two stays overlap"))
  assert.ok(home.gaps.some((gap) => gap.kind === "conflict" && gap.title === "Two flights overlap"))
})

test("a plan during a flight conflicts, and an empty day is its own gap", () => {
  const home = ids(
    [
      {
        id: "flight_day",
        title: "Hop",
        startDate: "2027-04-03",
        endDate: "2027-04-03",
        location: "SFO",
        locationTo: "LAX",
        startTime: "09:00",
        endTime: "10:30",
        startTimeZone: "America/Los_Angeles",
        endTimeZone: "America/Los_Angeles",
      },
      {
        id: "lunch",
        title: "Lunch",
        startDate: "2027-04-03",
        endDate: "2027-04-03",
        location: "Los Angeles",
        startTime: "09:30",
        endTime: "11:00",
        startTimeZone: "America/Los_Angeles",
        endTimeZone: "America/Los_Angeles",
      },
    ],
    { startDate: "2027-04-02", endDate: "2027-04-04" },
  )
  assert.ok(home.gaps.some((gap) => gap.title === "Plan overlaps a flight"))
  assert.ok(home.gaps.some((gap) => gap.id === "empty:2027-04-02"))
  assert.ok(home.gaps.some((gap) => gap.id === "empty:2027-04-04"))
  assert.equal(home.gaps.some((gap) => gap.id === "empty:2027-04-03"), false)
})

test("a stay that starts before landing and ends after departure does not line up", () => {
  const home = ids([
    overnight,
    {
      id: "flight_back",
      title: "TAP home",
      startDate: "2027-04-08",
      endDate: "2027-04-08",
      location: "LIS",
      locationTo: "SFO",
      startTime: "10:00",
      endTime: "14:00",
      startTimeZone: "Europe/Lisbon",
      endTimeZone: "America/Los_Angeles",
    },
    {
      id: "stay_early",
      title: "Alfama apartment",
      startDate: "2027-04-02",
      endDate: "2027-04-09",
      location: "Alfama, Lisbon",
    },
  ])
  const mismatch = home.gaps.find((gap) => gap.id === "stay-flight:stay_early")
  assert.ok(mismatch)
  assert.match(mismatch?.detail ?? "", /before you land|in the air|after you leave/)
  assert.equal(mismatch?.action.itemId, "stay_early")
  assert.equal(mismatch?.action.label, "Fix stay")
})

test("a Paris stay while the flights are in Lisbon does not line up", () => {
  const home = ids([
    overnight,
    {
      id: "stay_wrong",
      title: "Le Marais",
      startDate: "2027-04-03",
      endDate: "2027-04-06",
      location: "Paris",
    },
  ])
  const mismatch = home.gaps.find((gap) => gap.id === "stay-flight:stay_wrong")
  assert.ok(mismatch)
  assert.match(mismatch?.detail ?? "", /Paris/)
  assert.match(mismatch?.detail ?? "", /Lisbon/)
})

test("days with no plans are empty, and nights without a stay are open", () => {
  const home = ids(
    [
      {
        id: "market",
        title: "Time Out Market",
        startDate: "2027-04-03",
        endDate: "2027-04-03",
        location: "Lisbon",
      },
    ],
    { startDate: "2027-04-02", endDate: "2027-04-04" },
  )
  assert.ok(home.gaps.some((gap) => gap.id === "empty:2027-04-02"))
  assert.ok(home.gaps.some((gap) => gap.id === "empty:2027-04-04"))
  assert.equal(home.gaps.some((gap) => gap.id === "empty:2027-04-03"), false)
  assert.ok(home.gaps.some((gap) => gap.id === "night:2027-04-02"))
  assert.ok(home.gaps.some((gap) => gap.id === "night:2027-04-03"))
})

test("a spring-forward departure still counts the night in the air", () => {
  const home = buildTripHome({
    trip: { startDate: "2027-03-13", endDate: "2027-03-15" },
    plans: [
      {
        id: "red_eye",
        title: "Overnight to London",
        startDate: "2027-03-13",
        endDate: "2027-03-14",
        location: "JFK",
        locationTo: "LHR",
        startTime: "22:00",
        endTime: "10:00",
        startTimeZone: "America/New_York",
        endTimeZone: "Europe/London",
      },
    ],
    now: { instant: "2027-03-13T12:00:00.000Z", timeZone: "America/New_York" },
  })
  assert.equal(home.gaps.some((gap) => gap.id === "night:2027-03-13"), false)
  assert.ok(home.gaps.some((gap) => gap.id === "night:2027-03-14"))
})

test("a missing local time during the spring-forward hour does not throw", () => {
  const home = buildTripHome({
    trip: { startDate: "2027-03-14", endDate: "2027-03-15" },
    plans: [
      {
        id: "gap_clock",
        title: "Odd hour",
        startDate: "2027-03-14",
        endDate: "2027-03-14",
        location: "JFK",
        locationTo: "BOS",
        startTime: "02:30",
        endTime: "04:00",
        startTimeZone: "America/New_York",
        endTimeZone: "America/New_York",
      },
    ],
    now: { instant: "2027-03-14T12:00:00.000Z", timeZone: "America/New_York" },
  })
  assert.ok(home.upcoming.length >= 0)
  assert.equal(home.covered, false)
})

test("countdown uses the viewer clock, and an in-progress stay is not what's next", () => {
  const home = buildTripHome({
    trip: { startDate: "2027-04-02", endDate: "2027-04-09" },
    plans: [
      overnight,
      stay,
      {
        id: "market",
        title: "Time Out Market",
        startDate: "2027-04-05",
        endDate: "2027-04-05",
        location: "Lisbon",
        startTime: "19:00",
        endTime: "21:00",
        startTimeZone: "Europe/Lisbon",
      },
    ],
    now: { instant: "2027-04-03T02:00:00.000Z", timeZone: "America/Los_Angeles" },
  })
  assert.equal(home.upcoming[0]?.id, "flight_out")
  assert.equal(home.upcoming[0]?.countdown, "In 3 hr")
  const later = buildTripHome({
    trip: { startDate: "2027-04-02", endDate: "2027-04-09" },
    plans: [overnight, stay, { id: "market", title: "Time Out Market", startDate: "2027-04-05", endDate: "2027-04-05", location: "Lisbon" }],
    now: { instant: "2027-04-04T12:00:00.000Z", timeZone: "Europe/Lisbon" },
  })
  assert.equal(later.upcoming[0]?.id, "market")
  assert.equal(later.upcoming.some((item) => item.id === "stay_lisbon"), false)
})

test("tomorrow, a week out, and a spring planning horizon use distinct countdowns", () => {
  const tomorrow = buildTripHome({
    trip: { startDate: "2027-04-07", endDate: "2027-04-08" },
    plans: [{ id: "day", title: "Market", startDate: "2027-04-08", endDate: "2027-04-08", location: "Lisbon" }],
    now: { instant: "2027-04-07T15:00:00.000Z", timeZone: "UTC" },
  })
  assert.equal(tomorrow.upcoming[0]?.countdown, "Tomorrow")

  const week = buildTripHome({
    trip: { startDate: "2027-04-01", endDate: "2027-04-08" },
    plans: [{ id: "day", title: "Market", startDate: "2027-04-08", endDate: "2027-04-08", location: "Lisbon" }],
    now: { instant: "2027-04-01T15:00:00.000Z", timeZone: "UTC" },
  })
  assert.equal(week.upcoming[0]?.countdown, "In 7 days")

  const horizon = buildTripHome({
    trip: { startDate: "2027-04-02", endDate: "2027-04-08" },
    plans: [overnight],
    now: { instant: "2026-11-19T12:00:00.000Z", timeZone: "UTC" },
  })
  assert.equal(horizon.upcoming[0]?.countdown, "In 19 wk")
})

test("an untimed flight that lands the next day keeps that night in the air", () => {
  const home = ids(
    [
      {
        id: "untimed",
        title: "TAP to Lisbon",
        startDate: "2027-04-02",
        endDate: "2027-04-03",
        location: "San Francisco (SFO)",
        locationTo: "LIS",
      },
    ],
    { startDate: "2027-04-02", endDate: "2027-04-04" },
  )
  assert.equal(home.gaps.some((gap) => gap.id === "night:2027-04-02"), false)
  assert.ok(home.gaps.some((gap) => gap.id === "arrival:untimed"))
  assert.equal(home.gaps.find((gap) => gap.id === "departure:untimed")?.title, "No ride to SFO")
})

test("a trip with no plans is not covered, and a backwards range is not covered", () => {
  const empty = buildTripHome({
    trip: { startDate: "2027-04-02", endDate: "2027-04-08" },
    plans: [],
    now: { instant: "2027-04-01T12:00:00.000Z", timeZone: "UTC" },
  })
  assert.equal(empty.covered, false)
  assert.deepEqual(empty.gaps, [])
  const backwards = buildTripHome({
    trip: { startDate: "2027-04-08", endDate: "2027-04-02" },
    plans: [stay],
    now: { instant: "2027-04-01T12:00:00.000Z", timeZone: "UTC" },
  })
  assert.equal(backwards.covered, false)
  assert.deepEqual(backwards.gaps, [])
})
