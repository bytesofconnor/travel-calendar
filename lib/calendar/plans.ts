import { createHash } from "node:crypto"

import { airportTimeZone, isIanaTimeZone } from "./airports.ts"
import type { CalendarKind, CalendarPlan, SourceItem, TripCalendarSource } from "./types.ts"

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATED_NOTE = /^(\d{4}-\d{2}-\d{2})(?:\s+[-|–—:]\s+|\s+)(.+)$/

export function isIsoDate(value: string): boolean {
  const match = DATE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function addIsoDays(iso: string, days: number): string {
  const match = DATE.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
  return date.toISOString().slice(0, 10)
}

export function planKind(item: { locationTo?: string; startDate: string; endDate: string }): CalendarKind {
  if (item.locationTo?.trim()) return "flight"
  if (item.startDate !== item.endDate) return "stay"
  return "place"
}

function cleanTime(value: string | undefined): string | undefined {
  const time = value?.trim() ?? ""
  return TIME.test(time) ? time : undefined
}

function cleanZone(value: string | undefined, place: string | undefined): string | undefined {
  const zone = value?.trim() ?? ""
  if (zone && isIanaTimeZone(zone)) return zone
  return airportTimeZone(place)
}

function itemPlan(tripId: string, item: SourceItem): CalendarPlan | null {
  if (!item.title.trim() || !isIsoDate(item.startDate) || !isIsoDate(item.endDate)) return null
  const endDate = item.endDate < item.startDate ? item.startDate : item.endDate
  const kind = planKind({ ...item, endDate })
  const startTime = kind === "flight" ? cleanTime(item.startTime) : undefined
  const endTime = kind === "flight" ? cleanTime(item.endTime) : undefined
  return {
    id: item.id,
    tripId,
    kind,
    title: item.title.trim(),
    notes: item.notes?.trim() || undefined,
    linkLabel: item.linkLabel?.trim() || undefined,
    linkUrl: item.linkUrl?.trim() || undefined,
    startDate: item.startDate,
    endDate,
    location: item.location.trim(),
    locationTo: item.locationTo?.trim() || undefined,
    startTime,
    endTime,
    startTimeZone: startTime ? cleanZone(item.startTimeZone, item.location) : undefined,
    endTimeZone: endTime ? cleanZone(item.endTimeZone, item.locationTo) : undefined,
    revision: Math.max(0, Math.floor(item.revision)),
    updatedAt: item.updatedAt,
  }
}

function notePlans(tripId: string, content: string, updatedAt: number): CalendarPlan[] {
  const plans: CalendarPlan[] = []
  const seen = new Map<string, number>()
  for (const raw of content.split(/\r?\n/)) {
    const match = DATED_NOTE.exec(raw.trim())
    if (!match) continue
    const date = match[1] ?? ""
    const title = (match[2] ?? "").trim()
    if (!title || !isIsoDate(date)) continue
    const key = `${date}\n${title}`
    const index = seen.get(key) ?? 0
    seen.set(key, index + 1)
    const id = `note-${createHash("sha256").update(`${tripId}\n${date}\n${title}\n${index}`).digest("hex").slice(0, 24)}`
    plans.push({
      id,
      tripId,
      kind: "note",
      title,
      startDate: date,
      endDate: date,
      location: "",
      revision: 0,
      updatedAt,
    })
  }
  return plans
}

export function plansFromSource(source: TripCalendarSource): CalendarPlan[] {
  const plans = source.items.flatMap((item) => {
    const plan = itemPlan(source.tripId, item)
    return plan ? [plan] : []
  })
  if (source.note?.content.trim()) {
    plans.push(...notePlans(source.tripId, source.note.content, source.note.updatedAt))
  }
  return plans.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id))
}
