import type { TripItem } from "./kanban-store.ts"
import { orderDay } from "./plan-when.ts"
import { resolvePlanType } from "./plan-form.ts"
import type { PlanKind } from "./trip-kind.ts"

function planKind(item: TripItem): PlanKind {
  return resolvePlanType(item)
}

export interface MonthDayCell {
  iso: string
  inMonth: boolean
}

export interface StayBar {
  id: string
  title: string
  kind: PlanKind
  start: number
  end: number
  lane: number
  continuesBefore: boolean
  continuesAfter: boolean
}

const PLACE_CODE = /^[A-Za-z]{2,4}$/

function placeCode(value: string | undefined): string | null {
  const token = value?.trim().split(/[\s,/]+/)[0] ?? ""
  if (!PLACE_CODE.test(token)) return null
  return token.toUpperCase()
}

function routeEnds(item: TripItem): { from: string; to: string } | null {
  const titled = item.title.split(/\s+to\s+/i)
  const from = placeCode(item.location) ?? placeCode(titled[0])
  const to = placeCode(item.locationTo) ?? placeCode(titled[1])
  if (!from || !to || from === to) return null
  return { from, to }
}

function leadingWords(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return title.trim()
  if (words.length === 1) return words[0]
  const pair = `${words[0]} ${words[1]}`
  if (pair.length <= 10) return pair
  return words[0]
}

export function phonePlanLabel(item: TripItem): string {
  const travel = planKind(item) === "flight" || Boolean(item.locationTo?.trim())
  if (travel) {
    const route = routeEnds(item)
    if (route) return `${route.from}→${route.to}`
  }
  return leadingWords(item.title)
}

function letterCount(value: string) {
  return value.match(/[A-Za-z0-9]/g)?.length ?? 0
}

export function phoneDayFace(
  labels: string[],
  available: number,
  measure: (text: string) => number,
): "label" | "count" {
  if (labels.length === 0) return "label"
  if (!(available > 0)) return "count"
  const ellipsis = measure("…")
  for (const label of labels) {
    if (!label || measure(label) <= available) continue
    const room = available - ellipsis
    if (!(room > 0)) return "count"
    let fitted = ""
    for (const char of label) {
      const next = fitted + char
      if (measure(next) > room) break
      fitted = next
    }
    if (letterCount(fitted) <= 2) return "count"
  }
  return "label"
}

export function itemsOnDay(items: TripItem[], iso: string) {
  return orderDay(
    items.filter((item) => item.startDate <= iso && item.endDate >= iso),
    iso,
  )
}

export function stayBarsForWeek(days: MonthDayCell[], items: TripItem[]): StayBar[] {
  if (days.length !== 7) return []
  const weekStart = days[0].iso
  const weekEnd = days[6].iso
  const segments = items
    .filter((item) => planKind(item) === "stay" && item.startDate <= weekEnd && item.endDate >= weekStart)
    .map((item) => {
      let start = 0
      let end = 6
      for (let index = 0; index < 7; index += 1) {
        if (days[index].iso >= item.startDate) {
          start = index
          break
        }
      }
      for (let index = 6; index >= 0; index -= 1) {
        if (days[index].iso <= item.endDate) {
          end = index
          break
        }
      }
      return {
        id: item.id,
        title: item.title,
        kind: "stay" as const,
        start,
        end,
        continuesBefore: item.startDate < weekStart,
        continuesAfter: item.endDate > weekEnd,
      }
    })
    .sort((left, right) => left.start - right.start || right.end - left.end || left.title.localeCompare(right.title))

  const laneEnds: number[] = []
  return segments.map((segment) => {
    let lane = laneEnds.findIndex((taken) => taken < segment.start)
    if (lane < 0) {
      lane = laneEnds.length
      laneEnds.push(segment.end)
    } else {
      laneEnds[lane] = segment.end
    }
    return { ...segment, lane }
  })
}

export function tripEdges(days: Array<{ iso: string }>, index: number, tripStart: string, tripEnd: string) {
  const iso = days[index]?.iso ?? ""
  const inTrip = iso >= tripStart && iso <= tripEnd
  if (!inTrip) {
    return { inTrip: false, joinLeft: false, joinTop: false, edges: "" }
  }
  const onTrip = (offset: number) => {
    const day = days[index + offset]
    return Boolean(day && day.iso >= tripStart && day.iso <= tripEnd)
  }
  const joinLeft = index % 7 !== 0 && onTrip(-1)
  const joinRight = index % 7 !== 6 && onTrip(1)
  const joinTop = onTrip(-7)
  const joinBottom = onTrip(7)
  const edges = [
    joinTop ? "" : "top",
    joinRight ? "" : "right",
    joinBottom ? "" : "bottom",
    joinLeft ? "" : "left",
  ]
    .filter(Boolean)
    .join(" ")
  return { inTrip, joinLeft, joinTop, edges }
}
