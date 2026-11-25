import type { PlanType } from "./plan-types.ts"
import { homeRole } from "./plan-form.ts"

export type WhenPlan = {
  id: string
  title: string
  startDate: string
  endDate: string
  location: string
  locationTo?: string
  startTime?: string
  endTime?: string
  notes?: string
  planType?: PlanType
}

export type WhenIcon = "sunrise" | "moon"

export type WhenPart = {
  icon?: WhenIcon
  text: string
}

export type PlanWhen = {
  parts: WhenPart[]
  label: string
}

type StayRole = "checkin" | "middle" | "checkout"
type TravelKind = "arrival" | "departure" | "transfer"
type SlotKind = StayRole | "arrival" | "departure" | "timed" | "allday"

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function cleanTime(value: string | undefined): string | null {
  const time = value?.trim() ?? ""
  return TIME.test(time) ? time : null
}

export function formatClock(value: string | undefined): string | null {
  const time = cleanTime(value)
  if (!time) return null
  const match = TIME.exec(time)
  if (!match) return null
  const hour = Number(match[1])
  const minute = match[2]
  const suffix = hour >= 12 ? "PM" : "AM"
  const twelve = hour % 12 || 12
  return `${twelve}:${minute} ${suffix}`
}

function timeRange(item: WhenPlan): string | null {
  const start = formatClock(item.startTime)
  const end = formatClock(item.endTime)
  if (start && end) return `${start} → ${end}`
  return start ?? end
}

function plusMinute(time: string): string {
  const match = TIME.exec(time)
  if (!match) return time
  const total = Number(match[1]) * 60 + Number(match[2]) + 1
  const hour = Math.floor(total / 60)
  const minute = total % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function addDays(iso: string, days: number): string {
  const match = DATE.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
  return date.toISOString().slice(0, 10)
}

function daysBetween(start: string, day: string): number {
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${day}T00:00:00Z`)
  if (Number.isNaN(from) || Number.isNaN(to)) return 0
  return Math.round((to - from) / 86_400_000)
}

function stayNightCount(start: string, end: string): number {
  const nights = daysBetween(start, end)
  return nights > 0 ? nights : 1
}

function looseMatch(left: string, right: string): boolean {
  const a = left.trim().toLowerCase()
  const b = right.trim().toLowerCase()
  if (!a || !b) return false
  if (a === b) return true
  const word = (short: string, long: string) =>
    new RegExp(`(?:^|\\b)${short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\b|$)`, "i").test(long)
  if (a.length >= 2 && word(a, b)) return true
  if (b.length >= 2 && word(b, a)) return true
  return false
}

function isTravel(item: WhenPlan): boolean {
  const role = homeRole(item)
  return role === "flight" || role === "transport"
}

export function stayRole(item: WhenPlan, day: string): StayRole | null {
  if (homeRole(item) !== "stay") return null
  if (day < item.startDate || day > item.endDate) return null
  if (day === item.startDate) return "checkin"
  if (day === item.endDate) return "checkout"
  return "middle"
}

function travelKind(item: WhenPlan, day: string, items: readonly WhenPlan[]): TravelKind | null {
  if (!isTravel(item) || day < item.startDate || day > item.endDate) return null
  const checkins = items.filter((entry) => stayRole(entry, day) === "checkin")
  const checkouts = items.filter((entry) => stayRole(entry, day) === "checkout")
  const origin = item.location
  const destination = item.locationTo?.trim() ?? ""
  const arrivesOvernight = item.endDate === day && item.startDate < day
  const through = item.startDate < day && item.endDate > day
  const leavesOvernight = item.startDate === day && item.endDate > day
  const intoCheckin = checkins.some((stay) => looseMatch(destination, stay.location))
  const outOfCheckout = checkouts.some((stay) => looseMatch(origin, stay.location))
  if ((arrivesOvernight || through || intoCheckin) && outOfCheckout) return "transfer"
  if (arrivesOvernight || through || intoCheckin) return "arrival"
  if (leavesOvernight || outOfCheckout) return "departure"
  if (checkins.length > 0 && checkouts.length === 0) {
    const leavesStay = checkins.some((stay) => looseMatch(origin, stay.location)) && !intoCheckin
    return leavesStay ? "departure" : "arrival"
  }
  if (checkouts.length > 0 && checkins.length === 0) return "departure"
  if (checkins.length > 0 && checkouts.length > 0) return "transfer"
  return item.startDate === day ? "departure" : "arrival"
}

function slotKind(item: WhenPlan, day: string, items: readonly WhenPlan[]): SlotKind {
  const role = stayRole(item, day)
  if (role) return role
  const travel = travelKind(item, day, items)
  if (travel === "arrival" || travel === "transfer") return "arrival"
  if (travel === "departure") return "departure"
  if (cleanTime(item.startTime)) return "timed"
  return "allday"
}

function arrivalClock(items: readonly WhenPlan[], day: string): string {
  const clocks = items
    .filter((item) => slotKind(item, day, items) === "arrival")
    .flatMap((item) => {
      const clock = cleanTime(item.startTime)
      return clock ? [clock] : []
    })
    .sort((left, right) => left.localeCompare(right))
  return clocks.at(-1) ?? ""
}

function slotTime(item: WhenPlan, day: string, items: readonly WhenPlan[]): string {
  const kind = slotKind(item, day, items)
  const clock = cleanTime(item.startTime)
  if (kind === "arrival") {
    if (clock) return clock
    const latest = arrivalClock(items, day)
    return latest ? plusMinute(latest) : "00:30"
  }
  if (kind === "checkin") {
    const arrivals = items.filter((entry) => slotKind(entry, day, items) === "arrival")
    if (arrivals.length === 0) return "00:20"
    const latest = arrivals
      .map((entry) => slotTime(entry, day, items))
      .sort((left, right) => left.localeCompare(right))
      .at(-1)
    return latest ? plusMinute(latest) : "00:31"
  }
  if (kind === "departure") return clock ?? "00:50"
  if (kind === "timed") return clock ?? "12:00"
  return "99:00"
}

const TIE: Record<SlotKind, number> = {
  middle: 0,
  checkout: 1,
  arrival: 2,
  checkin: 3,
  departure: 4,
  timed: 5,
  allday: 6,
}

export function orderDay<T extends WhenPlan>(items: readonly T[], day: string): T[] {
  const middle = items.filter((item) => stayRole(item, day) === "middle")
  const checkout = items.filter((item) => stayRole(item, day) === "checkout")
  const rest = items.filter((item) => {
    const role = stayRole(item, day)
    return role !== "middle" && role !== "checkout"
  })
  const byTitle = (left: T, right: T) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
  const timeline = [...rest].sort((left, right) => {
    const time = slotTime(left, day, items).localeCompare(slotTime(right, day, items))
    if (time !== 0) return time
    const tie = TIE[slotKind(left, day, items)] - TIE[slotKind(right, day, items)]
    if (tie !== 0) return tie
    return byTitle(left, right)
  })
  return [...middle.sort(byTitle), ...checkout.sort(byTitle), ...timeline]
}

function travelParts(item: WhenPlan, day: string, items: readonly WhenPlan[]): WhenPart[] {
  const kind = travelKind(item, day, items)
  const origin = item.location.trim()
  const destination = item.locationTo?.trim() ?? ""
  if (kind === "transfer") {
    const parts: WhenPart[] = []
    if (origin) parts.push({ text: `Depart ${origin}` })
    if (destination) parts.push({ text: `Arrive ${destination}` })
    return parts
  }
  if (kind === "arrival" && destination) return [{ text: `Arrive ${destination}` }]
  if (kind === "departure" && origin) return [{ text: `Depart ${origin}` }]
  return []
}

export function describePlanWhen(item: WhenPlan, day: string, items: readonly WhenPlan[]): PlanWhen {
  const role = stayRole(item, day)
  if (role === "checkin") {
    const afterArrival = items.some((entry) => {
      const kind = travelKind(entry, day, items)
      return kind === "arrival" || kind === "transfer"
    })
    return pack([
      { icon: "moon", text: "Sleep here tonight" },
      { text: afterArrival ? "Check-in after arrival" : "Check-in" },
    ])
  }
  if (role === "middle") {
    const night = daysBetween(item.startDate, day) + 1
    const total = stayNightCount(item.startDate, item.endDate)
    return pack([
      { icon: "sunrise", text: "Wake up here" },
      { icon: "moon", text: "Sleep here tonight" },
      { text: `Night ${night} of ${total}` },
    ])
  }
  if (role === "checkout") {
    return pack([
      { icon: "sunrise", text: "Wake up here" },
      { text: "Check-out" },
    ])
  }
  const parts: WhenPart[] = []
  const range = timeRange(item)
  if (range) parts.push({ text: range })
  parts.push(...travelParts(item, day, items))
  if (parts.length === 0) parts.push({ text: "All day" })
  return pack(parts)
}

function pack(parts: WhenPart[]): PlanWhen {
  return { parts, label: parts.map((part) => part.text).join(" · ") }
}

export function groupItemsByDay<T extends WhenPlan>(items: readonly T[]): Array<{ date: string; items: T[] }> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const end = item.endDate >= item.startDate ? item.endDate : item.startDate
    let cursor = item.startDate
    let guard = 0
    while (cursor <= end && guard < 400) {
      const list = map.get(cursor) ?? []
      list.push(item)
      map.set(cursor, list)
      cursor = addDays(cursor, 1)
      guard += 1
    }
  }
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayItems]) => ({ date, items: orderDay(dayItems, date) }))
}
