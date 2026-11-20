import { createHash } from "node:crypto"

import { addIsoDays, plansFromSource } from "./plans.ts"
import { formatUtc, vtimezoneBlock } from "./timezones.ts"
import type { CalendarPlan, TripCalendarSource } from "./types.ts"

const CANONICAL_ORIGIN = "https://www.travelcalendar.space"
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function feedOrigin(requestUrl: string): string {
  const url = new URL(requestUrl)
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin
  return CANONICAL_ORIGIN
}

function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
}

function fold(line: string): string {
  const bytes = encoder.encode(line)
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let start = 0
  let width = 75
  while (start < bytes.length) {
    let end = Math.min(bytes.length, start + width)
    while (end > start && end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end -= 1
    if (end === start) end = Math.min(bytes.length, start + width)
    parts.push(decoder.decode(bytes.subarray(start, end)))
    start = end
    width = 74
  }
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n")
}

function line(value: string): string {
  return fold(value)
}

function compactDate(iso: string): string {
  return iso.replaceAll("-", "")
}

function localDateTime(date: string, time: string): string {
  return `${compactDate(date)}T${time.replace(":", "")}00`
}

export function isTimedFlight(plan: CalendarPlan): boolean {
  return (
    plan.kind === "flight" &&
    Boolean(plan.startTime && plan.endTime && plan.startTimeZone && plan.endTimeZone)
  )
}

function summary(plan: CalendarPlan): string {
  if (plan.kind === "flight") {
    const from = plan.location.trim()
    const to = plan.locationTo?.trim() ?? ""
    if (from && to) return `Flight: ${from} to ${to}`
    return `Flight: ${plan.title}`
  }
  const prefix = plan.kind === "stay" ? "Stay" : plan.kind === "note" ? "Note" : "Place"
  return `${prefix}: ${plan.title}`
}

function mapsPlace(place: string): string {
  const trimmed = place.trim()
  if (/^[A-Za-z]{3}$/.test(trimmed)) return `${trimmed.toUpperCase()} airport`
  return trimmed
}

function location(plan: CalendarPlan): string {
  if (plan.kind === "flight") return mapsPlace(plan.locationTo?.trim() || plan.location)
  return plan.location.trim()
}

function planUrl(origin: string, plan: CalendarPlan): string {
  const url = new URL(origin)
  url.searchParams.set("trip", plan.tripId)
  url.searchParams.set("plan", plan.id)
  return url.toString()
}

function description(plan: CalendarPlan, origin: string): string {
  const parts: string[] = []
  if (plan.notes?.trim()) parts.push(plan.notes.trim())
  if (plan.linkUrl?.trim()) {
    const label = plan.linkLabel?.trim()
    parts.push(label ? `${label}: ${plan.linkUrl.trim()}` : plan.linkUrl.trim())
  }
  if (plan.kind === "flight" && plan.endDate !== plan.startDate && !isTimedFlight(plan)) {
    parts.push(`Arrives ${plan.endDate}.`)
  }
  if (!isTimedFlight(plan) && (plan.startTime || plan.endTime)) {
    const clocks = [
      plan.startTime ? `Departs ${plan.startTime}` : "",
      plan.endTime ? `arrives ${plan.endTime}` : "",
    ].filter(Boolean)
    if (clocks.length > 0) parts.push(`${clocks.join(", ")}.`)
  }
  parts.push(`Open this plan: ${planUrl(origin, plan)}`)
  return parts.join("\n")
}

function allDayEnd(plan: CalendarPlan): string {
  if (plan.kind === "stay" && plan.endDate > plan.startDate) return plan.endDate
  return addIsoDays(plan.startDate, 1)
}

function eventLines(plan: CalendarPlan, origin: string, stamp: string): string[] {
  const where = location(plan)
  const lines = [
    "BEGIN:VEVENT",
    line(`UID:${plan.id}@travelcalendar.space`),
    line(`DTSTAMP:${stamp}`),
    line(`SUMMARY:${escapeText(summary(plan))}`),
  ]
  if (isTimedFlight(plan) && plan.startTime && plan.endTime && plan.startTimeZone && plan.endTimeZone) {
    lines.push(
      line(`DTSTART;TZID=${plan.startTimeZone}:${localDateTime(plan.startDate, plan.startTime)}`),
      line(`DTEND;TZID=${plan.endTimeZone}:${localDateTime(plan.endDate, plan.endTime)}`),
    )
  } else {
    lines.push(
      line(`DTSTART;VALUE=DATE:${compactDate(plan.startDate)}`),
      line(`DTEND;VALUE=DATE:${compactDate(allDayEnd(plan))}`),
    )
  }
  if (where) lines.push(line(`LOCATION:${escapeText(where)}`))
  lines.push(
    line(`DESCRIPTION:${escapeText(description(plan, origin))}`),
    line(`SEQUENCE:${Math.max(0, Math.floor(plan.revision))}`),
    line(`LAST-MODIFIED:${formatUtc(plan.updatedAt)}`),
    "END:VEVENT",
  )
  return lines
}

function zoneWindow(plan: CalendarPlan): { zone: string; start: number; end: number }[] {
  if (!isTimedFlight(plan) || !plan.startTimeZone || !plan.endTimeZone) return []
  const start = Date.parse(`${plan.startDate}T00:00:00Z`)
  const end = Date.parse(`${plan.endDate}T00:00:00Z`)
  return [
    { zone: plan.startTimeZone, start, end },
    { zone: plan.endTimeZone, start, end },
  ]
}

function timezoneLines(plans: CalendarPlan[]): string[] {
  const windows = new Map<string, { start: number; end: number }>()
  for (const plan of plans) {
    for (const entry of zoneWindow(plan)) {
      const current = windows.get(entry.zone)
      if (!current) {
        windows.set(entry.zone, { start: entry.start, end: entry.end })
      } else {
        current.start = Math.min(current.start, entry.start)
        current.end = Math.max(current.end, entry.end)
      }
    }
  }
  const blocks: string[] = []
  for (const zone of [...windows.keys()].sort()) {
    const window = windows.get(zone)
    if (!window) continue
    const block = vtimezoneBlock(zone, window.start, window.end)
    if (block) blocks.push(block)
  }
  return blocks
}

export function icsFilename(tripName: string): string {
  const slug = tripName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  return `${slug || "trip"}.ics`
}

export function feedPublishedAt(source: TripCalendarSource): number {
  const plans = plansFromSource(source)
  const latest = Math.max(source.tripUpdatedAt, ...plans.map((plan) => plan.updatedAt), 0)
  return latest || Date.UTC(2026, 0, 1)
}

export function buildCalendar(source: TripCalendarSource, origin = CANONICAL_ORIGIN): string {
  const plans = plansFromSource(source)
  const stamp = formatUtc(feedPublishedAt(source))
  const name = source.tripName.trim() || "Trip"
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Travel Calendar//travelcalendar.space//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    line(`X-WR-CALNAME:${escapeText(name)}`),
    "X-WR-CALDESC:Plans from the trip. Everyone on it stays up to date.",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...timezoneLines(plans),
    ...plans.flatMap((plan) => eventLines(plan, origin, stamp)),
    "END:VCALENDAR",
  ]
  return `${lines.join("\r\n")}\r\n`
}

export function calendarEtag(body: string): string {
  return `"${createHash("sha256").update(body).digest("hex")}"`
}
