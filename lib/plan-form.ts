import { airportTimeZone, zoneClockName } from "./calendar/airports.ts"
import type { TripItemInput } from "./kanban-store.ts"
import type { GeoPlace, PlanType, TravelMode } from "./plan-types.ts"
import {
  carrierFrom,
  groundRoute,
  guessTravelMode,
  modeKeepsArriveDay,
  readTravelMode,
  travelTitle,
} from "./travel-mode.ts"

export type { GeoPlace, PlanType } from "./plan-types.ts"

export type HomeRole = "flight" | "stay" | "transport" | "place"

const BARE = /^(stay|stays|flight|flights|travel|place|places|activity|activities|note|notes|plan|idea|train|bus|shuttle|taxi|walk)$/i
const FLIGHT_WORD = /\b(fly|flight|flying|airline)\b/i
const GROUND_WORD =
  /\b(taxi|uber|lyft|cab|shuttle|transfer|train|metro|subway|rental|pickup|pick-up|drop-off|dropoff|car service|bus|ride|rides|drive|driving)\b/i
const ROUTE = /^(.+?)\s+to\s+(.+)$/i
const FLY_ROUTE = /^(?:fly|flight)\s+(.+?)\s+to\s+(.+)$/i

export type PlanSource = {
  planType?: PlanType
  travelMode?: TravelMode
  title: string
  notes?: string
  location: string
  locationTo?: string
  startDate: string
  endDate: string
}

export function isBareTitle(title: string): boolean {
  return BARE.test(title.trim())
}

export function isFlightTitle(title: string): boolean {
  return FLIGHT_WORD.test(title)
}

export function isGroundTransit(title: string, notes?: string): boolean {
  return GROUND_WORD.test(`${title} ${notes ?? ""}`)
}

export function parseRoute(title: string): { from: string; to: string } | null {
  const text = title.trim()
  if (!text || isGroundTransit(text)) return null
  const fly = FLY_ROUTE.exec(text)
  if (fly?.[1] && fly[2]) return { from: fly[1].trim(), to: fly[2].trim() }
  if (!isFlightTitle(text) && !ROUTE.test(text)) return null
  const route = ROUTE.exec(text.replace(/^(?:fly|flight)\s+/i, ""))
  if (!route?.[1] || !route[2]) return null
  return { from: route[1].trim(), to: route[2].trim() }
}

export function guessPlanType(text: string): PlanType {
  const value = text.trim()
  if (!value) return "place"
  if (/^(note|remember|reminder)\b/i.test(value)) return "note"
  if (isFlightTitle(value)) return "flight"
  if (/\b(stay|hotel|airbnb|hostel|check-?in|apartment)\b/i.test(value)) return "stay"
  if (parseRoute(value)) return "flight"
  if (isGroundTransit(value) && /\bto\b/i.test(value)) return "flight"
  return "place"
}

export function resolvePlanType(item: PlanSource): PlanType {
  if (item.planType) return item.planType
  if (isFlightTitle(item.title)) return "flight"
  if (item.locationTo?.trim()) return "flight"
  if (parseRoute(item.title)) return "flight"
  if (!item.location.trim() && item.startDate === item.endDate) return "note"
  if (item.startDate !== item.endDate) return "stay"
  return "place"
}

export function homeRole(item: PlanSource): HomeRole {
  if (item.planType === "stay") return "stay"
  if (item.planType === "place" || item.planType === "note") return "place"
  const mode = readTravelMode(item.travelMode)
  if (mode && mode !== "flight") return "transport"
  if (mode === "flight" || item.planType === "flight") {
    if (mode === "flight") return "flight"
    return isGroundTransit(item.title, item.notes) && !isFlightTitle(item.title) ? "transport" : "flight"
  }
  if (isFlightTitle(item.title)) return "flight"
  const destination = item.locationTo?.trim() ?? ""
  if (destination) {
    if (isGroundTransit(item.title, item.notes)) return "transport"
    if (parseRoute(item.title)) return "flight"
    const originAirport = isAirport(item.location)
    const destinationAirport = isAirport(destination)
    if (originAirport && destinationAirport) return "flight"
    if (originAirport || destinationAirport) return "transport"
    return "flight"
  }
  if (parseRoute(item.title)) return "flight"
  if (item.startDate !== item.endDate) return "stay"
  if (isGroundTransit(item.title, item.notes) && (isAirport(item.location) || /\bairport\b/i.test(item.notes ?? ""))) {
    return "transport"
  }
  return "place"
}

function isAirport(place: string): boolean {
  const trimmed = place.trim().toUpperCase()
  if (/^[A-Z]{3}$/.test(trimmed) && airportTimeZone(trimmed)) return true
  const paren = trimmed.match(/\(([A-Z]{3})\)/)
  if (paren?.[1] && airportTimeZone(paren[1])) return true
  return /\bairport\b/i.test(place)
}

export function tripPlaceHint(name: string): string {
  return name
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/['’]\d{2}\b/g, " ")
    .replace(/\b(trip|with you|with the family|with family)\b/gi, " ")
    .replace(/[^\p{L}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function stayPlaceholder(hint: string): string {
  if (/vietnam/i.test(hint)) return "Airbnb in Hanoi Old Quarter"
  if (hint) return `Airbnb in ${hint}`
  return "Hotel, neighborhood, or address"
}

export function autoTitle(
  type: PlanType,
  fields: { where?: string; from?: string; to?: string; name?: string; mode?: TravelMode; carrier?: string },
): string {
  if (type === "stay") {
    const where = fields.where?.trim() ?? ""
    return where ? `Stay · ${where}` : ""
  }
  if (type === "flight") {
    return travelTitle(fields.mode ?? "flight", fields.from ?? "", fields.to ?? "", fields.carrier ?? "")
  }
  if (type === "place") return fields.name?.trim() ?? ""
  return fields.name?.trim() ?? ""
}

export type PlanDraft = {
  type: PlanType
  customTitle: string
  titleEdited: boolean
  name: string
  where: string
  wherePlace?: GeoPlace | null
  from: string
  fromPlace?: GeoPlace | null
  to: string
  toPlace?: GeoPlace | null
  flightCode: string
  mode: TravelMode
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  startZone: string
  endZone: string
  notes: string
  address: string
  confirmation: string
  linkLabel: string
  linkUrl: string
}

export function draftTitle(draft: PlanDraft): string {
  if (draft.type === "place" || draft.type === "note") return draft.name.trim()
  const auto = autoTitle(draft.type, {
    where: draft.where,
    from: draft.from,
    to: draft.to,
    mode: draft.mode,
    carrier: draft.flightCode,
  })
  const typed = draft.customTitle.trim()
  if (draft.titleEdited && typed && !isBareTitle(typed)) return typed
  return auto
}

export function draftErrors(draft: PlanDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (draft.type === "stay") {
    if (!draft.where.trim()) errors.where = "Add where you're staying."
    if (!draft.startDate) errors.startDate = "Add a check-in date."
    if (!draft.endDate) errors.endDate = "Add a check-out date."
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      errors.endDate = "Check-out is before check-in."
    }
  } else if (draft.type === "flight") {
    if (!draft.from.trim()) errors.from = "Add where you leave from."
    if (!draft.to.trim()) errors.to = "Add where you're going."
    if (!draft.startDate) errors.startDate = modeKeepsArriveDay(draft.mode) ? "Add a departure date." : "Add a date."
    if (modeKeepsArriveDay(draft.mode) && !draft.endDate) errors.endDate = "Add an arrival date."
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      errors.endDate = "Arrival is before departure."
    }
    if (!draftTitle(draft)) errors.customTitle = "Add where this goes so the title can be filled in."
  } else if (draft.type === "place") {
    if (!draft.name.trim()) errors.name = "Add a name."
    if (!draft.startDate) errors.startDate = "Add a date."
  } else if (!draft.name.trim()) {
    errors.name = "Write the note."
  }
  const address = draft.address.trim()
  if (draft.type === "stay" && address.includes("://") && !/^https?:\/\//i.test(address)) {
    errors.address = "That link needs to start with http:// or https://."
  }
  const link = draft.linkUrl.trim()
  if (link && !/^https?:\/\//i.test(link)) errors.linkUrl = "Link needs to start with http:// or https://."
  return errors
}

function samePlaceText(text: string, place: GeoPlace): boolean {
  const value = text.trim()
  if (!value) return false
  if (value === place.name.trim()) return true
  return Boolean(place.label?.trim() && value === place.label.trim())
}

function picked(text: string, place?: GeoPlace | null): GeoPlace | undefined {
  if (!place || typeof place.lat !== "number" || typeof place.lng !== "number") return undefined
  if (!samePlaceText(text, place)) return undefined
  return {
    name: place.name.trim(),
    lat: place.lat,
    lng: place.lng,
    ...(place.label?.trim() ? { label: place.label.trim() } : {}),
    ...(place.kind ? { kind: place.kind } : {}),
    ...(place.code ? { code: place.code } : {}),
    ...(place.city?.trim() ? { city: place.city.trim() } : {}),
    ...(place.country ? { country: place.country } : {}),
    ...(place.timeZone ? { timeZone: place.timeZone } : {}),
  }
}

export function formatClock(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match?.[1] || !match[2]) return value.trim()
  const hour = Number(match[1])
  const minute = match[2]
  if (hour > 23) return value.trim()
  const suffix = hour >= 12 ? "PM" : "AM"
  const twelve = hour % 12 || 12
  return `${twelve}:${minute} ${suffix}`
}

export function flightWhen(input: {
  departTime: string
  arriveTime: string
  departDate: string
  arriveDate: string
  departZone: string
  arriveZone: string
  departCity: string
  arriveCity: string
}): string {
  const nextDay = Boolean(input.departDate && input.arriveDate && input.arriveDate > input.departDate)
  const depart = clockPart("Departs", input.departTime, input.departZone, input.departCity, false)
  const arrive = clockPart("Arrives", input.arriveTime, input.arriveZone, input.arriveCity, nextDay)
  return [depart, arrive].filter(Boolean).join(" · ")
}

function clockPart(verb: string, time: string, zone: string, city: string, nextDay: boolean): string {
  if (!time.trim()) return ""
  const where = [zone ? zoneClockName(zone) : "", city.trim() ? `(${city.trim()})` : ""].filter(Boolean).join(" ")
  const day = nextDay ? " +1" : ""
  return where ? `${verb} ${formatClock(time)} ${where}${day}` : `${verb} ${formatClock(time)}${day}`
}

function zoneFor(text: string, place: GeoPlace | undefined, chosen: string): string {
  const pickedZone = chosen.trim()
  if (pickedZone) return pickedZone
  if (place?.timeZone) return place.timeZone
  return airportTimeZone(text) ?? ""
}

export function buildPlan(draft: PlanDraft, fallbackDate: string): TripItemInput | null {
  if (Object.keys(draftErrors(draft)).length > 0) return null
  const date = draft.startDate || fallbackDate
  const notes = draft.notes.trim()
  const linkUrl = draft.linkUrl.trim()
  const link = linkUrl ? { label: draft.linkLabel.trim() || "Link", url: linkUrl } : undefined
  const end = draft.endDate || date

  if (draft.type === "note") {
    return {
      planType: "note",
      title: draft.name.trim(),
      notes: notes || undefined,
      startDate: date,
      endDate: date,
      location: "",
      startTime: "",
      endTime: "",
      startTimeZone: "",
      endTimeZone: "",
      link,
    }
  }

  if (draft.type === "place") {
    const name = draft.name.trim()
    const where = draft.where.trim()
    const place = picked(where, draft.wherePlace)
    return {
      planType: "place",
      title: name,
      notes: notes || undefined,
      startDate: date,
      endDate: date,
      location: where || name,
      place,
      startTime: draft.startTime,
      endTime: "",
      startTimeZone: draft.startTime ? zoneFor(where, place, draft.startZone) : "",
      endTimeZone: "",
      link,
    }
  }

  if (draft.type === "flight") {
    const from = draft.from.trim()
    const to = draft.to.trim()
    const fromPlace = picked(from, draft.fromPlace)
    const toPlace = picked(to, draft.toPlace)
    const depart = draft.startTime.trim()
    const arrive = draft.endTime.trim()
    return {
      planType: "flight",
      travelMode: draft.mode,
      title: draftTitle(draft),
      notes: notes || undefined,
      flightCode: draft.mode === "walk" ? undefined : draft.flightCode.trim() || undefined,
      startDate: draft.startDate,
      endDate: end,
      location: from,
      locationTo: to,
      place: fromPlace,
      placeTo: toPlace,
      startTime: depart,
      endTime: arrive,
      startTimeZone: depart ? zoneFor(from, fromPlace, draft.startZone) : "",
      endTimeZone: arrive ? zoneFor(to, toPlace, draft.endZone) : "",
      link,
    }
  }

  const where = draft.where.trim()
  const place = picked(where, draft.wherePlace)
  const address = draft.address.trim()
  const addressLink = /^https?:\/\//i.test(address) ? { label: "Booking", url: address } : undefined
  return {
    planType: "stay",
    title: draftTitle(draft),
    notes: notes || undefined,
    confirmation: draft.confirmation.trim() || undefined,
    address: address && !addressLink ? address : undefined,
    startDate: draft.startDate,
    endDate: end,
    location: where,
    place,
    startTime: "",
    endTime: "",
    startTimeZone: "",
    endTimeZone: "",
    link: addressLink ?? link,
  }
}

function emptyDraft(type: PlanType, date: string): PlanDraft {
  return {
    type,
    customTitle: "",
    titleEdited: false,
    name: "",
    where: "",
    from: "",
    to: "",
    flightCode: "",
    mode: "flight",
    startDate: date,
    endDate: date,
    startTime: "",
    endTime: "",
    startZone: "",
    endZone: "",
    notes: "",
    address: "",
    confirmation: "",
    linkLabel: "",
    linkUrl: "",
  }
}

export function fieldsFromItem(item: PlanSource & {
  startTime?: string
  endTime?: string
  startTimeZone?: string
  endTimeZone?: string
  place?: GeoPlace
  placeTo?: GeoPlace
  confirmation?: string
  flightCode?: string
  address?: string
  travelMode?: TravelMode
  link?: { label: string; url: string }
}): PlanDraft {
  const type = resolvePlanType(item)
  const mode = type === "flight" ? (readTravelMode(item.travelMode) ?? "flight") : "flight"
  const route = type === "flight" && !item.locationTo?.trim() ? parseRoute(item.title) : null
  const from = item.locationTo?.trim() ? item.location : (route?.from ?? "")
  const to = item.locationTo?.trim() || route?.to || ""
  const where = type === "flight" ? "" : item.location
  const auto = autoTitle(type, { where, from, to, name: item.title, mode, carrier: item.flightCode })
  const titleEdited = (type === "stay" || type === "flight") && Boolean(item.title.trim()) && !isBareTitle(item.title) && item.title.trim() !== auto
  const address = item.address?.trim() || (type === "stay" && item.link?.url ? item.link.url : "")
  const link = type === "stay" && address === item.link?.url ? undefined : item.link
  return {
    ...emptyDraft(type, item.startDate),
    customTitle: titleEdited ? item.title : "",
    titleEdited,
    name: type === "place" || type === "note" ? item.title : "",
    where,
    wherePlace: item.place ?? null,
    from,
    fromPlace: type === "flight" ? item.place ?? null : null,
    to,
    toPlace: item.placeTo ?? null,
    flightCode: item.flightCode ?? "",
    mode,
    startDate: item.startDate,
    endDate: item.endDate,
    startTime: item.startTime ?? "",
    endTime: item.endTime ?? "",
    startZone: item.startTimeZone ?? "",
    endZone: item.endTimeZone ?? "",
    notes: item.notes ?? "",
    address,
    confirmation: item.confirmation ?? "",
    linkLabel: link?.label ?? "",
    linkUrl: link?.url ?? "",
  }
}

export function seedPlanType(input: Partial<TripItemInput> | null | undefined): PlanType {
  if (!input) return "place"
  if (input.planType) return input.planType
  if (input.locationTo?.trim()) return "flight"
  if (input.title?.trim()) return guessPlanType(input.title)
  if (input.startDate && input.endDate && input.startDate !== input.endDate) return "stay"
  return "place"
}

export function fieldsFromNew(type: PlanType, input: Partial<TripItemInput> | null, date: string): PlanDraft {
  const text = input?.title?.trim() ?? ""
  const spoken = isBareTitle(text) ? "" : text
  const route = type === "flight" && !input?.locationTo?.trim() ? parseRoute(spoken) : null
  const local = type === "flight" && !route && !input?.locationTo?.trim() ? groundRoute(spoken) : null
  const note = text.replace(/^(note|remember|reminder)\b[:\s-]*/i, "").trim()
  const where = input?.location?.trim() || (type === "stay" && text && !isBareTitle(text) ? text : "")
  const from = input?.location?.trim() || route?.from || local?.from || ""
  const to = input?.locationTo?.trim() || route?.to || local?.to || ""
  const mode = type === "flight" ? (readTravelMode(input?.travelMode) ?? guessTravelMode(spoken)) : "flight"
  const carrier = input?.flightCode?.trim() || (mode === "taxi" || mode === "shuttle" ? carrierFrom(spoken) : "")
  const autoStay = autoTitle("stay", { where })
  const autoFlight = autoTitle("flight", { from, to, mode, carrier })
  const stayEdited = type === "stay" && Boolean(input?.location?.trim()) && Boolean(text) && !isBareTitle(text) && text !== autoStay
  const flightEdited =
    type === "flight" && Boolean(text) && !isBareTitle(text) && !(route || local) && text !== autoFlight
  return {
    ...emptyDraft(type, input?.startDate || date),
    customTitle: stayEdited || flightEdited ? text : "",
    titleEdited: stayEdited || flightEdited,
    mode,
    flightCode: carrier,
    name: type === "note" ? note : type === "place" && !isBareTitle(text) ? text : "",
    where,
    from,
    to,
    startDate: input?.startDate || date,
    endDate: input?.endDate || input?.startDate || date,
    startTime: input?.startTime ?? "",
    endTime: input?.endTime ?? "",
    startZone: input?.startTimeZone ?? "",
    endZone: input?.endTimeZone ?? "",
    notes: input?.notes ?? "",
    linkLabel: input?.link?.label ?? "",
    linkUrl: input?.link?.url ?? "",
    wherePlace: type === "flight" ? null : input?.place ?? null,
    fromPlace: type === "flight" ? input?.place ?? null : null,
    toPlace: input?.placeTo ?? null,
  }
}

export function headingFor(type: PlanType, editing: boolean, mode: TravelMode = "flight"): string {
  if (type === "place") return editing ? "Edit activity" : "Add an activity"
  const noun = type === "stay" ? "stay" : type === "flight" ? mode : "note"
  return editing ? `Edit ${noun}` : `Add a ${noun}`
}

export function saveLabel(type: PlanType, editing: boolean, mode: TravelMode = "flight"): string {
  if (editing) return "Save"
  if (type === "stay") return "Add stay"
  if (type === "flight") return `Add ${mode}`
  if (type === "place") return "Add activity"
  return "Add note"
}

export function defaultPlanDate(input: {
  tapped?: string | null
  tripStart?: string | null
  tripEnd?: string | null
  plans?: Array<{ startDate?: string | null; endDate?: string | null }>
  today: string
}): string {
  const tapped = input.tapped?.trim()
  if (tapped) return tapped
  const start = input.tripStart?.trim() ?? ""
  const end = input.tripEnd?.trim() || start
  const today = input.today.trim()
  if (start && today && start > today) return start
  const last = latestPlanEnd(input.plans)
  if (last && start) {
    const next = addIsoDays(last, 1)
    if (!end || (next >= start && next <= end)) return next
  }
  return start || today
}

function latestPlanEnd(plans: Array<{ startDate?: string | null; endDate?: string | null }> | undefined): string {
  let last = ""
  for (const plan of plans ?? []) {
    const end = plan.endDate?.trim() || plan.startDate?.trim() || ""
    if (end > last) last = end
  }
  return last
}

function addIsoDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
