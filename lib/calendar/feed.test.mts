import assert from "node:assert/strict"
import { describe, it } from "node:test"

import ICAL from "ical.js"

import { buildCalendar, feedPublishedAt } from "./ics.ts"
import { calendarOrder, preferredCalendar, subscribeLinks } from "./links.ts"
import { plansFromSource } from "./plans.ts"
import { serveCalendarFeed } from "./serve.ts"
import { calendarToken, hashCalendarToken, isCalendarToken, tokenFromSegment } from "./token.ts"
import type { TripCalendarSource } from "./types.ts"

const ORIGIN = "https://www.travelcalendar.space"
const WHEN = Date.parse("2026-11-02T12:00:00.000Z")

function source(overrides: Partial<TripCalendarSource> = {}): TripCalendarSource {
  return {
    tripId: "trip_lisbon",
    tripName: "Lisbon with you",
    tripUpdatedAt: WHEN,
    items: [
      {
        id: "item_flight",
        title: "TAP to Lisbon",
        notes: "Aisle seats together",
        startDate: "2026-11-18",
        endDate: "2026-11-19",
        location: "SFO",
        locationTo: "LIS",
        startTime: "21:30",
        endTime: "14:45",
        startTimeZone: "America/Los_Angeles",
        endTimeZone: "Europe/Lisbon",
        revision: 0,
        updatedAt: WHEN,
      },
      {
        id: "item_stay",
        title: "Alfama apartment",
        notes: "Keys in the lockbox",
        startDate: "2026-11-18",
        endDate: "2026-11-24",
        location: "Alfama, Lisbon",
        revision: 1,
        updatedAt: WHEN + 1000,
      },
      {
        id: "item_place",
        title: "Time Out Market",
        startDate: "2026-11-19",
        endDate: "2026-11-19",
        location: "Cais do Sodré",
        revision: 2,
        updatedAt: WHEN + 2000,
      },
    ],
    note: {
      content: "Pack the adapter\n2026-11-20 Pastéis de Belém\nNo date on this line",
      updatedAt: WHEN + 3000,
    },
    ...overrides,
  }
}

function unfold(ics: string): string {
  return ics.replaceAll("\r\n ", "").replaceAll("\r\n\t", "")
}

function events(ics: string) {
  const calendar = new ICAL.Component(ICAL.parse(ics))
  return calendar.getAllSubcomponents("vevent").map((component) => new ICAL.Event(component))
}

function byUid(ics: string, id: string) {
  const found = events(ics).find((event) => event.uid === `${id}@travelcalendar.space`)
  assert.ok(found, `missing ${id}`)
  return found
}

describe("calendar feed", () => {
  it("builds a valid calendar with stable ids, time zones, and an all-day stay", () => {
    const ics = buildCalendar(source(), ORIGIN)
    assert.equal(ics, buildCalendar(source(), ORIGIN))
    assert.match(ics, /\r\n/)
    assert.equal(/(?<!\r)\n/.test(ics), false)
    for (const row of ics.split("\r\n")) {
      assert.ok(Buffer.byteLength(row) <= 75, row)
    }

    const calendar = new ICAL.Component(ICAL.parse(ics))
    assert.equal(calendar.getFirstPropertyValue("version"), "2.0")
    assert.equal(unfold(ics).includes("X-WR-CALNAME:Lisbon with you"), true)
    assert.match(unfold(ics), /REFRESH-INTERVAL;VALUE=DURATION:PT1H/)
    assert.match(unfold(ics), /X-PUBLISHED-TTL:PT1H/)
    assert.equal(unfold(ics).includes("Connor"), false)
    assert.equal(unfold(ics).includes("Alex"), false)
    assert.equal(unfold(ics).includes("@gmail"), false)

    const flight = byUid(ics, "item_flight")
    assert.equal(flight.summary, "Flight: SFO to LIS")
    assert.equal(flight.location, "LIS airport")
    assert.equal(flight.component.getFirstPropertyValue("sequence"), 0)
    assert.match(flight.description, /Aisle seats together/)
    assert.match(flight.description, /Open this plan: https:\/\/www\.travelcalendar\.space\/\?trip=trip_lisbon&plan=item_flight/)
    assert.equal(flight.startDate.zone.tzid, "America/Los_Angeles")
    assert.equal(flight.endDate.zone.tzid, "Europe/Lisbon")
    assert.equal(flight.startDate.toJSDate().toISOString(), "2026-11-19T05:30:00.000Z")
    assert.equal(flight.endDate.toJSDate().toISOString(), "2026-11-19T14:45:00.000Z")
    assert.match(unfold(ics), /BEGIN:VTIMEZONE\r?\nTZID:America\/Los_Angeles/)
    assert.match(unfold(ics), /BEGIN:VTIMEZONE\r?\nTZID:Europe\/Lisbon/)

    const stay = byUid(ics, "item_stay")
    assert.equal(stay.summary, "Stay: Alfama apartment")
    assert.equal(stay.location, "Alfama, Lisbon")
    assert.equal(stay.startDate.isDate, true)
    assert.equal(stay.startDate.toICALString(), "20261118")
    assert.equal(stay.endDate.toICALString(), "20261124")
    assert.equal(stay.component.getFirstProperty("dtstart")?.getParameter("tzid"), undefined)

    const place = byUid(ics, "item_place")
    assert.equal(place.summary, "Place: Time Out Market")
    assert.equal(place.startDate.toICALString(), "20261119")
    assert.equal(place.endDate.toICALString(), "20261120")

    const notes = events(ics).filter((event) => String(event.uid).startsWith("note-"))
    assert.equal(notes.length, 1)
    assert.equal(notes[0]?.summary, "Note: Pastéis de Belém")
    assert.match(notes[0]?.description ?? "", /plan=note-/)
  })

  it("keeps the uid when a plan changes and drops it when the plan is deleted", () => {
    const first = buildCalendar(source(), ORIGIN)
    const edited = source()
    const place = edited.items[2]
    assert.ok(place)
    place.title = "Time Out Market lunch"
    place.revision = 4
    place.updatedAt = WHEN + 9000
    const second = buildCalendar(edited, ORIGIN)
    assert.equal(byUid(first, "item_place").uid, byUid(second, "item_place").uid)
    assert.equal(byUid(second, "item_place").summary, "Place: Time Out Market lunch")
    assert.equal(byUid(second, "item_place").component.getFirstPropertyValue("sequence"), 4)
    assert.notEqual(
      byUid(first, "item_place").component.getFirstPropertyValue("last-modified"),
      byUid(second, "item_place").component.getFirstPropertyValue("last-modified"),
    )

    edited.items = edited.items.filter((item) => item.id !== "item_place")
    const third = buildCalendar(edited, ORIGIN)
    assert.equal(events(third).some((event) => event.uid === "item_place@travelcalendar.space"), false)
    assert.equal(byUid(third, "item_stay").uid, byUid(first, "item_stay").uid)
  })

  it("publishes an empty trip, a long stay, and an overnight flight without clocks", () => {
    const empty = buildCalendar(
      { tripId: "trip_empty", tripName: "Kyoto in spring", tripUpdatedAt: WHEN, items: [], note: null },
      ORIGIN,
    )
    assert.equal(events(empty).length, 0)
    assert.match(unfold(empty), /X-WR-CALNAME:Kyoto in spring/)
    assert.doesNotThrow(() => ICAL.parse(empty))

    const long = buildCalendar(
      {
        tripId: "trip_long",
        tripName: "A long way",
        tripUpdatedAt: WHEN,
        items: [
          {
            id: "item_long",
            title: "House sit",
            startDate: "2026-01-01",
            endDate: "2027-01-01",
            location: "Lisbon",
            revision: 0,
            updatedAt: WHEN,
          },
        ],
        note: { content: "Remember the plants", updatedAt: WHEN },
      },
      ORIGIN,
    )
    assert.equal(events(long).length, 1)
    assert.equal(byUid(long, "item_long").endDate.toICALString(), "20270101")

    const overnight = buildCalendar(
      {
        tripId: "trip_red_eye",
        tripName: "Red eye",
        tripUpdatedAt: WHEN,
        items: [
          {
            id: "item_redeye",
            title: "Overnight",
            startDate: "2026-11-18",
            endDate: "2026-11-19",
            location: "SFO",
            locationTo: "LIS",
            revision: 0,
            updatedAt: WHEN,
          },
          {
            id: "item_bad",
            title: "Broken",
            startDate: "nope",
            endDate: "2026-11-18",
            location: "Here",
            revision: 0,
            updatedAt: WHEN,
          },
        ],
        note: null,
      },
      ORIGIN,
    )
    assert.equal(events(overnight).length, 1)
    const redeye = byUid(overnight, "item_redeye")
    assert.equal(redeye.startDate.isDate, true)
    assert.equal(redeye.startDate.toICALString(), "20261118")
    assert.equal(redeye.endDate.toICALString(), "20261119")
    assert.match(redeye.description, /Arrives 2026-11-19/)
  })

  it("includes both standard and daylight offsets when a flight crosses a change", () => {
    const ics = buildCalendar(
      {
        tripId: "trip_dst",
        tripName: "Spring",
        tripUpdatedAt: WHEN,
        items: [
          {
            id: "item_dst",
            title: "Across the change",
            startDate: "2026-03-01",
            endDate: "2026-03-20",
            location: "SFO",
            locationTo: "LAX",
            startTime: "09:00",
            endTime: "10:00",
            revision: 0,
            updatedAt: WHEN,
          },
        ],
        note: null,
      },
      ORIGIN,
    )
    const text = unfold(ics)
    assert.match(text, /TZID:America\/Los_Angeles/)
    assert.match(text, /TZOFFSETFROM:-0800/)
    assert.match(text, /TZOFFSETTO:-0700/)
    const flight = byUid(ics, "item_dst")
    assert.equal(flight.startDate.toJSDate().toISOString(), "2026-03-01T17:00:00.000Z")
    assert.equal(flight.endDate.toJSDate().toISOString(), "2026-03-20T17:00:00.000Z")
  })

  it("reads a dated note and skips an undated one", () => {
    const plans = plansFromSource(source())
    assert.equal(plans.filter((plan) => plan.kind === "note").length, 1)
    assert.equal(
      plansFromSource({ ...source(), note: { content: "Just a list", updatedAt: WHEN } }).some(
        (plan) => plan.kind === "note",
      ),
      false,
    )
  })
})

describe("calendar token", () => {
  it("issues an unguessable token and rejects a bad or revoked one with 404", async () => {
    const token = calendarToken()
    assert.equal(token.length, 43)
    assert.equal(isCalendarToken(token), true)
    assert.equal(isCalendarToken("short"), false)
    assert.equal(tokenFromSegment(`${token}.ics`), token)
    assert.equal(tokenFromSegment("not a token.ics"), null)
    const hash = await hashCalendarToken(token)
    assert.equal(hash.length, 64)
    assert.notEqual(hash, token)

    let calls = 0
    const bad = await serveCalendarFeed(new Request("https://www.travelcalendar.space/cal/nope.ics"), "nope.ics", async () => {
      calls += 1
      return "missing"
    })
    assert.equal(bad.status, 404)
    assert.equal(calls, 0)
    assert.equal(bad.headers.get("cache-control"), "no-store")

    const revoked = await serveCalendarFeed(
      new Request(`https://www.travelcalendar.space/cal/${token}.ics`),
      `${token}.ics`,
      async () => "revoked",
    )
    assert.equal(revoked.status, 404)

    const missing = await serveCalendarFeed(
      new Request(`https://www.travelcalendar.space/cal/${token}.ics`),
      `${token}.ics`,
      async () => "missing",
    )
    assert.equal(missing.status, 404)
  })

  it("serves the feed with an etag and answers a repeat fetch with 304", async () => {
    const token = calendarToken()
    const trip = source()
    const response = await serveCalendarFeed(
      new Request(`https://www.travelcalendar.space/cal/${token}.ics`),
      `${token}.ics`,
      async () => trip,
    )
    assert.equal(response.status, 200)
    assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8")
    const etag = response.headers.get("etag")
    assert.ok(etag)
    const body = await response.text()
    assert.match(body, /BEGIN:VCALENDAR/)
    assert.equal(response.headers.get("last-modified"), new Date(feedPublishedAt(trip)).toUTCString())

    const cached = await serveCalendarFeed(
      new Request(`https://www.travelcalendar.space/cal/${token}.ics`, {
        headers: { "if-none-match": etag },
      }),
      `${token}.ics`,
      async () => trip,
    )
    assert.equal(cached.status, 304)
    assert.equal(await cached.text(), "")

    const since = await serveCalendarFeed(
      new Request(`https://www.travelcalendar.space/cal/${token}.ics`, {
        headers: { "if-modified-since": new Date(feedPublishedAt(trip) + 1000).toUTCString() },
      }),
      `${token}.ics`,
      async () => trip,
    )
    assert.equal(since.status, 304)
  })
})

describe("subscribe links", () => {
  it("puts the calendar that matches the phone or computer first", () => {
    assert.equal(
      preferredCalendar({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
      }),
      "apple",
    )
    assert.equal(
      preferredCalendar({
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      }),
      "google",
    )
    assert.equal(
      preferredCalendar({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        platform: "Win32",
        maxTouchPoints: 0,
      }),
      "outlook",
    )
    assert.deepEqual(calendarOrder("google"), ["google", "apple", "outlook"])
    const links = subscribeLinks("https://www.travelcalendar.space/cal/abc.ics", "Lisbon with you")
    assert.equal(links.apple, "webcal://www.travelcalendar.space/cal/abc.ics")
    assert.equal(
      links.google,
      "https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fwww.travelcalendar.space%2Fcal%2Fabc.ics",
    )
    assert.match(links.outlook, /^https:\/\/outlook\.office\.com\/calendar\/0\/addfromweb\?url=/)
    assert.match(links.outlook, /name=Lisbon%20with%20you/)
  })
})
