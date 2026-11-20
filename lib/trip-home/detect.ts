import { airportTimeZone, isIanaTimeZone } from "../calendar/airports.ts"
import { homeRole } from "../plan-form.ts"
import type { PlanType } from "../plan-types.ts"

export type HomePlan = {
  id: string
  title: string
  startDate: string
  endDate: string
  location: string
  locationTo?: string
  startTime?: string
  endTime?: string
  startTimeZone?: string
  endTimeZone?: string
  notes?: string
  planType?: PlanType
}

export type HomeNow = {
  instant: string
  timeZone: string
}

export type GapFlow = "stay" | "transport" | "place" | "flight"

export type GapAction = {
  flow: GapFlow
  label: string
  title: string
  startDate: string
  endDate: string
  location: string
  locationTo?: string
  itemId?: string
}

export type GapKind =
  | "uncovered-night"
  | "missing-arrival-transport"
  | "missing-departure-transport"
  | "conflict"
  | "empty-day"
  | "stay-flight-mismatch"

export type TripGap = {
  id: string
  kind: GapKind
  title: string
  detail: string
  action: GapAction
}

export type UpcomingKind = "flight" | "stay" | "place" | "transport"

export type UpcomingItem = {
  id: string
  title: string
  kind: UpcomingKind
  whenLabel: string
  countdown: string
  startDate: string
  location: string
  locationTo?: string
}

export type TripHomeModel = {
  upcoming: UpcomingItem[]
  gaps: TripGap[]
  covered: boolean
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/
const GAP_OK = /^[a-z0-9][a-z0-9:_-]{0,159}$/i

export function isGapId(value: string): boolean {
  return GAP_OK.test(value)
}
const HOUR = 3_600_000
const CONNECTION = 8 * HOUR
const RIDE_WINDOW = 6 * HOUR
const OVERLAP = 15 * 60_000

const CITIES: Record<string, { label: string; names: string[] }> = {
  AMS: { label: "Amsterdam", names: ["amsterdam"] },
  ARN: { label: "Stockholm", names: ["stockholm"] },
  ATH: { label: "Athens", names: ["athens"] },
  ATL: { label: "Atlanta", names: ["atlanta"] },
  AUS: { label: "Austin", names: ["austin"] },
  BCN: { label: "Barcelona", names: ["barcelona"] },
  BKK: { label: "Bangkok", names: ["bangkok"] },
  BNA: { label: "Nashville", names: ["nashville"] },
  BOG: { label: "Bogota", names: ["bogota", "bogotá"] },
  BOS: { label: "Boston", names: ["boston"] },
  CDG: { label: "Paris", names: ["paris"] },
  CLT: { label: "Charlotte", names: ["charlotte"] },
  CPH: { label: "Copenhagen", names: ["copenhagen"] },
  CUN: { label: "Cancun", names: ["cancun", "cancún"] },
  DEN: { label: "Denver", names: ["denver"] },
  DFW: { label: "Dallas", names: ["dallas"] },
  DUB: { label: "Dublin", names: ["dublin"] },
  DXB: { label: "Dubai", names: ["dubai"] },
  EWR: { label: "Newark", names: ["newark"] },
  FCO: { label: "Rome", names: ["rome"] },
  FRA: { label: "Frankfurt", names: ["frankfurt"] },
  GRU: { label: "Sao Paulo", names: ["sao paulo", "são paulo"] },
  HKG: { label: "Hong Kong", names: ["hong kong"] },
  HND: { label: "Tokyo", names: ["tokyo"] },
  HNL: { label: "Honolulu", names: ["honolulu"] },
  IAD: { label: "Washington", names: ["washington"] },
  IAH: { label: "Houston", names: ["houston"] },
  ICN: { label: "Seoul", names: ["seoul"] },
  JFK: { label: "New York", names: ["new york"] },
  LAS: { label: "Las Vegas", names: ["las vegas"] },
  LAX: { label: "Los Angeles", names: ["los angeles"] },
  LHR: { label: "London", names: ["london"] },
  LIS: { label: "Lisbon", names: ["lisbon"] },
  MAD: { label: "Madrid", names: ["madrid"] },
  MCO: { label: "Orlando", names: ["orlando"] },
  MEX: { label: "Mexico City", names: ["mexico city"] },
  MIA: { label: "Miami", names: ["miami"] },
  MSP: { label: "Minneapolis", names: ["minneapolis"] },
  MUC: { label: "Munich", names: ["munich"] },
  NRT: { label: "Tokyo", names: ["tokyo"] },
  OAK: { label: "Oakland", names: ["oakland"] },
  ORD: { label: "Chicago", names: ["chicago"] },
  PDX: { label: "Portland", names: ["portland"] },
  PHX: { label: "Phoenix", names: ["phoenix"] },
  SAN: { label: "San Diego", names: ["san diego"] },
  SEA: { label: "Seattle", names: ["seattle"] },
  SFO: { label: "San Francisco", names: ["san francisco"] },
  SIN: { label: "Singapore", names: ["singapore"] },
  SJC: { label: "San Jose", names: ["san jose"] },
  SLC: { label: "Salt Lake City", names: ["salt lake"] },
  SYD: { label: "Sydney", names: ["sydney"] },
  YVR: { label: "Vancouver", names: ["vancouver"] },
  YYZ: { label: "Toronto", names: ["toronto"] },
  ZRH: { label: "Zurich", names: ["zurich", "zürich"] },
}

type Role = "flight" | "stay" | "transport" | "place"

type Span = {
  id: string
  title: string
  role: Role
  startDate: string
  endDate: string
  location: string
  locationTo?: string
  notes?: string
  timed: boolean
  clocked: boolean
  startInstant: number
  endInstant: number
  departCivil: string
  arriveCivil: string
  origin: string
  destination: string
  originCode?: string
  destinationCode?: string
  startZone: string
  clock?: string
}

type Journey = {
  flights: Span[]
  depart: Span
  arrive: Span
  inAir: string[]
}

type NightState =
  | { kind: "air" }
  | { kind: "city"; code?: string; label: string }
  | { kind: "unknown" }

function isIsoDate(value: string): boolean {
  const match = DATE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function addDays(iso: string, days: number): string {
  const match = DATE.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
  return date.toISOString().slice(0, 10)
}

function eachDate(start: string, end: string): string[] {
  const dates: string[] = []
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) return dates
  let cursor = start
  while (cursor <= end && dates.length < 400) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

function nightsOf(start: string, end: string): string[] {
  if (!isIsoDate(start) || !isIsoDate(end) || end <= start) return []
  return eachDate(start, addDays(end, -1))
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function iataOf(place: string): string | undefined {
  const trimmed = place.trim().toUpperCase()
  if (/^[A-Z]{3}$/.test(trimmed) && airportTimeZone(trimmed)) return trimmed
  const paren = trimmed.match(/\(([A-Z]{3})\)/)
  if (paren?.[1] && airportTimeZone(paren[1])) return paren[1]
  return undefined
}

function cityOf(place: string): { code?: string; label: string } | null {
  const code = iataOf(place)
  if (code && CITIES[code]) return { code, label: CITIES[code].label }
  const text = normalize(place)
  if (!text) return null
  for (const [candidate, city] of Object.entries(CITIES)) {
    if (city.names.some((name) => text.includes(normalize(name)))) {
      return { code: candidate, label: city.label }
    }
  }
  if (/\bairport\b/i.test(place)) return { label: place.trim() }
  return null
}

function samePlace(a: string, b: string): boolean {
  const left = cityOf(a)
  const right = cityOf(b)
  if (left?.code && right?.code && left.code === right.code) return true
  if (left && right && normalize(left.label) === normalize(right.label)) return true
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

function prettyDate(iso: string): string {
  const match = DATE.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)
}

function clockLabel(time: string): string {
  const match = TIME.exec(time)
  if (!match) return time
  const hour = Number(match[1])
  const minute = Number(match[2])
  const suffix = hour >= 12 ? "PM" : "AM"
  const twelve = hour % 12 || 12
  return minute === 0 ? `${twelve} ${suffix}` : `${twelve}:${match[2]} ${suffix}`
}

function wallClock(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant))
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const year = read("year")
  const month = read("month")
  const day = read("day")
  const hour = read("hour")
  const minute = read("minute")
  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) return null
  return { year, month, day, hour, minute }
}

function zonedToUtc(isoDate: string, time: string, timeZone: string): number | null {
  if (!isIsoDate(isoDate) || !TIME.test(time) || !isIanaTimeZone(timeZone)) return null
  const match = DATE.exec(isoDate)
  const clock = TIME.exec(time)
  if (!match || !clock) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(clock[1])
  const minute = Number(clock[2])
  let utc = Date.UTC(year, month - 1, day, hour, minute)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const got = wallClock(utc, timeZone)
    if (!got) return null
    const wanted = Date.UTC(year, month - 1, day, hour, minute)
    const actual = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute)
    const delta = wanted - actual
    if (delta === 0) return utc
    utc += delta
  }
  return utc
}

function civilFromInstant(instant: number, timeZone: string): string | null {
  const got = wallClock(instant, timeZone)
  if (!got) return null
  return `${String(got.year).padStart(4, "0")}-${String(got.month).padStart(2, "0")}-${String(got.day).padStart(2, "0")}`
}

function zoneFor(explicit: string | undefined, place: string, fallback: string): string {
  const named = explicit?.trim() ?? ""
  if (named && isIanaTimeZone(named)) return named
  return airportTimeZone(iataOf(place) ?? place) ?? fallback
}

function cleanTime(value: string | undefined): string | undefined {
  const time = value?.trim() ?? ""
  return TIME.test(time) ? time : undefined
}

function classify(plan: HomePlan): Role {
  return homeRole(plan)
}

function toSpan(plan: HomePlan, fallbackZone: string): Span | null {
  if (!plan.id.trim() || !isIsoDate(plan.startDate) || !isIsoDate(plan.endDate)) return null
  const endDate = plan.endDate < plan.startDate ? plan.startDate : plan.endDate
  const role = classify({ ...plan, endDate })
  const origin = plan.location.trim()
  const destination = plan.locationTo?.trim() || origin
  const startZone = zoneFor(plan.startTimeZone, origin, fallbackZone)
  const endZone = zoneFor(plan.endTimeZone, destination, startZone)
  const startTime = cleanTime(plan.startTime)
  const endTime = cleanTime(plan.endTime)
  const timed = Boolean(startTime || endTime)
  const startInstant = zonedToUtc(plan.startDate, startTime ?? "12:00", startZone)
  let endInstant = zonedToUtc(endDate, endTime ?? (timed ? "23:59" : "23:59"), endZone)
  if (startInstant === null || endInstant === null) return null
  if (timed && endTime && endInstant <= startInstant) {
    const bumped = zonedToUtc(addDays(endDate, 1), endTime, endZone)
    if (bumped !== null && bumped > startInstant) endInstant = bumped
  }
  if (endInstant < startInstant) endInstant = startInstant
  const departCivil = (timed && startTime ? civilFromInstant(startInstant, startZone) : plan.startDate) ?? plan.startDate
  let arriveCivil = (timed && endTime ? civilFromInstant(endInstant, endZone) : endDate) ?? endDate
  if (arriveCivil < departCivil) arriveCivil = departCivil
  return {
    id: plan.id,
    title: plan.title.trim() || "Plan",
    role,
    startDate: plan.startDate,
    endDate,
    location: origin,
    locationTo: plan.locationTo?.trim() || undefined,
    notes: plan.notes?.trim() || undefined,
    timed: Boolean(startTime && endTime),
    clocked: Boolean(startTime),
    startInstant,
    endInstant,
    departCivil,
    arriveCivil: role === "flight" || role === "transport" ? arriveCivil : endDate,
    origin,
    destination,
    originCode: iataOf(origin),
    destinationCode: iataOf(destination),
    startZone,
    clock: startTime,
  }
}

function airportsMatch(place: string, airport: string): boolean {
  return samePlace(place, airport)
}

function buildJourneys(flights: Span[]): Journey[] {
  const sorted = [...flights].sort((a, b) => a.startInstant - b.startInstant || a.id.localeCompare(b.id))
  const groups: Span[][] = []
  for (const flight of sorted) {
    const current = groups[groups.length - 1]
    const previous = current?.[current.length - 1]
    const layover = previous ? flight.startInstant - previous.endInstant : -1
    const connects =
      previous &&
      previous.timed &&
      flight.timed &&
      layover >= 0 &&
      layover <= CONNECTION &&
      airportsMatch(previous.destination, flight.origin)
    if (current && connects) current.push(flight)
    else groups.push([flight])
  }
  return groups.map((flightsInJourney) => {
    const depart = flightsInJourney[0]
    const arrive = flightsInJourney[flightsInJourney.length - 1]
    return {
      flights: flightsInJourney,
      depart,
      arrive,
      inAir: nightsOf(depart.departCivil, arrive.arriveCivil),
    }
  })
}

function nightMap(tripNights: string[], journeys: Journey[]): Map<string, NightState> {
  const states = new Map<string, NightState>()
  for (const night of tripNights) states.set(night, { kind: "unknown" })
  journeys.forEach((journey, index) => {
    const next = journeys[index + 1]
    const label = cityOf(journey.arrive.destination)?.label ?? journey.arrive.destination
    const code = journey.arrive.destinationCode ?? cityOf(journey.arrive.destination)?.code
    for (const night of tripNights) {
      if (night < journey.arrive.arriveCivil) continue
      if (next && night >= next.depart.departCivil) continue
      const current = states.get(night)
      if (current?.kind === "air") continue
      states.set(night, { kind: "city", code, label })
    }
  })
  const first = journeys[0]
  if (first) {
    const label = cityOf(first.depart.origin)?.label ?? first.depart.origin
    const code = first.depart.originCode ?? cityOf(first.depart.origin)?.code
    for (const night of tripNights) {
      if (night >= first.depart.departCivil) continue
      const current = states.get(night)
      if (current?.kind === "air") continue
      states.set(night, { kind: "city", code, label })
    }
  }
  for (const journey of journeys) {
    for (const night of journey.inAir) {
      if (states.has(night)) states.set(night, { kind: "air" })
    }
  }
  return states
}

function stayCovers(stay: Span, night: string): boolean {
  return stay.startDate <= night && night < stay.endDate
}

function dayTouched(span: Span, day: string): boolean {
  if (span.role === "flight" || span.role === "transport") {
    return span.departCivil === day || span.arriveCivil === day || (span.startDate <= day && day <= span.endDate)
  }
  return span.startDate <= day && day <= span.endDate
}

function rideMatches(transport: Span, airport: string, direction: "from" | "to", whenCivil: string, whenInstant: number): boolean {
  const directional = Boolean(transport.locationTo)
  const fromOk = airportsMatch(transport.origin, airport)
  const toOk = airportsMatch(transport.destination, airport)
  const directionOk = direction === "from" ? fromOk : directional ? toOk : false
  if (!directionOk) return false
  if (transport.departCivil === whenCivil || transport.arriveCivil === whenCivil) return true
  if (!transport.timed) return false
  return Math.abs(transport.startInstant - whenInstant) <= RIDE_WINDOW
}

function placeRideMatches(transport: Span, airport: string, whenCivil: string): boolean {
  if (transport.locationTo) return false
  if (!airportsMatch(transport.origin, airport)) return false
  return transport.departCivil === whenCivil || transport.startDate === whenCivil
}

function countdownFor(start: number, now: number, zone: string): string {
  const delta = start - now
  if (delta <= 0) return "Now"
  const minutes = Math.max(1, Math.round(delta / 60_000))
  if (minutes < 60) return minutes === 1 ? "In 1 min" : `In ${minutes} min`
  const days = civilDayDiff(now, start, zone)
  if (days <= 0) {
    const hours = Math.max(1, Math.round(delta / HOUR))
    return hours === 1 ? "In 1 hr" : `In ${hours} hr`
  }
  if (days === 1) return "Tomorrow"
  if (days < 14) return days === 1 ? "Tomorrow" : `In ${days} days`
  const weeks = Math.max(2, Math.round(days / 7))
  return `In ${weeks} wk`
}

function civilDayDiff(fromInstant: number, toInstant: number, zone: string): number {
  const from = civilFromInstant(fromInstant, zone)
  const to = civilFromInstant(toInstant, zone)
  if (!from || !to) return Math.floor((toInstant - fromInstant) / 86_400_000)
  const fromUtc = Date.parse(`${from}T00:00:00Z`)
  const toUtc = Date.parse(`${to}T00:00:00Z`)
  return Math.round((toUtc - fromUtc) / 86_400_000)
}

function whenLabel(span: Span): string {
  const date = prettyDate(span.departCivil)
  return span.clock ? `${date} · ${clockLabel(span.clock)}` : date
}

function gapId(value: string): string {
  const id = value.replace(/[^a-z0-9:_-]/gi, "-").slice(0, 160)
  return GAP_OK.test(id) ? id : `gap-${id.replace(/[^a-z0-9]/gi, "").slice(0, 40)}`
}

function pairId(a: string, b: string): string {
  const [left, right] = [a, b].sort((one, two) => one.localeCompare(two))
  return gapId(`conflict:${left}:${right}`)
}

function actionOf(input: GapAction): GapAction {
  return input
}

export function buildTripHome(input: {
  trip: { startDate: string; endDate: string }
  plans: HomePlan[]
  now: HomeNow
}): TripHomeModel {
  const fallbackZone = isIanaTimeZone(input.now.timeZone) ? input.now.timeZone : "UTC"
  const parsedNow = Date.parse(input.now.instant)
  const now = Number.isNaN(parsedNow) ? Date.now() : parsedNow
  const spans = input.plans
    .map((plan) => toSpan(plan, fallbackZone))
    .filter((span): span is Span => span !== null)
  const validRange = isIsoDate(input.trip.startDate) && isIsoDate(input.trip.endDate) && input.trip.endDate >= input.trip.startDate
  const tripDays = validRange ? eachDate(input.trip.startDate, input.trip.endDate) : []
  const tripNights = validRange ? nightsOf(input.trip.startDate, input.trip.endDate) : []
  const flights = spans.filter((span) => span.role === "flight")
  const stays = spans.filter((span) => span.role === "stay")
  const transports = spans.filter((span) => span.role === "transport")
  const journeys = buildJourneys(flights)
  const nights = nightMap(tripNights, journeys)
  const gaps: TripGap[] = []

  if (validRange && spans.length > 0) {
    for (const night of tripNights) {
      const state = nights.get(night)
      if (state?.kind === "air") continue
      if (stays.some((stay) => stayCovers(stay, night))) continue
      const where = state?.kind === "city" ? state.label : "this trip"
      gaps.push({
        id: gapId(`night:${night}`),
        kind: "uncovered-night",
        title: `No stay ${prettyDate(night)}`,
        detail: `Nothing covers the night of ${prettyDate(night)} in ${where}.`,
        action: actionOf({
          flow: "stay",
          label: "Add stay",
          title: "Stay",
          startDate: night,
          endDate: addDays(night, 1),
          location: state?.kind === "city" ? state.label : "",
        }),
      })
    }

    for (const journey of journeys) {
      const arrivalAirport = journey.arrive.destination
      const departureAirport = journey.depart.origin
      const arrivalClaims = transports.some(
        (transport) =>
          rideMatches(transport, arrivalAirport, "from", journey.arrive.arriveCivil, journey.arrive.endInstant) ||
          (placeRideMatches(transport, arrivalAirport, journey.arrive.arriveCivil) &&
            !journeys.some(
              (other) =>
                other !== journey &&
                other.depart.departCivil === journey.arrive.arriveCivil &&
                airportsMatch(other.depart.origin, arrivalAirport),
            )),
      )
      if (!arrivalClaims) {
        const code = journey.arrive.destinationCode ?? arrivalAirport
        const city = cityOf(arrivalAirport)?.label ?? ""
        gaps.push({
          id: gapId(`arrival:${journey.arrive.id}`),
          kind: "missing-arrival-transport",
          title: `No ride from ${code}`,
          detail: `${journey.arrive.title} lands ${prettyDate(journey.arrive.arriveCivil)} and nothing gets you from the airport.`,
          action: actionOf({
            flow: "transport",
            label: "Add ride",
            title: `Ride from ${code}`,
            startDate: journey.arrive.arriveCivil,
            endDate: journey.arrive.arriveCivil,
            location: code,
            locationTo: city && city !== code ? city : undefined,
          }),
        })
      }
      const departureClaims = transports.some(
        (transport) =>
          rideMatches(transport, departureAirport, "to", journey.depart.departCivil, journey.depart.startInstant) ||
          (placeRideMatches(transport, departureAirport, journey.depart.departCivil) &&
            !journeys.some(
              (other) =>
                other !== journey &&
                other.arrive.arriveCivil === journey.depart.departCivil &&
                airportsMatch(other.arrive.destination, departureAirport),
            )),
      )
      if (!departureClaims) {
        const code = journey.depart.originCode ?? departureAirport
        const city = cityOf(departureAirport)?.label ?? ""
        gaps.push({
          id: gapId(`departure:${journey.depart.id}`),
          kind: "missing-departure-transport",
          title: `No ride to ${code}`,
          detail: `${journey.depart.title} leaves ${prettyDate(journey.depart.departCivil)} and nothing gets you to the airport.`,
          action: actionOf({
            flow: "transport",
            label: "Add ride",
            title: `Ride to ${code}`,
            startDate: journey.depart.departCivil,
            endDate: journey.depart.departCivil,
            location: city && city !== code ? city : "",
            locationTo: code,
          }),
        })
      }
    }

    for (let index = 0; index < stays.length; index += 1) {
      for (let other = index + 1; other < stays.length; other += 1) {
        const left = stays[index]
        const right = stays[other]
        const shared = tripNights.filter((night) => stayCovers(left, night) && stayCovers(right, night))
        if (shared.length === 0) continue
        gaps.push({
          id: pairId(left.id, right.id),
          kind: "conflict",
          title: "Two stays overlap",
          detail: `${left.title} and ${right.title} both cover ${prettyDate(shared[0])}.`,
          action: actionOf({
            flow: "stay",
            label: "Fix stay",
            title: right.title,
            startDate: right.startDate,
            endDate: right.endDate,
            location: right.location,
            itemId: right.id,
          }),
        })
      }
    }

    const timedFlights = flights.filter((flight) => flight.timed)
    for (let index = 0; index < timedFlights.length; index += 1) {
      for (let other = index + 1; other < timedFlights.length; other += 1) {
        const left = timedFlights[index]
        const right = timedFlights[other]
        const overlap = Math.min(left.endInstant, right.endInstant) - Math.max(left.startInstant, right.startInstant)
        if (overlap <= OVERLAP) continue
        gaps.push({
          id: pairId(left.id, right.id),
          kind: "conflict",
          title: "Two flights overlap",
          detail: `${left.title} and ${right.title} happen at the same time.`,
          action: actionOf({
            flow: "flight",
            label: "Review",
            title: right.title,
            startDate: right.startDate,
            endDate: right.endDate,
            location: right.location,
            locationTo: right.locationTo,
            itemId: right.id,
          }),
        })
      }
    }

    for (const plan of spans) {
      if (plan.role === "flight" || plan.role === "stay" || !plan.timed) continue
      for (const flight of timedFlights) {
        const overlap = Math.min(plan.endInstant, flight.endInstant) - Math.max(plan.startInstant, flight.startInstant)
        if (overlap <= OVERLAP) continue
        gaps.push({
          id: pairId(plan.id, flight.id),
          kind: "conflict",
          title: "Plan overlaps a flight",
          detail: `${plan.title} overlaps ${flight.title}.`,
          action: actionOf({
            flow: plan.role === "transport" ? "transport" : "place",
            label: "Review",
            title: plan.title,
            startDate: plan.startDate,
            endDate: plan.endDate,
            location: plan.location,
            locationTo: plan.locationTo,
            itemId: plan.id,
          }),
        })
      }
    }

    for (const stay of stays) {
      const covered = tripNights.filter((night) => stayCovers(stay, night))
      const stayCity = cityOf(stay.location)
      const reasons: string[] = []
      const airNight = covered.find((night) => nights.get(night)?.kind === "air")
      if (airNight) reasons.push(`covers ${prettyDate(airNight)} while you're in the air`)
      const wrong = covered
        .map((night) => nights.get(night))
        .find((state) => {
          if (state?.kind !== "city" || !stayCity) return false
          if (state.code && stayCity.code && state.code === stayCity.code) return false
          if (normalize(state.label) === normalize(stayCity.label)) return false
          return true
        })
      if (wrong?.kind === "city") {
        reasons.push(`is in ${stayCity?.label ?? stay.location} while you're in ${wrong.label}`)
      }
      const into = journeys
        .filter((journey) => samePlace(journey.arrive.destination, stay.location) && journey.arrive.arriveCivil <= stay.endDate)
        .sort((a, b) => b.arrive.arriveCivil.localeCompare(a.arrive.arriveCivil))[0]
      const outOf = journeys
        .filter((journey) => samePlace(journey.depart.origin, stay.location) && journey.depart.departCivil >= stay.startDate)
        .sort((a, b) => a.depart.departCivil.localeCompare(b.depart.departCivil))[0]
      if (into && stay.startDate < into.arrive.arriveCivil) {
        reasons.push(`starts ${prettyDate(stay.startDate)}, before you land on ${prettyDate(into.arrive.arriveCivil)}`)
      }
      if (outOf && stay.endDate > outOf.depart.departCivil) {
        reasons.push(`checks out ${prettyDate(stay.endDate)}, after you leave on ${prettyDate(outOf.depart.departCivil)}`)
      }
      if (reasons.length === 0) continue
      gaps.push({
        id: gapId(`stay-flight:${stay.id}`),
        kind: "stay-flight-mismatch",
        title: "Stay misses the flights",
        detail: `${stay.title} ${reasons[0]}.`,
        action: actionOf({
          flow: "stay",
          label: "Fix stay",
          title: stay.title,
          startDate: stay.startDate,
          endDate: stay.endDate,
          location: stay.location,
          itemId: stay.id,
        }),
      })
    }

    for (const day of tripDays) {
      if (spans.some((span) => dayTouched(span, day))) continue
      const state = nights.get(day) ?? nights.get(addDays(day, -1))
      const where = state?.kind === "city" ? state.label : ""
      gaps.push({
        id: gapId(`empty:${day}`),
        kind: "empty-day",
        title: `Nothing planned ${prettyDate(day)}`,
        detail: `${prettyDate(day)} has no flight, stay, or plan.`,
        action: actionOf({
          flow: "place",
          label: "Add plan",
          title: "",
          startDate: day,
          endDate: day,
          location: where,
        }),
      })
    }
  }

  const rank: Record<GapKind, number> = {
    "uncovered-night": 1,
    "missing-arrival-transport": 2,
    "missing-departure-transport": 3,
    conflict: 4,
    "stay-flight-mismatch": 5,
    "empty-day": 6,
  }
  gaps.sort((a, b) => rank[a.kind] - rank[b.kind] || a.id.localeCompare(b.id))

  const upcoming = spans
    .filter((span) => span.startInstant >= now)
    .sort((a, b) => a.startInstant - b.startInstant || a.id.localeCompare(b.id))
    .slice(0, 8)
    .map((span) => ({
      id: span.id,
      title: span.title,
      kind: span.role,
      whenLabel: whenLabel(span),
      countdown: countdownFor(span.startInstant, now, fallbackZone),
      startDate: span.departCivil,
      location: span.location,
      locationTo: span.locationTo,
    }))

  return {
    upcoming,
    gaps,
    covered: Boolean(validRange && spans.length > 0 && gaps.length === 0),
  }
}
