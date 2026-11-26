import { homeRole } from "./plan-form.ts"
import type { TravelMode } from "./plan-types.ts"
import { formatClock, orderDay, stayRole, type WhenPlan } from "./plan-when.ts"

export type GlancePlan = WhenPlan & {
  travelMode?: TravelMode
}

export type GlanceNight = {
  date: string
  index: number
  count: number
  city: string
  stayTitle: string
  stayId: string | null
  booked: boolean
  cityChange: boolean
}

export type SleepTonight = {
  id: string
  title: string
  city: string
}

export type NextLeg = {
  id: string
  title: string
  date: string
  timeLabel: string
  from: string
  to: string
}

export type TodayBrief<T extends GlancePlan> = {
  active: boolean
  plans: T[]
  sleep: SleepTonight | null
  nextLeg: NextLeg | null
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

function addDays(iso: string, days: number): string {
  const match = DATE.exec(iso)
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
  return date.toISOString().slice(0, 10)
}

function covers(item: GlancePlan, day: string): boolean {
  return item.startDate <= day && item.endDate >= day
}

function cityKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function sleepStay<T extends GlancePlan>(items: readonly T[], day: string): T | null {
  const checkins = items.filter((item) => stayRole(item, day) === "checkin")
  const middles = items.filter((item) => stayRole(item, day) === "middle")
  const pool = checkins.length > 0 ? checkins : middles
  return (
    [...pool].sort(
      (left, right) => right.startDate.localeCompare(left.startDate) || left.id.localeCompare(right.id),
    )[0] ?? null
  )
}

function hintCity(items: readonly GlancePlan[], day: string): string {
  const covering = items.filter((item) => covers(item, day))
  const place = covering.find((item) => homeRole(item) === "place" && item.location.trim())
  if (place) return place.location.trim()
  const arrival = covering.find((item) => {
    const role = homeRole(item)
    return (role === "flight" || role === "transport") && Boolean(item.locationTo?.trim())
  })
  if (arrival?.locationTo?.trim()) return arrival.locationTo.trim()
  const stay = covering.find((item) => homeRole(item) === "stay" && item.location.trim())
  if (stay) return stay.location.trim()
  return ""
}

function isLeg(item: GlancePlan): boolean {
  const role = homeRole(item)
  return role === "flight" || role === "transport"
}

function legTime(item: GlancePlan): string {
  const start = formatClock(item.startTime)
  const end = formatClock(item.endTime)
  if (start && end) return `${start} → ${end}`
  return start ?? end ?? "All day"
}

function legKey(item: GlancePlan, today: string): string | null {
  if (!isLeg(item) || item.endDate < today) return null
  const raw = item.startTime?.trim() ?? ""
  const clock = TIME.test(raw) ? raw : item.startDate > today ? "99:00" : "00:00"
  const date = item.startDate > today ? item.startDate : today
  return `${date}T${clock}`
}

export function nightLabel(night: GlanceNight, today?: string): string {
  const place = night.city ? `, ${night.city}` : ""
  const stay = night.booked ? `, ${night.stayTitle}` : ", no stay booked"
  const change = night.cityChange ? ", new city" : ""
  const current = today && night.date === today ? ", today" : ""
  return `Night ${night.index} of ${night.count}${place}${stay}${change}${current}`
}

export function tripNights<T extends GlancePlan>(items: readonly T[], start: string, end: string): GlanceNight[] {
  if (!DATE.test(start) || !DATE.test(end) || start >= end) return []
  const dates: string[] = []
  let cursor = start
  let guard = 0
  while (cursor < end && guard < 400) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
    guard += 1
  }
  let previous = ""
  return dates.map((date, index) => {
    const stay = sleepStay(items, date)
    const hinted = hintCity(items, date)
    const city = stay ? stay.location.trim() : hinted || previous
    const booked = Boolean(stay)
    const cityChange = Boolean(city) && Boolean(previous) && cityKey(city) !== cityKey(previous)
    if (city) previous = city
    return {
      date,
      index: index + 1,
      count: dates.length,
      city,
      stayTitle: stay?.title.trim() || (booked ? "Stay" : ""),
      stayId: stay?.id ?? null,
      booked,
      cityChange,
    }
  })
}

export function todayBrief<T extends GlancePlan>(
  items: readonly T[],
  today: string,
  start: string,
  end: string,
): TodayBrief<T> {
  const active = DATE.test(today) && today >= start && today <= end
  const plans = orderDay(
    items.filter((item) => covers(item, today)),
    today,
  )
  const stay = sleepStay(items, today)
  const sleep = stay
    ? { id: stay.id, title: stay.title.trim() || "Stay", city: stay.location.trim() }
    : null
  const ranked = items
    .map((item) => ({ item, key: legKey(item, today) }))
    .filter((entry): entry is { item: T; key: string } => entry.key !== null)
    .sort(
      (left, right) =>
        left.key.localeCompare(right.key) ||
        left.item.title.localeCompare(right.item.title) ||
        left.item.id.localeCompare(right.item.id),
    )
  const next = ranked[0]?.item ?? null
  const nextLeg = next
    ? {
        id: next.id,
        title: next.title.trim(),
        date: next.startDate > today ? next.startDate : today,
        timeLabel: legTime(next),
        from: next.location.trim(),
        to: next.locationTo?.trim() ?? "",
      }
    : null
  return { active, plans, sleep, nextLeg }
}
